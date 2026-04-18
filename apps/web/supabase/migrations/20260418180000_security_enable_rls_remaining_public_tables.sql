-- Security: align with Supabase Security Advisor (rls_disabled_in_public).
-- Enables RLS on any public heap table that still has relrowsecurity = false.
--
-- After deploy, re-check Dashboard → Database → Security Advisor.
-- If the app loses access for anon/authenticated on a table, add explicit policies
-- (SELECT/INSERT/UPDATE as needed); service_role continues to bypass RLS for server-side use.
--
-- To audit manually in SQL Editor before/after:
--   SELECT c.relname
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
--   ORDER BY 1;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS t
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
      AND c.relname NOT LIKE 'pg\_%' ESCAPE '\'
      AND c.relname NOT IN (
        'spatial_ref_sys',
        'geography_columns',
        'geometry_columns',
        'raster_columns',
        'raster_overviews'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.t);
    RAISE NOTICE 'security: enabled RLS on public.%', r.t;
  END LOOP;
END $$;
