-- Drop the problematic trigger and function
-- Profile creation is now handled by the frontend during signup

-- Drop trigger first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
END $$;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
