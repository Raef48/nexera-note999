-- Nexera Note Edge Functions Database Schema
-- Run this in your Insforge SQL Editor to set up required tables

-- ============================================
-- ANALYTICS EVENTS TABLE
-- ============================================
-- Tracks all user events for analytics and usage limits

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_month TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_user_date 
  ON analytics_events(user_id, event_date);
  
CREATE INDEX IF NOT EXISTS idx_analytics_user_month 
  ON analytics_events(user_id, event_month);
  
CREATE INDEX IF NOT EXISTS idx_analytics_event_type 
  ON analytics_events(event_type);
  
CREATE INDEX IF NOT EXISTS idx_analytics_created_at 
  ON analytics_events(created_at);

-- Comments
COMMENT ON TABLE analytics_events IS 'Tracks user events for analytics and usage limits';
COMMENT ON COLUMN analytics_events.user_id IS 'User identifier';
COMMENT ON COLUMN analytics_events.event_type IS 'Type of event: message_sent, note_created, note_updated, note_deleted, ai_query, file_uploaded, search_performed';
COMMENT ON COLUMN analytics_events.event_date IS 'Date in YYYY-MM-DD format for daily aggregation';
COMMENT ON COLUMN analytics_events.event_month IS 'Month in YYYY-MM format for monthly aggregation';
COMMENT ON COLUMN analytics_events.metadata IS 'Additional event-specific data in JSON format';

-- ============================================
-- USER PROFILES TABLE
-- ============================================
-- Stores user tier and preferences for limit enforcement

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
  ON user_profiles(user_id);
  
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier 
  ON user_profiles(tier);

-- Comments
COMMENT ON TABLE user_profiles IS 'User subscription tiers and preferences';
COMMENT ON COLUMN user_profiles.tier IS 'Subscription tier: free, pro, enterprise';
COMMENT ON COLUMN user_profiles.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN user_profiles.stripe_subscription_id IS 'Stripe subscription ID for recurring billing';

-- ============================================
-- USAGE LIMITS TABLE (Optional - for custom limits)
-- ============================================
-- Allows custom limits per user (overrides default tier limits)

CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  daily_messages INTEGER DEFAULT -1,
  monthly_messages INTEGER DEFAULT -1,
  daily_ai_queries INTEGER DEFAULT -1,
  monthly_ai_queries INTEGER DEFAULT -1,
  daily_file_uploads INTEGER DEFAULT -1,
  monthly_file_uploads INTEGER DEFAULT -1,
  custom_limits JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_usage_limits_user_id 
  ON usage_limits(user_id);

-- Comments
COMMENT ON TABLE usage_limits IS 'Custom usage limits per user (-1 = unlimited)';
COMMENT ON COLUMN usage_limits.daily_messages IS 'Daily message limit (-1 for unlimited)';
COMMENT ON COLUMN usage_limits.monthly_messages IS 'Monthly message limit (-1 for unlimited)';
COMMENT ON COLUMN usage_limits.daily_ai_queries IS 'Daily AI query limit (-1 for unlimited)';
COMMENT ON COLUMN usage_limits.monthly_ai_queries IS 'Monthly AI query limit (-1 for unlimited)';

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

-- Analytics Events Policies
-- Users can only view their own analytics
CREATE POLICY "Users can view own analytics"
  ON analytics_events FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service role can insert analytics (edge functions)
CREATE POLICY "Service can insert analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- Service can view all analytics (for reporting)
CREATE POLICY "Service can view all analytics"
  ON analytics_events FOR ALL
  USING (true);

-- User Profiles Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service can manage all profiles
CREATE POLICY "Service can manage profiles"
  ON user_profiles FOR ALL
  USING (true);

-- Usage Limits Policies
-- Users can view their own limits
CREATE POLICY "Users can view own limits"
  ON usage_limits FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service can manage all limits
CREATE POLICY "Service can manage limits"
  ON usage_limits FOR ALL
  USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for usage_limits
CREATE TRIGGER update_usage_limits_updated_at
  BEFORE UPDATE ON usage_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default user profile for existing users (optional)
-- Uncomment and run if you have existing users
-- INSERT INTO user_profiles (user_id, tier)
-- SELECT DISTINCT user_id, 'free'
-- FROM notes  -- or your main user table
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- VIEWS FOR ANALYTICS DASHBOARD
-- ============================================

-- Daily usage summary view
CREATE OR REPLACE VIEW daily_usage_summary AS
SELECT 
  user_id,
  event_date,
  event_type,
  COUNT(*) as event_count
FROM analytics_events
GROUP BY user_id, event_date, event_type
ORDER BY event_date DESC;

-- Monthly usage summary view
CREATE OR REPLACE VIEW monthly_usage_summary AS
SELECT 
  user_id,
  event_month,
  event_type,
  COUNT(*) as event_count
FROM analytics_events
GROUP BY user_id, event_month, event_type
ORDER BY event_month DESC;

-- User activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
  user_id,
  COUNT(DISTINCT event_date) as active_days,
  COUNT(*) as total_events,
  MAX(created_at) as last_activity,
  ARRAY_AGG(DISTINCT event_type) as event_types
FROM analytics_events
GROUP BY user_id
ORDER BY last_activity DESC;

-- ============================================
-- CLEANUP FUNCTION (Optional)
-- ============================================
-- Function to clean up old analytics data (keep last 90 days)
-- Can be called periodically via cron or edge function

CREATE OR REPLACE FUNCTION cleanup_old_analytics(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM analytics_events
  WHERE event_date < (CURRENT_DATE - retention_days);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT ON analytics_events TO authenticated;
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON usage_limits TO authenticated;

-- Grant permissions to service role
GRANT ALL ON analytics_events TO service_role;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON usage_limits TO service_role;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify setup

-- Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('analytics_events', 'user_profiles', 'usage_limits');

-- Check indexes
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE tablename IN ('analytics_events', 'user_profiles', 'usage_limits');

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE tablename IN ('analytics_events', 'user_profiles', 'usage_limits');
