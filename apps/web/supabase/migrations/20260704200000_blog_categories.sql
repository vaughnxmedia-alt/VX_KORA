-- Admin-managed blog categories for The Brief

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT blog_categories_name_unique UNIQUE (name),
  CONSTRAINT blog_categories_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_categories_display_order
  ON public.blog_categories (display_order ASC, name ASC);

CREATE INDEX IF NOT EXISTS idx_blog_categories_active
  ON public.blog_categories (is_active)
  WHERE is_active = true;

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY blog_categories_public_read_active
ON public.blog_categories
FOR SELECT
USING (is_active = true);

CREATE POLICY blog_categories_admin_read_all
ON public.blog_categories
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY blog_categories_admin_insert
ON public.blog_categories
FOR INSERT
TO authenticated
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY blog_categories_admin_update
ON public.blog_categories
FOR UPDATE
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin')
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY blog_categories_admin_delete
ON public.blog_categories
FOR DELETE
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE TRIGGER update_blog_categories_updated_at
BEFORE UPDATE ON public.blog_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed from existing post categories (with legacy renames applied)
WITH raw AS (
  SELECT DISTINCT trim(category) AS cat
  FROM public.blog_posts
  WHERE category IS NOT NULL AND trim(category) <> ''
),
normalized AS (
  SELECT DISTINCT CASE cat
    WHEN 'Brand Authority' THEN 'Visionary Highlight'
    WHEN 'Educational Frameworks' THEN 'Educational Series'
    ELSE cat
  END AS name
  FROM raw
),
numbered AS (
  SELECT
    name,
    lower(
      regexp_replace(
        regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'),
        '(^-|-$)',
        '',
        'g'
      )
    ) AS slug,
    row_number() OVER (ORDER BY name) * 10 AS display_order,
    CASE
      WHEN name IN (
        'Profile',
        'Start a Business in any State',
        'The Making of a Brand',
        'Visionary Highlight'
      ) THEN false
      ELSE true
    END AS is_active
  FROM normalized
)
INSERT INTO public.blog_categories (name, slug, display_order, is_active)
SELECT name, slug, display_order, is_active
FROM numbered
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.blog_categories (name, slug, display_order, is_active)
VALUES ('Uncategorized', 'uncategorized', 9999, true)
ON CONFLICT (name) DO NOTHING;

-- Ensure common Brief filters exist even if no posts yet
INSERT INTO public.blog_categories (name, slug, display_order, is_active)
VALUES
  ('Client Highlights', 'client-highlights', 10, true),
  ('Educational Series', 'educational-series', 20, true),
  ('Public Relations', 'public-relations', 30, true)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.blog_categories IS 'Admin-managed categories for The Brief blog posts. Posts store category by name in blog_posts.category.';
