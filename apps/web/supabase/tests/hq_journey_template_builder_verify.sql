-- All writes roll back. An uncaught exception is the result report.
-- Safe to run against the live HQ database.
DO $$
DECLARE
  v_owner uuid := '55b03ae0-2dce-4cfe-a234-4ee8efc7e0d8';
  v_clients integer;
  v_clients_after integer;
  v_template uuid;
  v_live uuid;
  v_stage jsonb;
  v_alpha uuid;
  v_beta uuid;
  v_order text;
  v_task_title text;
  v_rules jsonb;
  v_dup uuid;
  v_dup_stages integer;
  v_status text;
  v_service text;
  v_denied text := 'not-run';
  v_deleted text := 'not-run';
  v_session_stages text;
  v_client uuid;
  v_engagement uuid;
  v_first_stage uuid;
  v_gaps text := 'not-run';
  v_advance text := 'not-run';
  v_fork_template uuid;
  v_fork_stage uuid;
  v_saved jsonb;
  v_old_name text;
  v_new_name text;
  v_engagement_template uuid;
  v_report text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner, 'role', 'authenticated')::text,
    true
  );

  SELECT count(*) INTO v_clients FROM public.hq_clients;
  PERFORM public.hq_upsert_service('builder_service', 'Builder service', 'Temporary');

  v_template := public.hq_create_template('builder_service', 'Builder test', 'Temporary template');
  v_stage := public.hq_save_template_stage(
    v_template, NULL, 'Alpha', 'First stage', '["all_required_tasks"]'::jsonb, 'unassigned', NULL
  );
  v_alpha := (v_stage->>'stage_id')::uuid;
  v_template := (v_stage->>'template_id')::uuid;
  v_stage := public.hq_save_template_stage(
    v_template, NULL, 'Beta', 'Second stage', '["meeting_completed"]'::jsonb, 'strategist', NULL
  );
  v_beta := (v_stage->>'stage_id')::uuid;
  v_template := (v_stage->>'template_id')::uuid;
  v_template := public.hq_reorder_template_stages(v_template, ARRAY[v_beta, v_alpha]);

  SELECT string_agg(name, ',' ORDER BY position) INTO v_order
  FROM public.hq_journey_template_stages
  WHERE template_id = v_template AND archived_at IS NULL;

  PERFORM public.hq_save_template_task(
    v_template, v_beta, NULL, 'Send questionnaire', 'Ask for the brief', 'Use the standard form',
    'client', 'account_lead', NULL, true, '{"kind":"days_after_stage","amount":1}'::jsonb
  );
  SELECT title INTO v_task_title
  FROM public.hq_journey_template_tasks
  WHERE stage_id = v_beta AND archived_at IS NULL;

  SELECT completion_rules INTO v_rules
  FROM public.hq_journey_template_stages WHERE id = v_alpha;

  v_template := public.hq_update_template(v_template, 'Builder test', 'Connected', 'builder_service');
  SELECT service_key INTO v_service FROM public.hq_journey_templates WHERE id = v_template;

  v_dup := public.hq_duplicate_template(v_template);
  SELECT count(*) INTO v_dup_stages
  FROM public.hq_journey_template_stages
  WHERE template_id = v_dup AND archived_at IS NULL;

  PERFORM public.hq_set_template_status(v_template, 'archived');
  SELECT status INTO v_status FROM public.hq_journey_templates WHERE id = v_template;

  SELECT string_agg(s.name, ' → ' ORDER BY s.position) INTO v_session_stages
  FROM public.hq_journey_template_stages s
  JOIN public.hq_journey_templates t ON t.id = s.template_id
  WHERE t.service_key = 'session' AND t.is_active AND s.archived_at IS NULL;

  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  PERFORM set_config(
    'request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
    true
  );
  BEGIN
    PERFORM public.hq_create_template('employee_test', 'Employee test', '');
    v_denied := 'allowed';
  EXCEPTION
    WHEN OTHERS THEN
      v_denied := SQLERRM;
  END;

  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner, 'role', 'authenticated')::text,
    true
  );
  BEGIN
    DELETE FROM public.hq_journey_templates WHERE id = v_dup;
    v_deleted := 'deleted';
  EXCEPTION
    WHEN OTHERS THEN
      v_deleted := SQLERRM;
  END;

  v_live := public.hq_create_template('builder_live', 'Builder live', 'Fork test');
  v_stage := public.hq_save_template_stage(
    v_live, NULL, 'Original', 'Keep this name on open journeys', '["all_required_tasks"]'::jsonb, 'account_lead', NULL
  );
  v_fork_stage := (v_stage->>'stage_id')::uuid;
  v_live := (v_stage->>'template_id')::uuid;
  PERFORM public.hq_save_template_task(
    v_live, v_fork_stage, NULL, 'Required step', '', '', 'internal', 'unassigned', NULL, true, '{"kind":"same_day"}'::jsonb
  );
  PERFORM public.hq_set_template_status(v_live, 'active');

  SELECT id INTO v_client FROM public.hq_clients ORDER BY created_at LIMIT 1;
  v_engagement := public.hq_open_engagement(v_client, v_live, v_owner, 'Template fork test', CURRENT_DATE, NULL, NULL);
  v_saved := public.hq_save_template_stage(
    v_live, v_fork_stage, 'Changed', 'Future engagements only', '["all_required_tasks"]'::jsonb, 'account_lead', NULL
  );
  v_fork_template := (v_saved->>'template_id')::uuid;
  SELECT name INTO v_old_name FROM public.hq_journey_template_stages WHERE id = v_fork_stage;
  SELECT name INTO v_new_name
  FROM public.hq_journey_template_stages
  WHERE id = (v_saved->>'stage_id')::uuid;
  SELECT template_id INTO v_engagement_template FROM public.hq_engagements WHERE id = v_engagement;

  SELECT id INTO v_first_stage
  FROM public.hq_engagement_stages
  WHERE engagement_id = v_engagement
  ORDER BY position
  LIMIT 1;
  SELECT array_to_string(public.hq_stage_requirement_gaps(v_first_stage), '; ') INTO v_gaps;
  BEGIN
    PERFORM public.hq_advance_stage(v_first_stage);
    v_advance := 'advanced';
  EXCEPTION
    WHEN OTHERS THEN
      v_advance := SQLERRM;
  END;

  SELECT count(*) INTO v_clients_after FROM public.hq_clients;

  v_report := concat_ws(' | ',
    'reorder=' || COALESCE(v_order, 'null'),
    'task=' || COALESCE(v_task_title, 'null'),
    'rules=' || COALESCE(v_rules::text, 'null'),
    'service=' || COALESCE(v_service, 'null'),
    'duplicate_stages=' || COALESCE(v_dup_stages::text, 'null'),
    'status=' || COALESCE(v_status, 'null'),
    'denied=' || v_denied,
    'deleted=' || v_deleted,
    'session=' || COALESCE(v_session_stages, 'null'),
    'fork=' || COALESCE(v_old_name, 'null') || '/' || COALESCE(v_new_name, 'null'),
    'engagement_kept=' || COALESCE((v_engagement_template = v_live)::text, 'null'),
    'gaps=' || v_gaps,
    'advance=' || v_advance,
    'clients=' || v_clients::text || '->' || v_clients_after::text
  );

  IF v_order IS DISTINCT FROM 'Beta,Alpha'
    OR v_task_title IS DISTINCT FROM 'Send questionnaire'
    OR v_rules IS DISTINCT FROM '["all_required_tasks"]'::jsonb
    OR v_service IS DISTINCT FROM 'builder_service'
    OR v_dup_stages IS DISTINCT FROM 2
    OR v_status IS DISTINCT FROM 'archived'
    OR v_denied NOT LIKE 'Only management%'
    OR v_deleted NOT LIKE 'Archive journey templates%'
    OR v_session_stages NOT LIKE 'Inquiry → Qualified → Booked%'
    OR v_old_name IS DISTINCT FROM 'Original'
    OR v_new_name IS DISTINCT FROM 'Changed'
    OR v_engagement_template IS NOT DISTINCT FROM v_fork_template
    OR v_engagement_template IS DISTINCT FROM v_live
    OR v_gaps IS DISTINCT FROM 'All required tasks completed'
    OR v_advance NOT LIKE 'This stage cannot advance yet%'
    OR v_clients IS DISTINCT FROM v_clients_after
  THEN
    RAISE EXCEPTION 'BUILDER CHECKS FAILED: %', v_report;
  END IF;

  RAISE EXCEPTION 'BUILDER CHECKS PASSED: %', v_report;
END $$;
