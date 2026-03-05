alter table "public"."brand_blueprints" add column "payment_amount" numeric(10,2);

alter table "public"."brand_blueprints" add column "payment_date" timestamp with time zone;

alter table "public"."brand_blueprints" add column "payment_method" text;

alter table "public"."brand_blueprints" add column "payment_reference" text;

alter table "public"."brand_blueprints" add column "payment_status" text default 'pending'::text;

CREATE INDEX idx_brand_blueprints_payment_status ON public.brand_blueprints USING btree (payment_status);


