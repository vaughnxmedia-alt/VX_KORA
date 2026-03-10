-- KORA Core Brain Schema
-- Migration: 20260306400000
-- Purpose: Create global knowledge tables that are reusable across all tenants
-- 
-- CONFIDENTIALITY ARCHITECTURE:
-- 
-- This migration creates the "Core Brain" - KORA's global professional knowledge.
-- Think of this as KORA's "college degree" - universal knowledge needed to do the job well.
-- 
-- Core Brain tables (core_*) contain:
--   - PR frameworks
--   - Marketing strategy logic
--   - Audience analysis methodologies
--   - Campaign planning templates
--   - Platform behavior knowledge
--   - Output templates
--   - Review standards
--   - Reasoning heuristics
-- 
-- CRITICAL: Core Brain data is NEVER tenant-specific.
-- CRITICAL: Core Brain data may be safely reused across all tenants.
-- CRITICAL: No client examples, case studies, or derived insights from tenant work belong here.
-- 
-- Tenant Brain tables (intel_*) remain separate and contain:
--   - tenant_id on every row
--   - Private client data
--   - Never cross-referenced

-- ============================================================================
-- CORE FRAMEWORKS
-- ============================================================================
-- Universal PR/marketing frameworks that guide KORA's reasoning
-- Example: "PESO Model", "Jobs To Be Done", "Brand Archetype Framework"

CREATE TABLE IF NOT EXISTS core_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Framework identification
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'brand', 'audience', 'content', 'campaign', 'pr', 'social'
  
  -- Framework content
  description TEXT NOT NULL,
  methodology TEXT NOT NULL, -- Detailed explanation of how to apply
  when_to_use TEXT, -- Guidance on when this framework is appropriate
  limitations TEXT, -- Known limitations or caveats
  
  -- Structured components
  components JSONB, -- [{name, description, examples}]
  steps JSONB, -- [{order, name, description, outputs}]
  
  -- Source attribution (public sources only)
  source_attribution TEXT, -- "Harvard Business Review", "Industry Standard", etc.
  source_url TEXT,
  is_public_knowledge BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast category lookups
CREATE INDEX IF NOT EXISTS idx_core_frameworks_category ON core_frameworks(category);
CREATE INDEX IF NOT EXISTS idx_core_frameworks_slug ON core_frameworks(slug);

-- ============================================================================
-- CORE PROMPTS
-- ============================================================================
-- Reusable prompt templates that KORA uses for generation
-- These encode KORA's professional standards and reasoning patterns

CREATE TABLE IF NOT EXISTS core_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Prompt identification
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  agent_name TEXT NOT NULL, -- 'brand_intelligence', 'audience_intelligence', etc.
  purpose TEXT NOT NULL,
  
  -- The prompt template (uses {{variable}} placeholders)
  system_instruction TEXT NOT NULL, -- Base system message
  prompt_template TEXT NOT NULL, -- Main prompt with placeholders
  output_schema JSONB, -- Expected JSON structure
  
  -- Confidentiality controls (critical for tenant isolation)
  allowed_context_sources TEXT[] DEFAULT ARRAY['core_knowledge', 'current_tenant'],
  forbidden_context_sources TEXT[] DEFAULT ARRAY['other_tenants'],
  confidentiality_reminder TEXT DEFAULT 'Never reference, imply, or borrow from other client work.',
  
  -- Quality controls
  required_variables TEXT[], -- Variables that must be provided
  validation_rules JSONB, -- Rules for validating output
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_prompts_agent ON core_prompts(agent_name);
CREATE INDEX IF NOT EXISTS idx_core_prompts_slug ON core_prompts(slug);

-- ============================================================================
-- CORE PLAYBOOKS
-- ============================================================================
-- Step-by-step guides for common PR/marketing scenarios
-- Example: "Product Launch Playbook", "Crisis Response Playbook"

