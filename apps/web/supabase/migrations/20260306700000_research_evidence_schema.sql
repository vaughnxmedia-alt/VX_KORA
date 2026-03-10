-- ============================================================================
-- KORA Research & Evidence Schema
-- Migration: 20260306700000_research_evidence_schema.sql
-- 
-- This migration adds tables to store research findings and evidence bundles
-- that ground strategy documents in verifiable sources.
-- ============================================================================

-- ============================================================================
-- 1. RESEARCH FINDINGS TABLE
-- Stores raw research data collected by research agents
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_research_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id UUID REFERENCES intel_pipeline_runs(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenant_profiles(id) ON DELETE CASCADE,
  
  -- Finding classification
  finding_type TEXT NOT NULL CHECK (finding_type IN (
    'competitor', 
    'audience', 
    'market', 
    'industry', 
    'platform',
    'social',
    'news'
  )),
  finding_category TEXT,
  
  -- Research query and results
  search_query TEXT,
  search_provider TEXT, -- 'tavily', 'exa', 'perplexity', etc.
  
  -- Source information
  sources JSONB DEFAULT '[]'::JSONB,
  /* sources structure:
  [{
    "url": "https://...",
    "title": "Article Title",
    "domain": "forbes.com",
    "snippet": "...",
    "score": 0.85,
    "retrieved_at": "2026-03-06T..."
  }]
  */
  
  -- Extracted findings
  findings JSONB DEFAULT '{}'::JSONB,
  summary TEXT,
  key_insights TEXT[],
  
  -- Confidence and quality
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source_count INTEGER DEFAULT 0,
  
  -- Metadata
  search_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for efficient queries
  CONSTRAINT valid_findings CHECK (findings IS NOT NULL)
);

-- Indexes for research findings
CREATE INDEX idx_research_findings_tenant ON intel_research_findings(tenant_id);
CREATE INDEX idx_research_findings_pipeline ON intel_research_findings(pipeline_run_id);
CREATE INDEX idx_research_findings_type ON intel_research_findings(finding_type);
CREATE INDEX idx_research_findings_created ON intel_research_findings(created_at DESC);

-- ============================================================================
-- 2. EVIDENCE BUNDLES TABLE
-- Links claims in deliverables to their supporting evidence
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_evidence_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant_profiles(id) ON DELETE CASCADE,
  
  -- Link to deliverable
  deliverable_id UUID,
  deliverable_type TEXT CHECK (deliverable_type IN (
    'brand_blueprint',
    'content_strategy', 
    'audience_analysis',
    'campaign'
  )),
  
  -- The claim being supported
  claim TEXT NOT NULL,
  claim_type TEXT CHECK (claim_type IN (
    'market_data',
    'audience_demographics',
    'audience_psychographics',
    'competitor_analysis',
    'industry_trend',
    'best_practice',
    'platform_insight',
    'consumer_behavior',
    'strategic_recommendation'
  )),
  section_path TEXT, -- e.g., 'brand_voice.tone', 'content_pillars[0]'
  
  -- Evidence sources
  sources JSONB NOT NULL DEFAULT '[]'::JSONB,
  /* sources structure:
  [{
    "id": "src_...",
    "url": "https://...",
    "title": "...",
    "domain": "...",
    "quote": "The exact text supporting this claim...",
    "relevance_score": 0.85,
    "credibility_score": 0.9,
    "retrieved_at": "2026-03-06T...",
    "retrieval_method": "web_search"
  }]
  */
  
  -- Confidence assessment
  confidence_level TEXT CHECK (confidence_level IN (
    'high',      -- 3+ corroborating sources
    'medium',    -- 2 sources
    'low',       -- 1 source
    'unverified', -- No sources, general knowledge
    'conflicted'  -- Sources disagree
  )),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Conflicting evidence
  conflicting_evidence JSONB,
  /* conflicting_evidence structure:
  [{
    "position": "Alternative viewpoint...",
    "sources": [...],
    "resolution": "How conflict was resolved..."
  }]
  */
  
  -- Synthesis info
  synthesized_from TEXT[], -- IDs of research findings used
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for evidence bundles
CREATE INDEX idx_evidence_bundles_tenant ON intel_evidence_bundles(tenant_id);
CREATE INDEX idx_evidence_bundles_deliverable ON intel_evidence_bundles(deliverable_id, deliverable_type);
CREATE INDEX idx_evidence_bundles_claim_type ON intel_evidence_bundles(claim_type);
CREATE INDEX idx_evidence_bundles_confidence ON intel_evidence_bundles(confidence_level);

-- ============================================================================
-- 3. RESEARCH GAPS TABLE
-- Tracks what we couldn't find or verify
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_research_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant_profiles(id) ON DELETE CASCADE,
  pipeline_run_id UUID REFERENCES intel_pipeline_runs(id) ON DELETE CASCADE,
  
  -- Gap identification
  topic TEXT NOT NULL,
  gap_type TEXT CHECK (gap_type IN (
    'no_data',
    'conflicting_data', 
    'outdated_data',
    'insufficient_sources'
  )),
  
  -- Impact assessment
  impact TEXT CHECK (impact IN ('critical', 'moderate', 'minor')),
  affected_sections TEXT[], -- Which deliverable sections are affected
  
  -- Attempted research
  attempted_queries TEXT[],
  
  -- Resolution
  recommendation TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for research gaps
