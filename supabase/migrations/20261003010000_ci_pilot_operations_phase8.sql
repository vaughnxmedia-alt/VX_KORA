-- Communications Intelligence Phase 8 — pilot operations, activity, outcomes,
-- monthly reports, weekly briefs, and short client feedback.
-- Additive. No AI automation. Activity is product learning, not surveillance.

-- ---------------------------------------------------------------------------
-- Change history: updated_by on strategic records
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ci_touch_updated_by()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ci_organizations',
    'ci_intelligence_items',
    'ci_health_checks',
    'ci_messaging_entries',
    'ci_opportunities',
    'ci_action_items',
    'ci_counsel_requests',
    'ci_counsel_responses'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL',
      tbl
    );
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_by ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER %I_updated_by BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ci_touch_updated_by()',
      tbl,
      tbl
    );
  END LOOP;
END;
$$;

ALTER TABLE public.ci_admin_notes
  DROP CONSTRAINT IF EXISTS ci_admin_notes_entity_type_check;

ALTER TABLE public.ci_admin_notes
  ADD CONSTRAINT ci_admin_notes_entity_type_check
  CHECK (entity_type IN (
    'organization',
    'intelligence_item',
    'health_check',
    'messaging_entry',
    'opportunity',
    'action_item',
    'counsel_request',
    'outcome',
    'monthly_report',
    'weekly_brief',
    'pilot',
    'general'
  ));

-- ---------------------------------------------------------------------------
-- Pilot enrollment (admin-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_pilot_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'onboarding', 'active', 'needs_attention', 'completed', 'paused')),
  start_date date,
  end_date date,
  cohort text,
  onboarding_complete_at timestamptz,
  initial_health_complete_at timestamptz,
  first_intelligence_at timestamptz,
  first_client_login_at timestamptz,
  first_action_completed_at timestamptz,
  first_counsel_request_at timestamptz,
  final_review_at timestamptz,
  internal_notes text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_pilot_enrollments_status_idx
  ON public.ci_pilot_enrollments (status);

COMMENT ON TABLE public.ci_pilot_enrollments IS
  'Lightweight MVP pilot roster. Internal notes never leave the admin surface.';

DROP TRIGGER IF EXISTS ci_pilot_enrollments_updated_at ON public.ci_pilot_enrollments;
CREATE TRIGGER ci_pilot_enrollments_updated_at
  BEFORE UPDATE ON public.ci_pilot_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

DROP TRIGGER IF EXISTS ci_pilot_enrollments_updated_by ON public.ci_pilot_enrollments;
CREATE TRIGGER ci_pilot_enrollments_updated_by
  BEFORE INSERT OR UPDATE ON public.ci_pilot_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.ci_touch_updated_by();

ALTER TABLE public.ci_pilot_enrollments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_pilot_enrollments TO authenticated;
GRANT ALL ON public.ci_pilot_enrollments TO service_role;

