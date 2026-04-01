// Edge Function: AI Note Generator
// Purpose: Generate structured notes based on user prompts
// Usage: POST /api/v1/functions/ai-note-generator

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NoteGeneratorRequest {
  topic: string;
  userId: string;
  style?: 'default' | 'detailed' | 'outline' | 'tutorial';
}

interface NoteGeneratorResponse {
  title: string;
  content: string;
  tags: string[];
}

async function generateNoteContent(topic: string, style: string): Promise<string> {
  const stylePrompts: Record<string, string> = {
    default: `Create a well-structured note about "${topic}". Include:
- Clear introduction
- Key concepts and explanations
- Practical examples where relevant
- Summary or conclusion
Use markdown formatting with headers, bullet points, and code blocks as appropriate.`,
    
    detailed: `Create a comprehensive, detailed note about "${topic}". Include:
- In-depth introduction with context
- Detailed explanations of all key concepts
- Multiple examples and use cases
- Pros and cons if applicable
- Best practices
- Common pitfalls to avoid
- Resources for further learning
Use extensive markdown formatting with multiple levels of headers, tables, code blocks, and callouts.`,
    
    outline: `Create a structured outline note about "${topic}". Include:
- Main topic as H1
- Major sections as H2
- Sub-points as H3
- Bullet points for details
Keep it concise and organized. Focus on structure over detailed content.`,
    
    tutorial: `Create a step-by-step tutorial note about "${topic}". Include:
- Learning objectives
- Prerequisites
- Step-by-step instructions with numbered lists
- Code examples where applicable
- Tips and warnings
- Summary and next steps
Use clear, instructional language and markdown formatting.`,
  };

  return stylePrompts[style] || stylePrompts.default;
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: NoteGeneratorRequest = await req.json();
    const { topic, userId, style = 'default' } = body;

    if (!topic || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: topic, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI API key from environment
    const aiApiKey = Deno.env.get('VITE_GROQ_API_KEY') || Deno.env.get('GROQ_API_KEY');
    
    if (!aiApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate the prompt based on style
    const systemPrompt = await generateNoteContent(topic, style);

    // Call Groq API for note generation
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
            content: 'You are an expert note creator. You create well-structured, informative, and easy-to-understand notes using markdown formatting. Your notes are comprehensive yet concise, with clear headings, bullet points, and examples where appropriate.',
          },
          {
            role: 'user',
            content: systemPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 1,
        stream: false,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}));
      console.error('Groq API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to generate note content');
    }

    const groqData = await groqResponse.json();
    const generatedContent = groqData.choices[0]?.message?.content || '';

    // Generate title from topic
    const title = topic.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    // Extract potential tags from topic
    const tags = topic.split(' ').filter(word => word.length > 3).slice(0, 5);

    const response: NoteGeneratorResponse = {
      title: `📝 ${title}`,
      content: generatedContent,
      tags: tags.map(tag => tag.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()),
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('AI Note Generator error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate note',
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
