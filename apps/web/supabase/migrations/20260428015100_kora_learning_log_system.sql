-- KORA Learning Log System (LLS): backend-only Outcome Intelligence policy engine.
-- Phase 1 is tenant-scoped; cross-tenant/global insight aggregation is intentionally deferred.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared timestamp helper for LLS tables.
CREATE OR REPLACE FUNCTION public.lls_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Outcome events are the write-through intelligence record for every meaningful action.
CREATE TABLE IF NOT EXISTS public.lls_outcome_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  lead_id TEXT,
  subject_kind TEXT NOT NULL CHECK (
    subject_kind IN (
      'free_audit',
      'lead',
      'meeting',
      'payment',
      'scheduled_post',
      'publish_job',
      'content_plan_item',
      'brand_blueprint',
      'assistant_message',
      'client_action',
      'system'
    )
  ),
  subject_id TEXT,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('agent', 'employee', 'system', 'client', 'anonymous')),
  actor_id TEXT,
  action TEXT NOT NULL,
  strategy_origin TEXT NOT NULL DEFAULT 'ai_discovered' CHECK (
    strategy_origin IN ('human_defined', 'ai_discovered', 'hybrid')
  ),
  learning_mode TEXT NOT NULL DEFAULT 'validated_learning' CHECK (
    learning_mode IN ('validated_learning', 'exploratory_learning')
  ),
  intended_metric_type TEXT,
  actual_metric_type TEXT,
  predicted_conversion_probability NUMERIC CHECK (
    predicted_conversion_probability IS NULL OR predicted_conversion_probability BETWEEN 0 AND 1
  ),
  expected_baseline NUMERIC,
  delta_value NUMERIC,
  success_flag BOOLEAN,
  revenue_impact NUMERIC,
  time_to_outcome INTERVAL,
  time_to_conversion INTERVAL,
  failure_type TEXT NOT NULL DEFAULT 'unknown' CHECK (
    failure_type IN (
      'strategy_failure',
      'execution_failure',
      'audience_mismatch',
      'unclear_offer',
      'unknown'
    )
  ),
  outcome_verified BOOLEAN NOT NULL DEFAULT false,
  verification_source TEXT NOT NULL DEFAULT 'inferred' CHECK (
    verification_source IN ('system', 'analytics_api', 'human', 'inferred')
  ),
  verification_confidence_component NUMERIC NOT NULL DEFAULT 0 CHECK (
    verification_confidence_component BETWEEN 0 AND 1
  ),
  causal_method TEXT NOT NULL DEFAULT 'unknown' CHECK (
    causal_method IN ('direct_attribution', 'time_window', 'heuristic', 'unknown')
  ),
  causal_confidence_component NUMERIC NOT NULL DEFAULT 0 CHECK (
    causal_confidence_component BETWEEN 0 AND 1
  ),
  evidence_strength_component NUMERIC NOT NULL DEFAULT 0 CHECK (
    evidence_strength_component BETWEEN 0 AND 1
  ),
  final_confidence NUMERIC NOT NULL DEFAULT 0 CHECK (final_confidence BETWEEN 0 AND 1),
  confidence_model_version TEXT NOT NULL DEFAULT 'v1',
  intended_outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  actual_outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('success', 'failed', 'incomplete', 'pending')),
  business_goal TEXT NOT NULL CHECK (
    business_goal IN (
      'booked_strategy_session',
      'lead_quality',
      'revenue',
      'client_readiness',
      'campaign_performance',
      'retention',
      'execution_compliance',
      'brand_signal'
    )
  ),
  lesson TEXT,
  requires_review BOOLEAN NOT NULL DEFAULT false,
  correlation_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_validated_at TIMESTAMPTZ,
  freshness_score NUMERIC NOT NULL DEFAULT 1 CHECK (freshness_score BETWEEN 0 AND 1),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT lls_outcome_events_exploratory_human_check CHECK (
    learning_mode <> 'exploratory_learning'
    OR strategy_origin IN ('human_defined', 'hybrid')
  )
);

