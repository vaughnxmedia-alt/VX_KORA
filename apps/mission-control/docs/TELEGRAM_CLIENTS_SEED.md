# Telegram clients in Mission Control

Deep insights go to Telegram users defined in `send-deep-insights.ts`. Those people appear under **Clients** when they exist in Supabase `customers` with matching `telegram_id`.

## Automatic seed (recommended)

Apply migration `20260318120000_seed_insights_telegram_clients.sql` (included in `apps/web/supabase/migrations`). It inserts **Juss** (`8216104620`) and **Jocelyn** (`8697293004`) if not already present.

```bash
# From repo root, if you use Supabase CLI
supabase db push
```

## Manual SQL (Supabase SQL editor)

```sql
ALTER TABLE public.customers ALTER COLUMN user_id DROP NOT NULL;

INSERT INTO public.customers (telegram_id, first_name, business_name, client_status)
SELECT 8216104620::bigint, 'Juss', 'Juss', 'active_client'::public.client_status
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE telegram_id = 8216104620);

INSERT INTO public.customers (telegram_id, first_name, business_name, client_status)
SELECT 8697293004::bigint, 'Jocelyn', 'JahKnowsPR', 'active_client'::public.client_status
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE telegram_id = 8697293004);
```

## Link to portal login instead

If the person already has an `auth.users` row, use `link_telegram_to_auth_user(telegram_id, email, business_name)` (see migration `20260306600000_link_telegram_accounts.sql`) so `user_id` is set and the main site stays in sync.

## Who gets deep insights

**Trigger Run** (and `npm run send-insights`) now loads recipients from the database: every **customer** with a non-null `telegram_id` gets the insight run. So when you add a new user (e.g. run the seed SQL for a new Telegram ID or create a customer and set `telegram_id`), they are included automatically on the next run. Optional: add a row in `intel_content_preferences` for that customer (with `tenant_id` = customer `id`) to set focus topics and platforms; otherwise defaults are used.

## Ingest runs

After a **Trigger Run**, refresh **Ingest Runs**. Rows in `kora_ingest_runs` are written by `send-deep-insights`; client names resolve once `customers.telegram_id` matches.

## Mission Control role `author`

Authors previously could not `SELECT` every `customers` row (seeded telegram rows use `user_id` NULL), so names like **JahKnowsPR** did not appear in **All Clients**. Apply migration `20260415130000_mission_control_author_read.sql` (then `supabase db push` or run it in the SQL editor) so **author** users can read the full customer list and ingest run history read-only.
