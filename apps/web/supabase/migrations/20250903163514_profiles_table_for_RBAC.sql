create type "public"."user_role" as enum ('admin', 'author', 'client');

create table "public"."blog_posts" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone,
    "title" text not null,
    "tagline" text,
    "description" text,
    "content" text,
    "category" text,
    "read_time" text,
    "published_date" date,
    "author_name" text,
    "is_featured" boolean default false,
    "icon_name" text,
    "tags" text[],
    "video_url" text,
    "author_id" uuid
);


alter table "public"."blog_posts" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "updated_at" timestamp with time zone,
    "full_name" text,
    "avatar_url" text,
    "website" text,
    "role" user_role default 'client'::user_role
);


alter table "public"."profiles" enable row level security;

CREATE UNIQUE INDEX blog_posts_pkey ON public.blog_posts USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

alter table "public"."blog_posts" add constraint "blog_posts_pkey" PRIMARY KEY using index "blog_posts_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."blog_posts" add constraint "blog_posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."blog_posts" validate constraint "blog_posts_author_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$
;

grant delete on table "public"."blog_posts" to "anon";

grant insert on table "public"."blog_posts" to "anon";

grant references on table "public"."blog_posts" to "anon";

grant select on table "public"."blog_posts" to "anon";

grant trigger on table "public"."blog_posts" to "anon";

grant truncate on table "public"."blog_posts" to "anon";

grant update on table "public"."blog_posts" to "anon";

grant delete on table "public"."blog_posts" to "authenticated";

grant insert on table "public"."blog_posts" to "authenticated";

grant references on table "public"."blog_posts" to "authenticated";

grant select on table "public"."blog_posts" to "authenticated";

grant trigger on table "public"."blog_posts" to "authenticated";

grant truncate on table "public"."blog_posts" to "authenticated";

grant update on table "public"."blog_posts" to "authenticated";

grant delete on table "public"."blog_posts" to "service_role";

grant insert on table "public"."blog_posts" to "service_role";

grant references on table "public"."blog_posts" to "service_role";

grant select on table "public"."blog_posts" to "service_role";

grant trigger on table "public"."blog_posts" to "service_role";

grant truncate on table "public"."blog_posts" to "service_role";

grant update on table "public"."blog_posts" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

create policy "Allow admins to delete any blog post"
on "public"."blog_posts"
as permissive
for delete
to public
using ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::user_role));


create policy "Allow admins to update any blog post"
on "public"."blog_posts"
as permissive
for update
to public
using ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::user_role));


create policy "Allow authors to delete their own blog posts"
on "public"."blog_posts"
as permissive
for delete
to public
using (((auth.uid() = author_id) AND (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['author'::user_role, 'admin'::user_role]))));


create policy "Allow authors to insert blog posts"
on "public"."blog_posts"
as permissive
for insert
to public
with check ((( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['author'::user_role, 'admin'::user_role])));


create policy "Allow authors to update their own blog posts"
on "public"."blog_posts"
as permissive
for update
to public
using (((auth.uid() = author_id) AND (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['author'::user_role, 'admin'::user_role]))))
with check ((auth.uid() = author_id));


create policy "Allow public read access to blog posts"
on "public"."blog_posts"
as permissive
for select
to public
using (true);


create policy "Admins can update any profile."
on "public"."profiles"
as permissive
for update
to public
using ((( SELECT profiles_1.role
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid())) = 'admin'::user_role));


create policy "Public profiles are viewable by everyone."
on "public"."profiles"
as permissive
for select
to public
using (true);


create policy "Users can insert their own profile."
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can update own profile."
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


