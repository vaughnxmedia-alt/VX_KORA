-- KORA Source Intelligence Schema
-- Migration: 20260306500000
-- Purpose: Support discovery, processing, and scoring of intelligence sources
--          across READ (articles), WATCH (videos), and FOLLOW (social) classes
--
-- ARCHITECTURE:
-- 
-- Three source classes:
-- 1. READ: blogs, articles, press releases, news, newsletters, events
-- 2. WATCH: YouTube videos, channels, interviews, podcasts, creator videos
-- 3. FOLLOW: Instagram, TikTok, LinkedIn, YouTube creators, public accounts
--
-- YouTube is a first-class intelligence source with transcript support.

-- ============================================================================
-- INTELLIGENCE SOURCES
-- ============================================================================
-- Master table for all intelligence sources across all classes

CREATE TABLE IF NOT EXISTS intel_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  
  -- Source classification
  source_class TEXT NOT NULL CHECK (source_class IN ('read', 'watch', 'follow')),
  source_type TEXT NOT NULL, -- see check constraint below
  platform TEXT, -- 'youtube', 'instagram', 'tiktok', 'linkedin', 'web', 'rss'
  
  -- Source identification
  name TEXT NOT NULL,
  url TEXT,
  handle TEXT, -- for social accounts: @username
  external_id TEXT, -- platform-specific ID (YouTube channel ID, etc.)
  
  -- Source metadata
  description TEXT,
  thumbnail_url TEXT,
  author_name TEXT,
  author_url TEXT,
  
  -- Discovery metadata
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  discovered_by TEXT, -- 'manual', 'agent', 'suggestion'
  discovery_query TEXT, -- what search/logic found this
  discovery_context TEXT, -- why it was discovered
  
  -- Scoring (0-1 scale)
  relevance_score DECIMAL(3,2),
  viability_score DECIMAL(3,2),
  credibility_score DECIMAL(3,2),
  recency_score DECIMAL(3,2),
  overall_score DECIMAL(3,2),
  
  -- Status (three main states: suggested, approved, trusted)
  -- suggested: Discovered but not reviewed
  -- approved: Reviewed and accepted, may feed RAG
  -- trusted: Verified high-quality, influences strategy recommendations
  status TEXT DEFAULT 'suggested' CHECK (status IN (
    'suggested',      -- discovered but not reviewed
    'reviewing',      -- currently being evaluated
    'approved',       -- approved for regular ingestion, may feed RAG
    'trusted',        -- verified high-quality, influences strategy
    'subscribed',     -- actively subscribed/following
    'rejected',       -- explicitly rejected
    'inactive'        -- temporarily disabled
  )),
  
  -- Routing
  route_to_telegram BOOLEAN DEFAULT FALSE,
  route_to_rag BOOLEAN DEFAULT FALSE,
  telegram_frequency TEXT, -- 'instant', 'daily', 'weekly', null
  
  -- Ingestion tracking
  is_active BOOLEAN DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ,
  next_check_at TIMESTAMPTZ,
  check_frequency TEXT DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  items_ingested INTEGER DEFAULT 0,
  last_item_at TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Audit
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source type validation
ALTER TABLE intel_sources ADD CONSTRAINT valid_source_type CHECK (
  (source_class = 'read' AND source_type IN ('blog', 'article', 'press_release', 'news', 'newsletter', 'event', 'rss_feed')) OR
  (source_class = 'watch' AND source_type IN ('youtube_video', 'youtube_channel', 'youtube_playlist', 'interview', 'podcast', 'creator_video', 'webinar')) OR
  (source_class = 'follow' AND source_type IN ('instagram_account', 'tiktok_account', 'linkedin_creator', 'youtube_channel', 'twitter_account', 'threads_account'))
);

CREATE INDEX idx_intel_sources_tenant ON intel_sources(tenant_id);
CREATE INDEX idx_intel_sources_class ON intel_sources(source_class);
CREATE INDEX idx_intel_sources_type ON intel_sources(source_type);
CREATE INDEX idx_intel_sources_status ON intel_sources(status);
CREATE INDEX idx_intel_sources_platform ON intel_sources(platform);
CREATE INDEX idx_intel_sources_active ON intel_sources(tenant_id, is_active, status);

