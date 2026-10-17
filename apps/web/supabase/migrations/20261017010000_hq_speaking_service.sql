-- Allow speaking requests to be stored as HQ leads.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'hq_leads'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%interested_service%'
  LOOP
    EXECUTE format('ALTER TABLE public.hq_leads DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.hq_leads
  ADD CONSTRAINT hq_leads_interested_service_check
  CHECK (interested_service IN ('session', 'project', 'counsel', 'speaking', 'other'));

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'hq_clients'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%service%'
  LOOP
    EXECUTE format('ALTER TABLE public.hq_clients DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.hq_clients
  ADD CONSTRAINT hq_clients_service_check
  CHECK (service IS NULL OR service IN ('session', 'project', 'counsel', 'speaking', 'other'));
