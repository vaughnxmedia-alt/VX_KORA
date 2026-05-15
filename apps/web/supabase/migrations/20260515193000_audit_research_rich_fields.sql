ALTER TABLE IF EXISTS public.audit_social_evidence
  ADD COLUMN IF NOT EXISTS agent_name TEXT,
  ADD COLUMN IF NOT EXISTS observed_signal TEXT,
  ADD COLUMN IF NOT EXISTS strategic_interpretation TEXT,
  ADD COLUMN IF NOT EXISTS source_confidence NUMERIC CHECK (source_confidence >= 0 AND source_confidence <= 1),
  ADD COLUMN IF NOT EXISTS inference_confidence NUMERIC CHECK (inference_confidence >= 0 AND inference_confidence <= 1),
  ADD COLUMN IF NOT EXISTS final_confidence NUMERIC CHECK (final_confidence >= 0 AND final_confidence <= 1),
  ADD COLUMN IF NOT EXISTS evidence_strength TEXT,
  ADD COLUMN IF NOT EXISTS suggested_audit_category TEXT;

ALTER TABLE IF EXISTS public.audit_findings
  ADD COLUMN IF NOT EXISTS diagnosis TEXT,
  ADD COLUMN IF NOT EXISTS evidence_summary TEXT,
  ADD COLUMN IF NOT EXISTS business_implication TEXT,
  ADD COLUMN IF NOT EXISTS revenue_implication TEXT,
  ADD COLUMN IF NOT EXISTS audience_implication TEXT,
  ADD COLUMN IF NOT EXISTS evidence_source_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS produced_by_agent TEXT,
  ADD COLUMN IF NOT EXISTS human_summary TEXT,
  ADD COLUMN IF NOT EXISTS admin_review_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS strategist_summary TEXT,
  ADD COLUMN IF NOT EXISTS top_opportunity TEXT,
  ADD COLUMN IF NOT EXISTS top_risk TEXT,
  ADD COLUMN IF NOT EXISTS recommended_priority TEXT,
  ADD COLUMN IF NOT EXISTS next_3_moves JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
      AND table_name = 'audit_findings'
      AND column_name = 'admin_review_status'
      AND constraint_name = 'audit_findings_admin_review_status_check'
  ) THEN
    ALTER TABLE public.audit_findings
      ADD CONSTRAINT audit_findings_admin_review_status_check
      CHECK (admin_review_status IN ('pending', 'approved', 'rejected', 'edited'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS audit_social_evidence_agent_idx
  ON public.audit_social_evidence (audit_id, evidence_strength, final_confidence DESC);

CREATE INDEX IF NOT EXISTS audit_findings_agent_idx
  ON public.audit_findings (audit_id, produced_by_agent, admin_review_status, confidence_score DESC);
