-- KORA Campaigns: multi-client campaign planning, Google Search setup, tracking, analytics, and recommendations.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Extend the existing Creative Hub campaigns table so it can also carry the client-aware
-- Campaigns contract used by Mission Control.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS brand_id TEXT,
  ADD COLUMN IF NOT EXISTS organization_id TEXT,
  ADD COLUMN IF NOT EXISTS campaign_type TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS owner TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS daily_budget NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_budget NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audience_pool_id TEXT,
  ADD COLUMN IF NOT EXISTS offer_id TEXT,
  ADD COLUMN IF NOT EXISTS funnel_id TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS campaigns_client_id_idx ON public.campaigns(client_id);
CREATE INDEX IF NOT EXISTS campaigns_brand_id_idx ON public.campaigns(brand_id);
CREATE INDEX IF NOT EXISTS campaigns_platform_idx ON public.campaigns(platform);
CREATE INDEX IF NOT EXISTS campaigns_audience_pool_id_idx ON public.campaigns(audience_pool_id);

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS audience_pool_id TEXT;

ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS client_id TEXT;

ALTER TABLE public.analytics_daily_rollups
  ADD COLUMN IF NOT EXISTS client_id TEXT;

ALTER TABLE public.content_performance
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS audience_pool_id TEXT;

ALTER TABLE public.funnel_reports
  ADD COLUMN IF NOT EXISTS client_id TEXT;

ALTER TABLE public.revenue_attribution
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS audience_pool_id TEXT;

ALTER TABLE public.kora_analytics_findings
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS audience_pool_id TEXT;

CREATE INDEX IF NOT EXISTS analytics_events_client_id_idx ON public.analytics_events(client_id);
CREATE INDEX IF NOT EXISTS analytics_events_campaign_client_idx ON public.analytics_events(client_id, campaign_id);
CREATE INDEX IF NOT EXISTS analytics_events_audience_pool_id_idx ON public.analytics_events(audience_pool_id);
CREATE INDEX IF NOT EXISTS analytics_sessions_client_id_idx ON public.analytics_sessions(client_id);
CREATE INDEX IF NOT EXISTS analytics_daily_rollups_client_id_idx ON public.analytics_daily_rollups(client_id);
CREATE INDEX IF NOT EXISTS content_performance_client_id_idx ON public.content_performance(client_id);
CREATE INDEX IF NOT EXISTS funnel_reports_client_id_idx ON public.funnel_reports(client_id);
CREATE INDEX IF NOT EXISTS revenue_attribution_client_id_idx ON public.revenue_attribution(client_id);
CREATE INDEX IF NOT EXISTS kora_analytics_findings_client_id_idx ON public.kora_analytics_findings(client_id);

CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  brand_type TEXT,
  industry TEXT,
  website TEXT,
  voice_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audience_pools (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  location_focus TEXT,
  role_title TEXT,
  business_stage TEXT,
  problem_awareness_level TEXT,
  main_pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  desired_outcome TEXT,
  objections JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_intent TEXT,
  keywords_themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  negative_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  best_content_angles JSONB NOT NULL DEFAULT '[]'::jsonb,
  best_offer_fit TEXT,
  preferred_tone TEXT,
  notes TEXT,
  is_shared_template BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_content (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  title TEXT NOT NULL,
  content_type TEXT,
  url TEXT,
  category TEXT,
  funnel_fit TEXT,
  audience_fit TEXT,
  related_offer_id TEXT,
  cta TEXT,
  seo_keyword TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  kora_recommendation TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_offers (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  offer_name TEXT NOT NULL,
  offer_type TEXT,
  price NUMERIC(12,2),
  url TEXT,
  primary_cta TEXT,
  conversion_event TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_funnels (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  funnel_name TEXT NOT NULL,
  entry_source TEXT,
  entry_page TEXT,
  content_page TEXT,
  cta TEXT,
  offer_page TEXT,
  form_booking_checkout_step TEXT,
  thank_you_page TEXT,
  follow_up_action TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_funnel_steps (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  funnel_id TEXT NOT NULL REFERENCES public.campaign_funnels(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  event_name TEXT,
  expected_action TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.google_search_setups (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_key TEXT,
  google_ads_campaign_name TEXT NOT NULL,
  objective TEXT,
  location_targeting TEXT,
  language TEXT,
  daily_budget NUMERIC(12,2) DEFAULT 0,
  bidding_strategy TEXT,
  final_url TEXT,
  tracking_template TEXT,
  utm_source TEXT NOT NULL DEFAULT 'google',
  utm_medium TEXT NOT NULL DEFAULT 'cpc',
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.google_ad_groups (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_key TEXT,
  audience_pool_id TEXT,
  content_id TEXT,
  offer_id TEXT,
  ad_group_name TEXT NOT NULL,
  problem_angle TEXT,
  audience_segment TEXT,
  keyword_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  negative_keyword_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  landing_page TEXT,
  offer_path TEXT,
  ad_headlines JSONB NOT NULL DEFAULT '[]'::jsonb,
  ad_descriptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.google_keywords (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_key TEXT,
  ad_group_id TEXT REFERENCES public.google_ad_groups(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  match_type TEXT,
  intent_level TEXT,
  funnel_stage TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.google_search_ads (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_key TEXT,
  ad_group_id TEXT REFERENCES public.google_ad_groups(id) ON DELETE CASCADE,
  audience_pain_angle TEXT,
  brand_voice_note TEXT,
  headline_1 TEXT,
  headline_2 TEXT,
  headline_3 TEXT,
  description_1 TEXT,
  description_2 TEXT,
  final_url TEXT,
  display_path TEXT,
  cta TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_tracking_plans (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_key TEXT,
  audience_pool_id TEXT,
  content_id TEXT,
  offer_id TEXT,
  funnel_id TEXT,
  tracked_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  analytics_views JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_analytics_snapshots (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_key TEXT,
  date_range_start DATE,
  date_range_end DATE,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  cta_clicks INTEGER NOT NULL DEFAULT 0,
  content_views INTEGER NOT NULL DEFAULT 0,
  recommendation_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kora_campaign_recommendations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  brand_id TEXT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_key TEXT,
  finding_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  date_range_start DATE,
  date_range_end DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brands_client_id_idx ON public.brands(client_id);
CREATE INDEX IF NOT EXISTS audience_pools_client_id_idx ON public.audience_pools(client_id);
CREATE INDEX IF NOT EXISTS client_content_client_id_idx ON public.client_content(client_id);
CREATE INDEX IF NOT EXISTS client_offers_client_id_idx ON public.client_offers(client_id);
CREATE INDEX IF NOT EXISTS campaign_funnels_client_id_idx ON public.campaign_funnels(client_id);
CREATE INDEX IF NOT EXISTS google_search_setups_client_id_idx ON public.google_search_setups(client_id);
CREATE INDEX IF NOT EXISTS google_ad_groups_client_campaign_idx ON public.google_ad_groups(client_id, campaign_key);
CREATE INDEX IF NOT EXISTS google_keywords_client_campaign_idx ON public.google_keywords(client_id, campaign_key);
CREATE INDEX IF NOT EXISTS google_search_ads_client_campaign_idx ON public.google_search_ads(client_id, campaign_key);
CREATE INDEX IF NOT EXISTS campaign_tracking_plans_client_campaign_idx ON public.campaign_tracking_plans(client_id, campaign_key);
CREATE INDEX IF NOT EXISTS campaign_analytics_snapshots_client_campaign_idx ON public.campaign_analytics_snapshots(client_id, campaign_key);
CREATE INDEX IF NOT EXISTS kora_campaign_recommendations_client_campaign_idx ON public.kora_campaign_recommendations(client_id, campaign_key);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'brands',
    'audience_pools',
    'client_content',
    'client_offers',
    'campaign_funnels',
    'campaign_funnel_steps',
    'google_search_setups',
    'google_ad_groups',
    'google_keywords',
    'google_search_ads',
    'campaign_tracking_plans',
    'campaign_analytics_snapshots',
    'kora_campaign_recommendations'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP TRIGGER IF EXISTS tr_%I_set_updated_at ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER tr_%I_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', table_name, table_name);
  END LOOP;
END $$;

COMMENT ON TABLE public.audience_pools IS 'Client-specific reusable audience pools for KORA Campaigns.';
COMMENT ON TABLE public.client_content IS 'Client-specific content library used by KORA Campaigns.';
COMMENT ON TABLE public.client_offers IS 'Client-specific offers and conversion events for KORA Campaigns.';
COMMENT ON TABLE public.campaign_tracking_plans IS 'First-party analytics tracking contract for client-aware KORA Campaigns.';
COMMENT ON TABLE public.kora_campaign_recommendations IS 'Client-scoped and cross-client KORA campaign recommendations.';
