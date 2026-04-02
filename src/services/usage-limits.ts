import { insforge } from './insforge';

/**
 * Usage Limits Schema
 * Tracks user API usage for AI features with daily/monthly limits
 */
export interface UsageLimit {
  id: string;
  user_id: string;
  daily_messages: number;
  monthly_messages: number;
  daily_ai_queries: number;
  monthly_ai_queries: number;
  daily_file_uploads: number;
  monthly_file_uploads: number;
  custom_limits: Record<string, any>;
  used_daily_ai_queries: number;
  used_monthly_ai_queries: number;
  last_updated_date: string; // DATE
  last_updated_month: string; // TEXT (YYYY-MM)
  updated_at: string;
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
  is_daily_exceeded: boolean;
  is_monthly_exceeded: boolean;
  usage_percentage_daily: number;
  usage_percentage_monthly: number;
}

export interface UsageCheckResult {
  success: boolean;
  usage?: UsageInfo;
  message?: string;
  canProceed: boolean;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayDate = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * Get current month in YYYY-MM format
 */
const getCurrentMonth = (): string => {
  const now = new Date();
  return now.toISOString().slice(0, 7);
};

/**
 * Get tomorrow's date for daily reset
 */
const getTomorrowDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
};

/**
 * Get next month for monthly reset
 */
const getNextMonthDate = (): string => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
};

/**
 * Fetch or create usage limits for a user
 */
export async function getOrCreateUsageLimits(userId: string): Promise<UsageLimit | null> {
  try {
    // Try to fetch existing usage limits
    const { data, error } = await insforge
      .database.from('usage_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    if (data) {
      return data;
    }

    // Create new usage limits if not exists
    const today = getTodayDate();
    const currentMonth = getCurrentMonth();

    const { data: newData, error: createError } = await insforge
      .database.from('usage_limits')
      .insert({
        user_id: userId,
        daily_messages: 100,
        monthly_messages: 3000,
        daily_ai_queries: 50, // Default daily AI limit
        monthly_ai_queries: 1500, // Default monthly AI limit
        daily_file_uploads: 20,
        monthly_file_uploads: 500,
        custom_limits: {},
        used_daily_ai_queries: 0,
        used_monthly_ai_queries: 0,
        last_updated_date: today,
        last_updated_month: currentMonth,
      })
      .select()
      .single();

    if (createError) throw createError;

    return newData;
  } catch (error) {
    console.error('Error fetching/creating usage limits:', error);
    return null;
  }
}

/**
 * Calculate usage info from usage limits
 */
function calculateUsageInfo(limit: UsageLimit): UsageInfo {
  const remainingDaily = Math.max(0, limit.daily_ai_queries - limit.used_daily_ai_queries);
  const remainingMonthly = Math.max(0, limit.monthly_ai_queries - limit.used_monthly_ai_queries);

  return {
    daily_limit: limit.daily_ai_queries,
    monthly_limit: limit.monthly_ai_queries,
    current_daily_usage: limit.used_daily_ai_queries,
    current_monthly_usage: limit.used_monthly_ai_queries,
    remaining_daily: remainingDaily,
    remaining_monthly: remainingMonthly,
    reset_daily_at: getTomorrowDate(),
    reset_monthly_at: getNextMonthDate(),
    is_daily_exceeded: remainingDaily === 0,
    is_monthly_exceeded: remainingMonthly === 0,
    usage_percentage_daily: (limit.used_daily_ai_queries / limit.daily_ai_queries) * 100,
    usage_percentage_monthly: (limit.used_monthly_ai_queries / limit.monthly_ai_queries) * 100,
  };
}

/**
 * Check if user can perform an AI query
 */
export async function checkUsageLimit(userId: string): Promise<UsageCheckResult> {
  const usageLimit = await getOrCreateUsageLimits(userId);

  if (!usageLimit) {
    return {
      success: false,
      canProceed: false,
      message: 'Unable to fetch usage limits',
    };
  }

  const usageInfo = calculateUsageInfo(usageLimit);

  // Check if daily limit exceeded
  if (usageInfo.is_daily_exceeded) {
    return {
      success: true,
      canProceed: false,
      usage: usageInfo,
      message: `Daily AI query limit reached. Resets at ${new Date(usageInfo.reset_daily_at).toLocaleTimeString()}`,
    };
  }

  // Check if monthly limit exceeded
  if (usageInfo.is_monthly_exceeded) {
    return {
      success: true,
      canProceed: false,
      usage: usageInfo,
      message: `Monthly AI query limit reached. Resets on ${new Date(usageInfo.reset_monthly_at).toLocaleDateString()}`,
    };
  }

  return {
    success: true,
    canProceed: true,
    usage: usageInfo,
  };
}

/**
 * Increment usage counters (called after successful AI operation)
 */
