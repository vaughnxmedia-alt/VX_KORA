-- All writes roll back. An uncaught exception is the result report.
DO $$
DECLARE
  v_owner uuid := '55b03ae0-2dce-4cfe-a234-4ee8efc7e0d8';
  v_other uuid := '8fab27fb-7dda-4392-9ab1-51fccf1dd27e';
  v_clients integer;
  v_engagements integer;
  v_posts integer;
  v_client uuid;
  v_template uuid;
  v_engagement uuid;
  v_case integer;
  v_role text;
  v_post uuid;
  v_status text;
  v_hidden boolean;
  v_type text;
  v_work integer;
  v_blocked text := 'not-run';
  v_report text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner, 'role', 'authenticated')::text,
    true
  );

  SELECT count(*) INTO v_clients FROM public.hq_clients;
  SELECT count(*) INTO v_engagements FROM public.hq_engagements;
  SELECT count(*) INTO v_posts FROM public.blog_posts;

  SELECT id INTO v_client FROM public.hq_clients ORDER BY created_at LIMIT 1;
  SELECT id INTO v_template
  FROM public.hq_journey_templates
  WHERE service_key = 'session' AND is_active
  ORDER BY version DESC
  LIMIT 1;

  v_engagement := public.hq_open_engagement(
    v_client,
    v_template,
    v_owner,
    'Operating reset check',
    CURRENT_DATE,
    NULL,
    NULL
  );

  SELECT count(*) INTO v_case
  FROM public.hq_engagement_case_studies
  WHERE engagement_id = v_engagement;

  PERFORM public.hq_set_engagement_assignment(v_engagement, v_other, 'contributor');
  SELECT assignment_role INTO v_role
  FROM public.hq_engagement_assignments
  WHERE engagement_id = v_engagement AND user_id = v_other;

  PERFORM public.hq_save_case_study(
    v_engagement,
    'Objectives',
    'Work',
    'Outcomes',
    'Evidence',
    'approved'
  );

  UPDATE public.hq_engagement_tasks
  SET assignee_id = v_owner
  WHERE engagement_id = v_engagement
    AND id = (
      SELECT id FROM public.hq_engagement_tasks
      WHERE engagement_id = v_engagement
      ORDER BY position
      LIMIT 1
    );

  SELECT count(*) INTO v_work FROM public.hq_my_journey_work() WHERE engagement_id = v_engagement;

  BEGIN
    DELETE FROM public.hq_engagement_case_studies WHERE engagement_id = v_engagement;
    UPDATE public.hq_engagements SET status = 'completed' WHERE id = v_engagement;
    v_blocked := 'allowed';
  EXCEPTION WHEN OTHERS THEN
    v_blocked := SQLERRM;
  END;

  SELECT count(*) INTO v_case
  FROM public.hq_engagement_case_studies
  WHERE engagement_id = v_engagement;

  v_post := public.hq_copy_case_study_to_brief(v_engagement);
  SELECT publication_status, is_hidden, content_type
  INTO v_status, v_hidden, v_type
  FROM public.blog_posts
  WHERE id = v_post;

  v_report := concat_ws(
    ' | ',
    'case=' || v_case::text,
    'role=' || COALESCE(v_role, 'null'),
    'work=' || v_work::text,
    'blocked=' || v_blocked,
    'post=' || COALESCE(v_status, 'null') || '/' || COALESCE(v_hidden::text, 'null') || '/' || COALESCE(v_type, 'null'),
    'clients=' || v_clients::text,
    'engagements=' || v_engagements::text,
    'posts=' || v_posts::text
  );

  IF v_case IS DISTINCT FROM 1
    OR v_role IS DISTINCT FROM 'contributor'
    OR v_work < 1
    OR v_blocked NOT LIKE 'Create the internal case study draft%'
    OR v_status IS DISTINCT FROM 'draft'
    OR v_hidden IS DISTINCT FROM true
    OR v_type IS DISTINCT FROM 'case-study'
  THEN
    RAISE EXCEPTION 'OPERATING RESET CHECKS FAILED %', v_report;
  END IF;

  RAISE EXCEPTION 'OPERATING RESET CHECKS PASSED %', v_report;
END $$;
