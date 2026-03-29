-- K.O.R.A Tenant Tables Migration
-- Creates tables for multi-tenant KORA backend integration

-- Tenant role enum
CREATE TYPE tenant_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Tenant users mapping table
-- Maps auth user_id to tenant_id and role (server-side resolution only)
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  role tenant_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Index for fast tenant lookup by user
CREATE INDEX idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);

-- KORA event status enum
CREATE TYPE kora_event_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- KORA event type enum
CREATE TYPE kora_event_type AS ENUM (
  'content_strategy_requested',
  'content_strategy_completed',
  'content_strategy_failed',
  'campaign_requested',
  'campaign_completed',
  'campaign_failed'
);

-- KORA events table (job queue)
-- Website creates events, agents process them
CREATE TABLE IF NOT EXISTS kora_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_type kora_event_type NOT NULL,
  status kora_event_status NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Indexes for event processing
CREATE INDEX idx_kora_events_tenant_id ON kora_events(tenant_id);
CREATE INDEX idx_kora_events_status ON kora_events(status);
CREATE INDEX idx_kora_events_type_status ON kora_events(event_type, status);
CREATE INDEX idx_kora_events_created_at ON kora_events(created_at DESC);

-- Content strategy status enum
CREATE TYPE content_strategy_status AS ENUM ('requested', 'processing', 'completed', 'failed');

-- Content strategy requests table
CREATE TABLE IF NOT EXISTS content_strategy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES kora_events(id) ON DELETE CASCADE,
  status content_strategy_status NOT NULL DEFAULT 'requested',
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_strategy_requests_tenant_id ON content_strategy_requests(tenant_id);
CREATE INDEX idx_content_strategy_requests_status ON content_strategy_requests(status);

-- Content strategies output table (agent writes here)
CREATE TABLE IF NOT EXISTS content_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  request_id UUID REFERENCES content_strategy_requests(id) ON DELETE SET NULL,
  status content_strategy_status NOT NULL DEFAULT 'requested',
  title TEXT NOT NULL,
  summary TEXT,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  goals TEXT[] NOT NULL DEFAULT '{}',
  window_days INTEGER NOT NULL DEFAULT 30,
  window_start DATE,
  window_end DATE,
  output_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_content_strategies_tenant_id ON content_strategies(tenant_id);
CREATE INDEX idx_content_strategies_status ON content_strategies(status);
CREATE INDEX idx_content_strategies_created_at ON content_strategies(created_at DESC);

-- Campaign request status enum
CREATE TYPE campaign_request_status AS ENUM ('requested', 'processing', 'completed', 'failed');

-- Campaign objective enum
CREATE TYPE campaign_objective AS ENUM ('awareness', 'engagement', 'traffic', 'leads', 'sales', 'retention');

-- Campaign requests table
CREATE TABLE IF NOT EXISTS campaign_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES kora_events(id) ON DELETE CASCADE,
  content_strategy_id UUID REFERENCES content_strategies(id) ON DELETE SET NULL,
  status campaign_request_status NOT NULL DEFAULT 'requested',
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_requests_tenant_id ON campaign_requests(tenant_id);
CREATE INDEX idx_campaign_requests_content_strategy_id ON campaign_requests(content_strategy_id);
CREATE INDEX idx_campaign_requests_status ON campaign_requests(status);

-- Campaign outputs table (agent writes here)
CREATE TABLE IF NOT EXISTS campaign_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  request_id UUID REFERENCES campaign_requests(id) ON DELETE SET NULL,
  content_strategy_id UUID REFERENCES content_strategies(id) ON DELETE SET NULL,
  status campaign_request_status NOT NULL DEFAULT 'requested',
  platform TEXT NOT NULL,
  objective campaign_objective NOT NULL,
  title TEXT NOT NULL,
  output_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_campaign_outputs_tenant_id ON campaign_outputs(tenant_id);
CREATE INDEX idx_campaign_outputs_content_strategy_id ON campaign_outputs(content_strategy_id);
CREATE INDEX idx_campaign_outputs_status ON campaign_outputs(status);
CREATE INDEX idx_campaign_outputs_created_at ON campaign_outputs(created_at DESC);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_tenant_users_updated_at
  BEFORE UPDATE ON tenant_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kora_events_updated_at
  BEFORE UPDATE ON kora_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_strategy_requests_updated_at
  BEFORE UPDATE ON content_strategy_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_strategies_updated_at
  BEFORE UPDATE ON content_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_requests_updated_at
  BEFORE UPDATE ON campaign_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_outputs_updated_at
  BEFORE UPDATE ON campaign_outputs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
-- Enable RLS on all tables
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kora_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_strategy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_outputs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = p_user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- tenant_users: users can only see their own mappings
CREATE POLICY "Users can view their own tenant mappings"
  ON tenant_users FOR SELECT
  USING (user_id = auth.uid());

-- kora_events: users can only see events for their tenant
CREATE POLICY "Users can view their tenant events"
  ON kora_events FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- kora_events: users can insert events for their tenant (via server route)
CREATE POLICY "Users can insert events for their tenant"
  ON kora_events FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- content_strategy_requests: users can view their tenant requests
CREATE POLICY "Users can view their tenant strategy requests"
  ON content_strategy_requests FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- content_strategy_requests: users can insert for their tenant
CREATE POLICY "Users can insert strategy requests for their tenant"
  ON content_strategy_requests FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- content_strategies: users can view their tenant strategies
CREATE POLICY "Users can view their tenant strategies"
  ON content_strategies FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- campaign_requests: users can view their tenant campaign requests
CREATE POLICY "Users can view their tenant campaign requests"
  ON campaign_requests FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- campaign_requests: users can insert for their tenant
CREATE POLICY "Users can insert campaign requests for their tenant"
  ON campaign_requests FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- campaign_outputs: users can view their tenant campaign outputs
CREATE POLICY "Users can view their tenant campaign outputs"
  ON campaign_outputs FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Grant service role full access for backend agents
-- Note: Service role bypasses RLS by default
