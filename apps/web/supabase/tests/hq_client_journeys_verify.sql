-- Structural checks for Client Journeys.
-- Run in the Supabase SQL editor after 20261015220000_hq_client_journeys.sql.
-- Expect the counts and names below.

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'hq_journey_templates',
    'hq_journey_template_stages',
    'hq_journey_template_tasks',
    'hq_engagements',
    'hq_engagement_stages',
    'hq_engagement_tasks',
    'hq_engagement_assignments',
    'hq_engagement_notes',
    'hq_engagement_communications',
    'hq_engagement_documents'
  )
ORDER BY table_name;
-- Expect 10 tables.

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND (
    c.relname LIKE 'hq_engagement%'
    OR c.relname LIKE 'hq_journey_template%'
  )
ORDER BY 1;
-- Expect rls_enabled = true.

SELECT service_key, version, is_active
FROM public.hq_journey_templates
ORDER BY service_key, version;
-- Expect session, project, and counsel, each with an active version 1 on a fresh database.

SELECT id, public
FROM storage.buckets
WHERE id = 'hq-engagement-docs';
-- Expect one private bucket.

SELECT tgname
FROM pg_trigger
WHERE tgname IN (
  'hq_activity_log_block_history',
  'hq_engagement_notes_block_history',
  'hq_engagement_communications_block_history',
  'hq_clients_keep_engagement_history'
)
ORDER BY tgname;
-- Expect 4 triggers.
