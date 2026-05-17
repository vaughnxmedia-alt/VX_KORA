-- Rename public Brief categories to clearer section labels.
UPDATE public.blog_posts
SET category = 'Visionary Highlight',
    updated_at = now()
WHERE category = 'Brand Authority';

UPDATE public.blog_posts
SET category = 'Educational Series',
    updated_at = now()
WHERE category = 'Educational Frameworks';

UPDATE public.blog_posts
SET category = 'The Making of a Brand',
    updated_at = now()
WHERE category = 'Brand Foundation';
