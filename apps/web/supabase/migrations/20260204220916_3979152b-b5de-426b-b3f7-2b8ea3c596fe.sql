-- Add new columns to blog_posts table for CMS functionality
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS excerpt TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS gallery_image_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS video_type TEXT CHECK (video_type IN ('embed', 'upload', NULL));

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);

-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for blog videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-videos', 'blog-videos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for blog-images bucket
CREATE POLICY "Public can view blog images"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated users can upload blog images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authors and admins can update blog images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-images' 
  AND get_user_role(auth.uid()) IN ('author', 'admin')
);

CREATE POLICY "Authors and admins can delete blog images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-images' 
  AND get_user_role(auth.uid()) IN ('author', 'admin')
);

-- RLS policies for blog-videos bucket
CREATE POLICY "Public can view blog videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-videos');

CREATE POLICY "Authenticated users can upload blog videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-videos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authors and admins can update blog videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-videos' 
  AND get_user_role(auth.uid()) IN ('author', 'admin')
);

CREATE POLICY "Authors and admins can delete blog videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-videos' 
  AND get_user_role(auth.uid()) IN ('author', 'admin')
);