-- Fix increment_view_count function - add SET search_path
CREATE OR REPLACE FUNCTION public.increment_view_count(post_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $function$
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
$function$;

-- Fix handle_featured_post function - add SET search_path
CREATE OR REPLACE FUNCTION public.handle_featured_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_featured = true THEN
    UPDATE public.blog_posts
    SET is_featured = false
    WHERE id != NEW.id AND is_featured = true;
  END IF;
  RETURN NEW;
END;
$function$;