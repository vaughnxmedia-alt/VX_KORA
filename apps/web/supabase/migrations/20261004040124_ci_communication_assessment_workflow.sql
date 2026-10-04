-- Communications Assessment workflow: multi-assessment model, internal sections,
-- client-facing priorities, version history. No OpenAI integration.

CREATE TABLE IF NOT EXISTS public.ci_communication_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  title text,
  workflow_status text NOT NULL DEFAULT 'draft_profile'
    CHECK (workflow_status IN (
      'draft_profile',
      'profile_complete',
      'assessment_in_progress',
      'assessment_complete',
      'ready_for_chatgpt',
      'recommendations_drafted',
      'under_review',
      'approved',
      'delivered'
    )),
  step3_status text NOT NULL DEFAULT 'draft'
    CHECK (step3_status IN ('draft', 'under_review', 'approved', 'delivered')),
  assigned_to uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  findings_report text,
  findings_generated_at timestamptz,
  findings_generated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  recommended_order text,
  overall_direction text,
  started_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_communication_assessments_org_idx
  ON public.ci_communication_assessments (organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS ci_communication_assessments_status_idx
  ON public.ci_communication_assessments (workflow_status);

CREATE TABLE IF NOT EXISTS public.ci_assessment_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.ci_communication_assessments (id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'messaging',
    'visibility',
    'reputation',
    'media_readiness',
    'crisis_readiness',
    'brand_consistency'
  )),
  where_looked jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_observed text,
  status_label text NOT NULL DEFAULT 'not_enough_information'
    CHECK (status_label IN (
      'strong',
      'needs_attention',
      'significant_gap',
      'not_enough_information'
    )),
  short_assessment text,
  why_could_matter text,
  potential_next_step text,
  internal_score smallint CHECK (internal_score IS NULL OR (internal_score BETWEEN 1 AND 5)),
  assessed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  assessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, category)
);

CREATE INDEX IF NOT EXISTS ci_assessment_sections_assessment_idx
  ON public.ci_assessment_sections (assessment_id);

CREATE TABLE IF NOT EXISTS public.ci_communication_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.ci_communication_assessments (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 1 CHECK (sort_order BETWEEN 1 AND 5),
  title text NOT NULL DEFAULT '',
  priority_level text NOT NULL DEFAULT 'strengthen_next'
    CHECK (priority_level IN ('address_now', 'strengthen_next', 'maintain')),
  what_we_noticed text,
  why_it_matters text,
  recommendation text,
  next_practical_step text,
  support_type text NOT NULL DEFAULT 'internal'
    CHECK (support_type IN ('internal', 'strategic_support')),
  recommended_service text
    CHECK (
      recommended_service IS NULL
      OR recommended_service IN (
        'strategic_communications_session',
        'strategic_communications_pr_project',
        'ongoing_strategic_communications_counsel'
      )
    ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, sort_order)
);

CREATE INDEX IF NOT EXISTS ci_communication_priorities_assessment_idx
  ON public.ci_communication_priorities (assessment_id, sort_order);

CREATE TABLE IF NOT EXISTS public.ci_assessment_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.ci_communication_assessments (id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, version_number)
);

CREATE INDEX IF NOT EXISTS ci_assessment_versions_assessment_idx
  ON public.ci_assessment_versions (assessment_id, version_number DESC);

-- Touch updated_at
CREATE OR REPLACE FUNCTION public.ci_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ci_communication_assessments_touch ON public.ci_communication_assessments;
CREATE TRIGGER ci_communication_assessments_touch
  BEFORE UPDATE ON public.ci_communication_assessments
  FOR EACH ROW EXECUTE FUNCTION public.ci_touch_updated_at();

DROP TRIGGER IF EXISTS ci_assessment_sections_touch ON public.ci_assessment_sections;
CREATE TRIGGER ci_assessment_sections_touch
  BEFORE UPDATE ON public.ci_assessment_sections
  FOR EACH ROW EXECUTE FUNCTION public.ci_touch_updated_at();

DROP TRIGGER IF EXISTS ci_communication_priorities_touch ON public.ci_communication_priorities;
CREATE TRIGGER ci_communication_priorities_touch
  BEFORE UPDATE ON public.ci_communication_priorities
  FOR EACH ROW EXECUTE FUNCTION public.ci_touch_updated_at();

-- RLS: staff write; clients read approved priorities only
ALTER TABLE public.ci_communication_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_assessment_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_communication_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_assessment_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ci_assessments_admin_all ON public.ci_communication_assessments;
CREATE POLICY ci_assessments_admin_all ON public.ci_communication_assessments
  FOR ALL TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_assessments_member_select_approved ON public.ci_communication_assessments;
CREATE POLICY ci_assessments_member_select_approved ON public.ci_communication_assessments
  FOR SELECT TO authenticated
  USING (
    public.can_access_ci_org(organization_id, auth.uid())
    AND workflow_status IN ('approved', 'delivered')
  );

DROP POLICY IF EXISTS ci_assessment_sections_admin_all ON public.ci_assessment_sections;
CREATE POLICY ci_assessment_sections_admin_all ON public.ci_assessment_sections
  FOR ALL TO authenticated
  USING (
    public.is_ci_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.ci_communication_assessments a
      WHERE a.id = assessment_id
    )
  )
  WITH CHECK (public.is_ci_admin(auth.uid()));

-- Members never see internal sections
DROP POLICY IF EXISTS ci_assessment_sections_no_client ON public.ci_assessment_sections;

DROP POLICY IF EXISTS ci_priorities_admin_all ON public.ci_communication_priorities;
CREATE POLICY ci_priorities_admin_all ON public.ci_communication_priorities
  FOR ALL TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_priorities_member_select_approved ON public.ci_communication_priorities;
CREATE POLICY ci_priorities_member_select_approved ON public.ci_communication_priorities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ci_communication_assessments a
      WHERE a.id = assessment_id
        AND public.can_access_ci_org(a.organization_id, auth.uid())
        AND a.workflow_status IN ('approved', 'delivered')
    )
  );

DROP POLICY IF EXISTS ci_assessment_versions_admin_all ON public.ci_assessment_versions;
CREATE POLICY ci_assessment_versions_admin_all ON public.ci_assessment_versions
  FOR ALL TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_communication_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_assessment_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_communication_priorities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_assessment_versions TO authenticated;