CREATE INDEX idx_research_gaps_tenant ON intel_research_gaps(tenant_id);
CREATE INDEX idx_research_gaps_impact ON intel_research_gaps(impact);
CREATE INDEX idx_research_gaps_unresolved ON intel_research_gaps(resolved) WHERE resolved = FALSE;

-- ============================================================================
-- 4. COMPETITOR PROFILES TABLE
-- Detailed competitor analysis from research
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_competitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant_profiles(id) ON DELETE CASCADE,
  research_finding_id UUID REFERENCES intel_research_findings(id) ON DELETE SET NULL,
  
  -- Competitor identity
  competitor_name TEXT NOT NULL,
  website_url TEXT,
  
  -- Analysis
  description TEXT,
  positioning TEXT,
  target_audience TEXT,
  
  -- Strengths & Weaknesses
  strengths TEXT[],
  weaknesses TEXT[],
  key_messages TEXT[],
  
  -- Content strategy insights
  content_strategy JSONB,
  /* content_strategy structure:
  {
    "pillars": [...],
    "formats": [...],
    "tone": "...",
    "frequency": "..."
  }
  */
  
  -- Social presence
  social_presence JSONB,
  /* social_presence structure:
  {
    "platforms": ["instagram", "linkedin"],
    "estimated_followers": "10k-50k",
    "engagement_style": "..."
  }
  */
  
  -- Evidence
  evidence_bundle_id UUID REFERENCES intel_evidence_bundles(id) ON DELETE SET NULL,
  confidence_score DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, competitor_name)
);

-- Indexes for competitor profiles
CREATE INDEX idx_competitor_profiles_tenant ON intel_competitor_profiles(tenant_id);

-- ============================================================================
-- 5. AUDIENCE RESEARCH TABLE
-- Research-backed audience insights
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_audience_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant_profiles(id) ON DELETE CASCADE,
  research_finding_id UUID REFERENCES intel_research_findings(id) ON DELETE SET NULL,
  
  -- Demographics with evidence
  demographics JSONB,
  /* demographics structure:
  {
    "age_range": "25-45",
    "gender": "Mixed",
    "locations": ["US", "Urban"],
    "income": "$50k-100k",
    "education": "College+",
    "evidence_id": "eb_..."
  }
  */
  
  -- Psychographics with evidence
  psychographics JSONB,
  /* psychographics structure:
  {
    "values": [{"value": "...", "source": "..."}],
    "aspirations": [...],
    "fears": [...],
    "influences": [...]
  }
  */
  
  -- Platform behavior
  platform_behavior JSONB,
  /* platform_behavior structure:
  [{
    "platform": "instagram",
    "engagement_times": ["11am-1pm"],
    "content_preferences": ["video", "stories"],
    "engagement_patterns": "...",
    "evidence_id": "eb_..."
  }]
  */
  
  -- Pain points
  pain_points JSONB,
  /* pain_points structure:
  [{
    "point": "...",
    "severity": "high|medium|low",
    "frequency": "common",
    "evidence_id": "eb_..."
  }]
  */
  
  -- Content preferences
  content_preferences TEXT[],
  buying_behaviors TEXT[],
  
  -- Audience journey
  audience_journey JSONB,
  
  -- Overall confidence
  overall_confidence DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audience research
CREATE INDEX idx_audience_research_tenant ON intel_audience_research(tenant_id);

-- ============================================================================
-- 6. MARKET INTELLIGENCE TABLE
-- Industry and market research data
-- ============================================================================

CREATE TABLE IF NOT EXISTS intel_market_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenant_profiles(id) ON DELETE CASCADE,
  research_finding_id UUID REFERENCES intel_research_findings(id) ON DELETE SET NULL,
  
  -- Industry context
  industry TEXT NOT NULL,
  industry_overview TEXT,
  
  -- Market statistics
  market_size JSONB,
  /* market_size structure:
  {
    "value": "$10B",
    "year": "2025",
    "source": "forbes.com",
    "evidence_id": "eb_..."
  }
  */
  
  growth_rate JSONB,
  /* growth_rate structure:
  {
    "value": "8.5% CAGR",
    "period": "2025-2030",
    "source": "statista.com",
    "evidence_id": "eb_..."
  }
  */
  
  -- Trends
  key_trends JSONB,
  /* key_trends structure:
  [{
    "trend": "...",
    "description": "...",
    "impact": "high|medium|low",
    "timeframe": "2025-2027",
    "evidence_id": "eb_..."
  }]
  */
  
  -- Content & marketing trends
  content_trends JSONB,
  
  -- Strategic analysis
  opportunities TEXT[],
  threats TEXT[],
  seasonal_patterns TEXT[],
  recommendations TEXT[],
  
  -- Confidence
  overall_confidence DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for market intelligence
