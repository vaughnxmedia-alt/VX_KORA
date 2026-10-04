-- Communications Assessment Step 1: organization profile fields + draft status

ALTER TABLE public.ci_organizations
  ADD COLUMN IF NOT EXISTS primary_contact text,
  ADD COLUMN IF NOT EXISTS current_services text,
  ADD COLUMN IF NOT EXISTS assessment_notes text,
  ADD COLUMN IF NOT EXISTS assessment_profile_status text NOT NULL DEFAULT 'draft';

ALTER TABLE public.ci_organizations
  DROP CONSTRAINT IF EXISTS ci_organizations_assessment_profile_status_check;

ALTER TABLE public.ci_organizations
  ADD CONSTRAINT ci_organizations_assessment_profile_status_check
  CHECK (assessment_profile_status IN ('draft', 'complete'));

COMMENT ON COLUMN public.ci_organizations.primary_contact IS
  'Primary contact for the Communications Assessment profile.';
COMMENT ON COLUMN public.ci_organizations.current_services IS
  'Current services, products, or programs.';
COMMENT ON COLUMN public.ci_organizations.assessment_notes IS
  'Internal staff notes for the Communications Assessment profile.';
COMMENT ON COLUMN public.ci_organizations.assessment_profile_status IS
  'draft = in progress; complete = staff marked Step 1 ready to continue.';

-- Existing clients with profile content are treated as complete in app logic
-- until staff uses the new draft fields. A guarded UPDATE is intentionally
-- omitted here because client-facing update triggers block bulk backfills.
