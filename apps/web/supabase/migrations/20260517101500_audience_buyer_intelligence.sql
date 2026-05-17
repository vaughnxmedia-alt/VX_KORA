-- Audience + buyer intelligence foundation for client-specific ad optimization.
-- Purpose: answer "who is buying what" by client, industry, audience cluster, and offer.

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS industry_key TEXT,
  ADD COLUMN IF NOT EXISTS audience_cluster_id TEXT,
  ADD COLUMN IF NOT EXISTS adset_id TEXT,
  ADD COLUMN IF NOT EXISTS creative_id TEXT,
  ADD COLUMN IF NOT EXISTS buyer_key TEXT;

ALTER TABLE public.revenue_attribution
  ADD COLUMN IF NOT EXISTS industry_key TEXT,
  ADD COLUMN IF NOT EXISTS audience_cluster_id TEXT,
  ADD COLUMN IF NOT EXISTS adset_id TEXT,
  ADD COLUMN IF NOT EXISTS creative_id TEXT,
  ADD COLUMN IF NOT EXISTS buyer_key TEXT;

CREATE INDEX IF NOT EXISTS analytics_events_industry_key_idx
  ON public.analytics_events (industry_key);

CREATE INDEX IF NOT EXISTS analytics_events_audience_cluster_id_idx
  ON public.analytics_events (audience_cluster_id);

