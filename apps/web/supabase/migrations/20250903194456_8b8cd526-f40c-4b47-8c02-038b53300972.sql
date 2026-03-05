-- Add view_count column to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN view_count integer NOT NULL DEFAULT 0;

-- Create function to increment view count
CREATE OR REPLACE FUNCTION public.increment_blog_post_views(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.blog_posts 
  SET view_count = view_count + 1 
  WHERE id = post_id;
END;
$$;

-- Create RLS policy to allow public access to increment views
CREATE POLICY "Allow public to increment blog post views" 
ON public.blog_posts 
FOR UPDATE 
USING (true) 
WITH CHECK (true);