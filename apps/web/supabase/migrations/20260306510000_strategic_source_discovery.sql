-- Strategic Source Discovery Enhancement
-- Migration: 20260306510000
-- Purpose: Add strategic scoring columns and discovery profile support

-- ============================================================================
-- STRATEGIC SCORING COLUMNS FOR SOURCES
-- ============================================================================

-- Add strategic scoring columns to intel_sources
ALTER TABLE intel_sources 
ADD COLUMN IF NOT EXISTS strategic_relevance DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS audience_alignment DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS publishing_consistency DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS insight_density DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS discovery_context_data JSONB;

COMMENT ON COLUMN intel_sources.strategic_relevance IS 'How well aligned with tenant strategy (0-1)';
COMMENT ON COLUMN intel_sources.audience_alignment IS 'How well matched to target audience (0-1)';
COMMENT ON COLUMN intel_sources.publishing_consistency IS 'Regular, quality output indicator (0-1)';
COMMENT ON COLUMN intel_sources.insight_density IS 'Value per content piece (0-1)';
COMMENT ON COLUMN intel_sources.discovery_context_data IS 'JSON data from strategic discovery profile';

-- ============================================================================
-- CANDIDATE SIGNALS STORAGE
-- ============================================================================

-- Add signals columns for discovery filtering
ALTER TABLE intel_sources
ADD COLUMN IF NOT EXISTS candidate_signals JSONB,
ADD COLUMN IF NOT EXISTS verification_result JSONB,
ADD COLUMN IF NOT EXISTS filter_reasons TEXT[];

COMMENT ON COLUMN intel_sources.candidate_signals IS 'Raw signals collected during discovery';
COMMENT ON COLUMN intel_sources.verification_result IS 'Results from source verification stage';
COMMENT ON COLUMN intel_sources.filter_reasons IS 'Reasons source was filtered (if any)';

-- ============================================================================
-- STRATEGIC PROFILE STORAGE
-- ============================================================================

-- Table to store strategic search profiles for tenants
CREATE TABLE IF NOT EXISTS intel_strategic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL UNIQUE,
  
  -- Core identity
  brand_essence TEXT,
  industry TEXT,
  niche TEXT,
  
  -- Strategic context
  positioning_statement TEXT,
  differentiators TEXT[],
  strategic_goals TEXT[],
  content_themes TEXT[],
  
  -- Audience understanding
  primary_audience TEXT,
  audience_interests TEXT[],
  audience_challenges TEXT[],
  audience_platforms TEXT[],
  
  -- Competitive context
  competitors TEXT[],
  competitor_strengths TEXT[],
  
  -- Discovery focus
  learning_priorities TEXT[],
  topic_blacklist TEXT[],
  
  -- Thresholds
  min_credibility_threshold DECIMAL(3,2) DEFAULT 0.5,
  min_relevance_threshold DECIMAL(3,2) DEFAULT 0.4,
  
  -- Metadata
  last_built_at TIMESTAMPTZ,
  build_source TEXT, -- 'auto', 'manual'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intel_strategic_profiles_tenant ON intel_strategic_profiles(tenant_id);

-- RLS for strategic profiles
ALTER TABLE intel_strategic_profiles ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_intel_strategic_profiles_updated_at
  BEFORE UPDATE ON intel_strategic_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DISCOVERY RUN ENHANCEMENTS
-- ============================================================================

-- Add strategic profile reference to discovery runs
ALTER TABLE intel_discovery_runs
ADD COLUMN IF NOT EXISTS strategic_profile_id UUID REFERENCES intel_strategic_profiles(id),
ADD COLUMN IF NOT EXISTS sources_filtered INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS filter_summary JSONB,
ADD COLUMN IF NOT EXISTS verification_summary JSONB;

COMMENT ON COLUMN intel_discovery_runs.sources_filtered IS 'Number of sources filtered out during discovery';
COMMENT ON COLUMN intel_discovery_runs.filter_summary IS 'Summary of filtering reasons';
COMMENT ON COLUMN intel_discovery_runs.verification_summary IS 'Summary of verification results';

-- ============================================================================
-- WEAK SOURCE PATTERNS TABLE
-- ============================================================================

-- Store configurable weak source patterns
CREATE TABLE IF NOT EXISTS intel_weak_source_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern category
  category TEXT NOT NULL CHECK (category IN (
    'motivational_fluff',
    'ai_spam',
    'low_credibility',
    'irrelevant_content',
    'custom'
  )),
  
  -- Pattern definition
  pattern TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('regex', 'keyword', 'exact')),
  
  -- Scope
  is_global BOOLEAN DEFAULT TRUE,
  tenant_id UUID, -- NULL for global patterns
  
  -- Metadata
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intel_weak_source_patterns_category ON intel_weak_source_patterns(category);
CREATE INDEX idx_intel_weak_source_patterns_tenant ON intel_weak_source_patterns(tenant_id);

-- Insert default weak source patterns
INSERT INTO intel_weak_source_patterns (category, pattern, pattern_type, description) VALUES
-- Motivational fluff
('motivational_fluff', '^(5|7|10|12|15|20|25|30|50|100)\s+(ways|tips|secrets|habits|rules)', 'regex', 'Listicle click-bait'),
('motivational_fluff', 'unlock your potential', 'keyword', 'Generic motivation'),
('motivational_fluff', 'change your life', 'keyword', 'Generic motivation'),
('motivational_fluff', 'success mindset', 'keyword', 'Generic motivation'),
('motivational_fluff', 'hustle culture', 'keyword', 'Hustle culture content'),
('motivational_fluff', 'grind', 'keyword', 'Hustle culture content'),
('motivational_fluff', 'boss babe', 'keyword', 'MLM-adjacent content'),
('motivational_fluff', 'passive income secrets', 'keyword', 'Get-rich content'),

