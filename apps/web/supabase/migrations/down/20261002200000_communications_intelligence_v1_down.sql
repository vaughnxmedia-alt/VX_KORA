-- DOWN / reverse for 20261002200000_communications_intelligence_v1.sql
-- Manual rollback only. Does not touch hq_*, customers, profiles, or other existing tables.
-- Run in Supabase SQL editor if you need to fully remove Communications Intelligence V1.

-- Storage policies
DROP POLICY IF EXISTS "CI admin read counsel attachments" ON storage.objects;
DROP POLICY IF EXISTS "CI member read counsel attachments" ON storage.objects;
DROP POLICY IF EXISTS "CI admin upload counsel attachments" ON storage.objects;
DROP POLICY IF EXISTS "CI member upload counsel attachments" ON storage.objects;
DROP POLICY IF EXISTS "CI admin update counsel attachments" ON storage.objects;
DROP POLICY IF EXISTS "CI admin delete counsel attachments" ON storage.objects;
DROP POLICY IF EXISTS "CI member delete own counsel attachments" ON storage.objects;

DELETE FROM storage.objects WHERE bucket_id = 'ci-counsel-attachments';
DELETE FROM storage.buckets WHERE id = 'ci-counsel-attachments';

DROP FUNCTION IF EXISTS public.ci_storage_org_id(text);

-- Tables (CASCADE drops dependent policies/triggers)
DROP TABLE IF EXISTS public.ci_admin_notes CASCADE;
DROP TABLE IF EXISTS public.ci_counsel_requests CASCADE;
DROP TABLE IF EXISTS public.ci_action_items CASCADE;
DROP TABLE IF EXISTS public.ci_opportunities CASCADE;
DROP TABLE IF EXISTS public.ci_messaging_entries CASCADE;
DROP TABLE IF EXISTS public.ci_health_checks CASCADE;
DROP TABLE IF EXISTS public.ci_intelligence_items CASCADE;
DROP TABLE IF EXISTS public.ci_organization_members CASCADE;
DROP TABLE IF EXISTS public.ci_organizations CASCADE;

-- Functions / triggers (guards drop with tables; drop helpers explicitly)
DROP FUNCTION IF EXISTS public.ci_guard_counsel_request_client_update() CASCADE;
DROP FUNCTION IF EXISTS public.ci_guard_action_item_client_update() CASCADE;
DROP FUNCTION IF EXISTS public.can_access_ci_org(uuid, uuid);
DROP FUNCTION IF EXISTS public.ci_org_member_role(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_ci_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_ci_admin(uuid);
DROP FUNCTION IF EXISTS public.ci_set_updated_at() CASCADE;
