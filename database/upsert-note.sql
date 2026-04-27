CREATE OR REPLACE FUNCTION public.upsert_note(
  p_id uuid,
  p_user_id text,
  p_title text,
  p_content text,
  p_slug text,
  p_created_at timestamptz,
  p_updated_at timestamptz
)
RETURNS public.notes
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_note public.notes;
BEGIN
  INSERT INTO public.notes (
    id,
    user_id,
    title,
    content,
    slug,
    created_at,
    updated_at
  )
  VALUES (
    p_id,
    p_user_id,
    p_title,
    p_content,
    p_slug,
    p_created_at,
    p_updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    slug = EXCLUDED.slug,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_note;

  RETURN v_note;
END;
$function$;