-- ============================================================================
-- YOUTUBE VIDEOS
-- ============================================================================
-- First-class support for YouTube video intelligence

CREATE TABLE IF NOT EXISTS intel_youtube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  source_id UUID REFERENCES intel_sources(id) ON DELETE CASCADE,
  
  -- Video identification
  video_id TEXT NOT NULL, -- YouTube video ID (e.g., "dQw4w9WgXcQ")
  url TEXT NOT NULL,
  
  -- Video metadata
  title TEXT NOT NULL,
  description TEXT,
  channel_id TEXT,
  channel_title TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  published_at TIMESTAMPTZ,
  
  -- Engagement metrics (at time of fetch)
  view_count BIGINT,
  like_count INTEGER,
  comment_count INTEGER,
  
  -- Tags and categories
  tags TEXT[],
  category_id TEXT,
  
  -- Transcript status
  transcript_status TEXT DEFAULT 'pending' CHECK (transcript_status IN (
    'pending',           -- not yet attempted
    'fetching',          -- currently fetching
    'available',         -- captions available and fetched
    'transcribing',      -- using fallback transcription
    'transcribed',       -- fallback transcription complete
    'unavailable',       -- no captions and transcription failed
    'error'              -- fetch error
  )),
  transcript_language TEXT,
  transcript_source TEXT, -- 'youtube_captions', 'auto_captions', 'whisper', 'assembly_ai'
  transcript_error TEXT,
  
  -- Processing status
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
    'pending',
    'processing',
    'summarized',
    'scored',
    'complete',
    'error'
  )),
  
  -- Scoring (0-1 scale)
  relevance_score DECIMAL(3,2),
  audience_relevance_score DECIMAL(3,2),
  strategic_usefulness_score DECIMAL(3,2),
  credibility_score DECIMAL(3,2),
  recency_score DECIMAL(3,2),
  overall_score DECIMAL(3,2),
  
  -- Routing decisions
  route_to_telegram BOOLEAN DEFAULT FALSE,
  route_to_rag BOOLEAN DEFAULT FALSE,
  routed_to_telegram_at TIMESTAMPTZ,
  routed_to_rag_at TIMESTAMPTZ,
  
  -- Flags
  is_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, video_id)
);

CREATE INDEX idx_intel_youtube_videos_tenant ON intel_youtube_videos(tenant_id);
CREATE INDEX idx_intel_youtube_videos_source ON intel_youtube_videos(source_id);
CREATE INDEX idx_intel_youtube_videos_transcript ON intel_youtube_videos(transcript_status);
CREATE INDEX idx_intel_youtube_videos_processing ON intel_youtube_videos(processing_status);
CREATE INDEX idx_intel_youtube_videos_video_id ON intel_youtube_videos(video_id);

-- ============================================================================
-- VIDEO TRANSCRIPTS
-- ============================================================================
-- Stores transcripts for videos (YouTube and others)

CREATE TABLE IF NOT EXISTS intel_video_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  video_id UUID REFERENCES intel_youtube_videos(id) ON DELETE CASCADE,
  
  -- Transcript content
  raw_transcript TEXT NOT NULL,
  normalized_transcript TEXT, -- cleaned, formatted version
  word_count INTEGER,
  duration_covered_seconds INTEGER,
  
  -- Transcript metadata
  language TEXT DEFAULT 'en',
  source TEXT NOT NULL, -- 'youtube_captions', 'auto_captions', 'whisper', 'assembly_ai', 'manual'
  confidence_score DECIMAL(3,2), -- transcription confidence
  
  -- Timestamps (if available)
  has_timestamps BOOLEAN DEFAULT FALSE,
  timestamped_segments JSONB, -- [{start_ms, end_ms, text}]
  
  -- Processing
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intel_video_transcripts_tenant ON intel_video_transcripts(tenant_id);
CREATE INDEX idx_intel_video_transcripts_video ON intel_video_transcripts(video_id);

-- ============================================================================
-- VIDEO SUMMARIES
-- ============================================================================
-- AI-generated summaries of video content

