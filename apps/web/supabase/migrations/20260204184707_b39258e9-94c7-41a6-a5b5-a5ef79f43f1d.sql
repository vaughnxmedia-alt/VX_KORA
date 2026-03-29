-- Add social_media_links column as JSONB array to store multiple links
ALTER TABLE public.customers 
ADD COLUMN social_media_links JSONB DEFAULT '[]'::jsonb;

-- Rename website_or_social to website for clarity
ALTER TABLE public.customers 
RENAME COLUMN website_or_social TO website;