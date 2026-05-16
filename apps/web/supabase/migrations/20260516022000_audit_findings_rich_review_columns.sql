ALTER TABLE public.audit_findings
  ADD COLUMN IF NOT EXISTS diagnosis TEXT,
  ADD COLUMN IF NOT EXISTS evidence_summary TEXT,
  ADD COLUMN IF NOT EXISTS business_implication TEXT,
  ADD COLUMN IF NOT EXISTS revenue_implication TEXT,
  ADD COLUMN IF NOT EXISTS audience_implication TEXT,
  ADD COLUMN IF NOT EXISTS evidence_source_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS produced_by_agent TEXT,
  ADD COLUMN IF NOT EXISTS admin_review_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS human_summary TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS strategist_summary TEXT,
  ADD COLUMN IF NOT EXISTS top_opportunity TEXT,
  ADD COLUMN IF NOT EXISTS top_risk TEXT,
  ADD COLUMN IF NOT EXISTS recommended_priority TEXT,
  ADD COLUMN IF NOT EXISTS next_3_moves JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS audit_findings_admin_review_status_idx
  ON public.audit_findings (admin_review_status);

NOTIFY pgrst, 'reload schema';
