-- Public blog reads: only after publishing calendar date (US Eastern) and published + not hidden.
-- Dashboard staff (user_roles) can still SELECT all rows for editing.

DROP POLICY IF EXISTS "Allow public read access to blog posts" ON public.blog_posts;

CREATE POLICY "Blog posts readable when scheduled live or dashboard staff"
ON public.blog_posts
FOR SELECT
TO public
USING (
  (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
    )
  )
  OR (
    COALESCE(status, 'published') = 'published'
    AND COALESCE(is_hidden, false) = false
    AND published_date IS NOT NULL
    AND published_date <= (timezone('America/New_York', now()))::date
  )
);

-- View counts only for posts that are actually public per schedule
CREATE OR REPLACE FUNCTION public.increment_view_count(post_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id
    AND COALESCE(status, 'published') = 'published'
    AND COALESCE(is_hidden, false) = false
    AND published_date IS NOT NULL
    AND published_date <= (timezone('America/New_York', now()))::date;
$$;
