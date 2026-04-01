// Edge Function: AI Search / RAG (Retrieval-Augmented Generation)
// Purpose: Search across user notes and return relevant content with AI-powered answers
// Usage: POST /api/v1/functions/ai-search

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  userId: string;
  limit?: number;
  mode?: 'search' | 'rag' | 'both';
}

interface NoteDocument {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  note: NoteDocument;
  relevanceScore: number;
  excerpts: string[];
}

interface RAGResponse {
  answer: string;
  sources: { noteId: string; title: string; excerpt: string }[];
  query: string;
}

// Simple text similarity scoring (cosine similarity approximation)
function calculateSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) => 
    text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2);

  const words1 = normalize(text1);
  const words2 = normalize(text2);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(word => set2.has(word)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size || 0;
}

// Extract relevant excerpts from content
function extractExcerpts(content: string, query: string, maxExcerpts = 3): string[] {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 3);
  
  const scoredParagraphs = paragraphs.map(para => {
    const score = calculateSimilarity(para, query);
    const hasQueryTerm = queryTerms.some(term => 
      para.toLowerCase().includes(term)
    );
    return { para, score: hasQueryTerm ? score * 2 : score };
  });
  
  return scoredParagraphs
    .sort((a, b) => b.score - a.score)
    .slice(0, maxExcerpts)
    .map(({ para }) => para.length > 200 ? para.substring(0, 200) + '...' : para);
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SearchRequest = await req.json();
    const { query, userId, limit = 10, mode = 'both' } = body;

    if (!query || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: query, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Insforge credentials
    const insforgeUrl = Deno.env.get('VITE_INSFORGE_URL');
    const insforgeApiKey = Deno.env.get('VITE_INSFORGE_API_KEY');
    
    if (!insforgeUrl || !insforgeApiKey) {
      return new Response(
        JSON.stringify({ error: 'Insforge credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's notes from Insforge
    const notesResponse = await fetch(`${insforgeUrl}/rest/v1/notes?user_id=eq.${userId}&select=*`, {
      headers: {
        'apikey': insforgeApiKey,
        'Authorization': `Bearer ${insforgeApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!notesResponse.ok) {
      throw new Error('Failed to fetch notes');
    }

    const notes: NoteDocument[] = await notesResponse.json();

    if (notes.length === 0) {
      return new Response(
        JSON.stringify({ 
          results: [], 
          message: 'No notes found. Create some notes first!',
          ragAnswer: mode === 'rag' ? "I don't have any notes to search through yet. Create some notes and I'll be able to help you find information!" : undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search and score notes
    const searchResults: SearchResult[] = notes
      .map(note => {
        const titleScore = calculateSimilarity(note.title, query);
        const contentScore = calculateSimilarity(note.content, query);
        const combinedScore = (titleScore * 0.4) + (contentScore * 0.6);
        
        return {
          note,
          relevanceScore: combinedScore,
          excerpts: extractExcerpts(note.content, query),
        };
      })
      .filter(result => result.relevanceScore > 0.05)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    // Prepare response based on mode
    if (mode === 'search') {
      return new Response(
        JSON.stringify({
          query,
          results: searchResults.map(r => ({
            id: r.note.id,
            title: r.note.title,
            relevanceScore: Math.round(r.relevanceScore * 100),
            excerpts: r.excerpts,
            updated_at: r.note.updated_at,
          })),
          totalResults: searchResults.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // RAG mode - Generate AI answer based on retrieved context
    if (mode === 'rag' || mode === 'both') {
      const aiApiKey = Deno.env.get('VITE_GROQ_API_KEY') || Deno.env.get('GROQ_API_KEY');
      
      let ragAnswer = '';
      let sources: { noteId: string; title: string; excerpt: string }[] = [];

      if (searchResults.length > 0 && aiApiKey) {
        // Build context from top results
        const context = searchResults.slice(0, 5).map(r => 
          `From note "${r.note.title}":\n${r.excerpts.join('\n')}`
        ).join('\n\n---\n\n');

        // Call Groq API for RAG answer
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that answers questions based on the provided context from the user\'s notes. Always reference which note the information comes from. If the context doesn\'t contain relevant information, say so clearly.',
              },
              {
                role: 'user',
                content: `Based on the following context from my notes, answer this question: "${query}"\n\nContext:\n${context}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 1,
            stream: false,
          }),
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          ragAnswer = groqData.choices[0]?.message?.content || '';
          
          // Extract sources
          sources = searchResults.slice(0, 3).map(r => ({
            noteId: r.note.id,
            title: r.note.title,
            excerpt: r.excerpts[0] || '',
          }));
        }
      }

      const response: any = {
        query,
        results: searchResults.map(r => ({
          id: r.note.id,
          title: r.note.title,
          relevanceScore: Math.round(r.relevanceScore * 100),
          excerpts: r.excerpts,
          updated_at: r.note.updated_at,
        })),
        totalResults: searchResults.length,
      };

      if (ragAnswer) {
        response.ragAnswer = ragAnswer;
        response.sources = sources;
      }

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('AI Search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

serve(handler);