CREATE TABLE IF NOT EXISTS core_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Playbook identification
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'launch', 'crisis', 'growth', 'engagement', 'awareness'
  
  -- Playbook content
  overview TEXT NOT NULL,
  target_outcome TEXT NOT NULL,
  typical_timeline TEXT, -- "2-4 weeks", "90 days", etc.
  
  -- Structured phases
  phases JSONB NOT NULL, -- [{order, name, description, tasks, deliverables, duration}]
  
  -- Success criteria
  success_metrics JSONB, -- [{metric, target, measurement_method}]
  common_pitfalls TEXT[],
  
  -- Applicability
  best_for TEXT[], -- ["startups", "product launches", "B2B"]
  not_suitable_for TEXT[],
  
  -- Source (public only)
  source_attribution TEXT,
  is_public_knowledge BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_playbooks_category ON core_playbooks(category);

-- ============================================================================
-- CORE SCORING RULES
-- ============================================================================
-- Rules used by Quality Review Agent to score deliverables
-- These define KORA's professional standards

CREATE TABLE IF NOT EXISTS core_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule identification
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  deliverable_type TEXT NOT NULL, -- 'brand_blueprint', 'content_strategy', 'audience_analysis', 'all'
  score_category TEXT NOT NULL, -- 'formatting', 'specificity', 'research_depth', 'actionability', 'brand_alignment'
  
  -- Rule definition
  description TEXT NOT NULL,
  criteria JSONB NOT NULL, -- [{criterion, weight, scoring_guide}]
  
  -- Scoring scale
  min_score DECIMAL(3,2) DEFAULT 0,
  max_score DECIMAL(3,2) DEFAULT 1,
  passing_threshold DECIMAL(3,2) DEFAULT 0.7,
  
  -- Detection patterns
  red_flag_patterns TEXT[], -- Patterns that indicate low quality
  excellence_patterns TEXT[], -- Patterns that indicate high quality
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_scoring_rules_type ON core_scoring_rules(deliverable_type);
CREATE INDEX IF NOT EXISTS idx_core_scoring_rules_category ON core_scoring_rules(score_category);

-- ============================================================================
-- CORE PLATFORM KNOWLEDGE
-- ============================================================================
-- Knowledge about social platforms, algorithms, best practices
-- Updated independently of tenant data

CREATE TABLE IF NOT EXISTS core_platform_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Platform identification
  platform TEXT NOT NULL UNIQUE, -- 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'threads'
  display_name TEXT NOT NULL,
  
  -- Platform characteristics
  primary_content_type TEXT, -- 'visual', 'text', 'video', 'audio'
  audience_demographics JSONB, -- {age_range, interests, behaviors}
  
  -- Algorithm knowledge (public, general)
  algorithm_factors JSONB, -- [{factor, importance, notes}]
  optimal_posting_times JSONB, -- [{day, time_range, timezone}]
  
  -- Best practices
  content_best_practices TEXT[],
  engagement_strategies TEXT[],
  growth_tactics TEXT[],
  common_mistakes TEXT[],
  
  -- Format specifications
  content_formats JSONB, -- [{format, max_length, aspect_ratio, notes}]
  hashtag_guidance JSONB,
  
  -- Metrics benchmarks (industry averages, public data)
  engagement_benchmarks JSONB, -- {good, average, poor} by metric
  growth_benchmarks JSONB,
  
  -- Source attribution
  last_researched_at TIMESTAMPTZ,
  source_urls TEXT[],
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_platform_knowledge_platform ON core_platform_knowledge(platform);

-- ============================================================================
-- CORE INDUSTRY KNOWLEDGE
-- ============================================================================
-- Public knowledge about industries for context
-- Never contains tenant-specific insights

CREATE TABLE IF NOT EXISTS core_industry_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Industry identification
  industry TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  parent_industry TEXT, -- For hierarchical industries
  
  -- Industry characteristics
  description TEXT NOT NULL,
  typical_audience JSONB, -- General audience characteristics
  content_themes TEXT[], -- Common content themes in this industry
  
  -- Marketing patterns (public, general)
  common_marketing_channels TEXT[],
  typical_content_formats TEXT[],
  seasonality_patterns JSONB, -- {month: activity_level}
  
  -- Competitive landscape (general, public)
  typical_competitors_count TEXT, -- "5-10 major players"
  differentiation_factors TEXT[],
  
  -- PR considerations
  media_landscape TEXT,
  common_pr_angles TEXT[],
  sensitivity_topics TEXT[],
  
  -- Source attribution
  source_attribution TEXT,
  is_public_knowledge BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_industry_knowledge_slug ON core_industry_knowledge(slug);

