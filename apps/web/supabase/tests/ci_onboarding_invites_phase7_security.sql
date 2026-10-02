-- Phase 7 security: invite tokens, email bind, reuse, tenant isolation, onboarding lock.
-- Lifeline: 87514a3f-ee8f-4b63-8a97-3e7f09dfa56e
-- Other Org: 75ca6e28-9f62-4885-b8d6-8ee945d63e09
-- Lifeline/HQ user: 8fab27fb-7dda-4392-9ab1-51fccf1dd27e
-- Other Org member: 90a55176-cd5c-44f7-a0c4-60e5670a87c6

BEGIN;

CREATE TEMP TABLE phase7_results (
  step text PRIMARY KEY,
  ok boolean NOT NULL,
  detail text
);

DO $$
DECLARE
  lifeline uuid := '87514a3f-ee8f-4b63-8a97-3e7f09dfa56e';
  other_org uuid := '75ca6e28-9f62-4885-b8d6-8ee945d63e09';
  other_user uuid := '90a55176-cd5c-44f7-a0c4-60e5670a87c6';
  other_email text;
  token text := 'phase7-security-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  preview_email text;
  preview_org text;
  accept_failed boolean := false;
  reuse_failed boolean := false;
  mismatch_failed boolean := false;
  accepted_org uuid;
  invite_id uuid;
  other_can_see_invite boolean := false;
  other_can_see_lifeline boolean := false;
BEGIN
  SELECT lower(u.email) INTO other_email
  FROM auth.users u
  WHERE u.id = other_user;

  DELETE FROM public.ci_organization_invitations
  WHERE organization_id = lifeline
    AND email = other_email
    AND accepted_at IS NULL;

  INSERT INTO public.ci_organization_invitations (
    organization_id,
    email,
    member_role,
    token_hash,
    expires_at
  ) VALUES (
    lifeline,
    other_email,
    'owner',
    public.ci_hash_invite_token(token),
    now() + interval '2 days'
  )
  RETURNING id INTO invite_id;

  SELECT p.email, p.organization_name
  INTO preview_email, preview_org
  FROM public.ci_preview_organization_invite(token) p;

  INSERT INTO phase7_results VALUES (
    '1_preview_hides_hash',
    preview_email = other_email
      AND preview_org IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.ci_organization_invitations i
        WHERE i.id = invite_id
          AND i.token_hash = token
      ),
    preview_org
  );

  BEGIN
    PERFORM public.ci_accept_organization_invite(token);
  EXCEPTION WHEN OTHERS THEN
    accept_failed := SQLERRM ILIKE '%sign in%';
  END;

  INSERT INTO phase7_results VALUES (
    '2_accept_requires_auth',
    accept_failed,
    'unauthenticated accept rejected'
  );

  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    PERFORM public.ci_accept_organization_invite(token);
  EXCEPTION WHEN OTHERS THEN
    mismatch_failed := SQLERRM ILIKE '%invited email%' OR SQLERRM ILIKE '%sign in%';
  END;

  INSERT INTO phase7_results VALUES (
    '3_email_must_match',
    mismatch_failed
      AND NOT EXISTS (
        SELECT 1
        FROM public.ci_organization_members m
        WHERE m.organization_id = lifeline
          AND m.user_id = other_user
          AND m.status = 'active'
      ),
    'wrong account cannot accept Lifeline invite'
  );

  PERFORM set_config('request.jwt.claim.sub', other_user::text, true);

  accepted_org := public.ci_accept_organization_invite(token);

  INSERT INTO phase7_results VALUES (
    '4_existing_user_accepts',
    accepted_org = lifeline
      AND EXISTS (
        SELECT 1
        FROM public.ci_organization_members m
        WHERE m.organization_id = lifeline
          AND m.user_id = other_user
          AND m.status = 'active'
          AND m.member_role = 'owner'
      ),
    accepted_org::text
  );

  BEGIN
    PERFORM public.ci_accept_organization_invite(token);
  EXCEPTION WHEN OTHERS THEN
    reuse_failed := SQLERRM ILIKE '%already been used%';
  END;

  INSERT INTO phase7_results VALUES (
    '5_token_not_reusable',
    reuse_failed,
    'second accept rejected'
  );

  INSERT INTO phase7_results VALUES (
    '6_tenant_helpers',
    public.is_ci_org_member(other_org, other_user)
      AND NOT public.is_ci_admin(other_user)
      AND public.can_access_ci_org(lifeline, other_user) = true,
    'other user can reach Lifeline only after this test membership'
  );

  SELECT EXISTS (
    SELECT 1
    FROM public.ci_organization_invitations i
    WHERE i.id = invite_id
  ) INTO other_can_see_invite;

  -- Reset membership created by this test so Other Org stays isolated after rollback.
  DELETE FROM public.ci_organization_members
  WHERE organization_id = lifeline
    AND user_id = other_user;

  INSERT INTO phase7_results VALUES (
    '7_invite_row_exists_for_admin_path',
    invite_id IS NOT NULL AND other_can_see_invite,
    invite_id::text
  );

  INSERT INTO phase7_results VALUES (
    '8_other_org_still_exists',
    EXISTS (SELECT 1 FROM public.ci_organizations o WHERE o.id = other_org),
    other_org::text
  );

  other_can_see_lifeline := public.can_access_ci_org(lifeline, other_user);
  INSERT INTO phase7_results VALUES (
    '9_access_revoked_after_cleanup',
    other_can_see_lifeline = false,
    'membership removed; Other Org user cannot keep Lifeline access'
  );
END;
$$;

SELECT * FROM phase7_results ORDER BY step;

ROLLBACK;
