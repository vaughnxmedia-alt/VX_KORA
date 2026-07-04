-- Cover image for "Website Basics for New Businesses" (The Brief)
UPDATE public.blog_posts
SET
  cover_image_url = 'https://cjgqicpuwbflypcnhuak.supabase.co/storage/v1/object/public/blog-images/covers/1783205660418-462673website-basics.png',
  updated_at = now()
WHERE slug = 'website-basics-for-new-businesses'
  AND (cover_image_url IS NULL OR cover_image_url = '');