-- ============================================================================
-- CORE OUTPUT TEMPLATES
-- ============================================================================
-- Templates for structuring final deliverables
-- Define the format, not the content

CREATE TABLE IF NOT EXISTS core_output_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  deliverable_type TEXT NOT NULL, -- 'brand_blueprint', 'content_strategy', 'audience_analysis'
  output_format TEXT NOT NULL, -- 'telegram', 'pdf', 'dashboard', 'json'
  
  -- Template structure
  sections JSONB NOT NULL, -- [{order, name, description, required_fields, formatting_notes}]
  
  -- Formatting rules
  max_length INTEGER, -- Character limit for Telegram, etc.
  formatting_style TEXT, -- 'markdown', 'html', 'plain'
  section_separators TEXT,
  
  -- Quality requirements
  required_sections TEXT[],
  optional_sections TEXT[],
  minimum_content_per_section INTEGER,
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_output_templates_type ON core_output_templates(deliverable_type);

-- ============================================================================
-- CORE RAG DOCUMENTS
-- ============================================================================
-- Public knowledge documents for RAG retrieval
-- NEVER contains tenant data
-- 
-- CONFIDENTIALITY: This is the GLOBAL retrieval space.
-- Only public, reusable knowledge belongs here.

CREATE TABLE IF NOT EXISTS core_rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document identification
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'framework', 'best_practice', 'industry_report', 'methodology'
  
  -- Content
  content TEXT NOT NULL,
  summary TEXT,
  
  -- Chunking for retrieval
  chunk_index INTEGER DEFAULT 0, -- For split documents
  parent_document_id UUID REFERENCES core_rag_documents(id),
  
  -- Embedding (for vector search)
  embedding VECTOR(1536), -- OpenAI embedding dimension
  
  -- Source attribution (public sources only)
  source_type TEXT, -- 'public_report', 'industry_standard', 'methodology', 'best_practice'
  source_name TEXT,
  source_url TEXT,
  source_date DATE,
  
  -- Access control
  is_public_knowledge BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_rag_documents_category ON core_rag_documents(category);
CREATE INDEX IF NOT EXISTS idx_core_rag_documents_slug ON core_rag_documents(slug);

-- ============================================================================
-- TENANT RAG DOCUMENTS (Private per tenant)
-- ============================================================================
-- Private knowledge documents for each tenant
-- ALWAYS scoped by tenant_id
-- NEVER cross-queried between tenants
-- 
-- CONFIDENTIALITY: This is the TENANT-SPECIFIC retrieval space.
-- Each tenant has their own isolated namespace.

CREATE TABLE IF NOT EXISTS tenant_rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  
  -- Document identification
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'intake_answer', 'research_finding', 'deliverable', 'approval', 'campaign_idea'
  
  -- Content
  content TEXT NOT NULL,
  summary TEXT,
  
  -- Source within tenant data
  source_type TEXT, -- 'telegram_message', 'intake_answer', 'research', 'generated'
  source_id UUID, -- Reference to original record
  
  -- Chunking for retrieval
  chunk_index INTEGER DEFAULT 0,
  parent_document_id UUID REFERENCES tenant_rag_documents(id),
  
  -- Embedding (for vector search)
  embedding VECTOR(1536),
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL: Index on tenant_id for isolation
CREATE INDEX IF NOT EXISTS idx_tenant_rag_documents_tenant ON tenant_rag_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_rag_documents_category ON tenant_rag_documents(tenant_id, category);

-- ============================================================================
-- TENANT APPROVAL HISTORY
-- ============================================================================
-- Records of content/source approvals via Telegram
-- Private to each tenant

CREATE TABLE IF NOT EXISTS tenant_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  
  -- What was approved
  approval_type TEXT NOT NULL, -- 'content_source', 'deliverable', 'campaign_idea'
  item_id UUID NOT NULL,
  item_description TEXT,
  
  -- Approval details
  approved BOOLEAN NOT NULL,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  approved_via TEXT DEFAULT 'telegram', -- 'telegram', 'dashboard', 'api'
  telegram_message_id BIGINT,
  
  -- Feedback
  feedback_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_approval_history_tenant ON tenant_approval_history(tenant_id);

