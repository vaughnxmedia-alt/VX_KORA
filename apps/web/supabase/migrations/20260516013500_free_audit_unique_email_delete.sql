CREATE UNIQUE INDEX IF NOT EXISTS free_audits_lead_email_lower_unique_idx
  ON public.free_audits (lead_email_lower)
  WHERE lead_email_lower IS NOT NULL;

DROP POLICY IF EXISTS "Dashboard staff update free audits" ON public.free_audits;
CREATE POLICY "Dashboard staff update free audits"
ON public.free_audits FOR UPDATE TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "Dashboard staff delete free audits" ON public.free_audits;
CREATE POLICY "Dashboard staff delete free audits"
ON public.free_audits FOR DELETE TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

GRANT UPDATE, DELETE ON public.free_audits TO authenticated;
