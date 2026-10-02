-- Post-apply verification for Communications Intelligence V1
-- Run in Supabase SQL editor after applying 20261002200000_communications_intelligence_v1.sql
-- Expect: all checks return ok / expected counts.

-- 1) Tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'ci_%'
ORDER BY table_name;
-- Expect 9 tables:
-- ci_action_items, ci_admin_notes, ci_counsel_requests, ci_health_checks,
-- ci_intelligence_items, ci_messaging_entries, ci_opportunities,
-- ci_organization_members, ci_organizations

-- 2) RLS enabled
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname LIKE 'ci_%'
ORDER BY c.relname;
-- Expect rls_enabled = true for all

-- 3) Policy inventory
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'ci_%'
ORDER BY tablename, policyname;

-- 4) Helpers exist
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_ci_admin',
    'is_ci_org_member',
    'ci_org_member_role',
    'can_access_ci_org',
    'ci_storage_org_id',
    'ci_guard_action_item_client_update',
    'ci_guard_counsel_request_client_update',
    'ci_set_updated_at'
  )
ORDER BY p.proname;

-- 5) Storage bucket
SELECT id, public, file_size_limit
FROM storage.buckets
WHERE id = 'ci-counsel-attachments';

-- 6) No accidental grants of admin notes to anon
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'ci_admin_notes'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

-- 7) Sanity: hq_clients untouched / still present
SELECT COUNT(*) AS hq_clients_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'hq_clients';
