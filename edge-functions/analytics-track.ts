// Edge Function: Analytics Tracker
// Purpose: Track usage metrics for SaaS features (messages, users, limits)
// Usage: POST /api/v1/functions/analytics-track

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsTrackRequest {
  userId: string;
  eventType: 'message_sent' | 'note_created' | 'note_updated' | 'note_deleted' | 'ai_query' | 'file_uploaded' | 'search_performed';
  metadata?: Record<string, any>;
}

interface UsageLimit {
  daily_limit: number;
  monthly_limit: number;
  current_daily_usage: number;
  current_monthly_usage: number;
  remaining_daily: number;
  remaining_monthly: number;
  reset_daily_at: string;
  reset_monthly_at: string;
}

interface AnalyticsResponse {
  success: boolean;
  usage?: UsageLimit;
  message?: string;
}

// Get current date boundaries
function getDateBoundaries() {
  const now = new Date();
  
  // Daily reset at midnight UTC
  const dailyReset = new Date(now);
  dailyReset.setUTCHours(0, 0, 0, 0);
  dailyReset.setUTCDate(dailyReset.getUTCDate() + 1);
  
  // Monthly reset at first day of next month
  const monthlyReset = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  
  return {
    today: now.toISOString().split('T')[0],
    thisMonth: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    reset_daily_at: dailyReset.toISOString(),
    reset_monthly_at: monthlyReset.toISOString(),
  };
}

// Default usage limits (can be customized per user tier)
const DEFAULT_LIMITS = {
  free: {
    daily_messages: 50,
    monthly_messages: 500,
    daily_ai_queries: 20,
    monthly_ai_queries: 200,
    daily_file_uploads: 10,
    monthly_file_uploads: 100,
  },
  pro: {
    daily_messages: 500,
    monthly_messages: 5000,
    daily_ai_queries: 100,
    monthly_ai_queries: 1000,
    daily_file_uploads: 100,
    monthly_file_uploads: 1000,
  },
  enterprise: {
    daily_messages: -1, // unlimited
    monthly_messages: -1,
    daily_ai_queries: -1,
    monthly_ai_queries: -1,
    daily_file_uploads: -1,
    monthly_file_uploads: -1,
  },
};

async function getUserTier(userId: string, insforgeUrl: string, insforgeApiKey: string): Promise<string> {
  try {
    const response = await fetch(`${insforgeUrl}/rest/v1/user_profiles?user_id=eq.${userId}&select=tier`, {
      headers: {
        'apikey': insforgeApiKey,
        'Authorization': `Bearer ${insforgeApiKey}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data[0]?.tier || 'free';
    }
  } catch (error) {
    console.error('Failed to fetch user tier:', error);
  }
  
  return 'free';
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

    const body: AnalyticsTrackRequest = await req.json();
    const { userId, eventType, metadata = {} } = body;

    if (!userId || !eventType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, eventType' }),
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

    const { today, thisMonth, reset_daily_at, reset_monthly_at } = getDateBoundaries();

    // Get user tier
    const userTier = await getUserTier(userId, insforgeUrl, insforgeApiKey);
    const limits = DEFAULT_LIMITS[userTier as keyof typeof DEFAULT_LIMITS] || DEFAULT_LIMITS.free;

    // Map event types to limit categories
    const getLimitCategory = (type: string): string | null => {
      if (type.includes('message')) return 'messages';
      if (type.includes('ai_query')) return 'ai_queries';
      if (type.includes('file')) return 'file_uploads';
      return null;
    };

    const limitCategory = getLimitCategory(eventType);

    // Track the event in analytics table
    const analyticsData = {
      user_id: userId,
      event_type: eventType,
      event_date: today,
      event_month: thisMonth,
      metadata: JSON.stringify(metadata),
      created_at: new Date().toISOString(),
    };

    // Insert analytics record
    const insertResponse = await fetch(`${insforgeUrl}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: {
        'apikey': insforgeApiKey,
        'Authorization': `Bearer ${insforgeApiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(analyticsData),
    });

    if (!insertResponse.ok) {
      // Table might not exist, try to create usage tracking instead
      console.log('Analytics table might not exist, tracking usage directly...');
    }

    // Calculate current usage
    let usage: UsageLimit | undefined = undefined;

    if (limitCategory) {
      const dailyLimit = limits[`daily_${limitCategory}` as keyof typeof limits] as number;
      const monthlyLimit = limits[`monthly_${limitCategory}` as keyof typeof limits] as number;

      // Fetch current daily usage
      const dailyUsageResponse = await fetch(
        `${insforgeUrl}/rest/v1/analytics_events?select=count&user_id=eq.${userId}&event_date=eq.${today}&event_type=like.*${limitCategory}*`,
        {
          headers: {
            'apikey': insforgeApiKey,
            'Authorization': `Bearer ${insforgeApiKey}`,
          },
        }
      );

      const dailyUsageData = await dailyUsageResponse.json().catch(() => []);
      const current_daily_usage = Array.isArray(dailyUsageData) ? dailyUsageData.length : 0;

      // Fetch current monthly usage
      const monthlyUsageResponse = await fetch(
        `${insforgeUrl}/rest/v1/analytics_events?select=count&user_id=eq.${userId}&event_month=eq.${thisMonth}&event_type=like.*${limitCategory}*`,
        {
          headers: {
            'apikey': insforgeApiKey,
            'Authorization': `Bearer ${insforgeApiKey}`,
          },
        }
      );

      const monthlyUsageData = await monthlyUsageResponse.json().catch(() => []);
      const current_monthly_usage = Array.isArray(monthlyUsageData) ? monthlyUsageData.length : 0;

      usage = {
        daily_limit: dailyLimit,
        monthly_limit: monthlyLimit,
        current_daily_usage,
        current_monthly_usage,
        remaining_daily: dailyLimit === -1 ? -1 : Math.max(0, dailyLimit - current_daily_usage),
        remaining_monthly: monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - current_monthly_usage),
        reset_daily_at,
        reset_monthly_at,
      };

      // Check if user has exceeded limits
      if (dailyLimit !== -1 && current_daily_usage >= dailyLimit) {
        return new Response(
          JSON.stringify({
            success: false,
            usage,
            error: 'Daily limit exceeded',
            message: `You've reached your daily limit of ${dailyLimit} ${limitCategory.replace('_', ' ')}. Your limit resets at ${reset_daily_at}`,
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (monthlyLimit !== -1 && current_monthly_usage >= monthlyLimit) {
        return new Response(
          JSON.stringify({
            success: false,
            usage,
            error: 'Monthly limit exceeded',
            message: `You've reached your monthly limit of ${monthlyLimit} ${limitCategory.replace('_', ' ')}. Your limit resets at ${reset_monthly_at}`,
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    const response: AnalyticsResponse = {
      success: true,
      usage,
      message: 'Event tracked successfully',
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Analytics tracking failed',
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