CREATE POLICY ci_pilot_enrollments_admin_all ON public.ci_pilot_enrollments
  FOR ALL TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Product activity events (admin-readable; clients write via RPC only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  event_type text NOT NULL
    CHECK (event_type IN (
      'onboarding_completed',
      'portal_login',
      'intelligence_viewed',
      'opportunity_viewed',
      'action_status_changed',
      'messaging_copied',
      'health_viewed',
      'counsel_submitted',
      'counsel_response_viewed'
    )),
  entity_type text,
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_activity_events_org_created_idx
  ON public.ci_activity_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ci_activity_events_org_type_idx
  ON public.ci_activity_events (organization_id, event_type, created_at DESC);

COMMENT ON TABLE public.ci_activity_events IS
  'Minimal product-use events. No session replay, keystrokes, or device fingerprints.';

ALTER TABLE public.ci_activity_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ci_activity_events TO authenticated;
GRANT ALL ON public.ci_activity_events TO service_role;

CREATE POLICY ci_activity_events_admin_select ON public.ci_activity_events
  FOR SELECT TO authenticated
  USING (public.is_ci_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.ci_record_activity(
  p_organization_id uuid,
  p_event_type text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;
  IF NOT (
    public.is_ci_admin(v_actor)
    OR public.is_ci_org_member(p_organization_id, v_actor)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_event_type NOT IN (
    'onboarding_completed',
    'portal_login',
    'intelligence_viewed',
    'opportunity_viewed',
    'action_status_changed',
    'messaging_copied',
    'health_viewed',
    'counsel_submitted',
    'counsel_response_viewed'
  ) THEN
    RAISE EXCEPTION 'Unknown activity type';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.ci_activity_events e
    WHERE e.organization_id = p_organization_id
      AND e.actor_user_id = v_actor
      AND e.event_type = p_event_type
      AND COALESCE(e.entity_id, '00000000-0000-0000-0000-000000000000')
        = COALESCE(p_entity_id, '00000000-0000-0000-0000-000000000000')
      AND e.created_at > now() - interval '12 hours'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.ci_activity_events (
    organization_id, actor_user_id, event_type, entity_type, entity_id
  ) VALUES (
    p_organization_id, v_actor, p_event_type, p_entity_type, p_entity_id
  )
  RETURNING id INTO v_id;

  UPDATE public.ci_pilot_enrollments
  SET
    onboarding_complete_at = CASE
      WHEN p_event_type = 'onboarding_completed'
        THEN COALESCE(onboarding_complete_at, now())
      ELSE onboarding_complete_at
    END,
    first_client_login_at = CASE
      WHEN p_event_type = 'portal_login'
        THEN COALESCE(first_client_login_at, now())
      ELSE first_client_login_at
    END,
    first_action_completed_at = CASE
      WHEN p_event_type = 'action_status_changed'
        THEN COALESCE(first_action_completed_at, now())
      ELSE first_action_completed_at
    END,
    first_counsel_request_at = CASE
      WHEN p_event_type = 'counsel_submitted'
        THEN COALESCE(first_counsel_request_at, now())
      ELSE first_counsel_request_at
    END,
    status = CASE
      WHEN status IN ('invited', 'onboarding') AND p_event_type IN ('onboarding_completed', 'portal_login')
        THEN 'active'
      ELSE status
    END
  WHERE organization_id = p_organization_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ci_record_activity(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ci_record_activity(uuid, text, text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Communications outcomes (admin-managed; clients see published-facing fields)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  outcome_type text NOT NULL
    CHECK (outcome_type IN (
      'media_coverage',
      'speaking_secured',
      'partnership_secured',
      'event_participation',
      'messaging_updated',
      'website_messaging_corrected',
      'crisis_plan_created',
      'public_statement_prepared',
      'interview_completed',
      'award_application',
      'reputation_issue_addressed',
      'process_created',
      'other'
    )),
  title text NOT NULL,
  description text,
  occurred_on date,
  opportunity_id uuid REFERENCES public.ci_opportunities (id) ON DELETE SET NULL,
  action_item_id uuid REFERENCES public.ci_action_items (id) ON DELETE SET NULL,
  intelligence_item_id uuid REFERENCES public.ci_intelligence_items (id) ON DELETE SET NULL,
  url text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_outcomes_org_idx
  ON public.ci_outcomes (organization_id, occurred_on DESC NULLS LAST);

DROP TRIGGER IF EXISTS ci_outcomes_updated_at ON public.ci_outcomes;
CREATE TRIGGER ci_outcomes_updated_at
  BEFORE UPDATE ON public.ci_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

DROP TRIGGER IF EXISTS ci_outcomes_updated_by ON public.ci_outcomes;
CREATE TRIGGER ci_outcomes_updated_by
  BEFORE INSERT OR UPDATE ON public.ci_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.ci_touch_updated_by();

ALTER TABLE public.ci_outcomes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_outcomes TO authenticated;
GRANT ALL ON public.ci_outcomes TO service_role;

CREATE POLICY ci_outcomes_admin_all ON public.ci_outcomes
  FOR ALL TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

CREATE POLICY ci_outcomes_member_select ON public.ci_outcomes
  FOR SELECT TO authenticated
  USING (public.is_ci_org_member(organization_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Monthly reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  period_year integer NOT NULL,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready_for_review', 'published', 'archived')),
  executive_summary text,
  needed_attention text,
  opportunities text,
  actions_taken text,
  health text,
  outcomes text,
  next_priorities text,
  counsel text,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS ci_monthly_reports_org_idx
  ON public.ci_monthly_reports (organization_id, period_year DESC, period_month DESC);

DROP TRIGGER IF EXISTS ci_monthly_reports_updated_at ON public.ci_monthly_reports;
CREATE TRIGGER ci_monthly_reports_updated_at
  BEFORE UPDATE ON public.ci_monthly_reports
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

DROP TRIGGER IF EXISTS ci_monthly_reports_updated_by ON public.ci_monthly_reports;
CREATE TRIGGER ci_monthly_reports_updated_by
  BEFORE INSERT OR UPDATE ON public.ci_monthly_reports
  FOR EACH ROW EXECUTE FUNCTION public.ci_touch_updated_by();

ALTER TABLE public.ci_monthly_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_monthly_reports TO authenticated;
GRANT ALL ON public.ci_monthly_reports TO service_role;

CREATE POLICY ci_monthly_reports_admin_all ON public.ci_monthly_reports
  FOR ALL TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

CREATE POLICY ci_monthly_reports_member_published ON public.ci_monthly_reports
  FOR SELECT TO authenticated
  USING (
    public.is_ci_org_member(organization_id, auth.uid())
    AND status = 'published'
  );

-- ---------------------------------------------------------------------------
-- Weekly briefs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_weekly_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  week_of date NOT NULL,
  needs_attention text,
  best_opportunity text,
  important_action text,
  upcoming_moment text,
  note text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  published_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_weekly_briefs_org_idx
  ON public.ci_weekly_briefs (organization_id, week_of DESC);

DROP TRIGGER IF EXISTS ci_weekly_briefs_updated_at ON public.ci_weekly_briefs;
CREATE TRIGGER ci_weekly_briefs_updated_at
  BEFORE UPDATE ON public.ci_weekly_briefs
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

DROP TRIGGER IF EXISTS ci_weekly_briefs_updated_by ON public.ci_weekly_briefs;
CREATE TRIGGER ci_weekly_briefs_updated_by
  BEFORE INSERT OR UPDATE ON public.ci_weekly_briefs
  FOR EACH ROW EXECUTE FUNCTION public.ci_touch_updated_by();

ALTER TABLE public.ci_weekly_briefs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_weekly_briefs TO authenticated;
GRANT ALL ON public.ci_weekly_briefs TO service_role;

CREATE POLICY ci_weekly_briefs_admin_all ON public.ci_weekly_briefs
  FOR ALL TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

CREATE POLICY ci_weekly_briefs_member_published ON public.ci_weekly_briefs
  FOR SELECT TO authenticated
  USING (
    public.is_ci_org_member(organization_id, auth.uid())
    AND status = 'published'
  );

-- ---------------------------------------------------------------------------
-- Short recommendation feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  related_type text NOT NULL
    CHECK (related_type IN (
      'intelligence',
      'opportunity',
      'action',
      'health',
      'messaging',
      'weekly_brief',
      'monthly_report'
    )),
  related_id uuid,
  useful text NOT NULL CHECK (useful IN ('yes', 'somewhat', 'no')),
  why text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_recommendation_feedback_org_idx
  ON public.ci_recommendation_feedback (organization_id, created_at DESC);

ALTER TABLE public.ci_recommendation_feedback ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.ci_recommendation_feedback TO authenticated;
GRANT ALL ON public.ci_recommendation_feedback TO service_role;

CREATE POLICY ci_recommendation_feedback_admin_select ON public.ci_recommendation_feedback
  FOR SELECT TO authenticated
  USING (
    public.is_ci_admin(auth.uid())
    OR public.is_ci_org_member(organization_id, auth.uid())
  );

CREATE POLICY ci_recommendation_feedback_member_insert ON public.ci_recommendation_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ci_org_member(organization_id, auth.uid())
    AND created_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Pilot feedback (short form)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_pilot_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  most_useful text,
  confusing text,
  wish text,
  helped_decision text CHECK (helped_decision IN ('yes', 'somewhat', 'no') OR helped_decision IS NULL),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_pilot_feedback_org_idx
  ON public.ci_pilot_feedback (organization_id, created_at DESC);

ALTER TABLE public.ci_pilot_feedback ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.ci_pilot_feedback TO authenticated;
GRANT ALL ON public.ci_pilot_feedback TO service_role;

CREATE POLICY ci_pilot_feedback_admin_select ON public.ci_pilot_feedback
  FOR SELECT TO authenticated
  USING (
    public.is_ci_admin(auth.uid())
    OR public.is_ci_org_member(organization_id, auth.uid())
  );

CREATE POLICY ci_pilot_feedback_member_insert ON public.ci_pilot_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ci_org_member(organization_id, auth.uid())
    AND created_by = auth.uid()
  );
