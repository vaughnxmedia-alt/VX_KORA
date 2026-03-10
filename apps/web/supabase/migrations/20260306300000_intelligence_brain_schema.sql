-- KORA Intelligence Brain Schema
-- Migration: 20260306300000
-- Purpose: Create structured storage for the multi-stage intelligence pipeline

-- ============================================================================
-- CORE SESSION TABLES
-- ============================================================================

-- Individual intake answers (not JSONB blob)
CREATE TABLE IF NOT EXISTS intel_intake_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES telegram_intake_sessions(id) ON DELETE CASCADE,
  tenant_id UUID,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  raw_answer TEXT NOT NULL,
  normalized_answer TEXT,
  answer_type TEXT DEFAULT 'user_provided', -- 'user_provided', 'clarified', 'inferred'
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  needs_clarification BOOLEAN DEFAULT FALSE,
  clarification_reason TEXT,
  clarification_question TEXT,
  clarified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_intake_answers_session ON intel_intake_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_intel_intake_answers_tenant ON intel_intake_answers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_intake_answers_question ON intel_intake_answers(question_id);

-- Telegram message log for full conversation history
CREATE TABLE IF NOT EXISTS intel_telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES telegram_intake_sessions(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  telegram_chat_id BIGINT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL, -- 'question', 'answer', 'status', 'deliverable', 'clarification', 'error'
  content TEXT NOT NULL,
  message_id BIGINT, -- Telegram message ID for editing/deleting
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_telegram_messages_session ON intel_telegram_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_intel_telegram_messages_telegram ON intel_telegram_messages(telegram_id);
CREATE INDEX IF NOT EXISTS idx_intel_telegram_messages_chat ON intel_telegram_messages(telegram_chat_id);

-- ============================================================================
-- TENANT AND RESEARCH TABLES
-- ============================================================================

-- Tenant profile (enriched customer for intelligence pipeline)
CREATE TABLE IF NOT EXISTS intel_tenant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  telegram_id BIGINT UNIQUE,
  telegram_username TEXT,
  business_name TEXT,
  website_url TEXT,
  social_handles JSONB DEFAULT '{}', -- {instagram: "@x", twitter: "@y", linkedin: "url", youtube: "url", tiktok: "@z"}
  industry TEXT,
  business_type TEXT,
  
  -- Pipeline status tracking
  intake_status TEXT DEFAULT 'pending' CHECK (intake_status IN ('pending', 'in_progress', 'clarifying', 'complete')),
  research_status TEXT DEFAULT 'pending' CHECK (research_status IN ('pending', 'in_progress', 'complete', 'failed', 'skipped')),
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'brand', 'audience', 'strategy', 'complete', 'failed')),
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'in_progress', 'passed', 'failed', 'regenerating')),
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'in_progress', 'complete', 'failed')),
  
  -- Overall pipeline state
  pipeline_stage TEXT DEFAULT 'intake' CHECK (pipeline_stage IN ('intake', 'clarification', 'research', 'generation', 'review', 'delivery', 'complete', 'error')),
  pipeline_error TEXT,
  pipeline_started_at TIMESTAMPTZ,
  pipeline_completed_at TIMESTAMPTZ,
  
  -- Testing flags
  is_test_tenant BOOLEAN DEFAULT FALSE,
  test_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(customer_id)
);

CREATE INDEX IF NOT EXISTS idx_intel_tenant_profiles_customer ON intel_tenant_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_intel_tenant_profiles_telegram ON intel_tenant_profiles(telegram_id);
CREATE INDEX IF NOT EXISTS idx_intel_tenant_profiles_stage ON intel_tenant_profiles(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_intel_tenant_profiles_test ON intel_tenant_profiles(is_test_tenant) WHERE is_test_tenant = TRUE;

-- Social profile audit results
CREATE TABLE IF NOT EXISTS intel_social_profile_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES intel_tenant_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'facebook', 'threads')),
  profile_url TEXT,
  profile_handle TEXT,
  
  -- Profile data
  bio TEXT,
  display_name TEXT,
  follower_count INTEGER,
  following_count INTEGER,
  post_count INTEGER,
  
  -- Engagement metrics
  avg_likes_per_post INTEGER,
  avg_comments_per_post INTEGER,
  avg_engagement_rate DECIMAL(5,2), -- percentage
  posting_frequency TEXT, -- 'daily', 'several_per_week', 'weekly', 'sporadic', 'inactive'
  last_post_date TIMESTAMPTZ,
  
  -- Content analysis
  content_themes JSONB DEFAULT '[]', -- ["lifestyle", "business", "education"]
  content_formats JSONB DEFAULT '[]', -- ["reels", "carousels", "stories", "threads"]
  hashtag_usage JSONB DEFAULT '[]', -- most common hashtags
  platform_strengths JSONB DEFAULT '[]',
  platform_weaknesses JSONB DEFAULT '[]',
  notable_posts JSONB DEFAULT '[]', -- [{url, engagement, theme}]
  
  -- Metadata
  audit_date TIMESTAMPTZ DEFAULT NOW(),
  data_source TEXT DEFAULT 'inferred' CHECK (data_source IN ('api', 'scrape', 'manual', 'inferred')),
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  raw_data JSONB DEFAULT '{}',
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_intel_social_audits_tenant ON intel_social_profile_audits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_social_audits_platform ON intel_social_profile_audits(platform);

