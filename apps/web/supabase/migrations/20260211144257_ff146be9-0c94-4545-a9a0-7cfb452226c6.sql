
-- Harden increment_view_count to only work on published, non-hidden posts
CREATE OR REPLACE FUNCTION public.increment_view_count(post_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id
    AND status = 'published'
    AND is_hidden = false;
$$;
