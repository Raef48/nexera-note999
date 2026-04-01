import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { trackBackendUsage } from '../analytics';

dotenv.config();

const router = express.Router();

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

router.post('/', async (req: Request, res: Response) => {
  try {
    const body: NoteGeneratorRequest = req.body;
    const { topic, userId, style = 'default' } = body;

    if (!topic || !userId) {
      return res.status(400).json({ error: 'Missing required fields: topic, userId' });
    }

    // Check usage limits before generating
    const usageCheck = await trackBackendUsage(userId, 'ai_query', { checkOnly: true });
    if (usageCheck.usage && usageCheck.usage.remaining_daily <= 0) {
      return res.status(403).json({
        error: 'Usage limit exceeded',
        message: 'You have reached your daily AI generation limit.',
        usage: usageCheck.usage
      });
    }

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

    // Track actual usage after successful generation
    await trackBackendUsage(userId, 'ai_query', { topic, style });

    res.status(200).json(response);
  } catch (error) {
    console.error('AI Note Generator error:', error);
    res.status(500).json({ 
      error: 'Failed to generate note',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
