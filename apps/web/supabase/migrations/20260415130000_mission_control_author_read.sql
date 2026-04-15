-- Mission Control: users with role `author` need the same read surface as admins for
-- customer pickers and ingest history. Seeded telegram customers (e.g. Jocelyn) have NULL user_id,
-- so the self-service policy "auth.uid() = user_id" never matches them for authors.

DROP POLICY IF EXISTS "Authors can select all customers" ON public.customers;
CREATE POLICY "Authors can select all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = 'author');

-- Ingest runs were admin-only FOR ALL; add read-only SELECT for authors.
DROP POLICY IF EXISTS "Authors can select ingest runs" ON public.kora_ingest_runs;
CREATE POLICY "Authors can select ingest runs"
ON public.kora_ingest_runs
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = 'author');
