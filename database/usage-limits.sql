-- Usage Limits Schema and Functions for Nexera Note
-- Run this in your Supabase/InsForge SQL editor

-- ============================================
-- 1. CREATE USAGE LIMITS TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS public.usage_limits (
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

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_usage_limits_user_id ON public.usage_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_limits_date ON public.usage_limits(last_updated_date);
CREATE INDEX IF NOT EXISTS idx_usage_limits_month ON public.usage_limits(last_updated_month);

-- Enable Row Level Security
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own usage
CREATE POLICY IF NOT EXISTS "Users can read own usage"
  ON public.usage_limits
  FOR SELECT
  USING (user_id = current_setting('app.user_id', TRUE));

-- Create policy for users to update their own usage
CREATE POLICY IF NOT EXISTS "Users can update own usage"
  ON public.usage_limits
  FOR UPDATE
  USING (user_id = current_setting('app.user_id', TRUE));

-- Create policy for users to insert their own usage
CREATE POLICY IF NOT EXISTS "Users can insert own usage"
  ON public.usage_limits
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', TRUE));

-- ============================================
-- 2. CREATE INCREMENT USAGE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id TEXT,
  p_event_date DATE DEFAULT CURRENT_DATE,
  p_event_month TEXT DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM')
)
RETURNS public.usage_limits AS $$
DECLARE
  v_result public.usage_limits;
BEGIN
  -- Upsert usage limits with automatic reset logic
  INSERT INTO public.usage_limits (
    user_id,
    used_daily_ai_queries,
    used_monthly_ai_queries,
    last_updated_date,
    last_updated_month
  )
  VALUES (
    p_user_id,
    1,
    1,
    p_event_date,
    p_event_month
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    -- Reset daily if new day, otherwise increment
    used_daily_ai_queries = 
      CASE 
        WHEN public.usage_limits.last_updated_date = p_event_date 
        THEN public.usage_limits.used_daily_ai_queries + 1
        ELSE 1
      END,
    
    -- Reset monthly if new month, otherwise increment
    used_monthly_ai_queries = 
      CASE 
        WHEN public.usage_limits.last_updated_month = p_event_month 
        THEN public.usage_limits.used_monthly_ai_queries + 1
        ELSE 1
      END,
    
    last_updated_date = p_event_date,
    last_updated_month = p_event_month,
    updated_at = NOW()
  )
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. CREATE CHECK USAGE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.check_usage(
  p_user_id TEXT
)
RETURNS TABLE (
  can_use BOOLEAN,
  daily_limit INTEGER,
  monthly_limit INTEGER,
  used_daily INTEGER,
  used_monthly INTEGER,
  remaining_daily INTEGER,
  remaining_monthly INTEGER,
  reset_daily_date DATE,
  reset_monthly_date TEXT,
  message TEXT
) AS $$
DECLARE
  v_usage public.usage_limits;
  v_remaining_daily INTEGER;
  v_remaining_monthly INTEGER;
BEGIN
  -- Get current usage
  SELECT * INTO v_usage
  FROM public.usage_limits
  WHERE user_id = p_user_id;
  
  -- If no usage record exists, user can use (will be created on first use)
  IF v_usage IS NULL THEN
    RETURN QUERY SELECT
      TRUE,
      100,
      3000,
      0,
      0,
      100,
      3000,
      CURRENT_DATE + INTERVAL '1 day',
      TO_CHAR((CURRENT_DATE + INTERVAL '1 month'), 'YYYY-MM'),
      'No usage record found. First query is free!'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate remaining
  v_remaining_daily := GREATEST(0, v_usage.daily_limit - v_usage.used_daily_ai_queries);
  v_remaining_monthly := GREATEST(0, v_usage.monthly_limit - v_usage.used_monthly_ai_queries);
  
  -- Check limits
  IF v_remaining_daily = 0 THEN
    RETURN QUERY SELECT
      FALSE,
      v_usage.daily_limit,
      v_usage.monthly_limit,
      v_usage.used_daily_ai_queries,
      v_usage.used_monthly_ai_queries,
      0,
      v_remaining_monthly,
      (v_usage.last_updated_date + INTERVAL '1 day')::DATE,
      TO_CHAR((v_usage.last_updated_date + INTERVAL '1 month'), 'YYYY-MM'),
      ('Daily limit reached. Resets at ' || (v_usage.last_updated_date + INTERVAL '1 day')::TEXT)::TEXT;
    RETURN;
  END IF;
  
  IF v_remaining_monthly = 0 THEN
    RETURN QUERY SELECT
      FALSE,
      v_usage.daily_limit,
      v_usage.monthly_limit,
      v_usage.used_daily_ai_queries,
      v_usage.used_monthly_ai_queries,
      v_remaining_daily,
      0,
      (v_usage.last_updated_date + INTERVAL '1 day')::DATE,
      TO_CHAR((v_usage.last_updated_date + INTERVAL '1 month'), 'YYYY-MM'),
      ('Monthly limit reached. Resets on ' || TO_CHAR((CURRENT_DATE + INTERVAL '1 month'), 'YYYY-MM-DD'))::TEXT;
    RETURN;
  END IF;
  
  -- User can proceed
  RETURN QUERY SELECT
    TRUE,
    v_usage.daily_limit,
    v_usage.monthly_limit,
    v_usage.used_daily_ai_queries,
    v_usage.used_monthly_ai_queries,
    v_remaining_daily,
    v_remaining_monthly,
    (v_usage.last_updated_date + INTERVAL '1 day')::DATE,
    TO_CHAR((v_usage.last_updated_date + INTERVAL '1 month'), 'YYYY-MM'),
    'Usage OK'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE RESET USAGE FUNCTION (manual override)