CREATE INDEX idx_market_intelligence_tenant ON intel_market_intelligence(tenant_id);
CREATE INDEX idx_market_intelligence_industry ON intel_market_intelligence(industry);

-- ============================================================================
-- 7. UPDATE TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_research_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_evidence_bundles_updated_at
  BEFORE UPDATE ON intel_evidence_bundles
  FOR EACH ROW EXECUTE FUNCTION update_research_updated_at();

CREATE TRIGGER update_competitor_profiles_updated_at
  BEFORE UPDATE ON intel_competitor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_research_updated_at();

CREATE TRIGGER update_audience_research_updated_at
  BEFORE UPDATE ON intel_audience_research
  FOR EACH ROW EXECUTE FUNCTION update_research_updated_at();

CREATE TRIGGER update_market_intelligence_updated_at
  BEFORE UPDATE ON intel_market_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_research_updated_at();

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE intel_research_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_evidence_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_research_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_competitor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_audience_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_market_intelligence ENABLE ROW LEVEL SECURITY;

-- Policies for research findings
CREATE POLICY "Users can view own research findings"
  ON intel_research_findings FOR SELECT
  USING (tenant_id IN (
    SELECT tp.id FROM tenant_profiles tp 
    JOIN customers c ON c.id = tp.customer_id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage research findings"
  ON intel_research_findings FOR ALL
  USING (auth.role() = 'service_role');

-- Policies for evidence bundles
CREATE POLICY "Users can view own evidence bundles"
  ON intel_evidence_bundles FOR SELECT
  USING (tenant_id IN (
    SELECT tp.id FROM tenant_profiles tp 
    JOIN customers c ON c.id = tp.customer_id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage evidence bundles"
  ON intel_evidence_bundles FOR ALL
  USING (auth.role() = 'service_role');

-- Policies for research gaps
CREATE POLICY "Users can view own research gaps"
  ON intel_research_gaps FOR SELECT
  USING (tenant_id IN (
    SELECT tp.id FROM tenant_profiles tp 
    JOIN customers c ON c.id = tp.customer_id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage research gaps"
  ON intel_research_gaps FOR ALL
  USING (auth.role() = 'service_role');

-- Policies for competitor profiles
CREATE POLICY "Users can view own competitor profiles"
  ON intel_competitor_profiles FOR SELECT
  USING (tenant_id IN (
    SELECT tp.id FROM tenant_profiles tp 
    JOIN customers c ON c.id = tp.customer_id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage competitor profiles"
  ON intel_competitor_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Policies for audience research
CREATE POLICY "Users can view own audience research"
  ON intel_audience_research FOR SELECT
  USING (tenant_id IN (
    SELECT tp.id FROM tenant_profiles tp 
    JOIN customers c ON c.id = tp.customer_id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage audience research"
  ON intel_audience_research FOR ALL
  USING (auth.role() = 'service_role');

-- Policies for market intelligence
CREATE POLICY "Users can view own market intelligence"
  ON intel_market_intelligence FOR SELECT
  USING (tenant_id IN (
    SELECT tp.id FROM tenant_profiles tp 
    JOIN customers c ON c.id = tp.customer_id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage market intelligence"
  ON intel_market_intelligence FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to get all evidence for a deliverable
CREATE OR REPLACE FUNCTION get_deliverable_evidence(
  p_deliverable_id UUID,
  p_deliverable_type TEXT
) RETURNS TABLE (
  claim TEXT,
  claim_type TEXT,
  confidence_level TEXT,
  confidence_score DECIMAL,
  sources JSONB,
  section_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eb.claim,
    eb.claim_type,
    eb.confidence_level,
    eb.confidence_score,
    eb.sources,
    eb.section_path
  FROM intel_evidence_bundles eb
  WHERE eb.deliverable_id = p_deliverable_id
    AND eb.deliverable_type = p_deliverable_type
  ORDER BY eb.section_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate overall document confidence
CREATE OR REPLACE FUNCTION calculate_document_confidence(
  p_deliverable_id UUID,
  p_deliverable_type TEXT
) RETURNS DECIMAL AS $$
DECLARE
  avg_confidence DECIMAL;
BEGIN
  SELECT AVG(confidence_score)
  INTO avg_confidence
  FROM intel_evidence_bundles
  WHERE deliverable_id = p_deliverable_id
    AND deliverable_type = p_deliverable_type
    AND confidence_score IS NOT NULL;
  
  RETURN COALESCE(avg_confidence, 0.3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE intel_research_findings IS 'Raw research data collected by KORA research agents';
COMMENT ON TABLE intel_evidence_bundles IS 'Links claims in deliverables to their supporting evidence sources';
COMMENT ON TABLE intel_research_gaps IS 'Tracks research topics where data could not be found or verified';
COMMENT ON TABLE intel_competitor_profiles IS 'Detailed competitor analysis from research';
COMMENT ON TABLE intel_audience_research IS 'Research-backed audience insights with evidence';
COMMENT ON TABLE intel_market_intelligence IS 'Industry and market research data with citations';