CREATE TABLE IF NOT EXISTS intel_video_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  video_id UUID REFERENCES intel_youtube_videos(id) ON DELETE CASCADE,
  transcript_id UUID REFERENCES intel_video_transcripts(id) ON DELETE SET NULL,
  
  -- Summary content
  summary_type TEXT NOT NULL CHECK (summary_type IN (
    'brief',           -- 1-2 sentence summary
    'detailed',        -- comprehensive summary
    'key_points',      -- bullet points
    'actionable',      -- actionable takeaways
    'content_ideas'    -- content inspiration
  )),
  summary TEXT NOT NULL,
  
  -- Extracted data
  key_topics TEXT[],
  key_quotes TEXT[],
  mentioned_entities TEXT[], -- people, brands, products mentioned
  sentiment TEXT, -- 'positive', 'neutral', 'negative', 'mixed'
  
  -- Relevance to tenant
  brand_relevance_notes TEXT,
  audience_relevance_notes TEXT,
  strategy_relevance_notes TEXT,
  
  -- LLM metadata
  llm_provider TEXT,
  llm_model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intel_video_summaries_tenant ON intel_video_summaries(tenant_id);
CREATE INDEX idx_intel_video_summaries_video ON intel_video_summaries(video_id);
CREATE INDEX idx_intel_video_summaries_type ON intel_video_summaries(summary_type);

-- ============================================================================
-- PROCESSED CONTENT
-- ============================================================================
-- Normalized content from all source types (read, watch, follow)

CREATE TABLE IF NOT EXISTS intel_processed_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  source_id UUID REFERENCES intel_sources(id) ON DELETE SET NULL,
  
  -- Content type
  content_class TEXT NOT NULL CHECK (content_class IN ('read', 'watch', 'follow')),
  content_type TEXT NOT NULL,
  
  -- Original source
  original_url TEXT,
  original_title TEXT,
  original_author TEXT,
  original_published_at TIMESTAMPTZ,
  
  -- Normalized content
  title TEXT NOT NULL,
  content TEXT, -- full content or transcript
  summary TEXT,
  key_points TEXT[],
  
  -- Extracted metadata
  topics TEXT[],
  entities TEXT[], -- people, brands, products
  sentiment TEXT,
  language TEXT DEFAULT 'en',
  word_count INTEGER,
  reading_time_minutes INTEGER,
  
  -- Media
  thumbnail_url TEXT,
  media_urls TEXT[],
  
  -- Scoring (0-1 scale)
  topical_relevance_score DECIMAL(3,2),
  audience_relevance_score DECIMAL(3,2),
  strategic_usefulness_score DECIMAL(3,2),
  credibility_score DECIMAL(3,2),
  recency_score DECIMAL(3,2),
  overall_score DECIMAL(3,2),
  
  -- Score explanations
  score_rationale JSONB, -- {dimension: {score, reason}}
  
  -- Routing decisions
  routing_decision TEXT CHECK (routing_decision IN (
    'suggestion_only',   -- keep as suggestion
    'approve_source',    -- approve the source for regular ingestion
    'route_telegram',    -- send to Telegram
    'route_rag',         -- add to tenant RAG
    'route_both',        -- Telegram and RAG
    'reject'             -- not valuable
  )),
  routing_reason TEXT,
  
  -- Status
  routed_to_telegram BOOLEAN DEFAULT FALSE,
  routed_to_telegram_at TIMESTAMPTZ,
  routed_to_rag BOOLEAN DEFAULT FALSE,
  routed_to_rag_at TIMESTAMPTZ,
  
  -- Approval
  is_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by TEXT, -- 'auto', 'user', 'admin'
  
  -- Embedding
  is_embedded BOOLEAN DEFAULT FALSE,
  embedding_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intel_processed_content_tenant ON intel_processed_content(tenant_id);
CREATE INDEX idx_intel_processed_content_source ON intel_processed_content(source_id);
CREATE INDEX idx_intel_processed_content_class ON intel_processed_content(content_class);
CREATE INDEX idx_intel_processed_content_routing ON intel_processed_content(routing_decision);
CREATE INDEX idx_intel_processed_content_score ON intel_processed_content(overall_score DESC);

-- ============================================================================
-- SOURCE SUBSCRIPTIONS
-- ============================================================================
-- Tenant-specific subscriptions to sources