-- Research sources used for each tenant
CREATE TABLE IF NOT EXISTS intel_research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES intel_tenant_profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('website', 'social_profile', 'competitor', 'industry_report', 'news_article', 'review')),
  source_url TEXT,
  source_name TEXT,
  
  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fetching', 'fetched', 'analyzing', 'analyzed', 'failed')),
  accessed_at TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ,
  
  -- Content
  raw_content TEXT,
  content_length INTEGER,
  content_type TEXT, -- 'html', 'text', 'json'
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_research_sources_tenant ON intel_research_sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_research_sources_type ON intel_research_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_intel_research_sources_status ON intel_research_sources(status);

-- Research findings extracted from sources
CREATE TABLE IF NOT EXISTS intel_research_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES intel_tenant_profiles(id) ON DELETE CASCADE,
  source_id UUID REFERENCES intel_research_sources(id) ON DELETE SET NULL,
  
  finding_type TEXT NOT NULL CHECK (finding_type IN ('brand_signal', 'audience_signal', 'competitor_insight', 'industry_trend', 'content_pattern', 'engagement_pattern', 'positioning_clue')),
  finding_category TEXT NOT NULL CHECK (finding_category IN ('verified', 'inferred', 'assumption')),
  
  summary TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  evidence TEXT, -- direct quote or data point
  
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  relevance_score DECIMAL(3,2) DEFAULT 0.5,
  
  -- Usage tracking
  used_in_deliverable BOOLEAN DEFAULT FALSE,
  used_in_section TEXT, -- 'brand_blueprint.mission', 'audience.segments'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_research_findings_tenant ON intel_research_findings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_research_findings_type ON intel_research_findings(finding_type);
CREATE INDEX IF NOT EXISTS idx_intel_research_findings_category ON intel_research_findings(finding_category);
CREATE INDEX IF NOT EXISTS idx_intel_research_findings_confidence ON intel_research_findings(confidence_score);

-- ============================================================================
-- DELIVERABLE TABLES WITH CONFIDENCE SCORING
-- ============================================================================

-- Enhanced brand blueprints with per-field confidence
CREATE TABLE IF NOT EXISTS intel_brand_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES intel_tenant_profiles(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'approved', 'delivered', 'rejected')),
  
  -- Brand Essence
  brand_essence TEXT,
  brand_essence_confidence DECIMAL(3,2),
  brand_essence_source TEXT CHECK (brand_essence_source IN ('user_input', 'research', 'inferred')),
  
  -- Mission
  mission_statement TEXT,
  mission_confidence DECIMAL(3,2),
  mission_source TEXT CHECK (mission_source IN ('user_input', 'research', 'inferred')),
  
  -- Vision
  vision_statement TEXT,
  vision_confidence DECIMAL(3,2),
  vision_source TEXT CHECK (vision_source IN ('user_input', 'research', 'inferred')),
  
  -- Core Values (array with individual confidence)
  core_values JSONB DEFAULT '[]', -- [{value, explanation, confidence, source}]
  
  -- Brand Personality
  brand_personality JSONB DEFAULT '[]', -- [{trait, description, confidence}]
  brand_personality_confidence DECIMAL(3,2),
  
  -- Unique Value Proposition
  unique_value_proposition TEXT,
  uvp_confidence DECIMAL(3,2),
  uvp_source TEXT CHECK (uvp_source IN ('user_input', 'research', 'inferred')),
  
  -- Brand Voice
  brand_voice JSONB DEFAULT '{}', -- {tone, language_style, principles[], confidence}
  
  -- Visual Identity Guidelines
  visual_identity_guidelines JSONB DEFAULT '{}', -- {color_psychology, imagery_style, typography_direction}
  
  -- Positioning
  positioning_statement TEXT,
  positioning_confidence DECIMAL(3,2),
  
  -- Avoid Perceptions
  avoid_perceptions JSONB DEFAULT '[]',
  
  -- Brand Story
  brand_story TEXT,
  brand_story_confidence DECIMAL(3,2),
  
  -- Overall metrics
  overall_confidence_score DECIMAL(3,2),
  low_confidence_sections JSONB DEFAULT '[]', -- ["mission", "vision"]
  research_gaps JSONB DEFAULT '[]', -- [{section, gap_description}]
  
  -- Timestamps
  generated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_brand_blueprints_tenant ON intel_brand_blueprints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_brand_blueprints_status ON intel_brand_blueprints(status);
