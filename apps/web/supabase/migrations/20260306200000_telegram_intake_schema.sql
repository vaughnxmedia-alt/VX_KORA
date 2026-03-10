-- KORA Telegram Bot Intake Tables
-- Migration for strategy intake sessions and generated documents

-- Telegram Intake Sessions (tracks user progress through intake)
CREATE TABLE IF NOT EXISTS telegram_intake_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  current_question_id TEXT,
  phase TEXT NOT NULL DEFAULT 'intro' CHECK (phase IN ('intro', 'brand_identity', 'strategy', 'audience', 'completed', 'generating')),
  responses JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_id UUID REFERENCES customers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brand Blueprints (generated strategy documents)
CREATE TABLE IF NOT EXISTS brand_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES customers(id),
  telegram_id BIGINT,
  business_name TEXT NOT NULL,
  business_type TEXT,
  mission TEXT,
  vision TEXT,
  core_values JSONB DEFAULT '[]',
  unique_value_proposition TEXT,
  brand_personality JSONB DEFAULT '[]',
  brand_voice TEXT,
  avoid_perceptions JSONB DEFAULT '[]',
  brand_story TEXT,
  positioning_statement TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content Strategies (generated strategy documents)
CREATE TABLE IF NOT EXISTS content_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES customers(id),
  telegram_id BIGINT,
  content_pillars JSONB DEFAULT '[]',
  posting_schedule JSONB DEFAULT '{}',
  platform_strategy JSONB DEFAULT '[]',
  content_mix JSONB DEFAULT '{}',
  example_week JSONB DEFAULT '[]',
  hashtag_bank JSONB DEFAULT '[]',
  growth_strategy TEXT,
  key_tips JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audience Analyses (generated strategy documents)
CREATE TABLE IF NOT EXISTS audience_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES customers(id),
  telegram_id BIGINT,
  overview TEXT,
  primary_platforms JSONB DEFAULT '[]',
  core_positioning TEXT,
  audience_psychology TEXT,
  audience_segments JSONB DEFAULT '[]',
  platform_breakdown JSONB DEFAULT '[]',
  audience_motivations JSONB DEFAULT '[]',
  content_types_that_attract JSONB DEFAULT '[]',
  personality_types JSONB DEFAULT '[]',
  audience_flywheel TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add telegram_id to customers if not exists
ALTER TABLE customers ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

-- Add onboarding_status to customers if not exists  
ALTER TABLE customers ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_intake_sessions_telegram_id ON telegram_intake_sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_phase ON telegram_intake_sessions(phase);
CREATE INDEX IF NOT EXISTS idx_brand_blueprints_client ON brand_blueprints(client_id);
CREATE INDEX IF NOT EXISTS idx_content_strategies_client ON content_strategies(client_id);
CREATE INDEX IF NOT EXISTS idx_audience_analyses_client ON audience_analyses(client_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_intake_sessions_updated_at ON telegram_intake_sessions;
CREATE TRIGGER update_intake_sessions_updated_at
  BEFORE UPDATE ON telegram_intake_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_blueprints_updated_at ON brand_blueprints;
CREATE TRIGGER update_brand_blueprints_updated_at
  BEFORE UPDATE ON brand_blueprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_strategies_updated_at ON content_strategies;
CREATE TRIGGER update_content_strategies_updated_at
  BEFORE UPDATE ON content_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_audience_analyses_updated_at ON audience_analyses;
CREATE TRIGGER update_audience_analyses_updated_at
  BEFORE UPDATE ON audience_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE telegram_intake_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_analyses ENABLE ROW LEVEL SECURITY;

-- Content Intelligence Preferences (what users want to consume/create)
CREATE TABLE IF NOT EXISTS content_intelligence_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES customers(id),
  telegram_id BIGINT,
  topics_to_track TEXT,
  content_consumption TEXT,
  thought_leaders TEXT,
  content_to_create TEXT,
  topics_to_avoid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Source Recommendations (sources sent via Telegram for approval)
CREATE TABLE IF NOT EXISTS source_recommendations (
  id TEXT PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES customers(id),
  telegram_id BIGINT NOT NULL,
  source_url TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'newsletter', 'podcast', 'youtube', 'twitter', 'publication')),
  relevance_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_content_intel_prefs_client ON content_intelligence_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_source_recs_client ON source_recommendations(client_id);
CREATE INDEX IF NOT EXISTS idx_source_recs_telegram ON source_recommendations(telegram_id);
CREATE INDEX IF NOT EXISTS idx_source_recs_status ON source_recommendations(status);

-- Triggers for new tables
DROP TRIGGER IF EXISTS update_content_intel_prefs_updated_at ON content_intelligence_preferences;
CREATE TRIGGER update_content_intel_prefs_updated_at
  BEFORE UPDATE ON content_intelligence_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for new tables
ALTER TABLE content_intelligence_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_recommendations ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access to intake sessions" ON telegram_intake_sessions
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to brand blueprints" ON brand_blueprints
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to content strategies" ON content_strategies
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to audience analyses" ON audience_analyses
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to content intel prefs" ON content_intelligence_preferences
  FOR ALL USING (true);

CREATE POLICY "Service role has full access to source recommendations" ON source_recommendations
  FOR ALL USING (true);