CREATE INDEX IF NOT EXISTS analytics_events_offer_audience_idx
  ON public.analytics_events (client_id, industry_key, audience_cluster_id, offer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_campaign_adset_idx
  ON public.analytics_events (campaign_id, adset_id, creative_id, created_at DESC);

CREATE INDEX IF NOT EXISTS revenue_attr_industry_key_idx
  ON public.revenue_attribution (industry_key);

CREATE INDEX IF NOT EXISTS revenue_attr_audience_cluster_id_idx
  ON public.revenue_attribution (audience_cluster_id);

CREATE INDEX IF NOT EXISTS revenue_attr_offer_audience_idx
  ON public.revenue_attribution (client_id, industry_key, audience_cluster_id, offer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS revenue_attr_campaign_adset_idx
  ON public.revenue_attribution (campaign_id, adset_id, creative_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.industry_audience_clusters (
  id TEXT PRIMARY KEY,
  industry_key TEXT NOT NULL,
  cluster_name TEXT NOT NULL,
  cluster_summary TEXT,
  pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  intent_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  buying_triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_offers JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source_type TEXT NOT NULL DEFAULT 'kora_discovered' CHECK (
    source_type IN ('kora_discovered', 'human_curated', 'imported')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS industry_audience_clusters_name_unique
  ON public.industry_audience_clusters (industry_key, cluster_name);

CREATE INDEX IF NOT EXISTS industry_audience_clusters_industry_idx
  ON public.industry_audience_clusters (industry_key, is_active);

CREATE TABLE IF NOT EXISTS public.client_offer_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  brand_id TEXT,
  offer_id TEXT NOT NULL,
  offer_name TEXT NOT NULL,
  offer_type TEXT,
  price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS client_offer_catalog_unique
  ON public.client_offer_catalog (client_id, offer_id);

CREATE INDEX IF NOT EXISTS client_offer_catalog_client_idx
  ON public.client_offer_catalog (client_id, is_active);

CREATE TABLE IF NOT EXISTS public.buyer_purchase_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  site_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  client_id TEXT,
  industry_key TEXT,
  audience_cluster_id TEXT REFERENCES public.industry_audience_clusters(id) ON DELETE SET NULL,
  audience_pool_id TEXT,
  offer_id TEXT,
  offer_name TEXT,
  campaign_id TEXT,
  adset_id TEXT,
  creative_id TEXT,
  funnel_id TEXT,
  anonymous_visitor_id TEXT,
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_key TEXT,
  order_id TEXT,
  payment_provider TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT,
  source_event_id UUID REFERENCES public.analytics_events(id) ON DELETE SET NULL,
  source_revenue_attribution_id UUID REFERENCES public.revenue_attribution(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS buyer_purchase_attribution_created_idx
  ON public.buyer_purchase_attribution (created_at DESC);

CREATE INDEX IF NOT EXISTS buyer_purchase_attribution_client_offer_idx
  ON public.buyer_purchase_attribution (client_id, offer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS buyer_purchase_attribution_industry_audience_idx
  ON public.buyer_purchase_attribution (industry_key, audience_cluster_id, created_at DESC);

CREATE INDEX IF NOT EXISTS buyer_purchase_attribution_campaign_idx
  ON public.buyer_purchase_attribution (campaign_id, funnel_id, created_at DESC);

DROP TRIGGER IF EXISTS tr_industry_audience_clusters_set_updated_at ON public.industry_audience_clusters;
CREATE TRIGGER tr_industry_audience_clusters_set_updated_at
BEFORE UPDATE ON public.industry_audience_clusters
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_client_offer_catalog_set_updated_at ON public.client_offer_catalog;
CREATE TRIGGER tr_client_offer_catalog_set_updated_at
BEFORE UPDATE ON public.client_offer_catalog
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.industry_audience_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_offer_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_purchase_attribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "industry_audience_clusters_service_role_all" ON public.industry_audience_clusters;
CREATE POLICY "industry_audience_clusters_service_role_all"
ON public.industry_audience_clusters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "client_offer_catalog_service_role_all" ON public.client_offer_catalog;
CREATE POLICY "client_offer_catalog_service_role_all"
ON public.client_offer_catalog
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "buyer_purchase_attribution_service_role_all" ON public.buyer_purchase_attribution;
CREATE POLICY "buyer_purchase_attribution_service_role_all"
ON public.buyer_purchase_attribution
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "industry_audience_clusters_admin_read" ON public.industry_audience_clusters;
CREATE POLICY "industry_audience_clusters_admin_read"
ON public.industry_audience_clusters
FOR SELECT
TO authenticated
USING (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));

DROP POLICY IF EXISTS "client_offer_catalog_admin_read" ON public.client_offer_catalog;
CREATE POLICY "client_offer_catalog_admin_read"
ON public.client_offer_catalog
FOR SELECT
TO authenticated
USING (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));

DROP POLICY IF EXISTS "buyer_purchase_attribution_admin_read" ON public.buyer_purchase_attribution;
CREATE POLICY "buyer_purchase_attribution_admin_read"
ON public.buyer_purchase_attribution
FOR SELECT
TO authenticated
USING (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));

CREATE OR REPLACE VIEW public.client_audience_offer_purchase_summary AS
SELECT
  site_id,
  brand_id,
  COALESCE(client_id, 'unknown') AS client_id,
  COALESCE(industry_key, 'unknown') AS industry_key,
  COALESCE(audience_cluster_id, 'unknown') AS audience_cluster_id,
  COALESCE(offer_id, 'unknown') AS offer_id,
  COALESCE(offer_name, 'unknown') AS offer_name,
  COUNT(*)::BIGINT AS purchase_count,
  COUNT(DISTINCT COALESCE(order_id, source_event_id::TEXT, id::TEXT))::BIGINT AS unique_orders,
  COUNT(DISTINCT COALESCE(buyer_key, anonymous_visitor_id, session_id, user_id::TEXT))::BIGINT AS unique_buyers,
  SUM(amount)::NUMERIC(14,2) AS revenue,
  MAX(created_at) AS last_purchase_at
FROM public.buyer_purchase_attribution
GROUP BY
  site_id,
  brand_id,
  COALESCE(client_id, 'unknown'),
  COALESCE(industry_key, 'unknown'),
  COALESCE(audience_cluster_id, 'unknown'),
  COALESCE(offer_id, 'unknown'),
  COALESCE(offer_name, 'unknown');

GRANT SELECT ON public.client_audience_offer_purchase_summary TO authenticated;
GRANT SELECT ON public.client_audience_offer_purchase_summary TO service_role;

COMMENT ON TABLE public.industry_audience_clusters IS
  'Global audience cluster library by industry for cross-client learning.';

COMMENT ON TABLE public.client_offer_catalog IS
  'Canonical offer map per client to normalize buyer attribution.';

COMMENT ON TABLE public.buyer_purchase_attribution IS
  'Normalized purchase facts linking buyer activity to client, industry, audience cluster, and offer.';
