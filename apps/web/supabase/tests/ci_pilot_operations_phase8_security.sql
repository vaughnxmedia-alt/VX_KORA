-- Phase 8 security: tenant isolation, unpublished reports, internal notes, activity.
-- Lifeline: 87514a3f-ee8f-4b63-8a97-3e7f09dfa56e
-- Other Org: 75ca6e28-9f62-4885-b8d6-8ee945d63e09
-- Lifeline/HQ user: 8fab27fb-7dda-4392-9ab1-51fccf1dd27e
-- Other Org member: 90a55176-cd5c-44f7-a0c4-60e5670a87c6

BEGIN;

CREATE TEMP TABLE phase8_results (
  step text PRIMARY KEY,
  ok boolean NOT NULL,
  detail text
);

DO $$
DECLARE
  lifeline uuid := '87514a3f-ee8f-4b63-8a97-3e7f09dfa56e';
  other_org uuid := '75ca6e28-9f62-4885-b8d6-8ee945d63e09';
  lifeline_user uuid := '8fab27fb-7dda-4392-9ab1-51fccf1dd27e';
  other_user uuid := '90a55176-cd5c-44f7-a0c4-60e5670a87c6';
  draft_id uuid;
  published_id uuid;
  brief_id uuid;
  outcome_id uuid;
  note_id uuid;
  event_id uuid;
  published_policy text;
  draft_policy text;
  activity_policy text;
  pilot_policy text;
  outcome_admin_policy text;
  activity_rpc_failed boolean := false;
