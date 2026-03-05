
alter table "public"."blog_posts" drop column "view_count";

create policy "Allow anonymous update"
on "public"."subscribers"
as permissive
for update
to public
using (true)
with check (true);



