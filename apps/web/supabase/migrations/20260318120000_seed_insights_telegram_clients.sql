-- Telegram deep-insights recipients as customers (Mission Control Clients + ingest run metadata)
-- Safe to re-run: only inserts when telegram_id is missing.

ALTER TABLE public.customers ALTER COLUMN user_id DROP NOT NULL;

INSERT INTO public.customers (telegram_id, first_name, business_name, client_status)
SELECT 8216104620::bigint, 'Juss', 'Juss', 'active_client'::public.client_status
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE telegram_id = 8216104620);

INSERT INTO public.customers (telegram_id, first_name, business_name, client_status)
SELECT 8697293004::bigint, 'Jocelyn', 'JahKnowsPR', 'active_client'::public.client_status
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE telegram_id = 8697293004);
