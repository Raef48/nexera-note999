import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { insforge } from '../insforge';
import { trackBackendUsage } from '../analytics';

dotenv.config();

const router = express.Router();

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

router.post('/', async (req: Request, res: Response) => {
  try {
    const body: SearchRequest = req.body;
    const { query, userId, limit = 10, mode = 'both' } = body;

    if (!query || !userId) {
      return res.status(400).json({ error: 'Missing required fields: query, userId' });
    }

    // Check usage limits before searching
    const usageCheck = await trackBackendUsage(userId, 'search_performed', { checkOnly: true });
    if (usageCheck.usage && usageCheck.usage.remaining_daily <= 0) {
      return res.status(403).json({
        error: 'Usage limit exceeded',
        message: 'You have reached your daily AI search limit.',
        usage: usageCheck.usage
      });
    }

    // Fetch user's notes from Insforge using SDK
    const { data: notes, error: notesError } = await insforge.database
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (notesError) {
      console.error(`Insforge error fetching notes:`, notesError);
      throw new Error(`Failed to fetch notes: ${notesError.message}`);
    }

    if (!notes || notes.length === 0) {
      return res.status(200).json({ 
        results: [], 
        message: 'No notes found. Create some notes first!',
        ragAnswer: mode === 'rag' ? "I don't have any notes to search through yet. Create some notes and I'll be able to help you find information!" : undefined
      });
    }

    const searchResults: SearchResult[] = (notes as NoteDocument[])
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

    // Track actual usage after successful search
    await trackBackendUsage(userId, 'search_performed', { query, mode });

    if (mode === 'search') {
      return res.status(200).json({
        query,
        results: searchResults.map(r => ({
          id: r.note.id,
          title: r.note.title,
          relevanceScore: Math.round(r.relevanceScore * 100),
          excerpts: r.excerpts,
          updated_at: r.note.updated_at,
        })),
        totalResults: searchResults.length,
      });
    }

    if (mode === 'rag' || mode === 'both') {
      const aiApiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
      
      let ragAnswer = '';
      let sources: { noteId: string; title: string; excerpt: string }[] = [];

      if (searchResults.length > 0 && aiApiKey) {
        const context = searchResults.slice(0, 5).map(r => 
          `From note "${r.note.title}":\n${r.excerpts.join('\n')}`
        ).join('\n\n---\n\n');

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
                content: `Query: ${query}\n\nContext:\n${context}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 1024,
          }),
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          ragAnswer = groqData.choices[0]?.message?.content || '';
          sources = searchResults.slice(0, 3).map(r => ({
            noteId: r.note.id,
            title: r.note.title,
            excerpt: r.excerpts[0],
          }));
        }
      }

      return res.status(200).json({
        query,
        results: searchResults.map(r => ({
          id: r.note.id,
          title: r.note.title,
          relevanceScore: Math.round(r.relevanceScore * 100),
          excerpts: r.excerpts,
          updated_at: r.note.updated_at,
        })),
        totalResults: searchResults.length,
        ragAnswer,
        sources,
      });
    }

    res.status(400).json({ error: 'Invalid mode' });
  } catch (error) {
    console.error('AI Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
