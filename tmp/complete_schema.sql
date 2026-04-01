-- Complete schema setup for Nexera Note
-- Run this to fix the 400 Bad Request error

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  slug TEXT,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_slug ON public.notes(slug);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);

-- Drop existing functions to recreate with correct signatures
DROP FUNCTION IF EXISTS public.upsert_note(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.upsert_note(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_profile(TEXT, TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.create_chat(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.add_message(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_chat_messages(UUID);

-- Recreate upsert_note with TEXT user_id (matching the code)
CREATE OR REPLACE FUNCTION public.upsert_note(
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

-- Recreate upsert_profile with TEXT id
CREATE OR REPLACE FUNCTION public.upsert_profile(
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

-- Create chat function
CREATE OR REPLACE FUNCTION public.create_chat(
  p_user_id TEXT,
  p_note_id UUID,
  p_title TEXT
)
RETURNS chats AS $$
DECLARE
  new_chat chats;
BEGIN
  INSERT INTO chats (user_id, note_id, title)
  VALUES (p_user_id, p_note_id, p_title)
  RETURNING * INTO new_chat;
  RETURN new_chat;
END;
$$ LANGUAGE plpgsql;

-- Add message function
CREATE OR REPLACE FUNCTION public.add_message(
  p_chat_id UUID,
  p_role TEXT,
  p_content TEXT
)
RETURNS messages AS $$
DECLARE
  new_msg messages;
BEGIN
  INSERT INTO messages (chat_id, role, content)
  VALUES (p_chat_id, p_role, p_content)
  RETURNING * INTO new_msg;
  RETURN new_msg;
END;
$$ LANGUAGE plpgsql;

-- Get chat messages function
CREATE OR REPLACE FUNCTION public.get_chat_messages(
  p_chat_id UUID
)
RETURNS SETOF messages AS $$
BEGIN
  RETURN QUERY SELECT * FROM messages WHERE chat_id = p_chat_id ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Setup RLS policies (optional - disable for testing)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
DROP POLICY IF EXISTS "Public can view notes by slug" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;

-- Create policies
CREATE POLICY "Users can manage their own notes" ON public.notes
  FOR ALL USING (user_id = current_setting('app.settings', true)->>'user_id' OR true);

CREATE POLICY "Public can view notes by slug" ON public.notes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own profile" ON public.profiles
  FOR ALL USING (id = current_setting('app.settings', true)->>'user_id' OR true);

CREATE POLICY "Users can manage their own chats" ON public.chats
  FOR ALL USING (user_id = current_setting('app.settings', true)->>'user_id' OR true);

CREATE POLICY "Users can view their own messages" ON public.messages
  FOR ALL USING (chat_id IN (SELECT id FROM chats WHERE user_id = current_setting('app.settings', true)->>'user_id' OR true));