CREATE INDEX IF NOT EXISTS idx_intel_brand_blueprints_confidence ON intel_brand_blueprints(overall_confidence_score);

-- Content strategies with confidence scoring
CREATE TABLE IF NOT EXISTS intel_content_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES intel_tenant_profiles(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'approved', 'delivered', 'rejected')),
  
  -- Content Pillars
  content_pillars JSONB DEFAULT '[]', -- [{name, description, content_types[], frequency, confidence, rationale}]
  
  -- Content Themes
  content_themes JSONB DEFAULT '[]', -- [{theme, description, confidence}]
  
  -- Posting Schedule
  posting_schedule JSONB DEFAULT '{}', -- {optimal_times[], frequency_by_platform{}, confidence}
  
  -- Platform Strategy
  platform_strategy JSONB DEFAULT '[]', -- [{platform, focus, content_types[], posting_frequency, confidence}]
  
  -- Content Mix
  content_mix JSONB DEFAULT '{}', -- {educational%, entertaining%, promotional%, inspirational%}
  
  -- Example Week
  example_week JSONB DEFAULT '[]', -- [{day, content_type, topic, platform, rationale}]
  
  -- Hashtag Strategy
  hashtag_strategy JSONB DEFAULT '{}', -- {primary[], secondary[], avoid[], confidence}
  
  -- Growth Strategy
  growth_strategy TEXT,
  growth_strategy_confidence DECIMAL(3,2),
  
  -- Key Tips
  key_tips JSONB DEFAULT '[]',
  
  -- Overall metrics
  overall_confidence_score DECIMAL(3,2),
  low_confidence_sections JSONB DEFAULT '[]',
  research_gaps JSONB DEFAULT '[]',
  
  -- Timestamps
  generated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_content_strategies_tenant ON intel_content_strategies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_content_strategies_status ON intel_content_strategies(status);

-- Audience analyses with confidence scoring
CREATE TABLE IF NOT EXISTS intel_audience_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES intel_tenant_profiles(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'approved', 'delivered', 'rejected')),
  
  -- Overview
  overview TEXT,
  overview_confidence DECIMAL(3,2),
  
  -- Primary Audience
  primary_audience JSONB DEFAULT '{}', -- {demographics, psychographics, pain_points[], aspirations[], confidence}
  
  -- Audience Segments
  audience_segments JSONB DEFAULT '[]', -- [{name, description, size_estimate, engagement_approach, confidence, source}]
  
  -- Platform Breakdown
  platform_breakdown JSONB DEFAULT '[]', -- [{platform, audience_type, behavior, best_content, confidence}]
  
  -- Audience Psychology
  audience_psychology TEXT,
  psychology_confidence DECIMAL(3,2),
  
  -- Audience Motivations
  audience_motivations JSONB DEFAULT '[]', -- [{motivation, evidence, confidence}]
  
  -- Content Preferences
  content_types_that_attract JSONB DEFAULT '[]', -- [{type, why_it_works, confidence}]
  
  -- Personality Types
  personality_types JSONB DEFAULT '[]', -- [{type, description, approach, confidence}]
  
  -- Audience Journey
  audience_journey JSONB DEFAULT '{}', -- {awareness_stage, consideration_stage, decision_stage}
  
  -- Engagement Triggers
  engagement_triggers JSONB DEFAULT '[]',
  
  -- Audience Flywheel
  audience_flywheel TEXT,
  
  -- Verified vs Inferred signals
  verified_signals JSONB DEFAULT '[]', -- [{signal, source, evidence}]
  inferred_assumptions JSONB DEFAULT '[]', -- [{assumption, basis, confidence}]
  
  -- Overall metrics
  overall_confidence_score DECIMAL(3,2),
  low_confidence_sections JSONB DEFAULT '[]',
  research_gaps JSONB DEFAULT '[]',
  
  -- Timestamps
  generated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_audience_analyses_tenant ON intel_audience_analyses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_audience_analyses_status ON intel_audience_analyses(status);

