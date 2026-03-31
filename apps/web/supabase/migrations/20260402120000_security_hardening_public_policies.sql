-- Launch hardening: remove permissive public mutation surfaces.

-- Anonymous users should never mutate subscribers rows.
DROP POLICY IF EXISTS "Allow anonymous update" ON public.subscribers;

-- Prevent anonymous role escalation attempts against user_roles.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.user_roles FROM anon;

