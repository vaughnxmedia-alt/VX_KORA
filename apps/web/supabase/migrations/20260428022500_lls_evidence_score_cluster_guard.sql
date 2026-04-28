-- Phase 2 guardrail: insight proposals must point to an LLS evidence score
-- with the same tenant_id + cluster_key before RIA proposal writes are accepted.

ALTER TABLE public.lls_insight_proposals
  ADD COLUMN IF NOT EXISTS cluster_key TEXT;

ALTER TABLE public.lls_insight_proposals
  ADD COLUMN IF NOT EXISTS predicted_revenue_impact NUMERIC;

ALTER TABLE public.lls_insight_proposals
  ADD COLUMN IF NOT EXISTS confidence_explanation TEXT;

ALTER TABLE public.lls_insight_proposals
  ADD COLUMN IF NOT EXISTS baseline_comparison JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.lls_evidence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  cluster_key TEXT NOT NULL,
  evidence_event_ids UUID[] NOT NULL DEFAULT '{}',
  success_rate NUMERIC NOT NULL CHECK (success_rate BETWEEN 0 AND 1),
  sample_size INTEGER NOT NULL CHECK (sample_size >= 1),
  causal_strength NUMERIC NOT NULL CHECK (causal_strength BETWEEN 0 AND 1),
  sample_diversity NUMERIC NOT NULL CHECK (sample_diversity BETWEEN 0 AND 1),
  risk_penalty NUMERIC NOT NULL DEFAULT 0 CHECK (risk_penalty >= 0),
  final_confidence NUMERIC NOT NULL CHECK (final_confidence BETWEEN 0 AND 1),
  learning_mode TEXT NOT NULL CHECK (learning_mode IN ('validated_learning', 'exploratory_learning')),
  baseline_comparison JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lls_behavior_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_event_id UUID REFERENCES public.lls_outcome_events(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  subject_kind TEXT,
  subject_id TEXT,
  tone_type TEXT CHECK (
    tone_type IS NULL OR tone_type IN (
      'authority',
      'relatability',
      'challenger',
      'educational',
      'inspirational',
      'direct',
      'unknown'
    )
  ),
  emotional_trigger TEXT,
  audience_response_type TEXT,
  conversion_path TEXT,
  decision_confidence TEXT CHECK (
    decision_confidence IS NULL OR decision_confidence IN ('low', 'medium', 'high')
  ),
  time_to_decision_seconds NUMERIC CHECK (
    time_to_decision_seconds IS NULL OR time_to_decision_seconds >= 0
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lls_evidence_scores_tenant_cluster_idx
  ON public.lls_evidence_scores (tenant_id, cluster_key, computed_at DESC);

CREATE INDEX IF NOT EXISTS lls_evidence_scores_confidence_idx
  ON public.lls_evidence_scores (learning_mode, final_confidence, computed_at DESC);

CREATE INDEX IF NOT EXISTS lls_insight_proposals_cluster_idx
  ON public.lls_insight_proposals (tenant_id, cluster_key);

CREATE INDEX IF NOT EXISTS lls_insight_proposals_baseline_idx
  ON public.lls_insight_proposals USING gin (baseline_comparison);

CREATE INDEX IF NOT EXISTS lls_behavior_signals_event_idx
  ON public.lls_behavior_signals (outcome_event_id);

CREATE INDEX IF NOT EXISTS lls_behavior_signals_tenant_idx
  ON public.lls_behavior_signals (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lls_behavior_signals_decision_idx
  ON public.lls_behavior_signals (decision_confidence, time_to_decision_seconds);

CREATE OR REPLACE FUNCTION public.lls_enforce_proposal_evidence_cluster()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cluster_key IS NULL OR btrim(NEW.cluster_key) = '' THEN
    RAISE EXCEPTION 'lls_insight_proposals.cluster_key is required for evidence-backed proposals';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.lls_evidence_scores score
    WHERE score.tenant_id = NEW.tenant_id
      AND score.cluster_key = NEW.cluster_key
      AND score.learning_mode = NEW.learning_mode
      AND score.final_confidence = NEW.final_confidence
      AND score.sample_size = NEW.sample_size
      AND score.evidence_event_ids @> NEW.evidence_event_ids
  ) THEN
    RAISE EXCEPTION
      'proposal tenant_id/cluster_key must match an lls_evidence_scores row with matching learning mode, confidence, sample size, and evidence events';
  END IF;

  IF NEW.learning_mode = 'validated_learning'
     AND COALESCE((NEW.baseline_comparison ->> 'uplift_percentage')::NUMERIC, 0) <= 0 THEN
    RAISE EXCEPTION 'validated RIA proposals require positive baseline_comparison.uplift_percentage';
  END IF;

  IF NEW.learning_mode = 'validated_learning'
     AND COALESCE((NEW.baseline_comparison ->> 'confidence_delta')::NUMERIC, 0) <= 0 THEN
    RAISE EXCEPTION 'validated RIA proposals require positive baseline_comparison.confidence_delta';
  END IF;

  IF NEW.confidence_explanation IS NULL OR btrim(NEW.confidence_explanation) = '' THEN
    RAISE EXCEPTION 'RIA proposals require confidence_explanation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lls_insight_proposals_evidence_cluster
  ON public.lls_insight_proposals;

CREATE TRIGGER trg_lls_insight_proposals_evidence_cluster
BEFORE INSERT OR UPDATE OF tenant_id, cluster_key, learning_mode, final_confidence, sample_size, evidence_event_ids
ON public.lls_insight_proposals
FOR EACH ROW
WHEN (NEW.proposed_by = 'revenue-intelligence-run')
EXECUTE FUNCTION public.lls_enforce_proposal_evidence_cluster();

ALTER TABLE public.lls_evidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_behavior_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dashboard staff manage LLS evidence scores"
ON public.lls_evidence_scores FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Clients read own LLS evidence scores"
ON public.lls_evidence_scores FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Dashboard staff manage LLS behavior signals"
ON public.lls_behavior_signals FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Clients read own LLS behavior signals"
ON public.lls_behavior_signals FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

GRANT SELECT ON public.lls_evidence_scores TO authenticated;
GRANT SELECT ON public.lls_behavior_signals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_evidence_scores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_behavior_signals TO service_role;
GRANT EXECUTE ON FUNCTION public.lls_enforce_proposal_evidence_cluster() TO service_role;