export async function incrementUsage(
  userId: string,
  eventType: 'ai_query' | 'note_created' | 'search_performed' = 'ai_query'
): Promise<UsageInfo | null> {
  try {
    const today = getTodayDate();
    const currentMonth = getCurrentMonth();

    // Use the database function to increment usage
    const { data, error } = await insforge
      .database.rpc('increment_usage', {
        p_user_id: userId,
        p_event_date: today,
        p_event_month: currentMonth,
      })
      .select()
      .single();

    if (error) {
      console.error('Error incrementing usage:', error);
      // Fallback: direct update
      return await fallbackIncrementUsage(userId, today, currentMonth);
    }

    return calculateUsageInfo(data);
  } catch (error) {
    console.error('Failed to increment usage:', error);
    return null;
  }
}

/**
 * Check usage for a specific limit type
 */
export async function checkUsageForType(
  userId: string,
  type: 'ai_query' | 'message' | 'file_upload'
): Promise<UsageCheckResult> {
  const usageLimit = await getOrCreateUsageLimits(userId);

  if (!usageLimit) {
    return {
      success: false,
      canProceed: false,
      message: 'Unable to fetch usage limits',
    };
  }

  const today = getTodayDate();
  const currentMonth = getCurrentMonth();
  
  // Check if reset is needed
  const shouldResetDaily = usageLimit.last_updated_date !== today;
  const shouldResetMonthly = usageLimit.last_updated_month !== currentMonth;

  let dailyLimit: number;
  let monthlyLimit: number;
  let usedDaily: number;
  let usedMonthly: number;

  switch (type) {
    case 'ai_query':
      dailyLimit = usageLimit.daily_ai_queries;
      monthlyLimit = usageLimit.monthly_ai_queries;
      usedDaily = shouldResetDaily ? 0 : usageLimit.used_daily_ai_queries;
      usedMonthly = shouldResetMonthly ? 0 : usageLimit.used_monthly_ai_queries;
      break;
    case 'message':
      dailyLimit = usageLimit.daily_messages;
      monthlyLimit = usageLimit.monthly_messages;
      usedDaily = 0; // Not tracked yet
      usedMonthly = 0;
      break;
    case 'file_upload':
      dailyLimit = usageLimit.daily_file_uploads;
      monthlyLimit = usageLimit.monthly_file_uploads;
      usedDaily = 0; // Not tracked yet
      usedMonthly = 0;
      break;
  }

  const remainingDaily = Math.max(0, dailyLimit - usedDaily);
  const remainingMonthly = Math.max(0, monthlyLimit - usedMonthly);

  if (remainingDaily === 0) {
    return {
      success: true,
      canProceed: false,
      message: `Daily ${type.replace('_', ' ')} limit reached. Resets tomorrow.`,
    };
  }

  if (remainingMonthly === 0) {
    return {
      success: true,
      canProceed: false,
      message: `Monthly ${type.replace('_', ' ')} limit reached. Resets next month.`,
    };
  }

  return {
    success: true,
    canProceed: true,
  };
}

/**
 * Fallback increment usage if RPC function doesn't exist
 */
async function fallbackIncrementUsage(
  userId: string,
  today: string,
  currentMonth: string
): Promise<UsageInfo | null> {
  try {
    const { data: existing, error: fetchError } = await insforge
      .database.from('usage_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      throw fetchError;
    }

    // Check if we need to reset daily
    const shouldResetDaily = existing.last_updated_date !== today;
    const shouldResetMonthly = existing.last_updated_month !== currentMonth;

    const newDailyUsage = shouldResetDaily
      ? 1
      : existing.used_daily_ai_queries + 1;

    const newMonthlyUsage = shouldResetMonthly
      ? 1
      : existing.used_monthly_ai_queries + 1;

    const { data: updated, error: updateError } = await insforge
      .database.from('usage_limits')
      .update({
        used_daily_ai_queries: newDailyUsage,
        used_monthly_ai_queries: newMonthlyUsage,
        last_updated_date: today,
        last_updated_month: currentMonth,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    return calculateUsageInfo(updated);
  } catch (error) {
    console.error('Fallback increment failed:', error);
    return null;
  }
}

/**
 * Get current usage info for display
 */
export async function getCurrentUsage(userId: string): Promise<UsageInfo | null> {
  const usageLimit = await getOrCreateUsageLimits(userId);
  if (!usageLimit) return null;
  return calculateUsageInfo(usageLimit);
}

/**
 * Format usage percentage with color coding
 */
export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-500';
  if (percentage >= 70) return 'text-orange-500';
  if (percentage >= 50) return 'text-yellow-500';
  return 'text-green-500';
}

/**
 * Get usage bar background color
 */
export function getUsageBarColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-orange-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}
