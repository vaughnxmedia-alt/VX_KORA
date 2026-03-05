-- Add is_hidden column to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false;