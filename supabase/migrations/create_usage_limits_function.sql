-- Usage Limits Table (if not exists)
CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  daily_messages INTEGER DEFAULT 100,
  monthly_messages INTEGER DEFAULT 3000,
  daily_ai_queries INTEGER DEFAULT 50,
  monthly_ai_queries INTEGER DEFAULT 1500,
  daily_file_uploads INTEGER DEFAULT 20,
  monthly_file_uploads INTEGER DEFAULT 500,
  custom_limits JSONB DEFAULT '{}'::jsonb,
  used_daily_ai_queries INTEGER DEFAULT 0,
  used_monthly_ai_queries INTEGER DEFAULT 0,
  last_updated_date DATE DEFAULT CURRENT_DATE,
  last_updated_month TEXT DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_usage_limits_user_id ON usage_limits(user_id);

-- RPC Function to increment AI query usage with automatic reset logic
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id TEXT,
  p_event_date DATE,
  p_event_month TEXT
)
RETURNS usage_limits AS $$
DECLARE
  v_record usage_limits;
  v_should_reset_daily BOOLEAN;
  v_should_reset_monthly BOOLEAN;
  v_new_daily_usage INTEGER;
  v_new_monthly_usage INTEGER;
BEGIN
  -- Get current usage record
  SELECT * INTO v_record
  FROM usage_limits
  WHERE user_id = p_user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO usage_limits (user_id, last_updated_date, last_updated_month)
    VALUES (p_user_id, p_event_date, p_event_month)
    RETURNING * INTO v_record;
    
    RETURN v_record;
  END IF;

  -- Check if daily reset is needed
  v_should_reset_daily := v_record.last_updated_date != p_event_date;
  
  -- Check if monthly reset is needed
  v_should_reset_monthly := v_record.last_updated_month != p_event_month;

  -- Calculate new usage values
  v_new_daily_usage := CASE 
    WHEN v_should_reset_daily THEN 1
    ELSE v_record.used_daily_ai_queries + 1
  END;

  v_new_monthly_usage := CASE
    WHEN v_should_reset_monthly THEN 1
    ELSE v_record.used_monthly_ai_queries + 1
  END;

  -- Update the record
  UPDATE usage_limits
  SET 
    used_daily_ai_queries = v_new_daily_usage,
    used_monthly_ai_queries = v_new_monthly_usage,
    last_updated_date = p_event_date,
    last_updated_month = p_event_month,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql;

-- RPC Function to check if user can perform an action
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id TEXT,
  p_limit_type TEXT DEFAULT 'ai_query'
)
RETURNS TABLE (
  can_proceed BOOLEAN,
  daily_limit INTEGER,
  monthly_limit INTEGER,
  used_daily INTEGER,
  used_monthly INTEGER,
  remaining_daily INTEGER,
  remaining_monthly INTEGER,
  message TEXT
) AS $$
DECLARE
  v_record usage_limits;
  v_daily_limit INTEGER;
  v_monthly_limit INTEGER;
  v_used_daily INTEGER;
  v_used_monthly INTEGER;
  v_remaining_daily INTEGER;
  v_remaining_monthly INTEGER;
  v_today DATE := CURRENT_DATE;
  v_current_month TEXT := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
BEGIN
  -- Get usage record
  SELECT * INTO v_record
  FROM usage_limits
  WHERE user_id = p_user_id;

  -- If no record exists, user has no limits set yet (allow)
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      TRUE, 0, 0, 0, 0, 0, 0, 
      'No usage limits configured'::TEXT;
    RETURN;
  END IF;

  -- Determine which limits to check based on type
  IF p_limit_type = 'ai_query' THEN
    v_daily_limit := v_record.daily_ai_queries;
    v_monthly_limit := v_record.monthly_ai_queries;
    v_used_daily := CASE WHEN v_record.last_updated_date != v_today THEN 0 ELSE v_record.used_daily_ai_queries END;
    v_used_monthly := CASE WHEN v_record.last_updated_month != v_current_month THEN 0 ELSE v_record.used_monthly_ai_queries END;
  ELSIF p_limit_type = 'message' THEN
    v_daily_limit := v_record.daily_messages;
    v_monthly_limit := v_record.monthly_messages;
    v_used_daily := 0;
    v_used_monthly := 0;
  ELSIF p_limit_type = 'file_upload' THEN
    v_daily_limit := v_record.daily_file_uploads;
    v_monthly_limit := v_record.monthly_file_uploads;
    v_used_daily := 0;
    v_used_monthly := 0;
  ELSE
    v_daily_limit := v_record.daily_ai_queries;
    v_monthly_limit := v_record.monthly_ai_queries;
    v_used_daily := CASE WHEN v_record.last_updated_date != v_today THEN 0 ELSE v_record.used_daily_ai_queries END;
    v_used_monthly := CASE WHEN v_record.last_updated_month != v_current_month THEN 0 ELSE v_record.used_monthly_ai_queries END;
  END IF;

  v_remaining_daily := GREATEST(0, v_daily_limit - v_used_daily);
  v_remaining_monthly := GREATEST(0, v_monthly_limit - v_used_monthly);

  -- Determine if user can proceed
  IF v_remaining_daily = 0 THEN
    RETURN QUERY SELECT 
      FALSE, v_daily_limit, v_monthly_limit, v_used_daily, v_used_monthly, 
      v_remaining_daily, v_remaining_monthly,
      'Daily limit reached. Resets tomorrow.'::TEXT;
  ELSIF v_remaining_monthly = 0 THEN
    RETURN QUERY SELECT 
      FALSE, v_daily_limit, v_monthly_limit, v_used_daily, v_used_monthly, 
      v_remaining_daily, v_remaining_monthly,
      'Monthly limit reached. Resets next month.'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      TRUE, v_daily_limit, v_monthly_limit, v_used_daily, v_used_monthly, 
      v_remaining_daily, v_remaining_monthly,
      'OK'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_usage(TEXT, DATE, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_usage_limit(TEXT, TEXT) TO authenticated, anon;

