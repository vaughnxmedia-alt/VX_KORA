-- Closed-loop intelligence enforcement: every outcome must carry causal trace fields.

ALTER TABLE public.lls_outcome_events
  ADD COLUMN IF NOT EXISTS strategy_id UUID REFERENCES public.lls_strategy_memory(id) ON DELETE SET NULL;

ALTER TABLE public.lls_outcome_events
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES public.lls_insight_proposals(id) ON DELETE SET NULL;

ALTER TABLE public.lls_outcome_events
  ADD COLUMN IF NOT EXISTS messaging_angle TEXT;

ALTER TABLE public.lls_outcome_events
  ADD COLUMN IF NOT EXISTS hook TEXT;

ALTER TABLE public.lls_outcome_events
  ADD COLUMN IF NOT EXISTS projection_version TEXT;

CREATE INDEX IF NOT EXISTS lls_outcome_events_strategy_idx
  ON public.lls_outcome_events (strategy_id);

CREATE INDEX IF NOT EXISTS lls_outcome_events_proposal_idx
  ON public.lls_outcome_events (proposal_id);

CREATE INDEX IF NOT EXISTS lls_outcome_events_causal_trace_idx
  ON public.lls_outcome_events (correlation_id, messaging_angle, hook, projection_version);

ALTER TABLE public.lls_funnel_attribution
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

ALTER TABLE public.lls_funnel_attribution
  ADD COLUMN IF NOT EXISTS current_url TEXT;

ALTER TABLE public.lls_funnel_attribution
  ADD COLUMN IF NOT EXISTS lead_source TEXT;

ALTER TABLE public.lls_funnel_attribution
  ADD COLUMN IF NOT EXISTS messaging_angle TEXT;

ALTER TABLE public.lls_funnel_attribution
  ADD COLUMN IF NOT EXISTS hook TEXT;

CREATE INDEX IF NOT EXISTS lls_funnel_attribution_correlation_idx
  ON public.lls_funnel_attribution (correlation_id);

CREATE INDEX IF NOT EXISTS lls_funnel_attribution_angle_hook_idx
  ON public.lls_funnel_attribution (messaging_angle, hook);

ALTER TABLE public.kora_content_strategies
  ADD COLUMN IF NOT EXISTS lls_trace JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.kora_deliverables
  ADD COLUMN IF NOT EXISTS lls_trace JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS contact_name TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS business_name TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS website_link TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS instagram TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS facebook TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS tiktok TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS other_socials TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS growth_goal TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS current_blocker TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS target_audience_belief TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS intent TEXT CHECK (
    intent IS NULL OR intent IN ('ready_now', 'open_if_it_makes_sense', 'just_looking')
  );

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS readiness_level TEXT CHECK (
    readiness_level IS NULL OR readiness_level IN ('HOT', 'WARM', 'COLD')
  );

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS follow_up_status TEXT NOT NULL DEFAULT 'new' CHECK (
    follow_up_status IN ('new', 'reviewed', 'audit_sent', 'follow_up_needed', 'booked_strategy_session', 'converted', 'not_ready')
  );

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS retargeting_ready BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS audience_segment TEXT CHECK (
    audience_segment IS NULL OR audience_segment IN ('HOT', 'WARM', 'COLD')
  );

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS lead_source TEXT;

CREATE INDEX IF NOT EXISTS free_audits_readiness_idx
  ON public.free_audits (readiness_level, follow_up_status, created_at DESC);

CREATE INDEX IF NOT EXISTS free_audits_correlation_idx
  ON public.free_audits (correlation_id);

CREATE INDEX IF NOT EXISTS free_audits_lead_source_idx
  ON public.free_audits (lead_source);

CREATE OR REPLACE FUNCTION public.lls_enforce_outcome_causal_trace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.correlation_id IS NULL OR btrim(NEW.correlation_id) = '' THEN
    RAISE EXCEPTION 'lls_outcome_events.correlation_id is required';
  END IF;

  IF NEW.strategy_id IS NULL
     AND NEW.proposal_id IS NULL
     AND COALESCE(NEW.metadata ->> 'strategy_id', '') = ''
     AND COALESCE(NEW.metadata ->> 'proposal_id', '') = '' THEN
    RAISE EXCEPTION 'lls_outcome_events requires strategy_id or proposal_id for causal traceability';
  END IF;

  IF (NEW.messaging_angle IS NULL OR btrim(NEW.messaging_angle) = '')
     AND COALESCE(NEW.metadata ->> 'messaging_angle', '') = '' THEN
    RAISE EXCEPTION 'lls_outcome_events.messaging_angle is required';
  END IF;

  IF (NEW.hook IS NULL OR btrim(NEW.hook) = '')
     AND COALESCE(NEW.metadata ->> 'hook', '') = '' THEN
    RAISE EXCEPTION 'lls_outcome_events.hook is required';
  END IF;

  IF (NEW.projection_version IS NULL OR btrim(NEW.projection_version) = '')
     AND COALESCE(NEW.metadata ->> 'projection_version', '') = '' THEN
    RAISE EXCEPTION 'lls_outcome_events.projection_version is required';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lls_outcome_events_causal_trace
  ON public.lls_outcome_events;

CREATE TRIGGER trg_lls_outcome_events_causal_trace
BEFORE INSERT OR UPDATE OF correlation_id, strategy_id, proposal_id, messaging_angle, hook, projection_version
ON public.lls_outcome_events
FOR EACH ROW
EXECUTE FUNCTION public.lls_enforce_outcome_causal_trace();

GRANT EXECUTE ON FUNCTION public.lls_enforce_outcome_causal_trace() TO service_role;
