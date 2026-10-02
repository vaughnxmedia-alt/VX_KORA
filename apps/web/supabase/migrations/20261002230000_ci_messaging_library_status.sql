-- Communications Intelligence Phase 4 — Messaging Library statuses + types
-- Additive. Clients still only see approved language via RLS.

ALTER TABLE public.ci_messaging_entries
  DROP CONSTRAINT IF EXISTS ci_messaging_entries_entry_type_check;

ALTER TABLE public.ci_messaging_entries
  ADD CONSTRAINT ci_messaging_entries_entry_type_check
  CHECK (entry_type IN (
    'organization_description',
    'boilerplate',
    'founder_executive_bio',
    'key_messages',
    'talking_points',
    'faq_responses',
    'approved_statements',
    'media_bio',
    'crisis_holding_statement',
    'custom'
  ));

ALTER TABLE public.ci_messaging_entries
  ADD COLUMN IF NOT EXISTS status text;

UPDATE public.ci_messaging_entries
SET status = CASE
  WHEN is_published THEN 'approved'
  ELSE 'draft'
END
WHERE status IS NULL;

ALTER TABLE public.ci_messaging_entries
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.ci_messaging_entries
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.ci_messaging_entries
  DROP CONSTRAINT IF EXISTS ci_messaging_entries_status_check;

ALTER TABLE public.ci_messaging_entries
  ADD CONSTRAINT ci_messaging_entries_status_check
  CHECK (status IN ('draft', 'approved', 'archived'));

COMMENT ON COLUMN public.ci_messaging_entries.status IS
  'draft = staff only; approved = client-visible; archived = hidden from portal.';

CREATE OR REPLACE FUNCTION public.ci_sync_messaging_published()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_published := (NEW.status = 'approved');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ci_messaging_entries_sync_published ON public.ci_messaging_entries;
CREATE TRIGGER ci_messaging_entries_sync_published
  BEFORE INSERT OR UPDATE OF status, is_published
  ON public.ci_messaging_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.ci_sync_messaging_published();

UPDATE public.ci_messaging_entries
SET is_published = (status = 'approved');

DROP POLICY IF EXISTS ci_messaging_entries_select ON public.ci_messaging_entries;
CREATE POLICY ci_messaging_entries_select ON public.ci_messaging_entries
  FOR SELECT TO authenticated
  USING (
    public.is_ci_admin(auth.uid())
    OR (
      public.is_ci_org_member(organization_id, auth.uid())
      AND status = 'approved'
      AND is_published = true
    )
  );
