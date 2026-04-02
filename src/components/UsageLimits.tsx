import React from 'react';
import { Gauge, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { useUsageLimits } from '../hooks/useUsageLimits';

interface UsageLimitsProps {
  userId: string;
  compact?: boolean;
  showDetails?: boolean;
}

export default function UsageLimits({ userId, compact = false, showDetails = true }: UsageLimitsProps) {
  const {
    usage,
    isLoading,
    error,
    canUseAI,
    dailyUsageColor,
    monthlyUsageColor,
    dailyBarColor,
    monthlyBarColor,
  } = useUsageLimits(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <p className="text-sm text-red-400">Failed to load usage data</p>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Daily:</span>
          <span className={`font-semibold ${dailyUsageColor}`}>
            {usage.current_daily_usage}/{usage.daily_limit}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Monthly:</span>
          <span className={`font-semibold ${monthlyUsageColor}`}>
            {usage.current_monthly_usage}/{usage.monthly_limit}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
            <Gauge size={20} className="text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-100">AI Usage</h3>
            <p className="text-xs text-zinc-500">Track your AI query limits</p>
          </div>
        </div>
        {canUseAI ? (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle size={16} />
            <span className="text-xs font-medium">Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={16} />
            <span className="text-xs font-medium">Limit Reached</span>
          </div>
        )}
      </div>

      {/* Daily Usage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400 flex items-center gap-2">
            <TrendingUp size={14} className="text-zinc-500" />
            Daily Usage
          </span>
          <span className={`font-semibold ${dailyUsageColor}`}>
            {usage.current_daily_usage} / {usage.daily_limit}
          </span>
        </div>
        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full ${dailyBarColor} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(100, usage.usage_percentage_daily)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            {usage.usage_percentage_daily.toFixed(1)}% used
          </span>
          <span className="text-zinc-500">
            Resets {new Date(usage.reset_daily_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Monthly Usage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400 flex items-center gap-2">
            <TrendingDown size={14} className="text-zinc-500" />
            Monthly Usage
          </span>
          <span className={`font-semibold ${monthlyUsageColor}`}>
            {usage.current_monthly_usage} / {usage.monthly_limit}
          </span>
        </div>
        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full ${monthlyBarColor} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(100, usage.usage_percentage_monthly)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            {usage.usage_percentage_monthly.toFixed(1)}% used
          </span>
          <span className="text-zinc-500">
            Resets {new Date(usage.reset_monthly_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Remaining Info */}
      {showDetails && (
        <div className="pt-4 border-t border-zinc-800">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950/50 rounded-xl p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">Daily Remaining</p>
              <p className={`text-lg font-bold ${usage.remaining_daily > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {usage.remaining_daily}
              </p>
            </div>
            <div className="bg-zinc-950/50 rounded-xl p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">Monthly Remaining</p>
              <p className={`text-lg font-bold ${usage.remaining_monthly > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {usage.remaining_monthly}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Message if limits exceeded */}
      {!canUseAI && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">
                {usage.is_daily_exceeded ? 'Daily Limit Exceeded' : 'Monthly Limit Exceeded'}
              </p>
              <p className="text-xs text-red-300/80">
                {usage.is_daily_exceeded
                  ? `Your daily AI queries have been exhausted. They will reset at ${new Date(usage.reset_daily_at).toLocaleTimeString()}.`
                  : `Your monthly AI queries have been exhausted. They will reset on ${new Date(usage.reset_monthly_at).toLocaleDateString()}.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
