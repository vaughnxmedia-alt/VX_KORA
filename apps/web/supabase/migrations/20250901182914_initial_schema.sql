create table "public"."brand_blueprints" (
    "id" uuid not null default gen_random_uuid(),
    "customer_id" uuid,
    "target_audience" text,
    "problem_statement" text,
    "brand_personality" text,
    "brand_gaps" text,
    "six_month_vision" text,
    "status" text default 'draft'::text,
    "created_at" timestamp with time zone default now(),
    "submitted_at" timestamp with time zone
);


alter table "public"."brand_blueprints" enable row level security;

create table "public"."customers" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "first_name" text,
    "last_name" text,
    "email" text,
    "phone_number" text,
    "business_name" text,
    "website_or_social" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."customers" enable row level security;

CREATE UNIQUE INDEX brand_blueprints_pkey ON public.brand_blueprints USING btree (id);

CREATE UNIQUE INDEX customers_email_key ON public.customers USING btree (email);

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

alter table "public"."brand_blueprints" add constraint "brand_blueprints_pkey" PRIMARY KEY using index "brand_blueprints_pkey";

alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."brand_blueprints" add constraint "brand_blueprints_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE not valid;

alter table "public"."brand_blueprints" validate constraint "brand_blueprints_customer_id_fkey";

alter table "public"."customers" add constraint "customers_email_key" UNIQUE using index "customers_email_key";

alter table "public"."customers" add constraint "customers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."customers" validate constraint "customers_user_id_fkey";

grant delete on table "public"."brand_blueprints" to "anon";

grant insert on table "public"."brand_blueprints" to "anon";

grant references on table "public"."brand_blueprints" to "anon";

grant select on table "public"."brand_blueprints" to "anon";

grant trigger on table "public"."brand_blueprints" to "anon";

grant truncate on table "public"."brand_blueprints" to "anon";

grant update on table "public"."brand_blueprints" to "anon";

grant delete on table "public"."brand_blueprints" to "authenticated";

grant insert on table "public"."brand_blueprints" to "authenticated";

grant references on table "public"."brand_blueprints" to "authenticated";

grant select on table "public"."brand_blueprints" to "authenticated";

grant trigger on table "public"."brand_blueprints" to "authenticated";

grant truncate on table "public"."brand_blueprints" to "authenticated";

grant update on table "public"."brand_blueprints" to "authenticated";

grant delete on table "public"."brand_blueprints" to "service_role";

grant insert on table "public"."brand_blueprints" to "service_role";

grant references on table "public"."brand_blueprints" to "service_role";

grant select on table "public"."brand_blueprints" to "service_role";

grant trigger on table "public"."brand_blueprints" to "service_role";

grant truncate on table "public"."brand_blueprints" to "service_role";

grant update on table "public"."brand_blueprints" to "service_role";

grant delete on table "public"."customers" to "anon";

grant insert on table "public"."customers" to "anon";

grant references on table "public"."customers" to "anon";

grant select on table "public"."customers" to "anon";

grant trigger on table "public"."customers" to "anon";

grant truncate on table "public"."customers" to "anon";

grant update on table "public"."customers" to "anon";

grant delete on table "public"."customers" to "authenticated";

grant insert on table "public"."customers" to "authenticated";

grant references on table "public"."customers" to "authenticated";

grant select on table "public"."customers" to "authenticated";

grant trigger on table "public"."customers" to "authenticated";

grant truncate on table "public"."customers" to "authenticated";

grant update on table "public"."customers" to "authenticated";

grant delete on table "public"."customers" to "service_role";

grant insert on table "public"."customers" to "service_role";

grant references on table "public"."customers" to "service_role";

grant select on table "public"."customers" to "service_role";

grant trigger on table "public"."customers" to "service_role";

grant truncate on table "public"."customers" to "service_role";

grant update on table "public"."customers" to "service_role";

create policy "Users can manage their own brand blueprints"
on "public"."brand_blueprints"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM customers
  WHERE ((customers.id = brand_blueprints.customer_id) AND (customers.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM customers
  WHERE ((customers.id = brand_blueprints.customer_id) AND (customers.user_id = auth.uid())))));


create policy "Users can manage their own customer information"
on "public"."customers"
as permissive
for all
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



