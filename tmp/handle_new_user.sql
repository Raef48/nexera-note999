-- Simple function to auto-create profile on user signup
-- Compatible with InsForge auth system

-- Drop existing function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create minimal function that only uses guaranteed fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert basic profile using only email (always available)
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id::text,
    split_part(NEW.email, '@', 1),  -- Use email username as default name
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