-- ============================================

CREATE OR REPLACE FUNCTION public.reset_usage(
  p_user_id TEXT,
  p_reset_daily BOOLEAN DEFAULT TRUE,
  p_reset_monthly BOOLEAN DEFAULT TRUE
)
RETURNS public.usage_limits AS $$
DECLARE
  v_result public.usage_limits;
BEGIN
  UPDATE public.usage_limits
  SET
    used_daily_ai_queries = CASE WHEN p_reset_daily THEN 0 ELSE used_daily_ai_queries END,
    used_monthly_ai_queries = CASE WHEN p_reset_monthly THEN 0 ELSE used_monthly_ai_queries END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. CREATE UPDATE USAGE FROM ANALYTICS TRIGGER
-- ============================================

-- First, make sure analytics_events table exists
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_month TEXT NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON public.analytics_events(event_date);

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.update_usage_from_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track AI queries
  IF NEW.event_type = 'ai_query' THEN
    -- Use the increment_usage function
    PERFORM public.increment_usage(
      NEW.user_id,
      NEW.event_date,
      NEW.event_month
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_usage ON public.analytics_events;

CREATE TRIGGER trigger_update_usage
AFTER INSERT ON public.analytics_events
FOR EACH ROW
EXECUTE FUNCTION public.update_usage_from_analytics();

-- ============================================
-- 6. CREATE VIEW FOR USAGE STATISTICS
-- ============================================

CREATE OR REPLACE VIEW public.usage_stats AS
SELECT
  ul.user_id,
  ul.daily_limit,
  ul.monthly_limit,
  ul.used_daily_ai_queries,
  ul.used_monthly_ai_queries,
  GREATEST(0, ul.daily_limit - ul.used_daily_ai_queries) AS remaining_daily,
  GREATEST(0, ul.monthly_limit - ul.used_monthly_ai_queries) AS remaining_monthly,
  ROUND((ul.used_daily_ai_queries::NUMERIC / ul.daily_limit::NUMERIC) * 100, 2) AS daily_usage_percent,
  ROUND((ul.used_monthly_ai_queries::NUMERIC / ul.monthly_limit::NUMERIC) * 100, 2) AS monthly_usage_percent,
  ul.last_updated_date,
  ul.last_updated_month,
  CASE 
    WHEN ul.used_daily_ai_queries >= ul.daily_limit THEN 'EXCEEDED'
    WHEN ul.used_daily_ai_queries >= ul.daily_limit * 0.9 THEN 'WARNING'
    ELSE 'OK'
  END AS daily_status,
  CASE 
    WHEN ul.used_monthly_ai_queries >= ul.monthly_limit THEN 'EXCEEDED'
    WHEN ul.used_monthly_ai_queries >= ul.monthly_limit * 0.9 THEN 'WARNING'
    ELSE 'OK'
  END AS monthly_status
FROM public.usage_limits ul;

-- ============================================
-- 7. SEED DEFAULT USAGE LIMITS FOR EXISTING USERS
-- ============================================

-- Insert usage limits for users who don't have any yet
INSERT INTO public.usage_limits (user_id, daily_limit, monthly_limit)
SELECT DISTINCT 
  u.user_id,
  100,
  3000
FROM (
  SELECT user_id FROM public.notes
  UNION
  SELECT user_id FROM public.chats
  UNION
  SELECT user_id FROM public.profiles
) u
WHERE NOT EXISTS (
  SELECT 1 FROM public.usage_limits ul WHERE ul.user_id = u.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Check current usage:
-- SELECT * FROM public.check_usage('user-123');

-- Increment usage:
-- SELECT * FROM public.increment_usage('user-123');

-- Reset usage (admin only):
-- SELECT * FROM public.reset_usage('user-123', true, true);

-- View all usage stats:
-- SELECT * FROM public.usage_stats;
