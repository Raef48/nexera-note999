import { insforge } from './insforge';

export interface UsageLimit {
  daily_limit: number;
  monthly_limit: number;
  current_daily_usage: number;
  current_monthly_usage: number;
  remaining_daily: number;
  remaining_monthly: number;
  reset_daily_at: string;
  reset_monthly_at: string;
}

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
    daily_messages: -1,
    monthly_messages: -1,
    daily_ai_queries: -1,
    monthly_ai_queries: -1,
    daily_file_uploads: -1,
    monthly_file_uploads: -1,
  },
};

function getDateBoundaries() {
  const now = new Date();
  const dailyReset = new Date(now);
  dailyReset.setUTCHours(0, 0, 0, 0);
  dailyReset.setUTCDate(dailyReset.getUTCDate() + 1);
  const monthlyReset = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  
  return {
    today: now.toISOString().split('T')[0],
    thisMonth: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    reset_daily_at: dailyReset.toISOString(),
    reset_monthly_at: monthlyReset.toISOString(),
  };
}

async function getUserTier(userId: string): Promise<string> {
  try {
    const { data, error } = await insforge.database
      .from('user_profiles')
      .select('tier')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!error && data) {
      return data.tier || 'free';
    }
  } catch (error) {
    console.error('Failed to fetch user tier:', error);
  }
  return 'free';
}

export async function trackBackendUsage(
  userId: string, 
  eventType: string, 
  metadata: any = {}
): Promise<{ success: boolean; usage?: UsageLimit; message?: string }> {
  try {
    const { today, thisMonth, reset_daily_at, reset_monthly_at } = getDateBoundaries();
    const userTier = await getUserTier(userId);
    const limits = DEFAULT_LIMITS[userTier as keyof typeof DEFAULT_LIMITS] || DEFAULT_LIMITS.free;

    const getLimitCategory = (type: string): string | null => {
      if (type.includes('message')) return 'messages';
      if (type.includes('ai_query')) return 'ai_queries';
      if (type.includes('file')) return 'file_uploads';
      if (type.includes('search')) return 'ai_queries';
      return null;
    };

    const limitCategory = getLimitCategory(eventType);
    const isCheckOnly = metadata.checkOnly === true;

    if (!isCheckOnly) {
      const analyticsData = {
        user_id: userId,
        event_type: eventType,
        event_date: today,
        event_month: thisMonth,
        metadata: metadata,
        created_at: new Date().toISOString(),
      };

      await insforge.database
        .from('analytics_events')
        .insert([analyticsData]);
    }

    let usage: UsageLimit | undefined = undefined;

    if (limitCategory) {
      const dailyLimit = limits[`daily_${limitCategory}` as keyof typeof limits] as number;
      const monthlyLimit = limits[`monthly_${limitCategory}` as keyof typeof limits] as number;

      const { data: dailyUsage } = await insforge.database
        .from('analytics_events')
        .select('*')
        .eq('user_id', userId)
        .eq('event_date', today)
        .like('event_type', `%${limitCategory}%`);

      const current_daily_usage = dailyUsage?.length || 0;

      const { data: monthlyUsage } = await insforge.database
        .from('analytics_events')
        .select('*')
        .eq('user_id', userId)
        .eq('event_month', thisMonth)
        .like('event_type', `%${limitCategory}%`);

      const current_monthly_usage = monthlyUsage?.length || 0;

      usage = {
        daily_limit: dailyLimit,
        monthly_limit: monthlyLimit,
        current_daily_usage,
        current_monthly_usage,
        remaining_daily: dailyLimit === -1 ? 9999 : Math.max(0, dailyLimit - current_daily_usage),
        remaining_monthly: monthlyLimit === -1 ? 9999 : Math.max(0, monthlyLimit - current_monthly_usage),
        reset_daily_at,
        reset_monthly_at,
      };

      if (!isCheckOnly && dailyLimit !== -1 && current_daily_usage > dailyLimit) {
        return {
          success: false,
          message: `Daily limit exceeded for ${limitCategory}`,
          usage,
        };
      }
    }

    return { success: true, usage };
  } catch (error) {
    console.error('Backend tracking error:', error);
    return { success: false, message: 'Tracking failed' };
  }
}
