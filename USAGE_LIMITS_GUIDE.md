# Usage Limits Implementation Guide

## Overview

This document describes the **Usage Limits** feature implemented for Nexera Note, which tracks and limits user AI query usage with daily and monthly quotas.

## Features

- **Daily AI Query Limit**: 100 queries per day (resets at midnight UTC)
- **Monthly AI Limit**: 3000 queries per month (resets on the 1st of each month)
- **Real-time Tracking**: Usage is tracked automatically when users interact with AI features
- **Visual Indicators**: Progress bars and color-coded status in the UI
- **Limit Enforcement**: AI features are blocked when limits are exceeded

## Architecture

### Database Layer

**Table**: `usage_limits`

```sql
CREATE TABLE public.usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  daily_limit INTEGER NOT NULL DEFAULT 100,
  monthly_limit INTEGER NOT NULL DEFAULT 3000,
  used_daily_ai_queries INTEGER NOT NULL DEFAULT 0,
  used_monthly_ai_queries INTEGER NOT NULL DEFAULT 0,
  last_updated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_updated_month TEXT NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Key Functions**:
- `increment_usage(user_id, event_date, event_month)` - Increments usage counters with automatic daily/monthly reset
- `check_usage(user_id)` - Returns current usage status and whether user can proceed
- `reset_usage(user_id, reset_daily, reset_monthly)` - Manual reset function (admin)

**Trigger**: `trigger_update_usage` on `analytics_events` table automatically increments usage when AI queries are logged.

### Frontend Layer

#### Services

**`src/services/usage-limits.ts`**
- `UsageLimit` interface - Database schema type
- `UsageInfo` interface - Calculated usage information with percentages and reset times
- `UsageCheckResult` interface - Result of usage limit checks
- `getOrCreateUsageLimits(userId)` - Fetch or create usage record
- `checkUsageLimit(userId)` - Check if user can perform AI operation
- `incrementUsage(userId, eventType)` - Increment usage counters
- `getCurrentUsage(userId)` - Get current usage info for display
- `getUsageColor(percentage)` - Get color class based on usage percentage
- `getUsageBarColor(percentage)` - Get progress bar color

#### Hooks

**`src/hooks/useUsageLimits.ts`**
- `useUsageLimits(userId, autoCheck)` - React hook for managing usage limits in components
- Returns: `usage`, `isLoading`, `error`, `canUseAI`, `checkLimit()`, `trackUsage()`, `refreshUsage()`, color helpers

#### Components

**`src/components/UsageLimits.tsx`**
- Full usage limits display component with progress bars
- Props: `userId`, `compact`, `showDetails`
- Shows daily/monthly usage, remaining queries, reset times
- Color-coded status (green → yellow → orange → red)

**`src/components/Sidebar.tsx`** (Updated)
- Compact usage indicator in footer
- Shows daily usage progress bar
- Updates automatically via event listeners

**`src/components/AINoteGenerator.tsx`** (Updated)
- Checks usage limits before generating notes
- Shows error message when limits exceeded
- Displays reset time

**`src/components/AISearch.tsx`** (Updated)
- Checks usage limits before searching
- Shows error message when limits exceeded
- Displays reset time

**`src/components/ChatBox.tsx`** (Updated)
- Checks usage limits before sending messages
- Increments usage after successful AI response
- Shows error message when limits exceeded

#### Services Integration

**`src/services/ai-functions.ts`** (Updated)
- `generateNote()` - Automatically increments usage after successful generation
- `searchNotes()` - Automatically increments usage after successful search
- `trackUsage()` - Tracks analytics and increments usage for AI queries

## Setup Instructions

### 1. Database Setup

Run the SQL migration file in your Supabase/InsForge SQL editor:

```bash
# The file is located at:
database/usage-limits.sql
```

This will:
- Create the `usage_limits` table
- Create indexes for performance
- Set up Row Level Security policies
- Create the `increment_usage()` function
- Create the `check_usage()` function
- Create the `reset_usage()` function
- Set up the analytics trigger
- Create the `usage_stats` view
- Seed usage limits for existing users

### 2. Frontend Integration

The frontend integration is already complete. The following components are updated:

- ✅ `Sidebar.tsx` - Shows compact usage indicator
- ✅ `AINoteGenerator.tsx` - Checks limits before generation
- ✅ `AISearch.tsx` - Checks limits before search
- ✅ `ChatBox.tsx` - Checks limits before AI messages
- ✅ `UsageLimits.tsx` - Full usage display component (new)

### 3. Usage in New Components

To add usage limit checking to new components:

```tsx
import { checkUsageLimit } from '../services/usage-limits';
import { useUsageLimits } from '../hooks/useUsageLimits';

