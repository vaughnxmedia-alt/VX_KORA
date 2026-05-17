-- DEV ONLY.
-- DO NOT RUN IN PRODUCTION.
--
-- Cleanup script for:
-- apps/web/supabase/seed/kora_closed_loop_dev_seed.sql
--
-- Removes only rows created by the dev seed label:
--   dev_seed_label = 'kora_closed_loop_dev_seed_v1'

begin;

-- ---------------------------------------------------------------------------
-- Delete dependent rows first, then parent rows.
-- ---------------------------------------------------------------------------

delete from public.buyer_purchase_attribution
where id = 'c8100001-0000-4000-8000-000000000001'
   or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.revenue_attribution
where id = 'c8000001-0000-4000-8000-000000000001'
   or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.lead_magnet_interactions
where id in (
  'c6000001-0000-4000-8000-000000000001',
  'c6000001-0000-4000-8000-000000000002',
  'c6000001-0000-4000-8000-000000000003',
  'c6000001-0000-4000-8000-000000000004',
  'c6000001-0000-4000-8000-000000000005',
  'c6000001-0000-4000-8000-000000000006'
)
or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.offer_presentations
where id = 'c7000001-0000-4000-8000-000000000001'
   or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.contract_attribution
where id = 'c8200001-0000-4000-8000-000000000001'
   or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.lls_outcome_events
where id = 'c9000001-0000-4000-8000-000000000001'
   or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.lls_funnel_attribution
where id in (
  'c9100001-0000-4000-8000-000000000001',
  'c9100001-0000-4000-8000-000000000002',
  'c9100001-0000-4000-8000-000000000003'
)
or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.kora_analytics_findings
where id in (
  'ca000001-0000-4000-8000-000000000001',
  'ca000001-0000-4000-8000-000000000002'
)
or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.audit_audio_deliverables
where id = 'c5400001-0000-4000-8000-000000000001'
   or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.audit_pdf_deliverables
where id = 'c5300001-0000-4000-8000-000000000001'
   or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.audit_intake_analysis
where id = 'c5200001-0000-4000-8000-000000000001'
   or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.audit_intake_original_answers
where id = 'c5100001-0000-4000-8000-000000000001'
   or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.audit_intakes
where id = 'c5000001-0000-4000-8000-000000000001'
   or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.buyer_journeys
where id in (
  'c4000001-0000-4000-8000-000000000001',
  'c4000001-0000-4000-8000-000000000002',
  'c4000001-0000-4000-8000-000000000003'
)
or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.buyer_identity_links
where id in (
  'c3000001-0000-4000-8000-000000000001',
  'c3000001-0000-4000-8000-000000000002',
  'c3000001-0000-4000-8000-000000000003',
  'c3000001-0000-4000-8000-000000000004',
  'c3000001-0000-4000-8000-000000000005',
  'c3000001-0000-4000-8000-000000000006'
)
or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.analytics_events
where id in (
  'c1000001-0000-4000-8000-000000000001',
  'c1000001-0000-4000-8000-000000000002',
  'c1000001-0000-4000-8000-000000000003',
  'c1000001-0000-4000-8000-000000000004',
  'c1000001-0000-4000-8000-000000000005',
  'c1000001-0000-4000-8000-000000000006',
  'c1000001-0000-4000-8000-000000000007',
  'c1000001-0000-4000-8000-000000000008',
  'c1000001-0000-4000-8000-000000000009'
)
or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.analytics_daily_rollups
where id = 'c2000001-0000-4000-8000-000000000001'
   or metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

delete from public.industry_audience_clusters
where id in ('dev_kora_cluster_photography', 'dev_kora_cluster_wellness')
  and metadata ->> 'dev_seed_label' = 'kora_closed_loop_dev_seed_v1';

commit;