-- ============================================================================
-- TENANT CAMPAIGN IDEAS
-- ============================================================================
-- Campaign ideas generated for each tenant
-- Private, never shared across tenants

CREATE TABLE IF NOT EXISTS tenant_campaign_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CRITICAL: Tenant isolation
  tenant_id UUID NOT NULL,
  
  -- Campaign identification
  name TEXT NOT NULL,
  category TEXT, -- 'awareness', 'engagement', 'conversion', 'retention'
  
  -- Campaign details
  objective TEXT NOT NULL,
  target_audience TEXT,
  key_messages TEXT[],
  
  -- Execution plan
  channels TEXT[],
  content_types TEXT[],
  timeline TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'proposed', 'approved', 'active', 'completed'
  confidence_score DECIMAL(3,2),
  
  -- Source
  generated_from TEXT, -- 'strategy', 'research', 'user_request'
  source_deliverable_id UUID,
  
  -- Approval
  approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_campaign_ideas_tenant ON tenant_campaign_ideas(tenant_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Ensure tenant data is never accessible across tenants

ALTER TABLE tenant_rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_campaign_ideas ENABLE ROW LEVEL SECURITY;

-- Core tables are readable by all (they contain only public knowledge)
ALTER TABLE core_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_platform_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_industry_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_output_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_rag_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_core_frameworks_updated_at
  BEFORE UPDATE ON core_frameworks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_core_prompts_updated_at
  BEFORE UPDATE ON core_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_core_playbooks_updated_at
  BEFORE UPDATE ON core_playbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_core_scoring_rules_updated_at
  BEFORE UPDATE ON core_scoring_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_core_platform_knowledge_updated_at
  BEFORE UPDATE ON core_platform_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_core_industry_knowledge_updated_at
  BEFORE UPDATE ON core_industry_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_core_output_templates_updated_at
  BEFORE UPDATE ON core_output_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_core_rag_documents_updated_at
  BEFORE UPDATE ON core_rag_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_rag_documents_updated_at
  BEFORE UPDATE ON tenant_rag_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_campaign_ideas_updated_at
  BEFORE UPDATE ON tenant_campaign_ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL CORE KNOWLEDGE SEED DATA
-- ============================================================================
-- Seed essential frameworks that KORA needs to operate

INSERT INTO core_frameworks (name, slug, category, description, methodology, components, source_attribution, is_public_knowledge)
VALUES
  (
    'Brand Archetype Framework',
    'brand-archetypes',
    'brand',
    'A framework based on Carl Jung psychological archetypes adapted for brand personality development.',
    'Identify which of 12 archetypes best represents the brand by analyzing values, voice, and audience expectations. Each archetype has distinct personality traits, communication styles, and emotional appeals.',
    '[
      {"name": "The Innocent", "description": "Pure, optimistic, honest. Seeks happiness and safety."},
      {"name": "The Hero", "description": "Courageous, determined, strong. Seeks to prove worth through action."},
      {"name": "The Outlaw", "description": "Rebellious, disruptive, liberated. Breaks rules and conventions."},
      {"name": "The Magician", "description": "Visionary, transformative, charismatic. Makes dreams reality."},
      {"name": "The Sage", "description": "Wise, knowledgeable, thoughtful. Seeks truth and understanding."},
      {"name": "The Explorer", "description": "Adventurous, independent, pioneering. Discovers new things."},
      {"name": "The Creator", "description": "Innovative, artistic, imaginative. Builds lasting value."},
      {"name": "The Ruler", "description": "Authoritative, responsible, organized. Creates order and structure."},
      {"name": "The Caregiver", "description": "Nurturing, selfless, generous. Protects and cares for others."},
      {"name": "The Everyman", "description": "Relatable, authentic, down-to-earth. Belongs and connects."},
      {"name": "The Jester", "description": "Playful, humorous, joyful. Lives in the moment with fun."},
      {"name": "The Lover", "description": "Passionate, sensual, intimate. Seeks connection and beauty."}
    ]'::JSONB,
    'Carl Jung / Margaret Mark and Carol Pearson',
    TRUE
  ),
  (
    'PESO Model',
    'peso-model',
    'pr',
    'A media framework that categorizes four types of media: Paid, Earned, Shared, and Owned.',
    'Develop an integrated media strategy by planning activities across all four media types. Balance investment based on goals, resources, and audience behavior.',
    '[
      {"name": "Paid Media", "description": "Advertising, sponsored content, paid partnerships. Direct cost for visibility."},
      {"name": "Earned Media", "description": "PR coverage, press mentions, reviews. Credibility through third-party validation."},
      {"name": "Shared Media", "description": "Social media, community engagement, UGC. Amplification through audience participation."},
      {"name": "Owned Media", "description": "Website, blog, email list. Full control over messaging and experience."}
    ]'::JSONB,
    'Gini Dietrich / PRSA',
    TRUE
  ),
  (
    'Jobs To Be Done',
    'jobs-to-be-done',
    'audience',
    'A framework for understanding customer motivation by focusing on the "job" they hire a product or service to do.',
    'Identify the functional, emotional, and social jobs your audience needs done. Position your brand as the solution to these jobs rather than focusing on features.',
    '[
      {"name": "Functional Jobs", "description": "Practical tasks the audience needs to accomplish."},
      {"name": "Emotional Jobs", "description": "How the audience wants to feel during and after the experience."},
      {"name": "Social Jobs", "description": "How the audience wants to be perceived by others."}
    ]'::JSONB,
    'Clayton Christensen / Harvard Business School',
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO core_platform_knowledge (platform, display_name, primary_content_type, algorithm_factors, content_best_practices, engagement_strategies)
VALUES
  (
    'instagram',
    'Instagram',
    'visual',
    '[
      {"factor": "Engagement rate", "importance": "high", "notes": "Likes, comments, saves, shares within first hour"},
      {"factor": "Relationship signals", "importance": "high", "notes": "DMs, profile visits, repeated engagement"},
      {"factor": "Content type", "importance": "medium", "notes": "Reels prioritized, carousels second, static posts third"},
      {"factor": "Posting consistency", "importance": "medium", "notes": "Regular posting improves reach"}
    ]'::JSONB,
    ARRAY[
      'Use high-quality visuals with consistent aesthetic',
      'Write captions that encourage engagement',
      'Use 3-5 relevant hashtags per post',
      'Post Reels for maximum reach',
      'Use Stories for daily engagement',
      'Respond to comments within first hour'
    ],
    ARRAY[
      'Ask questions in captions',
      'Use interactive Story stickers',
      'Go live for real-time connection',
      'Collaborate with other accounts',
      'Share user-generated content'
    ]
  ),
  (
    'linkedin',
    'LinkedIn',
    'text',
    '[
      {"factor": "Dwell time", "importance": "high", "notes": "Time spent reading post indicates value"},
      {"factor": "Early engagement", "importance": "high", "notes": "Comments and reactions in first 90 minutes"},
      {"factor": "Connection relevance", "importance": "medium", "notes": "Content from connections and followed topics"},
      {"factor": "Content format", "importance": "medium", "notes": "Text posts and carousels perform well"}
    ]'::JSONB,
    ARRAY[
      'Start with a hook in first two lines',
      'Use line breaks for readability',
      'Share professional insights and lessons',
      'Post during business hours',
      'Engage in comments on your posts',
      'Use 3-5 relevant hashtags'
    ],
    ARRAY[
      'Ask thoughtful questions',
      'Share behind-the-scenes insights',
      'Comment on industry news',
      'Celebrate others achievements',
      'Start conversations in comments'
    ]
  ),
  (
    'tiktok',
    'TikTok',
    'video',
    '[
      {"factor": "Watch time", "importance": "high", "notes": "Completion rate is primary signal"},
      {"factor": "Engagement", "importance": "high", "notes": "Likes, comments, shares, follows from video"},
      {"factor": "Content signals", "importance": "medium", "notes": "Sounds, hashtags, captions influence distribution"},
      {"factor": "Account authority", "importance": "low", "notes": "New accounts can go viral quickly"}
    ]'::JSONB,
    ARRAY[
      'Hook viewers in first 1-2 seconds',
      'Keep videos short and punchy',
      'Use trending sounds when relevant',
      'Show personality and authenticity',
      'Use text overlays for accessibility',
      'Post consistently (1-3 times daily)'
    ],
    ARRAY[
      'Respond to comments with videos',
      'Duet and stitch relevant content',
      'Participate in trends authentically',
      'Go live to build community',
      'Ask questions to prompt comments'
    ]
  )
