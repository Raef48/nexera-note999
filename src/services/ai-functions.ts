// Vercel deployment: use relative paths
// Development: use localhost Express server
const getApiBaseUrl = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  const isLocalhost = backendUrl.includes('localhost');

  if (import.meta.env.PROD || isLocalhost || !backendUrl) {
    return '';
  }
  return backendUrl;
};

const BACKEND_URL = getApiBaseUrl();

import { incrementUsage, type UsageInfo } from './usage-limits';

export interface GeneratedNote {
  title: string;
  content: string;
  tags: string[];
  usage?: UsageInfo;
}

export interface SearchResults {
  query: string;
  results: Array<{
    id: string;
    title: string;
    relevanceScore: number;
    excerpts: string[];
    updated_at: string;
  }>;
  totalResults: number;
  message?: string;
  ragAnswer?: string;
  sources?: Array<{
    noteId: string;
    title: string;
    excerpt: string;
  }>;
  usage?: UsageInfo;
}

/**
 * Generate a note using AI with usage limit check
 */
export async function generateNote(topic: string, style: string = 'default', userId: string): Promise<GeneratedNote> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/functions/ai-note-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        userId,
        style,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate note');
    }

    const data = await response.json();

    // Track usage after successful generation
    await incrementUsage(userId, 'ai_query');

    return data;
  } catch (error: any) {
    console.error('AI Note Generator error:', error);
    throw error;
  }
}

/**
 * Search notes with AI-powered RAG with usage limit check
 */
export async function searchNotes(query: string, userId: string, mode: 'search' | 'rag' | 'both' = 'both', limit: number = 10): Promise<SearchResults> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/functions/ai-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        userId,
        mode,
        limit,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Search failed');
    }

    const data = await response.json();

    // Track usage after successful search
    await incrementUsage(userId, 'ai_query');

    return data;
  } catch (error: any) {
    console.error('AI Search error:', error);
    throw error;
  }
}

/**
 * Track usage analytics
 */
export async function trackUsage(
  eventType: 'message_sent' | 'note_created' | 'note_updated' | 'note_deleted' | 'ai_query' | 'file_uploaded' | 'search_performed',
  userId: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; usage?: UsageInfo; message?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/functions/analytics-track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        eventType,
        metadata,
      }),
    });

    const data = await response.json();

    if (!response.ok && !data.usage) {
      throw new Error(data.message || 'Failed to track usage');
    }

    // Also track in usage_limits table for AI queries
    if (eventType === 'ai_query') {
      await incrementUsage(userId, 'ai_query');
    }

    return data;
  } catch (error: any) {
    console.error('Analytics tracking error:', error);
    throw error;
  }
}

/**
 * Check current usage limits
 */
export async function checkUsage(userId: string): Promise<UsageInfo | null> {
  try {
    const { getCurrentUsage } = await import('./usage-limits');
    return await getCurrentUsage(userId);
  } catch (error) {
    console.error('Failed to check usage:', error);
    return null;
  }
}
