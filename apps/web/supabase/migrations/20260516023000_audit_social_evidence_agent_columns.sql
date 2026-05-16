ALTER TABLE public.audit_social_evidence
  ADD COLUMN IF NOT EXISTS agent_name TEXT,
  ADD COLUMN IF NOT EXISTS observed_signal TEXT,
  ADD COLUMN IF NOT EXISTS strategic_interpretation TEXT,
  ADD COLUMN IF NOT EXISTS source_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS inference_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS final_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS evidence_strength TEXT,
  ADD COLUMN IF NOT EXISTS suggested_audit_category TEXT;

CREATE INDEX IF NOT EXISTS audit_social_evidence_agent_name_idx
  ON public.audit_social_evidence (agent_name);

CREATE INDEX IF NOT EXISTS audit_social_evidence_strength_idx
  ON public.audit_social_evidence (evidence_strength);

NOTIFY pgrst, 'reload schema';
