// Vercel Serverless Function: AI Note Generator
// This runs on Vercel's serverless infrastructure

import type { VercelRequest, VercelResponse } from '@vercel/node';

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

// Simple usage tracking without analytics dependency
const checkUsageLimits = async (userId: string): Promise<{ allowed: boolean; usage?: any }> => {
  // For now, allow all requests - implement usage tracking if needed
  return { allowed: true };
};

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body: NoteGeneratorRequest = req.body;
    const { topic, userId, style = 'default' } = body;

    if (!topic || !userId) {
      return res.status(400).json({ error: 'Missing required fields: topic, userId' });
    }

    // Check usage limits before generating
    const usageCheck = await checkUsageLimits(userId);
    if (!usageCheck.allowed) {
      return res.status(403).json({
        error: 'Usage limit exceeded',
        message: 'You have reached your daily AI generation limit.',
        usage: usageCheck.usage
      });
    }

    // Get Groq API key from environment
    const aiApiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
    
    if (!aiApiKey) {
      return res.status(500).json({ error: 'AI API key not configured' });
    }

    const systemPrompt = await generateNoteContent(topic, style);

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

    const title = topic.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    const tags = topic.split(' ').filter(word => word.length > 3).slice(0, 5);

    const response: NoteGeneratorResponse = {
      title: `📝 ${title}`,
      content: generatedContent,
      tags: tags.map(tag => tag.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()),
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('AI Note Generator Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate note',
      message: error.message || 'Unknown error'
    });
  }
}