CREATE INDEX IF NOT EXISTS lls_outcome_events_tenant_time_idx
  ON public.lls_outcome_events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS lls_outcome_events_goal_time_idx
  ON public.lls_outcome_events (business_goal, occurred_at DESC);
CREATE INDEX IF NOT EXISTS lls_outcome_events_subject_idx
  ON public.lls_outcome_events (subject_kind, subject_id);
CREATE INDEX IF NOT EXISTS lls_outcome_events_correlation_idx
  ON public.lls_outcome_events (correlation_id);
CREATE INDEX IF NOT EXISTS lls_outcome_events_learning_lane_idx
  ON public.lls_outcome_events (strategy_origin, learning_mode);
CREATE INDEX IF NOT EXISTS lls_outcome_events_confidence_idx
  ON public.lls_outcome_events (outcome_verified, final_confidence);
CREATE INDEX IF NOT EXISTS lls_outcome_events_freshness_idx
  ON public.lls_outcome_events (freshness_score, last_validated_at);

CREATE TABLE IF NOT EXISTS public.lls_funnel_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_key TEXT NOT NULL,
  lead_kind TEXT NOT NULL CHECK (lead_kind IN ('subscriber', 'meeting', 'brand_blueprint', 'free_audit', 'customer')),
  tenant_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referrer TEXT,
  landing_path TEXT,
  attribution_confidence NUMERIC NOT NULL DEFAULT 0 CHECK (attribution_confidence BETWEEN 0 AND 1),
  multi_touch_weight NUMERIC NOT NULL DEFAULT 0 CHECK (multi_touch_weight BETWEEN 0 AND 1),
  first_touch_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_touch_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_key, lead_kind)
);

CREATE INDEX IF NOT EXISTS lls_funnel_attribution_tenant_idx
  ON public.lls_funnel_attribution (tenant_id);
CREATE INDEX IF NOT EXISTS lls_funnel_attribution_source_idx
  ON public.lls_funnel_attribution (utm_source, utm_campaign);

DROP TRIGGER IF EXISTS trg_lls_funnel_attribution_updated_at ON public.lls_funnel_attribution;
CREATE TRIGGER trg_lls_funnel_attribution_updated_at
BEFORE UPDATE ON public.lls_funnel_attribution
FOR EACH ROW EXECUTE FUNCTION public.lls_set_updated_at();

