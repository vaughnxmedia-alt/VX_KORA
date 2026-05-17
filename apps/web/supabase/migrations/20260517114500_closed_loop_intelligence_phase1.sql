-- KORA Closed-Loop Intelligence Phase 1
-- Additive schema for identity stitching, lead magnet intelligence, offer/revenue linkage,
-- LLS dimensional linkage, and audit data separation with backfill.

-- -----------------------------------------------------------------------------
-- 1) Extend first-party analytics / attribution facts
-- -----------------------------------------------------------------------------

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS lead_magnet_id TEXT,
  ADD COLUMN IF NOT EXISTS offer_stage TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS content_angle TEXT,
  ADD COLUMN IF NOT EXISTS message_angle TEXT,
  ADD COLUMN IF NOT EXISTS landing_page_url TEXT,
  ADD COLUMN IF NOT EXISTS audit_intake_id UUID,
  ADD COLUMN IF NOT EXISTS strategy_session_id UUID,
  ADD COLUMN IF NOT EXISTS buyer_journey_id UUID;

ALTER TABLE public.revenue_attribution
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS lead_magnet_id TEXT,
  ADD COLUMN IF NOT EXISTS offer_stage TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS content_angle TEXT,
  ADD COLUMN IF NOT EXISTS message_angle TEXT,
  ADD COLUMN IF NOT EXISTS landing_page_url TEXT,
  ADD COLUMN IF NOT EXISTS audit_intake_id UUID,
  ADD COLUMN IF NOT EXISTS strategy_session_id UUID,
  ADD COLUMN IF NOT EXISTS buyer_journey_id UUID;

