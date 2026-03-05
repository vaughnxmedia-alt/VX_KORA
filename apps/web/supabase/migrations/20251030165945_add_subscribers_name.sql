drop policy "Allow all updates" on "public"."subscribers";

drop policy "Allow anonymous update" on "public"."subscribers";

drop policy "Allow public insert" on "public"."subscribers";

alter table "public"."blog_posts" add column "view_count" integer not null default 0;

alter table "public"."subscribers" add column "name" text not null;