CREATE TABLE IF NOT EXISTS public.lls_client_readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL CHECK (score BETWEEN 0 AND 1),
  signal_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lls_client_readiness_latest_idx
  ON public.lls_client_readiness_scores (tenant_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS public.lls_client_execution_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL CHECK (score BETWEEN 0 AND 1),
  threshold NUMERIC NOT NULL DEFAULT 0.7 CHECK (threshold BETWEEN 0 AND 1),
  is_strategy_evaluable BOOLEAN NOT NULL DEFAULT true,
  signal_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lls_execution_compliance_latest_idx
  ON public.lls_client_execution_compliance (tenant_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS public.lls_reward_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_event_id UUID NOT NULL REFERENCES public.lls_outcome_events(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  reward NUMERIC NOT NULL,
  reward_source TEXT NOT NULL DEFAULT 'heuristic' CHECK (reward_source IN ('heuristic', 'rule', 'model', 'human')),
  notes TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS lls_reward_signals_event_idx
  ON public.lls_reward_signals (outcome_event_id);
CREATE INDEX IF NOT EXISTS lls_reward_signals_tenant_idx
  ON public.lls_reward_signals (tenant_id, assigned_at DESC);

CREATE TABLE IF NOT EXISTS public.lls_tenant_intent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  growth_priority TEXT NOT NULL DEFAULT 'balanced' CHECK (
    growth_priority IN ('aggressive', 'balanced', 'conservative')
  ),
  brand_positioning_type TEXT NOT NULL DEFAULT 'authority' CHECK (
    brand_positioning_type IN ('luxury', 'authority', 'community', 'mass')
  ),
  risk_tolerance NUMERIC NOT NULL DEFAULT 0.5 CHECK (risk_tolerance BETWEEN 0 AND 1),
  time_horizon TEXT NOT NULL DEFAULT 'medium_term',
  brand_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

DROP TRIGGER IF EXISTS trg_lls_tenant_intent_profiles_updated_at ON public.lls_tenant_intent_profiles;
CREATE TRIGGER trg_lls_tenant_intent_profiles_updated_at
BEFORE UPDATE ON public.lls_tenant_intent_profiles
FOR EACH ROW EXECUTE FUNCTION public.lls_set_updated_at();

CREATE TABLE IF NOT EXISTS public.lls_insight_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  proposed_by TEXT NOT NULL DEFAULT 'revenue-intelligence-run',
  proposal_kind TEXT NOT NULL CHECK (
    proposal_kind IN (
      'messaging_angle',
      'hook',
      'lead_source',
      'retargeting',
      'campaign',
      'client_readiness',
      'execution',
      'strategy_memory_update'
    )
  ),
  claim TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  affected_layer TEXT NOT NULL CHECK (affected_layer IN ('ads', 'funnel', 'content', 'execution', 'messaging')),
  strategy_origin TEXT NOT NULL CHECK (strategy_origin IN ('human_defined', 'ai_discovered', 'hybrid')),
  learning_mode TEXT NOT NULL DEFAULT 'validated_learning' CHECK (
    learning_mode IN ('validated_learning', 'exploratory_learning')
  ),
  activation_mode TEXT NOT NULL CHECK (
    activation_mode IN ('immediate', 'next_run', 'scheduled', 'experimental', 'reversible_experiment')
  ),
  activation_schedule TIMESTAMPTZ,
  rollback_condition JSONB,
  rollback_trigger TEXT,
  exploration_feedback_loop JSONB,
  evidence_event_ids UUID[] NOT NULL DEFAULT '{}',
  supporting_metrics JSONB,
  sample_size INTEGER,
  verification_confidence_component NUMERIC CHECK (
    verification_confidence_component IS NULL OR verification_confidence_component BETWEEN 0 AND 1
  ),
  causal_confidence_component NUMERIC CHECK (
    causal_confidence_component IS NULL OR causal_confidence_component BETWEEN 0 AND 1
  ),
  evidence_strength_component NUMERIC CHECK (
    evidence_strength_component IS NULL OR evidence_strength_component BETWEEN 0 AND 1
  ),
  final_confidence NUMERIC CHECK (final_confidence IS NULL OR final_confidence BETWEEN 0 AND 1),
  confidence_model_version TEXT NOT NULL DEFAULT 'v1',
  revenue_impact NUMERIC,
  risk_score NUMERIC NOT NULL CHECK (risk_score BETWEEN 0 AND 1),
  risk_type TEXT NOT NULL CHECK (risk_type IN ('strategy_shift', 'messaging_change', 'audience_targeting', 'unknown')),
  blast_radius TEXT NOT NULL CHECK (blast_radius IN ('low', 'medium', 'high')),
  variance_by_segment JSONB,
  time_distribution JSONB,
  sample_diversity_score NUMERIC CHECK (
    sample_diversity_score IS NULL OR sample_diversity_score BETWEEN 0 AND 1
  ),
  alignment_score NUMERIC NOT NULL CHECK (alignment_score BETWEEN 0 AND 1),
  brand_safety_flag BOOLEAN NOT NULL DEFAULT true,
  brand_vector JSONB,
  deviation_score NUMERIC CHECK (deviation_score IS NULL OR deviation_score BETWEEN 0 AND 1),
  intent_alignment_score NUMERIC CHECK (
    intent_alignment_score IS NULL OR intent_alignment_score BETWEEN 0 AND 1
  ),
  priority_score NUMERIC CHECK (priority_score IS NULL OR priority_score BETWEEN 0 AND 1),
  freshness_score NUMERIC NOT NULL DEFAULT 1 CHECK (freshness_score BETWEEN 0 AND 1),
  last_validated_at TIMESTAMPTZ,
  decay_status TEXT NOT NULL DEFAULT 'fresh' CHECK (decay_status IN ('fresh', 'stale', 'expired')),
  insight_status TEXT NOT NULL DEFAULT 'active' CHECK (
    insight_status IN ('active', 'stale', 'invalidated', 'archived')
  ),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
    status IN ('pending_review', 'approved', 'rejected', 'amended', 'deferred', 'test_only', 'override', 'applied')
  ),
  decision_action TEXT CHECK (
    decision_action IS NULL OR decision_action IN ('approve', 'reject', 'amend', 'defer', 'test_only', 'override')
  ),
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_timestamp TIMESTAMPTZ,
  converted_to_validated BOOLEAN NOT NULL DEFAULT false,
  converted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  conversion_notes TEXT,
  applied_to_memory_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lls_insight_validated_learning_check CHECK (
    learning_mode <> 'validated_learning'
    OR (
      final_confidence IS NOT NULL
      AND sample_size IS NOT NULL
      AND sample_size > 1
      AND cardinality(evidence_event_ids) > 0
      AND supporting_metrics IS NOT NULL
    )
  ),
  CONSTRAINT lls_insight_exploratory_learning_check CHECK (
    learning_mode <> 'exploratory_learning'
    OR (
      strategy_origin IN ('human_defined', 'hybrid')
      AND activation_mode IN ('experimental', 'reversible_experiment')
      AND exploration_feedback_loop IS NOT NULL
      AND intent_alignment_score IS NOT NULL
      AND brand_safety_flag = true
      AND risk_type IS NOT NULL
      AND blast_radius IS NOT NULL
    )
  ),
  CONSTRAINT lls_insight_reversible_rollback_check CHECK (
    activation_mode <> 'reversible_experiment'
    OR (rollback_condition IS NOT NULL AND rollback_trigger IS NOT NULL)
  ),
  CONSTRAINT lls_insight_high_risk_rollback_check CHECK (
    NOT (risk_score >= 0.7 OR blast_radius = 'high')
    OR (rollback_condition IS NOT NULL AND rollback_trigger IS NOT NULL)
  ),
  CONSTRAINT lls_insight_brand_safety_blocks_activation_check CHECK (
    brand_safety_flag = true
    OR status NOT IN ('approved', 'applied', 'test_only')
  ),
  CONSTRAINT lls_insight_conversion_audit_check CHECK (
    converted_to_validated = false
    OR converted_at IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS lls_insight_proposals_tenant_status_idx
  ON public.lls_insight_proposals (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS lls_insight_proposals_learning_lane_idx
  ON public.lls_insight_proposals (strategy_origin, learning_mode);
CREATE INDEX IF NOT EXISTS lls_insight_proposals_confidence_idx
  ON public.lls_insight_proposals (final_confidence);
CREATE INDEX IF NOT EXISTS lls_insight_proposals_risk_idx
  ON public.lls_insight_proposals (risk_score, blast_radius);
CREATE INDEX IF NOT EXISTS lls_insight_proposals_activation_idx
  ON public.lls_insight_proposals (activation_mode, activation_schedule);
CREATE INDEX IF NOT EXISTS lls_insight_proposals_lifecycle_idx
  ON public.lls_insight_proposals (insight_status, decay_status, last_validated_at);

DROP TRIGGER IF EXISTS trg_lls_insight_proposals_updated_at ON public.lls_insight_proposals;
CREATE TRIGGER trg_lls_insight_proposals_updated_at
BEFORE UPDATE ON public.lls_insight_proposals
FOR EACH ROW EXECUTE FUNCTION public.lls_set_updated_at();

CREATE TABLE IF NOT EXISTS public.lls_strategy_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  memory_kind TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  summary TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  strategy_origin TEXT NOT NULL CHECK (strategy_origin IN ('human_defined', 'ai_discovered', 'hybrid')),
  learning_mode TEXT NOT NULL CHECK (learning_mode IN ('validated_learning', 'exploratory_learning')),
  activation_mode TEXT NOT NULL CHECK (
    activation_mode IN ('immediate', 'next_run', 'scheduled', 'experimental', 'reversible_experiment')
  ),
  activation_schedule TIMESTAMPTZ,
  rollback_condition JSONB,
  rollback_trigger TEXT,
  activated_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ,
  freshness_score NUMERIC NOT NULL DEFAULT 1 CHECK (freshness_score BETWEEN 0 AND 1),
  decay_status TEXT NOT NULL DEFAULT 'fresh' CHECK (decay_status IN ('fresh', 'stale', 'expired')),
  insight_status TEXT NOT NULL DEFAULT 'active' CHECK (
    insight_status IN ('active', 'stale', 'invalidated', 'archived')
  ),
  source_proposal_id UUID NOT NULL REFERENCES public.lls_insight_proposals(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, memory_kind, key, version)
);

ALTER TABLE public.lls_insight_proposals
  ADD CONSTRAINT lls_insight_applied_memory_fk
  FOREIGN KEY (applied_to_memory_id)
  REFERENCES public.lls_strategy_memory(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lls_strategy_memory_tenant_current_idx
  ON public.lls_strategy_memory (tenant_id, memory_kind, key)
  WHERE is_current = true;
CREATE INDEX IF NOT EXISTS lls_strategy_memory_source_proposal_idx
  ON public.lls_strategy_memory (source_proposal_id);
CREATE INDEX IF NOT EXISTS lls_strategy_memory_lifecycle_idx
  ON public.lls_strategy_memory (insight_status, decay_status, last_validated_at);

DROP TRIGGER IF EXISTS trg_lls_strategy_memory_updated_at ON public.lls_strategy_memory;
CREATE TRIGGER trg_lls_strategy_memory_updated_at
BEFORE UPDATE ON public.lls_strategy_memory
FOR EACH ROW EXECUTE FUNCTION public.lls_set_updated_at();

CREATE TABLE IF NOT EXISTS public.lls_strategy_memory_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.lls_strategy_memory(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES public.lls_insight_proposals(id) ON DELETE RESTRICT,
  from_value JSONB,
  to_value JSONB NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_action TEXT NOT NULL CHECK (decision_action IN ('approve', 'amend', 'override')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS lls_strategy_memory_revisions_memory_idx
  ON public.lls_strategy_memory_revisions (memory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lls_strategy_memory_revisions_proposal_idx
  ON public.lls_strategy_memory_revisions (proposal_id);

CREATE TABLE IF NOT EXISTS public.lls_ria_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL CHECK (mode IN ('hourly_scoring', 'daily_insights', 'weekly_memory_batch')),
  metric_key TEXT NOT NULL,
  last_processed_at TIMESTAMPTZ,
  last_run_started_at TIMESTAMPTZ,
  last_run_completed_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'idle' CHECK (last_status IN ('idle', 'running', 'success', 'failed')),
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mode, metric_key)
);

DROP TRIGGER IF EXISTS trg_lls_ria_state_updated_at ON public.lls_ria_state;
CREATE TRIGGER trg_lls_ria_state_updated_at
BEFORE UPDATE ON public.lls_ria_state
FOR EACH ROW EXECUTE FUNCTION public.lls_set_updated_at();

CREATE OR REPLACE FUNCTION public.lls_ria_try_lock(lock_mode TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_try_advisory_lock(hashtext('lls_ria:' || lock_mode));
$$;

CREATE OR REPLACE FUNCTION public.lls_ria_unlock(lock_mode TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_advisory_unlock(hashtext('lls_ria:' || lock_mode));
$$;

CREATE TABLE IF NOT EXISTS public.lls_validation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  verification_weight NUMERIC NOT NULL DEFAULT 0.35 CHECK (verification_weight BETWEEN 0 AND 1),
  causal_weight NUMERIC NOT NULL DEFAULT 0.35 CHECK (causal_weight BETWEEN 0 AND 1),
  evidence_weight NUMERIC NOT NULL DEFAULT 0.30 CHECK (evidence_weight BETWEEN 0 AND 1),
  min_final_confidence NUMERIC NOT NULL DEFAULT 0.70 CHECK (min_final_confidence BETWEEN 0 AND 1),
  min_sample_size INTEGER NOT NULL DEFAULT 5 CHECK (min_sample_size >= 2),
  min_sample_diversity_score NUMERIC NOT NULL DEFAULT 0.50 CHECK (min_sample_diversity_score BETWEEN 0 AND 1),
  max_segment_variance NUMERIC NOT NULL DEFAULT 0.35 CHECK (max_segment_variance BETWEEN 0 AND 1),
  min_alignment_score NUMERIC NOT NULL DEFAULT 0.70 CHECK (min_alignment_score BETWEEN 0 AND 1),
  max_deviation_score NUMERIC NOT NULL DEFAULT 0.30 CHECK (max_deviation_score BETWEEN 0 AND 1),
  execution_compliance_threshold NUMERIC NOT NULL DEFAULT 0.70 CHECK (
    execution_compliance_threshold BETWEEN 0 AND 1
  ),
  high_risk_review_required BOOLEAN NOT NULL DEFAULT true,
  freshness_half_life_days INTEGER NOT NULL DEFAULT 30 CHECK (freshness_half_life_days > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id),
  CONSTRAINT lls_validation_weights_sum_check CHECK (
    abs((verification_weight + causal_weight + evidence_weight) - 1) < 0.0001
  )
);

DROP TRIGGER IF EXISTS trg_lls_validation_config_updated_at ON public.lls_validation_config;
CREATE TRIGGER trg_lls_validation_config_updated_at
BEFORE UPDATE ON public.lls_validation_config
FOR EACH ROW EXECUTE FUNCTION public.lls_set_updated_at();

CREATE TABLE IF NOT EXISTS public.lls_ria_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_function_url TEXT NOT NULL,
  shared_secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_lls_ria_config_updated_at ON public.lls_ria_config;
CREATE TRIGGER trg_lls_ria_config_updated_at
BEFORE UPDATE ON public.lls_ria_config
FOR EACH ROW EXECUTE FUNCTION public.lls_set_updated_at();

CREATE TABLE IF NOT EXISTS public.free_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_key TEXT NOT NULL,
  lead_email_lower TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  audit_angle TEXT NOT NULL,
  intended_cta TEXT,
  strategy_origin TEXT NOT NULL DEFAULT 'human_defined' CHECK (
    strategy_origin IN ('human_defined', 'ai_discovered', 'hybrid')
  ),
  learning_mode TEXT NOT NULL DEFAULT 'exploratory_learning' CHECK (
    learning_mode IN ('validated_learning', 'exploratory_learning')
  ),
  predicted_conversion_probability NUMERIC CHECK (
    predicted_conversion_probability IS NULL OR predicted_conversion_probability BETWEEN 0 AND 1
  ),
  expected_baseline NUMERIC,
  completion_status TEXT NOT NULL DEFAULT 'started' CHECK (
    completion_status IN ('started', 'abandoned', 'completed')
  ),
  score_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  actual_outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS free_audits_lead_key_idx ON public.free_audits (lead_key);
CREATE INDEX IF NOT EXISTS free_audits_customer_idx ON public.free_audits (customer_id);
CREATE INDEX IF NOT EXISTS free_audits_angle_status_idx
  ON public.free_audits (audit_angle, completion_status, started_at DESC);

DROP TRIGGER IF EXISTS trg_free_audits_updated_at ON public.free_audits;
CREATE TRIGGER trg_free_audits_updated_at
BEFORE UPDATE ON public.free_audits
FOR EACH ROW EXECUTE FUNCTION public.lls_set_updated_at();

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS lead_source JSONB;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS lead_source JSONB;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS lead_source JSONB;

CREATE OR REPLACE FUNCTION public.lls_enforce_strategy_memory_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposal public.lls_insight_proposals%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'lls_strategy_memory can only be written by service_role apply flow';
  END IF;

  SELECT * INTO proposal
  FROM public.lls_insight_proposals
  WHERE id = NEW.source_proposal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lls_strategy_memory requires a valid source_proposal_id';
  END IF;

  IF proposal.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'lls_strategy_memory tenant_id must match source proposal tenant_id';
  END IF;

  IF proposal.status NOT IN ('approved', 'applied', 'override') THEN
    RAISE EXCEPTION 'strategy memory source proposal must be approved/applied/override';
  END IF;

  IF proposal.decision_action NOT IN ('approve', 'override') THEN
    RAISE EXCEPTION 'strategy memory requires approve or override decision action';
  END IF;

  IF proposal.brand_safety_flag IS NOT true THEN
    RAISE EXCEPTION 'brand unsafe proposal cannot become strategy memory';
  END IF;

  IF proposal.insight_status IN ('stale', 'invalidated', 'archived') THEN
    RAISE EXCEPTION 'stale, invalidated, or archived proposal cannot become strategy memory';
  END IF;

  IF proposal.learning_mode = 'exploratory_learning'
     AND COALESCE(proposal.converted_to_validated, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'exploratory learning cannot write permanent memory until converted_to_validated is true';
  END IF;

  IF COALESCE(proposal.converted_to_validated, false) IS TRUE
     AND proposal.converted_at IS NULL THEN
    RAISE EXCEPTION 'converted exploratory learning must include converted_at';
  END IF;

  IF proposal.activation_mode = 'reversible_experiment'
     AND (proposal.rollback_condition IS NULL OR proposal.rollback_trigger IS NULL) THEN
    RAISE EXCEPTION 'reversible experiment requires rollback condition and trigger';
  END IF;

  NEW.strategy_origin := proposal.strategy_origin;
  NEW.learning_mode := proposal.learning_mode;
  NEW.activation_mode := proposal.activation_mode;
  NEW.activation_schedule := proposal.activation_schedule;
  NEW.rollback_condition := proposal.rollback_condition;
  NEW.rollback_trigger := proposal.rollback_trigger;
  NEW.activated_at := COALESCE(NEW.activated_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lls_strategy_memory_enforce_source ON public.lls_strategy_memory;
CREATE TRIGGER trg_lls_strategy_memory_enforce_source
BEFORE INSERT OR UPDATE ON public.lls_strategy_memory
FOR EACH ROW EXECUTE FUNCTION public.lls_enforce_strategy_memory_source();

ALTER TABLE public.lls_outcome_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_funnel_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_client_readiness_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_client_execution_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_reward_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_insight_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_strategy_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_strategy_memory_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_ria_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_validation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_ria_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lls_tenant_intent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dashboard staff manage LLS outcome events"
ON public.lls_outcome_events FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Dashboard staff manage LLS attribution"
ON public.lls_funnel_attribution FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Dashboard staff manage LLS readiness"
ON public.lls_client_readiness_scores FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Dashboard staff manage LLS execution compliance"
ON public.lls_client_execution_compliance FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Dashboard staff manage LLS reward signals"
ON public.lls_reward_signals FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Dashboard staff manage LLS insight proposals"
ON public.lls_insight_proposals FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Dashboard staff read LLS strategy memory"
ON public.lls_strategy_memory FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Dashboard staff read LLS memory revisions"
ON public.lls_strategy_memory_revisions FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Dashboard staff manage LLS validation config"
ON public.lls_validation_config FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Dashboard staff manage LLS RIA config"
ON public.lls_ria_config FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Dashboard staff manage LLS tenant intent"
ON public.lls_tenant_intent_profiles FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Dashboard staff read free audits"
ON public.free_audits FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

CREATE POLICY "Clients read own LLS outcome events"
ON public.lls_outcome_events FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Clients read own LLS insights"
ON public.lls_insight_proposals FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Clients read own LLS strategy memory"
ON public.lls_strategy_memory FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Clients read own readiness"
ON public.lls_client_readiness_scores FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Clients read own execution compliance"
ON public.lls_client_execution_compliance FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Clients read own tenant intent"
ON public.lls_tenant_intent_profiles FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Clients read own free audits"
ON public.free_audits FOR SELECT TO authenticated
USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

GRANT SELECT ON public.lls_outcome_events TO authenticated;
GRANT SELECT ON public.lls_funnel_attribution TO authenticated;
GRANT SELECT ON public.lls_client_readiness_scores TO authenticated;
GRANT SELECT ON public.lls_client_execution_compliance TO authenticated;
GRANT SELECT ON public.lls_reward_signals TO authenticated;
GRANT SELECT ON public.lls_insight_proposals TO authenticated;
GRANT SELECT ON public.lls_strategy_memory TO authenticated;
GRANT SELECT ON public.lls_strategy_memory_revisions TO authenticated;
GRANT SELECT ON public.lls_validation_config TO authenticated;
GRANT SELECT ON public.lls_ria_config TO authenticated;
GRANT SELECT ON public.lls_tenant_intent_profiles TO authenticated;
GRANT SELECT ON public.free_audits TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_outcome_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_funnel_attribution TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_client_readiness_scores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_client_execution_compliance TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_reward_signals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_insight_proposals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_strategy_memory TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_strategy_memory_revisions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_ria_state TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_validation_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_ria_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lls_tenant_intent_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.free_audits TO service_role;
GRANT EXECUTE ON FUNCTION public.lls_ria_try_lock(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.lls_ria_unlock(TEXT) TO service_role;

DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net is unavailable; use Vercel/GitHub cron fallback for LLS RIA.';
  END;

  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron is unavailable; use Vercel/GitHub cron fallback for LLS RIA.';
  END;

  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron')
     AND EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'net') THEN
    EXECUTE $cron$
      SELECT cron.schedule(
        'lls-ria-hourly-scoring',
        '7 * * * *',
        $job$
          SELECT net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object('Content-Type', 'application/json', 'x-lls-ria-secret', shared_secret),
            body := jsonb_build_object('mode', 'hourly_scoring')
          )
          FROM public.lls_ria_config
          WHERE is_active = true
          LIMIT 1;
        $job$
      )
      WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lls-ria-hourly-scoring');
    $cron$;

    EXECUTE $cron$
      SELECT cron.schedule(
        'lls-ria-daily-insights',
        '17 5 * * *',
        $job$
          SELECT net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object('Content-Type', 'application/json', 'x-lls-ria-secret', shared_secret),
            body := jsonb_build_object('mode', 'daily_insights')
          )
          FROM public.lls_ria_config
          WHERE is_active = true
          LIMIT 1;
        $job$
      )
      WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lls-ria-daily-insights');
    $cron$;

    EXECUTE $cron$
      SELECT cron.schedule(
        'lls-ria-weekly-memory-batch',
        '27 6 * * 1',
        $job$
          SELECT net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object('Content-Type', 'application/json', 'x-lls-ria-secret', shared_secret),
            body := jsonb_build_object('mode', 'weekly_memory_batch')
          )
          FROM public.lls_ria_config
          WHERE is_active = true
          LIMIT 1;
        $job$
      )
      WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lls-ria-weekly-memory-batch');
    $cron$;
  END IF;
END $$;
