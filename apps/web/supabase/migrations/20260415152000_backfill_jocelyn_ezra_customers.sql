-- Backfill known portal users into public.customers for Mission Control visibility.
-- Safe to re-run: updates matching rows, then inserts only when still missing.

-- Ezra Brown
UPDATE public.customers
SET
  first_name = COALESCE(first_name, 'Ezra'),
  last_name = COALESCE(last_name, 'Brown'),
  email = COALESCE(email, 'birdshotthis@gmail.com'),
  phone_number = COALESCE(phone_number, '4092457445'),
  business_name = COALESCE(business_name, 'Birdshotthis'),
  client_status = COALESCE(client_status, 'active_client'::public.client_status)
WHERE lower(COALESCE(email, '')) = 'birdshotthis@gmail.com'
   OR (lower(COALESCE(first_name, '')) = 'ezra' AND lower(COALESCE(last_name, '')) = 'brown');

INSERT INTO public.customers (
  first_name,
  last_name,
  email,
  phone_number,
  business_name,
  client_status
)
SELECT
  'Ezra',
  'Brown',
  'birdshotthis@gmail.com',
  '4092457445',
  'Birdshotthis',
  'active_client'::public.client_status
WHERE NOT EXISTS (
  SELECT 1
  FROM public.customers
  WHERE lower(COALESCE(email, '')) = 'birdshotthis@gmail.com'
     OR (lower(COALESCE(first_name, '')) = 'ezra' AND lower(COALESCE(last_name, '')) = 'brown')
);

-- Jocelyn Caviness
UPDATE public.customers
SET
  first_name = COALESCE(first_name, 'Jocelyn'),
  last_name = COALESCE(last_name, 'Caviness'),
  business_name = COALESCE(business_name, 'JahKnowsPR'),
  client_status = COALESCE(client_status, 'active_client'::public.client_status)
WHERE (lower(COALESCE(first_name, '')) = 'jocelyn' AND lower(COALESCE(last_name, '')) = 'caviness')
   OR lower(COALESCE(email, '')) = 'jocelyncavinessbrigman@gmail.com';

INSERT INTO public.customers (
  first_name,
  last_name,
  email,
  business_name,
  client_status
)
SELECT
  'Jocelyn',
  'Caviness',
  'jocelyncavinessbrigman@gmail.com',
  'JahKnowsPR',
  'active_client'::public.client_status
WHERE NOT EXISTS (
  SELECT 1
  FROM public.customers
  WHERE (lower(COALESCE(first_name, '')) = 'jocelyn' AND lower(COALESCE(last_name, '')) = 'caviness')
     OR lower(COALESCE(email, '')) = 'jocelyncavinessbrigman@gmail.com'
);
