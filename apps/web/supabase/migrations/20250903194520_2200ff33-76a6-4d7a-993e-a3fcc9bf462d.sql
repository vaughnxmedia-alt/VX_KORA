-- Fix function search path issues for security
CREATE OR REPLACE FUNCTION public.increment_blog_post_views(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts 
  SET view_count = view_count + 1 
  WHERE id = post_id;
END;
$$;

-- Update existing functions to have proper search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;