-- ============================================================================
-- REVIEW AND QUALITY TABLES
-- ============================================================================

-- Deliverable quality reviews
CREATE TABLE IF NOT EXISTS intel_deliverable_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES intel_tenant_profiles(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL CHECK (deliverable_type IN ('brand_blueprint', 'content_strategy', 'audience_analysis')),
  deliverable_id UUID NOT NULL,
  review_round INTEGER DEFAULT 1,
  
  -- Quality scores (0-1)
  formatting_score DECIMAL(3,2),
  specificity_score DECIMAL(3,2),
  research_depth_score DECIMAL(3,2),
  brand_alignment_score DECIMAL(3,2),
  actionability_score DECIMAL(3,2),
  overall_score DECIMAL(3,2),
  
  -- Issues detected
  malformed_fields JSONB DEFAULT '[]', -- [{field_path, issue, raw_value}]
  generic_statements JSONB DEFAULT '[]', -- [{field_path, text, suggestion}]
  unsupported_assumptions JSONB DEFAULT '[]', -- [{field_path, assumption, needs}]
  missing_research JSONB DEFAULT '[]', -- [{section, what_is_missing}]
  
  -- Review outcome
  passed_review BOOLEAN DEFAULT FALSE,
  review_notes TEXT,
  improvement_actions JSONB DEFAULT '[]', -- [{action, field, priority}]
  
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_reviews_tenant ON intel_deliverable_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_reviews_deliverable ON intel_deliverable_reviews(deliverable_type, deliverable_id);
CREATE INDEX IF NOT EXISTS idx_intel_reviews_passed ON intel_deliverable_reviews(passed_review);

-- Per-field confidence scores (for detailed tracking)
CREATE TABLE IF NOT EXISTS intel_confidence_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES intel_tenant_profiles(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  deliverable_id UUID NOT NULL,
  field_path TEXT NOT NULL, -- 'brand_blueprint.mission' or 'audience.segments[0].description'
  
  confidence_score DECIMAL(3,2) NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('user_provided', 'researched', 'inferred', 'generated')),
  
  -- Evidence
  supporting_evidence JSONB DEFAULT '[]', -- [{source_id, finding_id, excerpt}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(deliverable_type, deliverable_id, field_path)
);

CREATE INDEX IF NOT EXISTS idx_intel_confidence_tenant ON intel_confidence_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_confidence_deliverable ON intel_confidence_scores(deliverable_type, deliverable_id);

-- ============================================================================
-- LLM AND OPERATIONS TABLES
-- ============================================================================

-- LLM execution logs
CREATE TABLE IF NOT EXISTS intel_llm_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES intel_tenant_profiles(id) ON DELETE SET NULL,
  session_id UUID,
  
  -- Agent and task info
  agent_name TEXT NOT NULL,
  task_type TEXT NOT NULL, -- 'embeddings', 'classification', 'synthesis', 'formatting', etc.
  task_description TEXT,
  
  -- Provider info
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'anthropic')),
  model TEXT NOT NULL,
  
  -- Token usage
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  
  -- Cost tracking
  cost_usd DECIMAL(10,6),
  
  -- Performance
  latency_ms INTEGER,
  
  -- Deduplication
  input_hash TEXT,
  cache_hit BOOLEAN DEFAULT FALSE,
  
  -- Debug info
  prompt_preview TEXT, -- first 500 chars
  response_preview TEXT, -- first 500 chars
  full_prompt TEXT, -- full prompt for debugging
  full_response TEXT, -- full response for debugging
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'retrying')),
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_intel_llm_runs_tenant ON intel_llm_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_llm_runs_agent ON intel_llm_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_intel_llm_runs_provider ON intel_llm_runs(provider);
CREATE INDEX IF NOT EXISTS idx_intel_llm_runs_status ON intel_llm_runs(status);
CREATE INDEX IF NOT EXISTS idx_intel_llm_runs_created ON intel_llm_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_intel_llm_runs_hash ON intel_llm_runs(input_hash) WHERE input_hash IS NOT NULL;

