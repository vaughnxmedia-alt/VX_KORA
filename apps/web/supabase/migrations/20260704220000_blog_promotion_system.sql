-- Separate publication status from promotional tags for The Brief

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'scheduled', 'live', 'archived')),
  ADD COLUMN IF NOT EXISTS promo_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_editors_pick BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_trending BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_homepage_shuffle BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_priority SMALLINT
    CHECK (feature_priority IS NULL OR (feature_priority >= 1 AND feature_priority <= 3));

ALTER TABLE public.blog_categories
  ADD COLUMN IF NOT EXISTS featured_insights_eligible BOOLEAN NOT NULL DEFAULT false;

-- Backfill publication_status from legacy fields
UPDATE public.blog_posts
SET publication_status = 'archived'
WHERE is_hidden = true;

UPDATE public.blog_posts
SET publication_status = 'draft'
WHERE is_hidden = false
  AND COALESCE(status, 'draft') = 'draft';

UPDATE public.blog_posts
SET publication_status = 'scheduled'
WHERE is_hidden = false
  AND COALESCE(status, 'published') = 'published'
  AND publish_scheduled_at IS NOT NULL
  AND publish_scheduled_at > now();

UPDATE public.blog_posts
SET publication_status = 'live'
WHERE is_hidden = false
  AND COALESCE(status, 'published') = 'published'
  AND publication_status = 'draft';

-- Backfill promotion tags from legacy flags
UPDATE public.blog_posts
SET promo_featured = COALESCE(is_featured, false),
    promo_trending = COALESCE(is_hot_topic, false);

-- Keep legacy columns in sync for older code paths
UPDATE public.blog_posts
SET is_featured = promo_featured,
    is_hot_topic = promo_trending;

-- Only one Editor's Pick at a time (homepage hero)
CREATE OR REPLACE FUNCTION public.handle_editors_pick_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.promo_editors_pick = true THEN
    UPDATE public.blog_posts
    SET promo_editors_pick = false
    WHERE id IS DISTINCT FROM NEW.id
      AND promo_editors_pick = true;
  END IF;
  NEW.is_featured := NEW.promo_featured;
  NEW.is_hot_topic := NEW.promo_trending;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_blog_post_featured ON public.blog_posts;
DROP TRIGGER IF EXISTS on_blog_post_editors_pick ON public.blog_posts;

CREATE TRIGGER on_blog_post_editors_pick
BEFORE INSERT OR UPDATE OF promo_editors_pick, promo_featured, promo_trending ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.handle_editors_pick_post();

-- Featured Insights homepage slots (admin-managed categories)
INSERT INTO public.blog_categories (name, slug, display_order, is_active, featured_insights_eligible)
VALUES
  ('Strategy', 'strategy', 15, true, true),
  ('Public Relations', 'public-relations', 30, true, true),
  ('The PR Perspective', 'the-pr-perspective', 35, true, true),
  ('Case Studies', 'case-studies', 40, true, true),
  ('Guides', 'guides', 45, true, true)
ON CONFLICT (name) DO UPDATE
SET featured_insights_eligible = true,
    is_active = EXCLUDED.is_active;

UPDATE public.blog_categories
SET featured_insights_eligible = true
WHERE name IN (
  'Strategy',
  'Public Relations',
  'The PR Perspective',
  'Case Studies',
  'Guides'
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_publication_status
  ON public.blog_posts (publication_status);

CREATE INDEX IF NOT EXISTS idx_blog_posts_promo_homepage_shuffle
  ON public.blog_posts (promo_homepage_shuffle)
  WHERE promo_homepage_shuffle = true;

CREATE INDEX IF NOT EXISTS idx_blog_categories_featured_insights
  ON public.blog_categories (display_order, name)
  WHERE featured_insights_eligible = true AND is_active = true;

COMMENT ON COLUMN public.blog_posts.publication_status IS 'Draft, scheduled, live, or archived — separate from promotion tags.';
COMMENT ON COLUMN public.blog_posts.feature_priority IS 'Homepage promotion priority 1 (highest) through 3.';
COMMENT ON COLUMN public.blog_categories.featured_insights_eligible IS 'When true, The Brief homepage may show one Featured Insights card for this category.';
