-- Phase 5 verification: opportunity/action fields, guards, tenant helpers.

-- 1) New columns exist
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('ci_opportunities', 'ci_action_items')
  AND column_name IN (
    'source', 'source_url', 'priority',
    'assigned_to', 'intelligence_item_id', 'opportunity_id'
  )
ORDER BY table_name, column_name;

-- 2) Client-update guards exist
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'ci_guard_opportunity_client_update',
    'ci_guard_action_item_client_update'
  )
ORDER BY p.proname;

-- 3) Tenant isolation helpers
-- Other Org member cannot access Lifeline.
-- Other Org member can access Other Org.
-- Lifeline portal user is HQ admin (can_access all) but is not an Other Org member.
SELECT
  public.can_access_ci_org('87514a3f-ee8f-4b63-8a97-3e7f09dfa56e'::uuid, '90a55176-cd5c-44f7-a0c4-60e5670a87c6'::uuid) AS other_member_lifeline,
  public.can_access_ci_org('75ca6e28-9f62-4885-b8d6-8ee945d63e09'::uuid, '90a55176-cd5c-44f7-a0c4-60e5670a87c6'::uuid) AS other_member_other,
  public.is_ci_org_member('75ca6e28-9f62-4885-b8d6-8ee945d63e09'::uuid, '8fab27fb-7dda-4392-9ab1-51fccf1dd27e'::uuid) AS lifeline_user_is_other_member,
  public.is_ci_admin('90a55176-cd5c-44f7-a0c4-60e5670a87c6'::uuid) AS other_user_is_admin;