-- Pipeline run tracking
CREATE TABLE IF NOT EXISTS intel_pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES intel_tenant_profiles(id) ON DELETE CASCADE,
  
  -- Run info
  run_type TEXT NOT NULL CHECK (run_type IN ('full', 'resume', 'regenerate', 'redelivery')),
  trigger TEXT NOT NULL CHECK (trigger IN ('telegram_command', 'manual', 'scheduled', 'retry')),
  
  -- Stage tracking
  current_stage TEXT,
  stages_completed JSONB DEFAULT '[]', -- ['intake', 'clarification', 'research']
  stages_failed JSONB DEFAULT '[]', -- [{stage, error, timestamp}]
  
  -- Overall status
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  
  -- Metrics
  total_llm_calls INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_usd DECIMAL(10,4) DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_pipeline_runs_tenant ON intel_pipeline_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_pipeline_runs_status ON intel_pipeline_runs(status);

-- ============================================================================
-- TESTING AND FEEDBACK TABLES
-- ============================================================================

-- Testing feedback from Juss/JahKnowsPR
CREATE TABLE IF NOT EXISTS intel_testing_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES intel_tenant_profiles(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  deliverable_id UUID NOT NULL,
  pipeline_run_id UUID REFERENCES intel_pipeline_runs(id) ON DELETE SET NULL,
  
  -- Tester info
  tester_telegram_id BIGINT,
  tester_name TEXT,
  
  -- Grading (1-5 scale)
  context_quality INTEGER CHECK (context_quality BETWEEN 1 AND 5),
  research_depth INTEGER CHECK (research_depth BETWEEN 1 AND 5),
  usefulness INTEGER CHECK (usefulness BETWEEN 1 AND 5),
  brand_alignment INTEGER CHECK (brand_alignment BETWEEN 1 AND 5),
  formatting_quality INTEGER CHECK (formatting_quality BETWEEN 1 AND 5),
  overall_grade INTEGER CHECK (overall_grade BETWEEN 1 AND 5),
  
  -- Qualitative feedback
  feedback_notes TEXT,
  improvement_suggestions TEXT,
  specific_issues JSONB DEFAULT '[]', -- [{section, issue}]
  what_worked_well JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intel_testing_feedback_tenant ON intel_testing_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intel_testing_feedback_deliverable ON intel_testing_feedback(deliverable_type, deliverable_id);
CREATE INDEX IF NOT EXISTS idx_intel_testing_feedback_tester ON intel_testing_feedback(tester_telegram_id);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_intel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'intel_intake_answers',
      'intel_tenant_profiles',
      'intel_social_profile_audits',
      'intel_research_sources',
      'intel_brand_blueprints',
      'intel_content_strategies',
      'intel_audience_analyses'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON %I;
      CREATE TRIGGER trigger_update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_intel_updated_at();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================================================
-- INSERT TEST TENANTS (Juss and JahKnowsPR)
-- ============================================================================

INSERT INTO intel_tenant_profiles (
  customer_id,
  telegram_id,
  telegram_username,
  business_name,
  is_test_tenant,
  test_notes
) VALUES 
  ('juss', 8216104620, 'juss', 'Juss', TRUE, 'Primary test tenant'),
  ('jahknowspr', 8697293004, 'jahknowspr', 'JahKnowsPR', TRUE, 'Secondary test tenant')
ON CONFLICT (customer_id) DO UPDATE SET
  is_test_tenant = TRUE,
  test_notes = EXCLUDED.test_notes,
  updated_at = NOW();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE intel_intake_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_telegram_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_social_profile_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_research_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_brand_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_content_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_audience_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_deliverable_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_llm_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_testing_feedback ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for backend operations)
CREATE POLICY "Service role full access" ON intel_intake_answers FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_telegram_messages FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_tenant_profiles FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_social_profile_audits FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_research_sources FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_research_findings FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_brand_blueprints FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_content_strategies FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_audience_analyses FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_deliverable_reviews FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_confidence_scores FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_llm_runs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_pipeline_runs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON intel_testing_feedback FOR ALL USING (true);
