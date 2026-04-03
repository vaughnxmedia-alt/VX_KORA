-- Allow authenticated users to SELECT only their own subscriber row (matched by JWT email).
-- Used by the site to suppress the marketing signup popup when they are already on the list.
-- Dashboard staff retain existing broader SELECT via "Dashboard roles can read subscribers".

CREATE POLICY "Authenticated users can select own subscriber row by email"
ON public.subscribers
FOR SELECT
TO authenticated
USING (
  lower(btrim(email)) = lower(btrim(coalesce((auth.jwt() ->> 'email')::text, '')))
  AND coalesce((auth.jwt() ->> 'email')::text, '') <> ''
);
