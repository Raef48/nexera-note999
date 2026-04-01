ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;
ALTER TABLE public.notes ALTER COLUMN user_id TYPE TEXT USING user_id::text;

CREATE OR REPLACE FUNCTION public.upsert_note (
  p_id UUID,
  p_user_id TEXT,
  p_title TEXT,
  p_content TEXT,
  p_slug TEXT,
  p_created_at TIMESTAMPTZ,
  p_updated_at TIMESTAMPTZ
)
RETURNS public.notes AS $$
DECLARE
  v_note public.notes;
BEGIN
  INSERT INTO public.notes (id, user_id, title, content, slug, created_at, updated_at)
  VALUES (p_id, p_user_id, p_title, p_content, p_slug, p_created_at, p_updated_at)
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    slug = EXCLUDED.slug,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_note;

  RETURN v_note;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.upsert_profile (
  p_id TEXT,
  p_full_name TEXT,
  p_avatar_url TEXT,
  p_updated_at TIMESTAMPTZ
)
RETURNS public.profiles AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
  VALUES (p_id, p_full_name, p_avatar_url, p_updated_at)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
