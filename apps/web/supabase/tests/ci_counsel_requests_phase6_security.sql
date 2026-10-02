-- Phase 6 security workflow. Runs as a transaction and rolls back.
-- Lifeline: 87514a3f-ee8f-4b63-8a97-3e7f09dfa56e
-- Other Org: 75ca6e28-9f62-4885-b8d6-8ee945d63e09
-- Lifeline/HQ user: 8fab27fb-7dda-4392-9ab1-51fccf1dd27e
-- Other Org member: 90a55176-cd5c-44f7-a0c4-60e5670a87c6

BEGIN;

CREATE TEMP TABLE phase6_results (
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
  v_request_id uuid;
  other_opp uuid;
  related_failed boolean := false;
  note_id uuid;
BEGIN
  INSERT INTO public.ci_counsel_requests (
    organization_id,
    subject,
    request_type,
    description,
    urgency,
    status,
    submitted_by
  ) VALUES (
    lifeline,
    'Phase 6 security review',
    'event_opportunity',
    'Do you think we should pursue this, and what should we say?',
    'time_sensitive',
    'submitted',
    lifeline_user
  )
  RETURNING id INTO v_request_id;

  INSERT INTO phase6_results VALUES (
    '1_client_submit',
    v_request_id IS NOT NULL,
    v_request_id::text
  );

  INSERT INTO public.ci_admin_notes (
    organization_id,
    body,
    created_by,
    entity_type,
    entity_id
  ) VALUES (
    lifeline,
    'Internal strategy only. Client must not see this.',
    lifeline_user,
    'counsel_request',
    v_request_id
  )
  RETURNING id INTO note_id;

  INSERT INTO phase6_results VALUES (
    '3_internal_note',
    note_id IS NOT NULL
      AND NOT public.is_ci_admin(other_user)
      AND NOT public.is_ci_org_member(lifeline, other_user),
    'other member is not staff and not a Lifeline member'
  );

  INSERT INTO public.ci_counsel_responses (
    request_id,
    organization_id,
    body,
    created_by,
    updated_by
  ) VALUES (
    v_request_id,
    lifeline,
    'Pursue it. Lead with the community story, not the product.',
    lifeline_user,
    lifeline_user
  );

  INSERT INTO phase6_results VALUES (
    '5_draft_response_hidden_by_status',
    EXISTS (
      SELECT 1
      FROM public.ci_counsel_requests r
      WHERE r.id = v_request_id
        AND r.status = 'submitted'
    )
    AND EXISTS (
      SELECT 1
      FROM public.ci_counsel_responses resp
      WHERE resp.request_id = v_request_id
    ),
    'response exists while status is still submitted'
  );

  BEGIN
    UPDATE public.ci_counsel_requests
    SET status = 'response_ready'
    WHERE id = v_request_id;
    INSERT INTO phase6_results VALUES (
      '6_client_cannot_change_status',
      false,
      'unauthenticated update was allowed'
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO phase6_results VALUES (
      '6_client_cannot_change_status',
      true,
      SQLERRM
    );
  END;

  PERFORM set_config('request.jwt.claim.sub', lifeline_user::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', lifeline_user, 'role', 'authenticated')::text,
    true
  );

  UPDATE public.ci_counsel_requests
  SET status = 'response_ready'
  WHERE id = v_request_id;

  INSERT INTO phase6_results VALUES (
    '7_response_ready',
    EXISTS (
      SELECT 1
      FROM public.ci_counsel_requests r
      WHERE r.id = v_request_id
        AND r.status = 'response_ready'
    ),
    'status marked response_ready'
  );

  INSERT INTO phase6_results VALUES (
    '10_tenant_isolation',
    public.can_access_ci_org(lifeline, other_user) = false
      AND public.can_access_ci_org(other_org, other_user) = true
      AND public.is_ci_org_member(lifeline, other_user) = false,
    'other org member cannot access Lifeline'
  );

  UPDATE public.ci_counsel_requests
  SET status = 'closed'
  WHERE id = v_request_id;

  INSERT INTO phase6_results VALUES (
    '11_close_request',
    EXISTS (
      SELECT 1
      FROM public.ci_counsel_requests r
      WHERE r.id = v_request_id
        AND r.status = 'closed'
    ),
    'request closed'
  );

  INSERT INTO public.ci_opportunities (
    organization_id,
    title,
    description,
    opportunity_type,
    status,
    created_by
  ) VALUES (
    other_org,
    'Phase 6 cross-org guard',
    'Should not attach to a Lifeline counsel request',
    'media',
    'new',
    other_user
  )
  RETURNING id INTO other_opp;

  BEGIN
    UPDATE public.ci_counsel_requests
    SET opportunity_id = other_opp
    WHERE id = v_request_id;
  EXCEPTION WHEN OTHERS THEN
    related_failed := true;
  END;

  INSERT INTO phase6_results VALUES (
    '12_related_same_org_guard',
    related_failed,
    CASE
      WHEN related_failed THEN 'cross-org opportunity rejected'
      ELSE 'cross-org opportunity was accepted'
    END
  );
END;
$$;

SELECT * FROM phase6_results ORDER BY step;

ROLLBACK;
