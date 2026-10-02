-- Phase 7 verification: onboarding columns, invite RPCs, tenant helpers.

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ci_organizations'
  AND column_name IN (
    'pr_media_concerns',
    'reputation_concerns',
    'has_approved_messaging',
    'onboarding_status'
  )
ORDER BY column_name;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ci_organization_invitations'
  AND column_name IN ('email', 'token_hash', 'expires_at', 'accepted_at', 'revoked_at')
ORDER BY column_name;

SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'ci_create_organization_invite',
    'ci_accept_organization_invite',
    'ci_preview_organization_invite',
    'ci_revoke_organization_invite',
    'ci_guard_organization_client_update'
  )
ORDER BY p.proname;

SELECT
  public.can_access_ci_org('87514a3f-ee8f-4b63-8a97-3e7f09dfa56e'::uuid, '90a55176-cd5c-44f7-a0c4-60e5670a87c6'::uuid) AS other_member_lifeline,
  public.is_ci_org_member('75ca6e28-9f62-4885-b8d6-8ee945d63e09'::uuid, '90a55176-cd5c-44f7-a0c4-60e5670a87c6'::uuid) AS other_member_other,
  public.is_ci_admin('90a55176-cd5c-44f7-a0c4-60e5670a87c6'::uuid) AS other_user_is_admin;