BEGIN
  INSERT INTO public.ci_pilot_enrollments (
    organization_id, status, cohort, internal_notes, created_by
  ) VALUES (
    lifeline, 'active', 'MVP-security', 'Internal pilot note. Clients must not see this.', lifeline_user
  )
  ON CONFLICT (organization_id) DO UPDATE
    SET internal_notes = EXCLUDED.internal_notes;

  INSERT INTO public.ci_monthly_reports (
    organization_id, period_year, period_month, status, executive_summary, created_by
  ) VALUES (
    lifeline, 2099, 1, 'draft', 'Draft only. Clients must not see this.', lifeline_user
  )
  ON CONFLICT (organization_id, period_year, period_month) DO UPDATE
    SET status = 'draft', executive_summary = EXCLUDED.executive_summary
  RETURNING id INTO draft_id;

  INSERT INTO public.ci_monthly_reports (
    organization_id, period_year, period_month, status, executive_summary, published_at, published_by, created_by
  ) VALUES (
    lifeline, 2099, 2, 'published', 'Published summary clients in this org may see.', now(), lifeline_user, lifeline_user
  )
  ON CONFLICT (organization_id, period_year, period_month) DO UPDATE
    SET status = 'published', executive_summary = EXCLUDED.executive_summary
  RETURNING id INTO published_id;

  INSERT INTO public.ci_weekly_briefs (
    organization_id, week_of, needs_attention, status, created_by
  ) VALUES (
    lifeline, DATE '2099-01-05', 'Draft brief. Clients must not see this.', 'draft', lifeline_user
  )
  RETURNING id INTO brief_id;

  INSERT INTO public.ci_outcomes (
    organization_id, outcome_type, title, description, occurred_on, created_by
  ) VALUES (
    lifeline, 'interview_completed', 'Security-test interview', 'Client-visible title.', CURRENT_DATE, lifeline_user
  )
  RETURNING id INTO outcome_id;

  INSERT INTO public.ci_admin_notes (
    organization_id, entity_type, entity_id, body, created_by
  ) VALUES (
    lifeline, 'outcome', outcome_id, 'Internal outcome note. Client must not see this.', lifeline_user
  )
  RETURNING id INTO note_id;

  INSERT INTO public.ci_activity_events (
    organization_id, actor_user_id, event_type
  ) VALUES (
    lifeline, lifeline_user, 'portal_login'
  )
  RETURNING id INTO event_id;

  SELECT pg_get_expr(polqual, polrelid) INTO published_policy
  FROM pg_policy
  WHERE polrelid = 'public.ci_monthly_reports'::regclass
    AND polname = 'ci_monthly_reports_member_published';

  SELECT pg_get_expr(polqual, polrelid) INTO draft_policy
  FROM pg_policy
  WHERE polrelid = 'public.ci_weekly_briefs'::regclass
    AND polname = 'ci_weekly_briefs_member_published';

  SELECT pg_get_expr(polqual, polrelid) INTO activity_policy
  FROM pg_policy
  WHERE polrelid = 'public.ci_activity_events'::regclass
    AND polname = 'ci_activity_events_admin_select';

  SELECT pg_get_expr(polqual, polrelid) INTO pilot_policy
  FROM pg_policy
  WHERE polrelid = 'public.ci_pilot_enrollments'::regclass
    AND polname = 'ci_pilot_enrollments_admin_all';

  SELECT pg_get_expr(polwithcheck, polrelid) INTO outcome_admin_policy
  FROM pg_policy
  WHERE polrelid = 'public.ci_outcomes'::regclass
    AND polname = 'ci_outcomes_admin_all';

  INSERT INTO phase8_results VALUES (
    '1_tenant_helpers',
    public.can_access_ci_org(lifeline, other_user) = false
      AND public.is_ci_org_member(lifeline, other_user) = false
      AND public.is_ci_org_member(other_org, other_user) = true
      AND public.is_ci_admin(other_user) = false
      AND public.is_ci_admin(lifeline_user) = true,
    'other org member cannot reach Lifeline or admin surfaces'
  );

  INSERT INTO phase8_results VALUES (
    '2_published_report_policy',
    published_policy ILIKE '%is_ci_org_member%'
      AND published_policy ILIKE '%published%',
    published_policy
  );

  INSERT INTO phase8_results VALUES (
    '3_draft_brief_policy',
    draft_policy ILIKE '%is_ci_org_member%'
      AND draft_policy ILIKE '%published%',
    draft_policy
  );

  INSERT INTO phase8_results VALUES (
    '4_activity_admin_only',
    activity_policy ILIKE '%is_ci_admin%',
    activity_policy
  );

  INSERT INTO phase8_results VALUES (
    '5_pilot_admin_only',
    pilot_policy ILIKE '%is_ci_admin%',
    pilot_policy
  );

  INSERT INTO phase8_results VALUES (
    '6_outcomes_admin_write',
    outcome_admin_policy ILIKE '%is_ci_admin%',
    outcome_admin_policy
  );

  INSERT INTO phase8_results VALUES (
    '7_records_created',
    draft_id IS NOT NULL
      AND published_id IS NOT NULL
      AND brief_id IS NOT NULL
      AND outcome_id IS NOT NULL
      AND note_id IS NOT NULL
      AND event_id IS NOT NULL,
    published_id::text
  );

  INSERT INTO phase8_results VALUES (
    '8_internal_note_not_on_outcome_row',
    EXISTS (
      SELECT 1 FROM public.ci_outcomes o WHERE o.id = outcome_id
    )
    AND EXISTS (
      SELECT 1 FROM public.ci_admin_notes n
      WHERE n.id = note_id AND n.entity_type = 'outcome' AND n.entity_id = outcome_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ci_outcomes'
        AND column_name = 'internal_notes'
    ),
    'outcome notes stay on ci_admin_notes'
  );

  PERFORM set_config('request.jwt.claim.sub', other_user::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', other_user, 'role', 'authenticated')::text,
    true
  );

  BEGIN
    PERFORM public.ci_record_activity(lifeline, 'portal_login', NULL, NULL);
  EXCEPTION WHEN OTHERS THEN
    activity_rpc_failed := SQLERRM ILIKE '%not authorized%';
  END;

  INSERT INTO phase8_results VALUES (
    '9_activity_rpc_requires_membership',
    activity_rpc_failed,
    'other org member cannot record Lifeline activity'
  );
END;
$$;

SELECT * FROM phase8_results ORDER BY step;

ROLLBACK;
