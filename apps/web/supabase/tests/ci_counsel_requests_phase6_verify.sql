-- Phase 6 verification: counsel request types, responses, related-record guards, grants.

-- 1) Request columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ci_counsel_requests'
  AND column_name IN (
    'request_type',
    'intelligence_item_id',
    'opportunity_id',
    'action_item_id'
  )
ORDER BY column_name;

-- 2) Response table exists
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ci_counsel_responses'
  AND column_name IN ('request_id', 'organization_id', 'body', 'created_by', 'updated_by')
ORDER BY column_name;

-- 3) Guards and helpers
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'ci_guard_counsel_request_related',
    'ci_guard_counsel_request_client_update'
  )
ORDER BY p.proname;

-- 4) Unpublished response columns are not granted to authenticated
SELECT column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'ci_counsel_requests'
  AND grantee = 'authenticated'
  AND privilege_type = 'SELECT'
  AND column_name IN ('response', 'responded_by', 'responded_at')
ORDER BY column_name;

-- 5) Client-readable request columns are granted
SELECT column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'ci_counsel_requests'
  AND grantee = 'authenticated'
  AND privilege_type = 'SELECT'
  AND column_name IN ('id', 'subject', 'request_type', 'status', 'urgency')
ORDER BY column_name;

-- 6) Tenant isolation helpers (Other Org member is not staff)
SELECT
  public.can_access_ci_org('87514a3f-ee8f-4b63-8a97-3e7f09dfa56e'::uuid, '90a55176-cd5c-44f7-a0c4-60e5670a87c6'::uuid) AS other_member_lifeline,
  public.can_access_ci_org('75ca6e28-9f62-4885-b8d6-8ee945d63e09'::uuid, '90a55176-cd5c-44f7-a0c4-60e5670a87c6'::uuid) AS other_member_other,
  public.is_ci_org_member('87514a3f-ee8f-4b63-8a97-3e7f09dfa56e'::uuid, '90a55176-cd5c-44f7-a0c4-60e5670a87c6'::uuid) AS other_member_of_lifeline,
  public.is_ci_admin('90a55176-cd5c-44f7-a0c4-60e5670a87c6'::uuid) AS other_user_is_admin,
  public.is_ci_admin('8fab27fb-7dda-4392-9ab1-51fccf1dd27e'::uuid) AS lifeline_user_is_admin;
