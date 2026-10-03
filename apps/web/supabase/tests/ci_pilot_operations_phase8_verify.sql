-- Phase 8 verification: pilot, activity, outcomes, reports, briefs, feedback, updated_by.

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'ci_pilot_enrollments',
    'ci_activity_events',
    'ci_outcomes',
    'ci_monthly_reports',
    'ci_weekly_briefs',
    'ci_recommendation_feedback',
    'ci_pilot_feedback'
  )
ORDER BY table_name;

SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('ci_record_activity', 'ci_touch_updated_by')
ORDER BY p.proname;

SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'ci_intelligence_items',
    'ci_health_checks',
    'ci_messaging_entries',
    'ci_opportunities',
    'ci_action_items',
    'ci_counsel_requests',
    'ci_counsel_responses',
    'ci_monthly_reports'
  )
  AND column_name = 'updated_by'
ORDER BY table_name;

SELECT polrelid::regclass::text AS table_name, polname
FROM pg_policy
WHERE polrelid IN (
  'public.ci_pilot_enrollments'::regclass,
  'public.ci_activity_events'::regclass,
  'public.ci_outcomes'::regclass,
  'public.ci_monthly_reports'::regclass,
  'public.ci_weekly_briefs'::regclass,
  'public.ci_recommendation_feedback'::regclass,
  'public.ci_pilot_feedback'::regclass
)
ORDER BY table_name, polname;