CREATE TABLE IF NOT EXISTS intel_source_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  source_id UUID REFERENCES intel_sources(id) ON DELETE CASCADE,
  
  -- Subscription settings
  is_active BOOLEAN DEFAULT TRUE,
  check_frequency TEXT DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  
  -- Routing preferences
  route_to_telegram BOOLEAN DEFAULT FALSE,
  telegram_frequency TEXT, -- 'instant', 'daily_digest', 'weekly_digest'
  route_to_rag BOOLEAN DEFAULT TRUE,
  
  -- Filters
  min_score_threshold DECIMAL(3,2) DEFAULT 0.5,
  keyword_filters TEXT[], -- only include if contains these
  exclude_keywords TEXT[], -- exclude if contains these
  
  -- Tracking
  last_checked_at TIMESTAMPTZ,
  items_received INTEGER DEFAULT 0,
  items_approved INTEGER DEFAULT 0,
  items_rejected INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, source_id)
);

CREATE INDEX idx_intel_source_subscriptions_tenant ON intel_source_subscriptions(tenant_id);
CREATE INDEX idx_intel_source_subscriptions_source ON intel_source_subscriptions(source_id);
CREATE INDEX idx_intel_source_subscriptions_active ON intel_source_subscriptions(tenant_id, is_active);

-- ============================================================================
-- INTELLIGENCE PREFERENCES
-- ============================================================================
-- Tenant-specific preferences for source discovery

CREATE TABLE IF NOT EXISTS intel_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL UNIQUE,
  
  -- Source class preferences
  read_sources_enabled BOOLEAN DEFAULT TRUE,
  watch_sources_enabled BOOLEAN DEFAULT TRUE,
  follow_sources_enabled BOOLEAN DEFAULT TRUE,
  
  -- Platform preferences
  preferred_platforms TEXT[] DEFAULT ARRAY['youtube', 'instagram', 'linkedin'],
  excluded_platforms TEXT[],
  
  -- Content preferences
  preferred_topics TEXT[],
  excluded_topics TEXT[],
  preferred_content_types TEXT[],
  
  -- Discovery preferences
  auto_discover_enabled BOOLEAN DEFAULT TRUE,
  auto_approve_threshold DECIMAL(3,2) DEFAULT 0.85, -- auto-approve if score >= this
  auto_reject_threshold DECIMAL(3,2) DEFAULT 0.3,   -- auto-reject if score <= this
  
  -- Telegram routing
  telegram_enabled BOOLEAN DEFAULT TRUE,
  telegram_min_score DECIMAL(3,2) DEFAULT 0.7,
  telegram_digest_frequency TEXT DEFAULT 'daily',
  
  -- RAG routing
  rag_enabled BOOLEAN DEFAULT TRUE,
  rag_min_score DECIMAL(3,2) DEFAULT 0.6,
  
  -- YouTube specific
  youtube_transcript_required BOOLEAN DEFAULT TRUE,
  youtube_min_duration_seconds INTEGER DEFAULT 60,
  youtube_max_duration_seconds INTEGER DEFAULT 3600,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intel_preferences_tenant ON intel_preferences(tenant_id);

-- ============================================================================
-- DISCOVERY RUNS
-- ============================================================================
-- Tracks source discovery runs

CREATE TABLE IF NOT EXISTS intel_discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  
  -- Run metadata
  run_type TEXT NOT NULL CHECK (run_type IN ('scheduled', 'manual', 'triggered')),
  source_classes TEXT[] DEFAULT ARRAY['read', 'watch', 'follow'],
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed'
  )),
  
  -- Discovery queries used
  queries_used JSONB, -- [{query, class, results_count}]
  
  -- Results
  sources_discovered INTEGER DEFAULT 0,
  sources_new INTEGER DEFAULT 0,
  sources_updated INTEGER DEFAULT 0,
  sources_auto_approved INTEGER DEFAULT 0,
  sources_auto_rejected INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Errors
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intel_discovery_runs_tenant ON intel_discovery_runs(tenant_id);
CREATE INDEX idx_intel_discovery_runs_status ON intel_discovery_runs(status);

-- ============================================================================
-- PROCESSING RUNS
-- ============================================================================
-- Tracks content processing runs