ON CONFLICT (platform) DO NOTHING;

INSERT INTO core_scoring_rules (name, slug, deliverable_type, score_category, description, criteria, passing_threshold, red_flag_patterns, excellence_patterns)
VALUES
  (
    'Specificity Score',
    'specificity-score',
    'all',
    'specificity',
    'Measures how specific and concrete the content is versus generic and vague.',
    '[
      {"criterion": "Contains specific examples", "weight": 0.3, "scoring_guide": "1.0 = multiple specific examples, 0.5 = some examples, 0.0 = no examples"},
      {"criterion": "Uses concrete numbers or metrics", "weight": 0.2, "scoring_guide": "1.0 = specific numbers, 0.5 = ranges, 0.0 = vague terms"},
      {"criterion": "References brand-specific details", "weight": 0.3, "scoring_guide": "1.0 = brand name and specifics, 0.5 = generic industry terms, 0.0 = could apply to anyone"},
      {"criterion": "Actionable recommendations", "weight": 0.2, "scoring_guide": "1.0 = clear next steps, 0.5 = directional guidance, 0.0 = vague suggestions"}
    ]'::JSONB,
    0.7,
    ARRAY[
      'various audiences',
      'many people',
      'high-quality content',
      'engaging posts',
      'build your brand',
      'grow your following',
      'connect with your audience'
    ],
    ARRAY[
      'specific percentage',
      'exact number',
      'brand name mentioned',
      'by [date]',
      'measured by',
      'for example'
    ]
  ),
  (
    'Research Depth Score',
    'research-depth-score',
    'all',
    'research_depth',
    'Measures how well the content is supported by research and evidence.',
    '[
      {"criterion": "Cites research findings", "weight": 0.3, "scoring_guide": "1.0 = multiple findings cited, 0.5 = some findings, 0.0 = no research cited"},
      {"criterion": "Distinguishes facts from assumptions", "weight": 0.3, "scoring_guide": "1.0 = clearly labeled, 0.5 = sometimes labeled, 0.0 = not distinguished"},
      {"criterion": "Includes confidence indicators", "weight": 0.2, "scoring_guide": "1.0 = confidence scores, 0.5 = hedging language, 0.0 = false certainty"},
      {"criterion": "References external sources", "weight": 0.2, "scoring_guide": "1.0 = profile/website data, 0.5 = general industry data, 0.0 = no sources"}
    ]'::JSONB,
    0.6,
    ARRAY[
      'we assume',
      'probably',
      'likely',
      'based on general',
      'typically'
    ],
    ARRAY[
      'based on your website',
      'from your Instagram bio',
      'research indicates',
      'verified from',
      'confirmed by'
    ]
  ),
  (
    'Formatting Quality Score',
    'formatting-quality-score',
    'all',
    'formatting',
    'Measures the quality of output formatting and structure.',
    '[
      {"criterion": "No malformed fields", "weight": 0.4, "scoring_guide": "1.0 = clean output, 0.0 = contains [object Object], undefined, etc."},
      {"criterion": "Proper structure", "weight": 0.3, "scoring_guide": "1.0 = clear sections, 0.5 = some structure, 0.0 = wall of text"},
      {"criterion": "Appropriate length", "weight": 0.2, "scoring_guide": "1.0 = within limits, 0.5 = slightly over/under, 0.0 = way too long/short"},
      {"criterion": "Consistent formatting", "weight": 0.1, "scoring_guide": "1.0 = consistent style, 0.5 = mostly consistent, 0.0 = inconsistent"}
    ]'::JSONB,
    0.8,
    ARRAY[
      '[object Object]',
      'undefined',
      'null',
      'NaN',
      '{{',
      '}}'
    ],
    ARRAY[]
  )
ON CONFLICT (slug) DO NOTHING;