-- AI spam
('ai_spam', 'written by ai', 'keyword', 'Explicit AI disclosure'),
('ai_spam', 'generated content', 'keyword', 'AI content indicator'),
('ai_spam', '\[insert [^\]]+\]', 'regex', 'Template placeholder'),
('ai_spam', 'lorem ipsum', 'keyword', 'Placeholder text'),
('ai_spam', 'as an ai', 'keyword', 'AI self-reference'),

-- Low credibility
('low_credibility', 'free ebook', 'keyword', 'Lead magnet spam'),
('low_credibility', 'click here to', 'keyword', 'Spam CTA'),
('low_credibility', 'limited time offer', 'keyword', 'Urgency spam'),
('low_credibility', 'act now', 'keyword', 'Urgency spam'),
('low_credibility', 'guaranteed results', 'keyword', 'False promises'),
('low_credibility', 'make \$\d+', 'regex', 'Income claims'),
('low_credibility', 'earn from home', 'keyword', 'Work-from-home spam'),

-- Irrelevant content
('irrelevant_content', 'horoscope', 'keyword', 'Astrology content'),
('irrelevant_content', 'zodiac', 'keyword', 'Astrology content'),
('irrelevant_content', 'crypto trading', 'keyword', 'Crypto spam'),
('irrelevant_content', 'forex signals', 'keyword', 'Forex spam'),
('irrelevant_content', 'betting tips', 'keyword', 'Gambling content'),
('irrelevant_content', 'gambling', 'keyword', 'Gambling content');

-- ============================================================================
-- SOURCE VERIFICATION LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  source_id UUID REFERENCES intel_sources(id) ON DELETE CASCADE,
  
  -- Verification details
  verified BOOLEAN NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  issues TEXT[],
  recommendations TEXT[],
  
  -- What was checked
  checks_performed JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intel_verification_logs_tenant ON intel_verification_logs(tenant_id);
CREATE INDEX idx_intel_verification_logs_source ON intel_verification_logs(source_id);

ALTER TABLE intel_verification_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VIEWS FOR UI
-- ============================================================================

-- Strategic sources overview with all scoring
CREATE OR REPLACE VIEW intel_strategic_sources_overview AS
SELECT 
  s.id,
  s.tenant_id,
  s.source_class,
  s.source_type,
  s.platform,
  s.name,
  s.url,
  s.handle,
  s.description,
  s.status,
  -- Strategic scores
  s.strategic_relevance,
  s.audience_alignment,
  s.credibility_score,
  s.publishing_consistency,
  s.insight_density,
  s.recency_score,
  s.overall_score,
  -- Routing
  s.route_to_telegram,
  s.route_to_rag,
  s.is_active,
  -- Verification
  s.verification_result->>'verified' as verification_status,
  s.verification_result->>'confidence' as verification_confidence,
  -- Metadata
  s.discovered_at,
  s.discovered_by,
  s.approved_at,
  s.created_at
FROM intel_sources s
WHERE s.status != 'rejected';

-- Trusted sources view for strategy influence
CREATE OR REPLACE VIEW intel_trusted_sources AS
SELECT 
  s.id,
  s.tenant_id,
  s.source_class,
  s.source_type,
  s.platform,
  s.name,
  s.url,
  s.description,
  s.strategic_relevance,
  s.audience_alignment,
  s.credibility_score,
  s.overall_score,
  s.route_to_rag,
  sp.content_themes,
  sp.learning_priorities
FROM intel_sources s
LEFT JOIN intel_strategic_profiles sp ON sp.tenant_id = s.tenant_id
WHERE s.status = 'trusted'
  AND s.is_active = TRUE
ORDER BY s.overall_score DESC;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate strategic overall score
CREATE OR REPLACE FUNCTION calculate_strategic_score(
  strategic_relevance DECIMAL,
  audience_alignment DECIMAL,
  credibility DECIMAL,
  publishing_consistency DECIMAL,
  insight_density DECIMAL,
  recency DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  -- Weighted: Strategic relevance 30%, audience 20%, credibility 20%,
  -- consistency 10%, insight 15%, recency 5%
  RETURN ROUND(
    COALESCE(strategic_relevance, 0) * 0.30 +
    COALESCE(audience_alignment, 0) * 0.20 +
    COALESCE(credibility, 0) * 0.20 +
    COALESCE(publishing_consistency, 0) * 0.10 +
    COALESCE(insight_density, 0) * 0.15 +
    COALESCE(recency, 0) * 0.05
  , 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get tenant's strategic profile
CREATE OR REPLACE FUNCTION get_strategic_profile(p_tenant_id UUID)
RETURNS intel_strategic_profiles AS $$
DECLARE
  profile intel_strategic_profiles;
BEGIN
  SELECT * INTO profile
  FROM intel_strategic_profiles
  WHERE tenant_id = p_tenant_id;
  
  RETURN profile;
END;
$$ LANGUAGE plpgsql;
