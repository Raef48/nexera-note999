// Vercel deployment: use relative paths
// Development: use localhost Express server
const getApiBaseUrl = () => {
  // Check if we're in production or if VITE_BACKEND_URL is localhost
  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  const isLocalhost = backendUrl.includes('localhost');
  
  // In production (Vercel) or if backend URL is localhost, use relative paths
  if (import.meta.env.PROD || isLocalhost || !backendUrl) {
    return '';  // Use relative paths like /api/v1/functions/...
  }
  // In development with non-localhost backend, use the specified URL
  return backendUrl;
};

const BACKEND_URL = getApiBaseUrl();

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

export interface UsageInfo {
  daily_limit: number;
  monthly_limit: number;
  current_daily_usage: number;
  current_monthly_usage: number;
  remaining_daily: number;
  remaining_monthly: number;
  reset_daily_at: string;
  reset_monthly_at: string;
}

/**
 * Generate a note using AI
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
    return data;
  } catch (error) {
    console.error('AI Note Generator error:', error);
    throw error;
  }
}

/**
 * Search notes with AI-powered RAG
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
    return data;
  } catch (error) {
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

    return data;
  } catch (error) {
    console.error('Analytics tracking error:', error);
    throw error;
  }
}

/**
 * Check current usage limits
 */
export async function checkUsage(userId: string): Promise<UsageInfo | null> {
  try {
    const result = await trackUsage('message_sent', userId, { checkOnly: true });
    return result.usage || null;
  } catch (error) {
    console.error('Failed to check usage:', error);
    return null;
  }
}
