drop policy "Allow public to increment blog post views" on "public"."blog_posts";

drop policy "Public profiles are viewable by everyone." on "public"."profiles";

drop policy "Users can update own profile." on "public"."profiles";

drop policy "Allow admins to delete any blog post" on "public"."blog_posts";

drop policy "Allow admins to update any blog post" on "public"."blog_posts";

drop policy "Allow authors to delete their own blog posts" on "public"."blog_posts";

drop policy "Allow authors to insert blog posts" on "public"."blog_posts";

drop policy "Allow authors to update their own blog posts" on "public"."blog_posts";

drop policy "Admins can update any profile." on "public"."profiles";

drop function if exists "public"."increment_blog_post_views"(post_id uuid);


create table "public"."user_roles" (
  "user_id" uuid not null,
  "role" public.user_role not null
);


alter table "public"."user_roles" enable row level security;

alter table "public"."customers" alter column "user_id" set not null;

alter table "public"."profiles" drop column "role";

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (user_id);

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role_name text;
BEGIN
  SELECT role::text INTO user_role_name
  FROM public.user_roles
  WHERE user_id = p_user_id;
  RETURN user_role_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_view_count(post_id uuid)
 RETURNS void
 LANGUAGE sql
AS $function$
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'client');
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$
;

grant delete on table "public"."user_roles" to "anon";

grant insert on table "public"."user_roles" to "anon";

grant references on table "public"."user_roles" to "anon";

grant select on table "public"."user_roles" to "anon";

grant trigger on table "public"."user_roles" to "anon";

grant truncate on table "public"."user_roles" to "anon";

grant update on table "public"."user_roles" to "anon";

grant delete on table "public"."user_roles" to "authenticated";

grant insert on table "public"."user_roles" to "authenticated";

grant references on table "public"."user_roles" to "authenticated";

grant select on table "public"."user_roles" to "authenticated";

grant trigger on table "public"."user_roles" to "authenticated";

grant truncate on table "public"."user_roles" to "authenticated";

grant update on table "public"."user_roles" to "authenticated";

grant delete on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "service_role";

grant references on table "public"."user_roles" to "service_role";

grant select on table "public"."user_roles" to "service_role";

grant trigger on table "public"."user_roles" to "service_role";

grant truncate on table "public"."user_roles" to "service_role";

grant update on table "public"."user_roles" to "service_role";


create policy "Profiles are viewable by owner and admins."
  on "public"."profiles"
  as permissive
  for select
  to public
using (((auth.uid() = id) OR (public.get_user_role(auth.uid()) = 'admin'::text)));



create policy "Users can update their own profile."
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



create policy "Allow admins full access to subscribers"
  on "public"."subscribers"
  as permissive
  for all
  to public
using ((public.get_user_role(auth.uid()) = 'admin'::text))
with check ((public.get_user_role(auth.uid()) = 'admin'::text));



create policy "Allow admin users to manage user roles"
  on "public"."user_roles"
  as permissive
  for all
  to public
using ((( SELECT public.get_user_role(auth.uid()) AS get_user_role) = 'admin'::text))
with check ((( SELECT public.get_user_role(auth.uid()) AS get_user_role) = 'admin'::text));



create policy "Allow users to view their own roles"
  on "public"."user_roles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



create policy "Allow admins to delete any blog post"
  on "public"."blog_posts"
  as permissive
  for delete
  to public
using ((public.get_user_role(auth.uid()) = 'admin'::text));



create policy "Allow admins to update any blog post"
  on "public"."blog_posts"
  as permissive
  for update
  to public
using ((public.get_user_role(auth.uid()) = 'admin'::text));



create policy "Allow authors to delete their own blog posts"
  on "public"."blog_posts"
  as permissive
  for delete
  to public
using (((auth.uid() = author_id) AND (public.get_user_role(auth.uid()) = ANY (ARRAY['author'::text, 'admin'::text]))));



create policy "Allow authors to insert blog posts"
  on "public"."blog_posts"
  as permissive
  for insert
  to public
with check ((public.get_user_role(auth.uid()) = ANY (ARRAY['author'::text, 'admin'::text])));



create policy "Allow authors to update their own blog posts"
  on "public"."blog_posts"
  as permissive
  for update
  to public
using (((auth.uid() = author_id) AND (public.get_user_role(auth.uid()) = ANY (ARRAY['author'::text, 'admin'::text]))))
with check ((auth.uid() = author_id));



create policy "Admins can update any profile."
  on "public"."profiles"
  as permissive
  for update
  to public
using ((public.get_user_role(auth.uid()) = 'admin'::text));



