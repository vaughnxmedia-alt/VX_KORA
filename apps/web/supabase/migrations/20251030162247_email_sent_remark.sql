create table "public"."subscribers" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "email_sent" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."subscribers" enable row level security;

CREATE UNIQUE INDEX subscribers_email_key ON public.subscribers USING btree (email);

CREATE UNIQUE INDEX subscribers_pkey ON public.subscribers USING btree (id);

alter table "public"."subscribers" add constraint "subscribers_pkey" PRIMARY KEY using index "subscribers_pkey";

alter table "public"."subscribers" add constraint "subscribers_email_key" UNIQUE using index "subscribers_email_key";

grant delete on table "public"."subscribers" to "anon";

grant insert on table "public"."subscribers" to "anon";

grant references on table "public"."subscribers" to "anon";

grant select on table "public"."subscribers" to "anon";

grant trigger on table "public"."subscribers" to "anon";

grant truncate on table "public"."subscribers" to "anon";

grant update on table "public"."subscribers" to "anon";

grant delete on table "public"."subscribers" to "authenticated";

grant insert on table "public"."subscribers" to "authenticated";

grant references on table "public"."subscribers" to "authenticated";

grant select on table "public"."subscribers" to "authenticated";

grant trigger on table "public"."subscribers" to "authenticated";

grant truncate on table "public"."subscribers" to "authenticated";

grant update on table "public"."subscribers" to "authenticated";

grant delete on table "public"."subscribers" to "service_role";

grant insert on table "public"."subscribers" to "service_role";

grant references on table "public"."subscribers" to "service_role";

grant select on table "public"."subscribers" to "service_role";

grant trigger on table "public"."subscribers" to "service_role";

grant truncate on table "public"."subscribers" to "service_role";

grant update on table "public"."subscribers" to "service_role";

create policy "Allow all updates"
on "public"."subscribers"
as permissive
for update
to public
using (true);


create policy "Allow public insert"
on "public"."subscribers"
as permissive
for insert
to public
with check (true);