ALTER TABLE public.buyer_purchase_attribution
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS lead_magnet_id TEXT,
  ADD COLUMN IF NOT EXISTS offer_stage TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS content_angle TEXT,
  ADD COLUMN IF NOT EXISTS message_angle TEXT,
  ADD COLUMN IF NOT EXISTS landing_page_url TEXT,
  ADD COLUMN IF NOT EXISTS audit_intake_id UUID,
  ADD COLUMN IF NOT EXISTS strategy_session_id UUID,
  ADD COLUMN IF NOT EXISTS buyer_journey_id UUID,
  ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS analytics_events_lead_magnet_idx
  ON public.analytics_events (lead_magnet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_buyer_journey_idx
  ON public.analytics_events (buyer_journey_id, created_at DESC);
CREATE INDEX IF NOT EXISTS revenue_attr_lead_magnet_idx
  ON public.revenue_attribution (lead_magnet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS revenue_attr_buyer_journey_idx
  ON public.revenue_attribution (buyer_journey_id, created_at DESC);
CREATE INDEX IF NOT EXISTS buyer_purchase_lead_magnet_idx
  ON public.buyer_purchase_attribution (lead_magnet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS buyer_purchase_buyer_journey_idx
  ON public.buyer_purchase_attribution (buyer_journey_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2) Lead magnets, buyer identity stitching, journeys, and contract attribution
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.lead_magnets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (
    kind IN (
      'free_audit',
      'strategy_session',
      'newsletter',
      'download',
      'webinar',
      'other'
    )
  ),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.lead_magnets (id, label, kind, is_paid, metadata)
VALUES
  ('free_audit', 'Free Audit', 'free_audit', false, jsonb_build_object('default_offer_stage', 'free')),
  ('strategy_session', 'Strategy Session', 'strategy_session', true, jsonb_build_object('default_offer_stage', 'paid_trust_builder')),
  ('the_brief', 'The Brief Subscription', 'newsletter', false, jsonb_build_object('default_offer_stage', 'subscription')),
  ('download', 'Download Resource', 'download', false, jsonb_build_object('default_offer_stage', 'free')),
  ('webinar', 'Webinar', 'webinar', false, jsonb_build_object('default_offer_stage', 'free')),
  ('other', 'Other Lead Magnet', 'other', false, jsonb_build_object('default_offer_stage', 'other'))
ON CONFLICT (id) DO UPDATE
SET
  label = EXCLUDED.label,
  kind = EXCLUDED.kind,
  is_paid = EXCLUDED.is_paid,
  metadata = EXCLUDED.metadata,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.buyer_identity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_buyer_key TEXT NOT NULL,
  identity_type TEXT NOT NULL CHECK (
    identity_type IN (
      'buyer_key',
      'anonymous_visitor_id',
      'session_id',
      'user_id',
      'lead_key',
      'customer_id',
      'email'
    )
  ),
  identity_value TEXT NOT NULL,
  site_id TEXT,
  brand_id TEXT,
  client_id TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (canonical_buyer_key, identity_type, identity_value)
);

CREATE INDEX IF NOT EXISTS buyer_identity_links_canonical_idx
  ON public.buyer_identity_links (canonical_buyer_key, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS buyer_identity_links_identity_idx
  ON public.buyer_identity_links (identity_type, identity_value);
CREATE INDEX IF NOT EXISTS buyer_identity_links_client_idx
  ON public.buyer_identity_links (client_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.buyer_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_key TEXT NOT NULL UNIQUE,
  site_id TEXT NOT NULL DEFAULT 'jahknowspr_web',
  brand_id TEXT NOT NULL DEFAULT 'jahknowspr',
  client_id TEXT,
  canonical_buyer_key TEXT NOT NULL,
  buyer_key TEXT,
  lead_key TEXT,
  anonymous_visitor_id TEXT,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  audit_intake_id UUID,
  strategy_session_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  contract_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  first_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_touch_utm_source TEXT,
  first_touch_utm_medium TEXT,
  first_touch_utm_campaign TEXT,
  first_touch_utm_content TEXT,
  first_touch_utm_term TEXT,
  last_touch_utm_source TEXT,
  last_touch_utm_medium TEXT,
  last_touch_utm_campaign TEXT,
  last_touch_utm_content TEXT,
  last_touch_utm_term TEXT,
  journey_status TEXT NOT NULL DEFAULT 'anonymous_engaged' CHECK (
    journey_status IN (
      'anonymous_engaged',
      'lead_captured',
      'audit_submitted',
      'strategy_session_booked',
      'offer_presented',
      'purchased',
      'contracted',
      'lost'
    )
  ),
  is_buyer BOOLEAN NOT NULL DEFAULT false,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  latest_offer_id TEXT,
  latest_campaign_id TEXT,
  latest_lead_magnet_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS buyer_journeys_lookup_idx
  ON public.buyer_journeys (canonical_buyer_key, last_event_at DESC);
CREATE INDEX IF NOT EXISTS buyer_journeys_client_idx
  ON public.buyer_journeys (client_id, journey_status, last_event_at DESC);
CREATE INDEX IF NOT EXISTS buyer_journeys_revenue_idx
  ON public.buyer_journeys (is_buyer, total_revenue DESC);

CREATE TABLE IF NOT EXISTS public.lead_magnet_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_magnet_id TEXT REFERENCES public.lead_magnets(id) ON DELETE SET NULL,
  interaction_kind TEXT NOT NULL CHECK (
    interaction_kind IN (
      'view',
      'start',
      'submit',
      'qualified',
      'booking',
      'purchase',
      'nurture',
      'no_purchase',
      'contract'
    )
  ),
  interaction_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    interaction_status IN ('success', 'pending', 'failed', 'abandoned', 'unknown')
  ),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  site_id TEXT NOT NULL DEFAULT 'jahknowspr_web',
  brand_id TEXT NOT NULL DEFAULT 'jahknowspr',
  client_id TEXT,
  buyer_journey_id UUID REFERENCES public.buyer_journeys(id) ON DELETE SET NULL,
  canonical_buyer_key TEXT,
  buyer_key TEXT,
  lead_key TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  anonymous_visitor_id TEXT,
  session_id TEXT,
  audit_intake_id UUID,
  strategy_session_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  campaign_id TEXT,
  adset_id TEXT,
  creative_id TEXT,
  audience_cluster_id TEXT,
  audience_pool_id TEXT,
  offer_id TEXT,
  offer_stage TEXT,
  revenue_value NUMERIC(12,2),
  currency TEXT,
  source_event_id UUID REFERENCES public.analytics_events(id) ON DELETE SET NULL,
  source_revenue_attribution_id UUID REFERENCES public.revenue_attribution(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS lead_magnet_interactions_magnet_idx
  ON public.lead_magnet_interactions (lead_magnet_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS lead_magnet_interactions_journey_idx
  ON public.lead_magnet_interactions (buyer_journey_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS lead_magnet_interactions_offer_idx
  ON public.lead_magnet_interactions (offer_id, offer_stage, occurred_at DESC);
CREATE INDEX IF NOT EXISTS lead_magnet_interactions_campaign_idx
  ON public.lead_magnet_interactions (campaign_id, adset_id, creative_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.offer_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  site_id TEXT NOT NULL DEFAULT 'jahknowspr_web',
  brand_id TEXT NOT NULL DEFAULT 'jahknowspr',
  client_id TEXT,
  buyer_journey_id UUID REFERENCES public.buyer_journeys(id) ON DELETE SET NULL,
  canonical_buyer_key TEXT,
  buyer_key TEXT,
  lead_key TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  offer_id TEXT NOT NULL,
  offer_name TEXT,
  offer_type TEXT,
  offer_stage TEXT,
  lead_magnet_id TEXT REFERENCES public.lead_magnets(id) ON DELETE SET NULL,
  audit_intake_id UUID,
  strategy_session_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  campaign_id TEXT,
  adset_id TEXT,
  creative_id TEXT,
  audience_cluster_id TEXT,
  audience_pool_id TEXT,
  presented_by TEXT,
  source_event_id UUID REFERENCES public.analytics_events(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS offer_presentations_offer_idx
  ON public.offer_presentations (offer_id, offer_stage, presented_at DESC);
CREATE INDEX IF NOT EXISTS offer_presentations_journey_idx
  ON public.offer_presentations (buyer_journey_id, presented_at DESC);

CREATE TABLE IF NOT EXISTS public.contract_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  client_id TEXT,
  brand_id TEXT NOT NULL DEFAULT 'jahknowspr',
  buyer_journey_id UUID REFERENCES public.buyer_journeys(id) ON DELETE SET NULL,
  buyer_key TEXT,
  lead_key TEXT,
  offer_id TEXT,
  offer_stage TEXT NOT NULL DEFAULT 'long_term_contract',
  lead_magnet_id TEXT REFERENCES public.lead_magnets(id) ON DELETE SET NULL,
  campaign_id TEXT,
  adset_id TEXT,
  creative_id TEXT,
  audience_cluster_id TEXT,
  audience_pool_id TEXT,
  source_revenue_attribution_id UUID REFERENCES public.revenue_attribution(id) ON DELETE SET NULL,
  source_event_id UUID REFERENCES public.analytics_events(id) ON DELETE SET NULL,
  contract_value NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (
    status IN ('prospect', 'contract_sent', 'contract_signed', 'active_client', 'inactive')
  ),
  signed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS contract_attribution_customer_idx
  ON public.contract_attribution (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contract_attribution_journey_idx
  ON public.contract_attribution (buyer_journey_id, created_at DESC);

ALTER TABLE public.revenue_attribution
  ADD COLUMN IF NOT EXISTS contract_attribution_id UUID REFERENCES public.contract_attribution(id) ON DELETE SET NULL;

ALTER TABLE public.buyer_purchase_attribution
  ADD COLUMN IF NOT EXISTS contract_attribution_id UUID REFERENCES public.contract_attribution(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 3) Offer model extensions and cross-table linkage columns
-- -----------------------------------------------------------------------------

ALTER TABLE public.client_offer_catalog
  ADD COLUMN IF NOT EXISTS offer_stage TEXT NOT NULL DEFAULT 'standard' CHECK (
    offer_stage IN (
      'free',
      'paid_low_ticket',
      'paid_trust_builder',
      'retainer',
      'long_term_contract',
      'standard',
      'other'
    )
  ),
  ADD COLUMN IF NOT EXISTS offer_category TEXT,
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_paid_trust_builder BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_long_term_contract BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_lead_magnet_id TEXT REFERENCES public.lead_magnets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.free_audits
  ADD COLUMN IF NOT EXISTS audit_intake_id UUID,
  ADD COLUMN IF NOT EXISTS buyer_key TEXT,
  ADD COLUMN IF NOT EXISTS strategy_session_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS audit_intake_id UUID,
  ADD COLUMN IF NOT EXISTS buyer_key TEXT,
  ADD COLUMN IF NOT EXISTS buyer_journey_id UUID REFERENCES public.buyer_journeys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_magnet_id TEXT REFERENCES public.lead_magnets(id) ON DELETE SET NULL;

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS buyer_key TEXT,
  ADD COLUMN IF NOT EXISTS buyer_journey_id UUID REFERENCES public.buyer_journeys(id) ON DELETE SET NULL;

ALTER TABLE public.lls_outcome_events
  ADD COLUMN IF NOT EXISTS buyer_key TEXT,
  ADD COLUMN IF NOT EXISTS buyer_journey_id UUID REFERENCES public.buyer_journeys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audit_intake_id UUID,
  ADD COLUMN IF NOT EXISTS strategy_session_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_magnet_id TEXT REFERENCES public.lead_magnets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS adset_id TEXT,
  ADD COLUMN IF NOT EXISTS creative_id TEXT,
  ADD COLUMN IF NOT EXISTS offer_id TEXT,
  ADD COLUMN IF NOT EXISTS offer_stage TEXT,
  ADD COLUMN IF NOT EXISTS audience_cluster_id TEXT,
  ADD COLUMN IF NOT EXISTS audience_pool_id TEXT,
  ADD COLUMN IF NOT EXISTS revenue_attribution_id UUID REFERENCES public.revenue_attribution(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_attribution_id UUID REFERENCES public.contract_attribution(id) ON DELETE SET NULL;

ALTER TABLE public.lls_funnel_attribution
  ADD COLUMN IF NOT EXISTS buyer_key TEXT,
  ADD COLUMN IF NOT EXISTS lead_magnet_id TEXT REFERENCES public.lead_magnets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS adset_id TEXT,
  ADD COLUMN IF NOT EXISTS creative_id TEXT,
  ADD COLUMN IF NOT EXISTS offer_id TEXT,
  ADD COLUMN IF NOT EXISTS offer_stage TEXT,
  ADD COLUMN IF NOT EXISTS audience_cluster_id TEXT,
  ADD COLUMN IF NOT EXISTS audience_pool_id TEXT;

CREATE INDEX IF NOT EXISTS free_audits_audit_intake_idx
  ON public.free_audits (audit_intake_id);
CREATE INDEX IF NOT EXISTS free_audits_buyer_key_idx
  ON public.free_audits (buyer_key);
CREATE INDEX IF NOT EXISTS meetings_audit_intake_idx
  ON public.meetings (audit_intake_id);
CREATE INDEX IF NOT EXISTS meetings_buyer_journey_idx
  ON public.meetings (buyer_journey_id);
CREATE INDEX IF NOT EXISTS lls_outcome_events_buyer_journey_idx
  ON public.lls_outcome_events (buyer_journey_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS lls_outcome_events_dimensional_idx
  ON public.lls_outcome_events (lead_magnet_id, campaign_id, offer_id, audience_cluster_id, occurred_at DESC);

-- -----------------------------------------------------------------------------
-- 4) Audit data separation tables
-- -----------------------------------------------------------------------------

-- Keeps source intake lifecycle and attribution separate from analysis and deliverables.
CREATE TABLE IF NOT EXISTS public.audit_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  free_audit_id UUID UNIQUE REFERENCES public.free_audits(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  lead_key TEXT NOT NULL,
  lead_email_lower TEXT,
  status TEXT NOT NULL DEFAULT 'started' CHECK (
    status IN (
      'started',
      'completed',
      'abandoned',
      'reviewed',
      'audit_sent',
      'follow_up_needed',
      'booked_strategy_session',
      'converted',
      'not_ready'
    )
  ),
  source TEXT NOT NULL DEFAULT 'free_audit_form',
  correlation_id TEXT,
  lead_source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referrer TEXT,
  landing_page TEXT,
  current_url TEXT,
  first_touch_at TIMESTAMPTZ,
  last_touch_at TIMESTAMPTZ,
  consent_follow_up BOOLEAN NOT NULL DEFAULT true,
  consent_marketing BOOLEAN,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stores only original user-submitted answers from the intake form.
CREATE TABLE IF NOT EXISTS public.audit_intake_original_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_intake_id UUID NOT NULL UNIQUE REFERENCES public.audit_intakes(id) ON DELETE CASCADE,
  contact_name TEXT,
  phone TEXT,
  business_entity_type TEXT,
  business_name TEXT,
  public_business_name TEXT,
  website_link TEXT,
  instagram TEXT,
  facebook TEXT,
  tiktok TEXT,
  other_socials TEXT,
  growth_goal TEXT,
  current_blocker TEXT,
  target_audience_belief TEXT,
  intent TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Stores KORA-derived analysis and scores, isolated from original answers.
CREATE TABLE IF NOT EXISTS public.audit_intake_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_intake_id UUID NOT NULL UNIQUE REFERENCES public.audit_intakes(id) ON DELETE CASCADE,
  readiness_level TEXT,
  audience_segment TEXT,
  audit_angle TEXT,
  intended_cta TEXT,
  predicted_conversion_probability NUMERIC,
  expected_baseline NUMERIC,
  completion_status TEXT,
  score_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  actual_outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  interpreted_growth_goal TEXT,
  interpreted_blocker TEXT,
  interpreted_target_audience TEXT,
  positioning_gap_summary TEXT,
  documentation_risk TEXT,
  analysis_version TEXT NOT NULL DEFAULT 'v1',
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Stores generated/sent PDF report content and references separately from intake+analysis.
CREATE TABLE IF NOT EXISTS public.audit_pdf_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_intake_id UUID NOT NULL UNIQUE REFERENCES public.audit_intakes(id) ON DELETE CASCADE,
  free_audit_id UUID REFERENCES public.free_audits(id) ON DELETE SET NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    delivery_status IN ('generated', 'sent', 'failed', 'pending')
  ),
  generated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  report_subject TEXT,
  report_filename TEXT,
  pdf_storage_bucket TEXT,
  pdf_storage_path TEXT,
  pdf_public_url TEXT,
  report_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ratings_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  diagnosis_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_pdf_deliverables_intake_idx
  ON public.audit_pdf_deliverables (audit_intake_id, created_at DESC);

-- Stores audio script + file linkage separately from intake+analysis.
CREATE TABLE IF NOT EXISTS public.audit_audio_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_intake_id UUID NOT NULL UNIQUE REFERENCES public.audit_intakes(id) ON DELETE CASCADE,
  free_audit_id UUID REFERENCES public.free_audits(id) ON DELETE SET NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    delivery_status IN ('generated', 'sent', 'failed', 'pending')
  ),
  generated_at TIMESTAMPTZ,
  audio_storage_bucket TEXT,
  audio_storage_path TEXT,
  audio_public_url TEXT,
  script TEXT,
  script_version TEXT,
  script_writer TEXT,
  script_model TEXT,
  script_style_preset TEXT,
  voice_preset TEXT,
  voice_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio_mode TEXT,
  word_count INTEGER,
  estimated_minutes NUMERIC(10,2),
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  plain_language_brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_audio_deliverables_intake_idx
  ON public.audit_audio_deliverables (audit_intake_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 5) Backfill for audit separation + identity/journey/linkage
-- -----------------------------------------------------------------------------

INSERT INTO public.audit_intakes (
  id,
  free_audit_id,
  customer_id,
  lead_key,
  lead_email_lower,
  status,
  source,
  correlation_id,
  lead_source,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_content,
  utm_term,
  referrer,
  landing_page,
  current_url,
  first_touch_at,
  last_touch_at,
  metadata,
  created_at,
  updated_at
)
SELECT
  f.id,
  f.id,
  f.customer_id,
  f.lead_key,
  f.lead_email_lower,
  COALESCE(f.follow_up_status, f.completion_status, 'started'),
  'free_audit_form',
  f.correlation_id,
  f.lead_source,
  f.metadata -> 'attribution' ->> 'utm_source',
  f.metadata -> 'attribution' ->> 'utm_medium',
  f.metadata -> 'attribution' ->> 'utm_campaign',
  f.metadata -> 'attribution' ->> 'utm_content',
  f.metadata -> 'attribution' ->> 'utm_term',
  f.metadata -> 'attribution' ->> 'referrer',
  COALESCE(f.metadata -> 'attribution' ->> 'landing_page', f.metadata -> 'attribution' ->> 'landing_path'),
  f.metadata -> 'attribution' ->> 'current_url',
  CASE
    WHEN COALESCE(f.metadata -> 'attribution' ->> 'first_touch_at', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
      THEN (f.metadata -> 'attribution' ->> 'first_touch_at')::timestamptz
    ELSE NULL
  END,
  CASE
    WHEN COALESCE(f.metadata -> 'attribution' ->> 'last_touch_at', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
      THEN (f.metadata -> 'attribution' ->> 'last_touch_at')::timestamptz
    ELSE NULL
  END,
  f.metadata,
  f.created_at,
  f.updated_at
FROM public.free_audits f
LEFT JOIN public.audit_intakes ai ON ai.free_audit_id = f.id
WHERE ai.id IS NULL;

UPDATE public.free_audits f
SET audit_intake_id = ai.id
FROM public.audit_intakes ai
WHERE ai.free_audit_id = f.id
  AND (f.audit_intake_id IS NULL OR f.audit_intake_id <> ai.id);

INSERT INTO public.audit_intake_original_answers (
  audit_intake_id,
  contact_name,
  phone,
  business_entity_type,
  business_name,
  public_business_name,
  website_link,
  instagram,
  facebook,
  tiktok,
  other_socials,
  growth_goal,
  current_blocker,
  target_audience_belief,
  intent,
  submitted_at,
  raw_answers,
  metadata
)
SELECT
  ai.id,
  f.contact_name,
  f.phone,
  f.metadata ->> 'business_entity_type',
  f.metadata ->> 'legal_or_registered_business_name',
  COALESCE(f.metadata ->> 'public_business_name', f.business_name),
  f.website_link,
  f.instagram,
  f.facebook,
  f.tiktok,
  f.other_socials,
  f.growth_goal,
  f.current_blocker,
  f.target_audience_belief,
  f.intent,
  f.started_at,
  jsonb_build_object(
    'contact_name', f.contact_name,
    'phone', f.phone,
    'business_entity_type', f.metadata ->> 'business_entity_type',
    'business_name', f.metadata ->> 'legal_or_registered_business_name',
    'public_business_name', COALESCE(f.metadata ->> 'public_business_name', f.business_name),
    'website_link', f.website_link,
    'instagram', f.instagram,
    'facebook', f.facebook,
    'tiktok', f.tiktok,
    'other_socials', f.other_socials,
    'growth_goal', f.growth_goal,
    'current_blocker', f.current_blocker,
    'target_audience_belief', f.target_audience_belief,
    'intent', f.intent
  ),
  jsonb_build_object('backfilled_from_free_audits', true)
FROM public.free_audits f
JOIN public.audit_intakes ai ON ai.free_audit_id = f.id
LEFT JOIN public.audit_intake_original_answers oa ON oa.audit_intake_id = ai.id
WHERE oa.id IS NULL;

INSERT INTO public.audit_intake_analysis (
  audit_intake_id,
  readiness_level,
  audience_segment,
  audit_angle,
  intended_cta,
  predicted_conversion_probability,
  expected_baseline,
  completion_status,
  score_summary,
  actual_outcome,
  interpreted_growth_goal,
  interpreted_blocker,
  interpreted_target_audience,
  positioning_gap_summary,
  documentation_risk,
  analysis_version,
  analyzed_at,
  metadata
)
SELECT
  ai.id,
  f.readiness_level,
  f.audience_segment,
  f.audit_angle,
  f.intended_cta,
  f.predicted_conversion_probability,
  f.expected_baseline,
  f.completion_status,
  COALESCE(f.score_summary, '{}'::jsonb),
  COALESCE(f.actual_outcome, '{}'::jsonb),
  f.growth_goal,
  f.current_blocker,
  f.target_audience_belief,
  NULL,
  CASE
    WHEN COALESCE((f.metadata ->> 'requires_filing_notice')::boolean, false) THEN 'business_documentation_gap'
    ELSE NULL
  END,
  'v1-backfill',
  COALESCE(f.completed_at, f.updated_at, f.created_at),
  jsonb_build_object('backfilled_from_free_audits', true)
FROM public.free_audits f
JOIN public.audit_intakes ai ON ai.free_audit_id = f.id
LEFT JOIN public.audit_intake_analysis ia ON ia.audit_intake_id = ai.id
WHERE ia.id IS NULL;

INSERT INTO public.audit_pdf_deliverables (
  audit_intake_id,
  free_audit_id,
  delivery_status,
  generated_at,
  sent_at,
  report_subject,
  report_filename,
  report_payload,
  ratings_payload,
  metadata
)
SELECT
  ai.id,
  f.id,
  CASE
    WHEN f.follow_up_status = 'audit_sent' THEN 'sent'
    WHEN f.completion_status = 'completed' THEN 'generated'
    ELSE 'pending'
  END,
  COALESCE(f.completed_at, f.updated_at, f.created_at),
  CASE WHEN f.follow_up_status = 'audit_sent' THEN COALESCE(f.completed_at, f.updated_at) ELSE NULL END,
  CONCAT('Brand Diagnosis for ', COALESCE(f.business_name, 'Unknown Business')),
  CONCAT(COALESCE(NULLIF(regexp_replace(lower(COALESCE(f.business_name, 'brand-audit')), '[^a-z0-9]+', '-', 'g'), ''), 'brand-audit'), '.pdf'),
  jsonb_build_object(
    'audit_angle', f.audit_angle,
    'intended_cta', f.intended_cta
  ),
  COALESCE(f.score_summary, '{}'::jsonb),
  jsonb_build_object('backfilled_from_free_audits', true)
FROM public.free_audits f
JOIN public.audit_intakes ai ON ai.free_audit_id = f.id
LEFT JOIN public.audit_pdf_deliverables pd ON pd.audit_intake_id = ai.id
WHERE pd.id IS NULL;

INSERT INTO public.audit_audio_deliverables (
  audit_intake_id,
  free_audit_id,
  delivery_status,
  generated_at,
  audio_storage_bucket,
  audio_storage_path,
  audio_public_url,
  script,
  script_version,
  script_writer,
  script_model,
  script_style_preset,
  voice_preset,
  voice_settings,
  audio_mode,
  word_count,
  estimated_minutes,
  checks,
  plain_language_brief,
  metadata
)
SELECT
  ai.id,
  f.id,
  'generated',
  CASE
    WHEN COALESCE(f.metadata -> 'report_audio' ->> 'generated_at', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
      THEN (f.metadata -> 'report_audio' ->> 'generated_at')::timestamptz
    ELSE f.updated_at
  END,
  f.metadata -> 'report_audio' ->> 'storage_bucket',
  f.metadata -> 'report_audio' ->> 'storage_path',
  f.metadata -> 'report_audio' ->> 'url',
  f.metadata -> 'report_audio' ->> 'script',
  f.metadata -> 'report_audio' ->> 'script_version',
  f.metadata -> 'report_audio' ->> 'script_writer',
  f.metadata -> 'report_audio' ->> 'script_model',
  f.metadata -> 'report_audio' ->> 'script_style_preset',
  f.metadata -> 'report_audio' ->> 'voice_preset',
  COALESCE(f.metadata -> 'report_audio' -> 'voices', '{}'::jsonb),
  f.metadata -> 'report_audio' ->> 'audio_mode',
  CASE
    WHEN COALESCE(f.metadata -> 'report_audio' ->> 'word_count', '') ~ '^[0-9]+$'
      THEN (f.metadata -> 'report_audio' ->> 'word_count')::integer
    ELSE NULL
  END,
  CASE
    WHEN COALESCE(f.metadata -> 'report_audio' ->> 'estimated_minutes', '') ~ '^[0-9]+(\.[0-9]+)?$'
      THEN (f.metadata -> 'report_audio' ->> 'estimated_minutes')::numeric
    ELSE NULL
  END,
  COALESCE(f.metadata -> 'report_audio' -> 'audio_brief_checks', '{}'::jsonb),
  COALESCE(f.metadata -> 'report_audio' -> 'plain_language_audio_brief', '{}'::jsonb),
  jsonb_build_object('backfilled_from_free_audits', true)
FROM public.free_audits f
JOIN public.audit_intakes ai ON ai.free_audit_id = f.id
LEFT JOIN public.audit_audio_deliverables ad ON ad.audit_intake_id = ai.id
WHERE ad.id IS NULL
  AND COALESCE(f.metadata -> 'report_audio' ->> 'url', '') <> '';

UPDATE public.free_audits
SET buyer_key = COALESCE(
  NULLIF(buyer_key, ''),
  NULLIF((metadata -> 'attribution' ->> 'buyer_key'), ''),
  NULLIF(lead_email_lower, ''),
  lead_key
)
WHERE buyer_key IS NULL;

UPDATE public.meetings m
SET
  audit_intake_id = COALESCE(m.audit_intake_id, f.audit_intake_id),
  buyer_key = COALESCE(m.buyer_key, f.buyer_key, lower(m.email)),
  lead_magnet_id = COALESCE(m.lead_magnet_id, 'strategy_session')
FROM public.free_audits f
WHERE lower(m.email) = f.lead_email_lower;

INSERT INTO public.buyer_identity_links (
  canonical_buyer_key,
  identity_type,
  identity_value,
  site_id,
  brand_id,
  client_id,
  metadata
)
SELECT
  canonical_key,
  identity_type,
  identity_value,
  'jahknowspr_web',
  'jahknowspr',
  COALESCE(customer_id::text, 'jahknowspr'),
  jsonb_build_object('backfilled_from', 'free_audits')
FROM (
  SELECT
    COALESCE(f.buyer_key, f.lead_email_lower, f.lead_key, f.id::text) AS canonical_key,
    'buyer_key'::text AS identity_type,
    f.buyer_key AS identity_value,
    f.customer_id
  FROM public.free_audits f
  WHERE COALESCE(f.buyer_key, '') <> ''
  UNION ALL
  SELECT
    COALESCE(f.buyer_key, f.lead_email_lower, f.lead_key, f.id::text),
    'lead_key'::text,
    f.lead_key,
    f.customer_id
  FROM public.free_audits f
  WHERE COALESCE(f.lead_key, '') <> ''
  UNION ALL
  SELECT
    COALESCE(f.buyer_key, f.lead_email_lower, f.lead_key, f.id::text),
    'email'::text,
    f.lead_email_lower,
    f.customer_id
  FROM public.free_audits f
  WHERE COALESCE(f.lead_email_lower, '') <> ''
) aliases
ON CONFLICT (canonical_buyer_key, identity_type, identity_value)
DO UPDATE SET
  last_seen_at = now(),
  metadata = public.buyer_identity_links.metadata || EXCLUDED.metadata;

INSERT INTO public.buyer_journeys (
  journey_key,
  site_id,
  brand_id,
  client_id,
  canonical_buyer_key,
  buyer_key,
  lead_key,
  customer_id,
  audit_intake_id,
  first_event_at,
  last_event_at,
  journey_status,
  is_buyer,
  purchase_count,
  total_revenue,
  latest_lead_magnet_id,
  metadata
)
SELECT
  concat_ws(':', 'jahknowspr_web', 'jahknowspr', COALESCE(f.customer_id::text, 'jahknowspr'), COALESCE(f.buyer_key, f.lead_email_lower, f.lead_key, f.id::text)),
  'jahknowspr_web',
  'jahknowspr',
  COALESCE(f.customer_id::text, 'jahknowspr'),
  COALESCE(f.buyer_key, f.lead_email_lower, f.lead_key, f.id::text),
  f.buyer_key,
  f.lead_key,
  f.customer_id,
  f.audit_intake_id,
  f.started_at,
  COALESCE(f.completed_at, f.updated_at, f.started_at),
  CASE
    WHEN f.follow_up_status = 'converted' THEN 'contracted'
    WHEN f.follow_up_status = 'booked_strategy_session' THEN 'strategy_session_booked'
    WHEN f.completion_status = 'completed' THEN 'audit_submitted'
    ELSE 'lead_captured'
  END,
  false,
  0,
  0,
  'free_audit',
  jsonb_build_object('backfilled_from', 'free_audits')
FROM public.free_audits f
ON CONFLICT (journey_key)
DO UPDATE SET
  audit_intake_id = COALESCE(EXCLUDED.audit_intake_id, public.buyer_journeys.audit_intake_id),
  buyer_key = COALESCE(EXCLUDED.buyer_key, public.buyer_journeys.buyer_key),
  lead_key = COALESCE(EXCLUDED.lead_key, public.buyer_journeys.lead_key),
  customer_id = COALESCE(EXCLUDED.customer_id, public.buyer_journeys.customer_id),
  first_event_at = LEAST(public.buyer_journeys.first_event_at, EXCLUDED.first_event_at),
  last_event_at = GREATEST(public.buyer_journeys.last_event_at, EXCLUDED.last_event_at),
  journey_status = EXCLUDED.journey_status,
  metadata = public.buyer_journeys.metadata || EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.lead_magnet_interactions (
  lead_magnet_id,
  interaction_kind,
  interaction_status,
  occurred_at,
  site_id,
  brand_id,
  client_id,
  buyer_journey_id,
  canonical_buyer_key,
  buyer_key,
  lead_key,
  customer_id,
  audit_intake_id,
  offer_id,
  offer_stage,
  metadata
)
SELECT
  'free_audit',
  'submit',
  'success',
  f.started_at,
  'jahknowspr_web',
  'jahknowspr',
  COALESCE(f.customer_id::text, 'jahknowspr'),
  bj.id,
  bj.canonical_buyer_key,
  f.buyer_key,
  f.lead_key,
  f.customer_id,
  f.audit_intake_id,
  'free_audit',
  'free',
  jsonb_build_object('backfilled_from', 'free_audits')
FROM public.free_audits f
JOIN public.buyer_journeys bj
  ON bj.journey_key = concat_ws(':', 'jahknowspr_web', 'jahknowspr', COALESCE(f.customer_id::text, 'jahknowspr'), COALESCE(f.buyer_key, f.lead_email_lower, f.lead_key, f.id::text));

INSERT INTO public.lead_magnet_interactions (
  lead_magnet_id,
  interaction_kind,
  interaction_status,
  occurred_at,
  site_id,
  brand_id,
  client_id,
  buyer_journey_id,
  canonical_buyer_key,
  buyer_key,
  lead_key,
  customer_id,
  strategy_session_id,
  audit_intake_id,
  offer_id,
  offer_stage,
  metadata
)
SELECT
  'strategy_session',
  'booking',
  'success',
  m.created_at,
  'jahknowspr_web',
  'jahknowspr',
  COALESCE(m.customer_id::text, 'jahknowspr'),
  bj.id,
  bj.canonical_buyer_key,
  m.buyer_key,
  lower(m.email),
  m.customer_id,
  m.id,
  m.audit_intake_id,
  'strategy_session',
  'paid_trust_builder',
  jsonb_build_object('backfilled_from', 'meetings')
FROM public.meetings m
LEFT JOIN public.buyer_journeys bj
  ON bj.journey_key = concat_ws(':', 'jahknowspr_web', 'jahknowspr', COALESCE(m.customer_id::text, 'jahknowspr'), COALESCE(m.buyer_key, lower(m.email), m.id::text))
WHERE COALESCE(m.service_name, '') = 'Strategy Session';

UPDATE public.revenue_attribution
SET
  utm_content = COALESCE(revenue_attribution.utm_content, revenue_attribution.metadata ->> 'utm_content'),
  utm_term = COALESCE(revenue_attribution.utm_term, revenue_attribution.metadata ->> 'utm_term'),
  lead_magnet_id = COALESCE(
    revenue_attribution.lead_magnet_id,
    CASE
      WHEN revenue_attribution.offer_id = 'free_audit' THEN 'free_audit'
      WHEN revenue_attribution.offer_id = 'strategy_session' THEN 'strategy_session'
      WHEN revenue_attribution.offer_id = 'newsletter' THEN 'the_brief'
      ELSE 'other'
    END
  ),
  offer_stage = COALESCE(
    revenue_attribution.offer_stage,
    CASE
      WHEN revenue_attribution.offer_id = 'free_audit' THEN 'free'
      WHEN revenue_attribution.offer_id = 'strategy_session' THEN 'paid_trust_builder'
      WHEN revenue_attribution.offer_id = 'campaign_retainer' THEN 'retainer'
      ELSE 'standard'
    END
  ),
  platform = COALESCE(revenue_attribution.platform, revenue_attribution.metadata ->> 'platform'),
  content_angle = COALESCE(revenue_attribution.content_angle, revenue_attribution.metadata ->> 'content_angle'),
  message_angle = COALESCE(revenue_attribution.message_angle, revenue_attribution.metadata ->> 'message_angle'),
  landing_page_url = COALESCE(revenue_attribution.landing_page_url, revenue_attribution.metadata ->> 'landing_page_url');

WITH purchase_sources AS (
  SELECT
    bp.id,
    ae.utm_source AS ae_utm_source,
    ae.utm_medium AS ae_utm_medium,
    ae.utm_campaign AS ae_utm_campaign,
    ae.utm_content AS ae_utm_content,
    ae.utm_term AS ae_utm_term,
    ae.lead_magnet_id AS ae_lead_magnet_id,
    ae.offer_stage AS ae_offer_stage,
    ae.platform AS ae_platform,
    ae.content_angle AS ae_content_angle,
    ae.message_angle AS ae_message_angle,
    ae.landing_page_url AS ae_landing_page_url,
    ae.audit_intake_id AS ae_audit_intake_id,
    ae.strategy_session_id AS ae_strategy_session_id,
    ae.buyer_journey_id AS ae_buyer_journey_id,
    ra.utm_source AS ra_utm_source,
    ra.utm_medium AS ra_utm_medium,
    ra.utm_campaign AS ra_utm_campaign,
    ra.utm_content AS ra_utm_content,
    ra.utm_term AS ra_utm_term,
    ra.lead_magnet_id AS ra_lead_magnet_id,
    ra.offer_stage AS ra_offer_stage,
    ra.platform AS ra_platform,
    ra.content_angle AS ra_content_angle,
    ra.message_angle AS ra_message_angle,
    ra.landing_page_url AS ra_landing_page_url,
    ra.audit_intake_id AS ra_audit_intake_id,
    ra.strategy_session_id AS ra_strategy_session_id,
    ra.buyer_journey_id AS ra_buyer_journey_id
  FROM public.buyer_purchase_attribution bp
  LEFT JOIN public.analytics_events ae ON ae.id = bp.source_event_id
  LEFT JOIN public.revenue_attribution ra ON ra.id = bp.source_revenue_attribution_id
)
UPDATE public.buyer_purchase_attribution bp
SET
  utm_source = COALESCE(bp.utm_source, s.ae_utm_source, s.ra_utm_source),
  utm_medium = COALESCE(bp.utm_medium, s.ae_utm_medium, s.ra_utm_medium),
  utm_campaign = COALESCE(bp.utm_campaign, s.ae_utm_campaign, s.ra_utm_campaign),
  utm_content = COALESCE(bp.utm_content, s.ae_utm_content, s.ra_utm_content),
  utm_term = COALESCE(bp.utm_term, s.ae_utm_term, s.ra_utm_term),
  lead_magnet_id = COALESCE(bp.lead_magnet_id, s.ae_lead_magnet_id, s.ra_lead_magnet_id),
  offer_stage = COALESCE(bp.offer_stage, s.ae_offer_stage, s.ra_offer_stage),
  platform = COALESCE(bp.platform, s.ae_platform, s.ra_platform),
  content_angle = COALESCE(bp.content_angle, s.ae_content_angle, s.ra_content_angle),
  message_angle = COALESCE(bp.message_angle, s.ae_message_angle, s.ra_message_angle),
  landing_page_url = COALESCE(bp.landing_page_url, s.ae_landing_page_url, s.ra_landing_page_url),
  audit_intake_id = COALESCE(bp.audit_intake_id, s.ae_audit_intake_id, s.ra_audit_intake_id),
  strategy_session_id = COALESCE(bp.strategy_session_id, s.ae_strategy_session_id, s.ra_strategy_session_id),
  buyer_journey_id = COALESCE(bp.buyer_journey_id, s.ae_buyer_journey_id, s.ra_buyer_journey_id)
FROM purchase_sources s
WHERE s.id = bp.id;

INSERT INTO public.contract_attribution (
  customer_id,
  client_id,
  brand_id,
  buyer_journey_id,
  buyer_key,
  lead_key,
  offer_id,
  offer_stage,
  lead_magnet_id,
  contract_value,
  currency,
  status,
  signed_at,
  metadata
)
SELECT
  c.id,
  c.id::text,
  'jahknowspr',
  bj.id,
  bj.buyer_key,
  bj.lead_key,
  'long_term_contract',
  'long_term_contract',
  COALESCE(bj.latest_lead_magnet_id, 'strategy_session'),
  NULL,
  'USD',
  CASE WHEN c.client_status = 'active_client'::public.client_status THEN 'active_client' ELSE 'prospect' END,
  NULL,
  jsonb_build_object('backfilled_from', 'customers.client_status')
FROM public.customers c
LEFT JOIN public.buyer_journeys bj ON bj.customer_id = c.id
LEFT JOIN public.contract_attribution ca ON ca.customer_id = c.id
WHERE ca.id IS NULL
  AND c.client_status = 'active_client'::public.client_status;

-- -----------------------------------------------------------------------------
-- 6) RLS, policies, triggers, and grants for new tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.lead_magnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_magnet_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_intake_original_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_intake_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_pdf_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_audio_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_magnets_service_role_all" ON public.lead_magnets;
CREATE POLICY "lead_magnets_service_role_all"
ON public.lead_magnets FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "buyer_identity_links_service_role_all" ON public.buyer_identity_links;
CREATE POLICY "buyer_identity_links_service_role_all"
ON public.buyer_identity_links FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "buyer_journeys_service_role_all" ON public.buyer_journeys;
CREATE POLICY "buyer_journeys_service_role_all"
ON public.buyer_journeys FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lead_magnet_interactions_service_role_all" ON public.lead_magnet_interactions;
CREATE POLICY "lead_magnet_interactions_service_role_all"
ON public.lead_magnet_interactions FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "offer_presentations_service_role_all" ON public.offer_presentations;
CREATE POLICY "offer_presentations_service_role_all"
ON public.offer_presentations FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "contract_attribution_service_role_all" ON public.contract_attribution;
CREATE POLICY "contract_attribution_service_role_all"
ON public.contract_attribution FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "audit_intakes_service_role_all" ON public.audit_intakes;
CREATE POLICY "audit_intakes_service_role_all"
ON public.audit_intakes FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "audit_intake_original_answers_service_role_all" ON public.audit_intake_original_answers;
CREATE POLICY "audit_intake_original_answers_service_role_all"
ON public.audit_intake_original_answers FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "audit_intake_analysis_service_role_all" ON public.audit_intake_analysis;
CREATE POLICY "audit_intake_analysis_service_role_all"
ON public.audit_intake_analysis FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "audit_pdf_deliverables_service_role_all" ON public.audit_pdf_deliverables;
CREATE POLICY "audit_pdf_deliverables_service_role_all"
ON public.audit_pdf_deliverables FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "audit_audio_deliverables_service_role_all" ON public.audit_audio_deliverables;
CREATE POLICY "audit_audio_deliverables_service_role_all"
ON public.audit_audio_deliverables FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lead_magnets_dashboard_read" ON public.lead_magnets;
CREATE POLICY "lead_magnets_dashboard_read"
ON public.lead_magnets FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "buyer_journeys_dashboard_read" ON public.buyer_journeys;
CREATE POLICY "buyer_journeys_dashboard_read"
ON public.buyer_journeys FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "lead_magnet_interactions_dashboard_read" ON public.lead_magnet_interactions;
CREATE POLICY "lead_magnet_interactions_dashboard_read"
ON public.lead_magnet_interactions FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "offer_presentations_dashboard_read" ON public.offer_presentations;
CREATE POLICY "offer_presentations_dashboard_read"
ON public.offer_presentations FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "contract_attribution_dashboard_read" ON public.contract_attribution;
CREATE POLICY "contract_attribution_dashboard_read"
ON public.contract_attribution FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "audit_intakes_dashboard_read" ON public.audit_intakes;
CREATE POLICY "audit_intakes_dashboard_read"
ON public.audit_intakes FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "audit_original_dashboard_read" ON public.audit_intake_original_answers;
CREATE POLICY "audit_original_dashboard_read"
ON public.audit_intake_original_answers FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "audit_analysis_dashboard_read" ON public.audit_intake_analysis;
CREATE POLICY "audit_analysis_dashboard_read"
ON public.audit_intake_analysis FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "audit_pdf_dashboard_read" ON public.audit_pdf_deliverables;
CREATE POLICY "audit_pdf_dashboard_read"
ON public.audit_pdf_deliverables FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "audit_audio_dashboard_read" ON public.audit_audio_deliverables;
CREATE POLICY "audit_audio_dashboard_read"
ON public.audit_audio_deliverables FOR SELECT TO authenticated
USING (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "audit_intakes_client_read" ON public.audit_intakes;
CREATE POLICY "audit_intakes_client_read"
ON public.audit_intakes FOR SELECT TO authenticated
USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "audit_original_client_read" ON public.audit_intake_original_answers;
CREATE POLICY "audit_original_client_read"
ON public.audit_intake_original_answers FOR SELECT TO authenticated
USING (
  audit_intake_id IN (
    SELECT ai.id
    FROM public.audit_intakes ai
    JOIN public.customers c ON c.id = ai.customer_id
    WHERE c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "audit_analysis_client_read" ON public.audit_intake_analysis;
CREATE POLICY "audit_analysis_client_read"
ON public.audit_intake_analysis FOR SELECT TO authenticated
USING (
  audit_intake_id IN (
    SELECT ai.id
    FROM public.audit_intakes ai
    JOIN public.customers c ON c.id = ai.customer_id
    WHERE c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "audit_pdf_client_read" ON public.audit_pdf_deliverables;
CREATE POLICY "audit_pdf_client_read"
ON public.audit_pdf_deliverables FOR SELECT TO authenticated
USING (
  audit_intake_id IN (
    SELECT ai.id
    FROM public.audit_intakes ai
    JOIN public.customers c ON c.id = ai.customer_id
    WHERE c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "audit_audio_client_read" ON public.audit_audio_deliverables;
CREATE POLICY "audit_audio_client_read"
ON public.audit_audio_deliverables FOR SELECT TO authenticated
USING (
  audit_intake_id IN (
    SELECT ai.id
    FROM public.audit_intakes ai
    JOIN public.customers c ON c.id = ai.customer_id
    WHERE c.user_id = auth.uid()
  )
);

GRANT SELECT ON public.lead_magnets TO authenticated;
GRANT SELECT ON public.buyer_journeys TO authenticated;
GRANT SELECT ON public.lead_magnet_interactions TO authenticated;
GRANT SELECT ON public.offer_presentations TO authenticated;
GRANT SELECT ON public.contract_attribution TO authenticated;
GRANT SELECT ON public.audit_intakes TO authenticated;
GRANT SELECT ON public.audit_intake_original_answers TO authenticated;
GRANT SELECT ON public.audit_intake_analysis TO authenticated;
GRANT SELECT ON public.audit_pdf_deliverables TO authenticated;
GRANT SELECT ON public.audit_audio_deliverables TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_magnets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_identity_links TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_journeys TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_magnet_interactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_presentations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_attribution TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_intakes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_intake_original_answers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_intake_analysis TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_pdf_deliverables TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_audio_deliverables TO service_role;

DROP TRIGGER IF EXISTS tr_lead_magnets_set_updated_at ON public.lead_magnets;
CREATE TRIGGER tr_lead_magnets_set_updated_at
BEFORE UPDATE ON public.lead_magnets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_buyer_journeys_set_updated_at ON public.buyer_journeys;
CREATE TRIGGER tr_buyer_journeys_set_updated_at
BEFORE UPDATE ON public.buyer_journeys
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_audit_intakes_set_updated_at ON public.audit_intakes;
CREATE TRIGGER tr_audit_intakes_set_updated_at
BEFORE UPDATE ON public.audit_intakes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_audit_pdf_deliverables_set_updated_at ON public.audit_pdf_deliverables;
CREATE TRIGGER tr_audit_pdf_deliverables_set_updated_at
BEFORE UPDATE ON public.audit_pdf_deliverables
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_audit_audio_deliverables_set_updated_at ON public.audit_audio_deliverables;
CREATE TRIGGER tr_audit_audio_deliverables_set_updated_at
BEFORE UPDATE ON public.audit_audio_deliverables
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.audit_intakes IS
  'Parent audit intake record with source/attribution metadata; separates intake lifecycle from analysis and deliverables.';
COMMENT ON TABLE public.audit_intake_original_answers IS
  'Immutable original prospect-submitted intake answers.';
COMMENT ON TABLE public.audit_intake_analysis IS
  'KORA-derived interpretation and scoring of an audit intake.';
COMMENT ON TABLE public.audit_pdf_deliverables IS
  'PDF diagnosis deliverable payloads and references.';
COMMENT ON TABLE public.audit_audio_deliverables IS
  'Audio script and audio file references for audit deliverables.';
COMMENT ON TABLE public.buyer_identity_links IS
  'Canonical buyer identity alias map for anonymous-to-known stitching.';
COMMENT ON TABLE public.buyer_journeys IS
  'Cross-event buyer journey spine from first touch to purchase/contract outcomes.';
COMMENT ON TABLE public.lead_magnet_interactions IS
  'Observed interactions across free audits, strategy sessions, subscriptions, downloads, webinars, and future lead magnets.';
COMMENT ON TABLE public.contract_attribution IS
  'Long-term contract attribution tied back to buyer, campaign, offer, and lead magnet context.';
