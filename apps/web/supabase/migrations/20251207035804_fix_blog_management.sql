alter table "public"."blog_posts" add column "is_hot_topic" boolean default false;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_featured_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.is_featured = true THEN
    UPDATE public.blog_posts
    SET is_featured = false
    WHERE id != NEW.id AND is_featured = true;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE TRIGGER on_featured_post_change BEFORE INSERT OR UPDATE OF is_featured ON public.blog_posts FOR EACH ROW WHEN ((new.is_featured = true)) EXECUTE FUNCTION public.handle_featured_post();


