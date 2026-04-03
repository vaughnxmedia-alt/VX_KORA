-- Scheduled publish instant (US Eastern wall time stored as timestamptz).
-- When set, public visibility uses publish_scheduled_at <= now().
-- When null, fall back to legacy published_date <= today (America/New_York).

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS publish_scheduled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.blog_posts.publish_scheduled_at IS
  'When the post becomes publicly visible (interpreted from Eastern date+time in the CMS).';

-- Backfill: start of each published_date in America/New_York
UPDATE public.blog_posts
SET publish_scheduled_at = (
  (published_date::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/New_York'
)
WHERE published_date IS NOT NULL
  AND publish_scheduled_at IS NULL;

DROP POLICY IF EXISTS "Blog posts readable when scheduled live or dashboard staff" ON public.blog_posts;

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
    AND (
      (publish_scheduled_at IS NOT NULL AND publish_scheduled_at <= now())
      OR (
        publish_scheduled_at IS NULL
        AND published_date <= (timezone('America/New_York', now()))::date
      )
    )
  )
);

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
    AND (
      (publish_scheduled_at IS NOT NULL AND publish_scheduled_at <= now())
      OR (
        publish_scheduled_at IS NULL
        AND published_date <= (timezone('America/New_York', now()))::date
      )
    );
$$;