// Option 1: Use the hook
function MyComponent({ userId }) {
  const { usage, canUseAI, checkLimit } = useUsageLimits(userId);
  
  if (!canUseAI) {
    return <div>Usage limit exceeded</div>;
  }
  
  return <div>Remaining: {usage.remaining_daily}</div>;
}

// Option 2: Check manually
async function handleAICall() {
  const result = await checkUsageLimit(userId);
  if (!result.canProceed) {
    alert(result.message);
    return;
  }
  // Proceed with AI call
}
```

## API Reference

### UsageInfo Interface

```typescript
interface UsageInfo {
  daily_limit: number;           // Daily quota (100)
  monthly_limit: number;         // Monthly quota (3000)
  current_daily_usage: number;   // Queries used today
  current_monthly_usage: number; // Queries used this month
  remaining_daily: number;       // Remaining today
  remaining_monthly: number;     // Remaining this month
  reset_daily_at: string;        // ISO timestamp of next daily reset
  reset_monthly_at: string;      // ISO timestamp of next monthly reset
  is_daily_exceeded: boolean;    // True if daily limit reached
  is_monthly_exceeded: boolean;  // True if monthly limit reached
  usage_percentage_daily: number; // 0-100 percentage
  usage_percentage_monthly: number; // 0-100 percentage
}
```

### UsageCheckResult Interface

```typescript
interface UsageCheckResult {
  success: boolean;      // Request succeeded
  canProceed: boolean;   // User can make AI queries
  usage?: UsageInfo;     // Current usage info
  message?: string;      // Error/warning message
}
```

## Customization

### Change Limits

Edit the default values in `database/usage-limits.sql`:

```sql
daily_limit INTEGER NOT NULL DEFAULT 100,    -- Change this
monthly_limit INTEGER NOT NULL DEFAULT 3000, -- Change this
```

### Add New Event Types

Edit the `incrementUsage` function in `src/services/usage-limits.ts`:

```typescript
export async function incrementUsage(
  userId: string,
  eventType: 'ai_query' | 'note_created' | 'search_performed' = 'ai_query'
) {
  // Add custom logic for different event types
}
```

## Troubleshooting

### Usage not updating

1. Check that the database trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_usage';
   ```

2. Verify the `increment_usage()` function exists:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'increment_usage';
   ```

3. Check browser console for errors

### Limits not resetting

The reset is automatic based on date comparison. Verify:
- `last_updated_date` is being set correctly
- Server timezone matches expected reset time

### UI not updating

The UI updates via custom events. Check that:
- `window.dispatchEvent(new CustomEvent('nexera_usage_update'))` is being called
- Components are listening to the event

## Monitoring

Query current usage statistics:

```sql
-- View all user usage
SELECT * FROM public.usage_stats;

-- Check specific user
SELECT * FROM public.usage_stats WHERE user_id = 'user-id';

-- Find users near limits
SELECT * FROM public.usage_stats 
WHERE daily_usage_percent > 80 OR monthly_usage_percent > 80;
```

## Future Enhancements

- [ ] Tiered limits (Free/Pro/Enterprise)
- [ ] Usage notifications (email/push)
- [ ] Usage history charts
- [ ] Admin dashboard for limit management
- [ ] Rate limiting (queries per minute/hour)
- [ ] Custom limit overrides per user
