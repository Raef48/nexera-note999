import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentUsage,
  checkUsageLimit,
  incrementUsage,
  type UsageInfo,
  type UsageCheckResult,
  getUsageColor,
  getUsageBarColor,
} from '../services/usage-limits';

interface UseUsageLimitsReturn {
  usage: UsageInfo | null;
  isLoading: boolean;
  error: string | null;
  canUseAI: boolean;
  checkLimit: () => Promise<UsageCheckResult>;
  trackUsage: (eventType?: 'ai_query' | 'note_created' | 'search_performed') => Promise<void>;
  refreshUsage: () => Promise<void>;
  dailyUsageColor: string;
  monthlyUsageColor: string;
  dailyBarColor: string;
  monthlyBarColor: string;
}

/**
 * React hook for managing usage limits
 * @param userId - The user ID to track usage for
 * @param autoCheck - Whether to automatically check usage on mount (default: true)
 */
export function useUsageLimits(userId: string, autoCheck: boolean = true): UseUsageLimitsReturn {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh usage data from server
   */
  const refreshUsage = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getCurrentUsage(userId);
      setUsage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch usage data');
      console.error('Usage refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Check if user can perform AI operation
   */
  const checkLimit = useCallback(async (): Promise<UsageCheckResult> => {
    if (!userId) {
      return {
        success: false,
        canProceed: false,
        message: 'User not authenticated',
      };
    }
    
    const result = await checkUsageLimit(userId);
    
    // Update local state with latest usage
    if (result.usage) {
      setUsage(result.usage);
    }
    
    return result;
  }, [userId]);

  /**
   * Track usage after successful operation
   */
  const trackUsage = useCallback(async (
    eventType: 'ai_query' | 'note_created' | 'search_performed' = 'ai_query'
  ) => {
    if (!userId) return;
    
    try {
      const updatedUsage = await incrementUsage(userId, eventType);
      if (updatedUsage) {
        setUsage(updatedUsage);
        // Dispatch event for other components to listen
        window.dispatchEvent(new CustomEvent('nexera_usage_update', { detail: updatedUsage }));
      }
    } catch (err: any) {
      console.error('Usage tracking error:', err);
    }
  }, [userId]);

  // Auto-check usage on mount
  useEffect(() => {
    if (autoCheck && userId) {
      refreshUsage();
    }
  }, [userId, autoCheck, refreshUsage]);

  // Listen for usage update events from other components
  useEffect(() => {
    const handleUsageUpdate = (event: CustomEvent) => {
      if (event.detail) {
        setUsage(event.detail);
      }
    };

    window.addEventListener('nexera_usage_update', handleUsageUpdate as EventListener);
    return () => {
      window.removeEventListener('nexera_usage_update', handleUsageUpdate as EventListener);
    };
  }, []);

  // Calculate colors based on usage
  const dailyUsageColor = usage ? getUsageColor(usage.usage_percentage_daily) : 'text-green-500';
  const monthlyUsageColor = usage ? getUsageColor(usage.usage_percentage_monthly) : 'text-green-500';
  const dailyBarColor = usage ? getUsageBarColor(usage.usage_percentage_daily) : 'bg-green-500';
  const monthlyBarColor = usage ? getUsageBarColor(usage.usage_percentage_monthly) : 'bg-green-500';

  return {
    usage,
    isLoading,
    error,
    canUseAI: usage ? !usage.is_daily_exceeded && !usage.is_monthly_exceeded : true,
    checkLimit,
    trackUsage,
    refreshUsage,
    dailyUsageColor,
    monthlyUsageColor,
    dailyBarColor,
    monthlyBarColor,
  };
}