CREATE TABLE IF NOT EXISTS intel_processing_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  source_id UUID REFERENCES intel_sources(id) ON DELETE SET NULL,
  
  -- Run metadata
  content_class TEXT NOT NULL,
  content_type TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'fetching', 'processing', 'scoring', 'routing', 'completed', 'failed'
  )),
  
  -- Processing details
  items_fetched INTEGER DEFAULT 0,
  items_processed INTEGER DEFAULT 0,
  items_scored INTEGER DEFAULT 0,
  items_routed_telegram INTEGER DEFAULT 0,
  items_routed_rag INTEGER DEFAULT 0,
  
  -- For YouTube
  transcripts_fetched INTEGER DEFAULT 0,
  transcripts_generated INTEGER DEFAULT 0,
  summaries_generated INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Errors
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_intel_processing_runs_tenant ON intel_processing_runs(tenant_id);
CREATE INDEX idx_intel_processing_runs_source ON intel_processing_runs(source_id);
CREATE INDEX idx_intel_processing_runs_status ON intel_processing_runs(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE intel_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_video_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_video_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_processed_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_source_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_processing_runs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_intel_sources_updated_at
  BEFORE UPDATE ON intel_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intel_youtube_videos_updated_at
  BEFORE UPDATE ON intel_youtube_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intel_video_transcripts_updated_at
  BEFORE UPDATE ON intel_video_transcripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intel_processed_content_updated_at
  BEFORE UPDATE ON intel_processed_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intel_source_subscriptions_updated_at
  BEFORE UPDATE ON intel_source_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intel_preferences_updated_at
  BEFORE UPDATE ON intel_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate overall score from component scores
CREATE OR REPLACE FUNCTION calculate_source_overall_score(
  relevance DECIMAL,
  viability DECIMAL,
  credibility DECIMAL,
  recency DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  -- Weighted average: relevance 35%, viability 25%, credibility 25%, recency 15%
  RETURN ROUND(
    (COALESCE(relevance, 0) * 0.35) +
    (COALESCE(viability, 0) * 0.25) +
    (COALESCE(credibility, 0) * 0.25) +
    (COALESCE(recency, 0) * 0.15),
    2
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate content overall score
CREATE OR REPLACE FUNCTION calculate_content_overall_score(
  topical DECIMAL,
  audience DECIMAL,
  strategic DECIMAL,
  credibility DECIMAL,
  recency DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  -- Weighted average
  RETURN ROUND(
    (COALESCE(topical, 0) * 0.25) +
    (COALESCE(audience, 0) * 0.25) +
    (COALESCE(strategic, 0) * 0.20) +
    (COALESCE(credibility, 0) * 0.15) +
    (COALESCE(recency, 0) * 0.15),
    2
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- VIEWS FOR MISSION CONTROL
-- ============================================================================

-- Sources overview with stats
CREATE OR REPLACE VIEW intel_sources_overview AS
SELECT 
  s.id,
  s.tenant_id,
  s.source_class,
  s.source_type,
  s.platform,
  s.name,
  s.url,
  s.handle,
  s.status,
  s.is_active,
  s.relevance_score,
  s.viability_score,
  s.overall_score,
  s.route_to_telegram,
  s.route_to_rag,
  s.last_checked_at,
  s.items_ingested,
  s.approved_at,
  -- For YouTube sources, get transcript availability
  CASE 
    WHEN s.source_type IN ('youtube_video', 'youtube_channel') THEN
      EXISTS(
        SELECT 1 FROM intel_youtube_videos yv 
        WHERE yv.source_id = s.id 
        AND yv.transcript_status IN ('available', 'transcribed')
      )
    ELSE NULL
  END as has_transcript,
  s.created_at,
  s.updated_at
FROM intel_sources s;

-- YouTube videos with transcript status
CREATE OR REPLACE VIEW intel_youtube_videos_overview AS
SELECT
  v.id,
  v.tenant_id,
  v.video_id,
  v.url,
  v.title,
  v.channel_title,
  v.thumbnail_url,
  v.duration_seconds,
  v.published_at,
  v.view_count,
  v.transcript_status,
  v.processing_status,
  v.overall_score,
  v.route_to_telegram,
  v.route_to_rag,
  v.is_approved,
  -- Check if transcript exists
  EXISTS(SELECT 1 FROM intel_video_transcripts t WHERE t.video_id = v.id) as has_transcript,
  -- Check if summary exists
  EXISTS(SELECT 1 FROM intel_video_summaries s WHERE s.video_id = v.id) as has_summary,
  v.created_at,
  v.updated_at
FROM intel_youtube_videos v;
