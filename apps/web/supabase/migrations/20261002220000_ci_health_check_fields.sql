-- Communications Intelligence Phase 4 — health check field alignment
-- Additive: why_it_matters + status labels used by the admin/portal UI.

ALTER TABLE public.ci_health_checks
  ADD COLUMN IF NOT EXISTS why_it_matters text;

COMMENT ON COLUMN public.ci_health_checks.why_it_matters IS
  'Plain-language reason this category matters to the organization. Secondary to explanation + recommended_improvement.';

ALTER TABLE public.ci_health_checks
  DROP CONSTRAINT IF EXISTS ci_health_checks_status_label_check;

UPDATE public.ci_health_checks
SET status_label = CASE status_label
  WHEN 'needs_work' THEN 'needs_attention'
  WHEN 'critical' THEN 'high_priority'
  WHEN 'unknown' THEN 'not_assessed'
  ELSE status_label
END
WHERE status_label IN ('needs_work', 'critical', 'unknown');

ALTER TABLE public.ci_health_checks
  ADD CONSTRAINT ci_health_checks_status_label_check
  CHECK (
    status_label IS NULL
    OR status_label IN (
      'strong',
      'stable',
      'needs_attention',
      'high_priority',
      'not_assessed'
    )
  );
