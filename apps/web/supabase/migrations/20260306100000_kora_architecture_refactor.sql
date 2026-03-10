-- KORA Architecture Refactor Migration
-- Creates new tables for the refactored intelligence system

-- =============================================================================
-- SOURCES TABLE (Enhanced version of kora_ingest_sources)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'youtube', 'social', 'web', 'search')),
    url TEXT NOT NULL,
    tenant_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('active', 'inactive', 'error', 'pending_approval')),
    is_active BOOLEAN DEFAULT false,
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'archived')),
    filter_profile_id UUID,
    relevance_score DECIMAL(5,4),
    last_checked_at TIMESTAMPTZ,
    next_check_at TIMESTAMPTZ,
    check_frequency_hours INTEGER DEFAULT 24,
    items_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0,
    last_error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kora_sources_tenant ON public.kora_sources(tenant_id);
CREATE INDEX idx_kora_sources_type ON public.kora_sources(source_type);
CREATE INDEX idx_kora_sources_status ON public.kora_sources(status);
CREATE INDEX idx_kora_sources_approval ON public.kora_sources(approval_status);

-- =============================================================================
-- GLOBAL INTELLIGENCE POOL (Items before routing)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_global_intelligence_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES public.kora_sources(id) ON DELETE SET NULL,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'article' CHECK (content_type IN ('article', 'video', 'podcast', 'social_post', 'event', 'report', 'thread')),
    title TEXT NOT NULL,
    url TEXT,
    extracted_summary TEXT,
    raw_content TEXT,
    raw_type TEXT,
    language TEXT DEFAULT 'en',
    author TEXT,
    published_at TIMESTAMPTZ,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered', 'processing', 'ready', 'routed', 'archived', 'rejected')),
    parser_status TEXT DEFAULT 'pending' CHECK (parser_status IN ('pending', 'parsed', 'enriched', 'failed')),
    tenant_matches JSONB DEFAULT '[]',
    relevance_scores JSONB DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    entities JSONB DEFAULT '[]',
    sentiment DECIMAL(3,2),
    is_event BOOLEAN DEFAULT false,
    event_data JSONB,
    embedding_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kora_gip_source ON public.kora_global_intelligence_pool(source_id);
CREATE INDEX idx_kora_gip_status ON public.kora_global_intelligence_pool(status);
CREATE INDEX idx_kora_gip_type ON public.kora_global_intelligence_pool(content_type);
CREATE INDEX idx_kora_gip_discovered ON public.kora_global_intelligence_pool(discovered_at);
CREATE INDEX idx_kora_gip_is_event ON public.kora_global_intelligence_pool(is_event) WHERE is_event = true;

-- =============================================================================
-- TENANT RAG DOCUMENTS (Per-tenant routed documents)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_tenant_rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    intelligence_item_id UUID REFERENCES public.kora_global_intelligence_pool(id) ON DELETE SET NULL,
    source_id UUID REFERENCES public.kora_sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    embedding_id TEXT,
    approval_source TEXT NOT NULL DEFAULT 'manual' CHECK (approval_source IN ('auto', 'manual', 'telegram')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    strategy_linkage TEXT[] DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    quality_score DECIMAL(3,2),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kora_rag_docs_tenant ON public.kora_tenant_rag_documents(tenant_id);
CREATE INDEX idx_kora_rag_docs_item ON public.kora_tenant_rag_documents(intelligence_item_id);
CREATE INDEX idx_kora_rag_docs_active ON public.kora_tenant_rag_documents(is_active) WHERE is_active = true;

-- =============================================================================
-- INTELLIGENCE FILTER PROFILES (Tenant filtering preferences)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_intelligence_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Topic filters
    include_topics TEXT[] DEFAULT '{}',
    exclude_topics TEXT[] DEFAULT '{}',
    
    -- Keyword filters
    include_keywords TEXT[] DEFAULT '{}',
    exclude_keywords TEXT[] DEFAULT '{}',
    
    -- Source type preferences
    preferred_source_types TEXT[] DEFAULT '{}',
    ignored_source_types TEXT[] DEFAULT '{}',
    
    -- Entity filters
    include_entities TEXT[] DEFAULT '{}',
    exclude_entities TEXT[] DEFAULT '{}',
    
    -- Focus areas
    audience_focus TEXT[] DEFAULT '{}',
    platform_focus TEXT[] DEFAULT '{}',
    industry_focus TEXT[] DEFAULT '{}',
    geography_focus TEXT[] DEFAULT '{}',
    
    -- Signal prioritization
    signal_types_to_prioritize TEXT[] DEFAULT '{}',
    signal_types_to_ignore TEXT[] DEFAULT '{}',
    
    -- Processing limits
    max_sources_per_run INTEGER DEFAULT 50,
    max_items_per_source INTEGER DEFAULT 20,
    
    -- Output style preferences
    summary_style TEXT DEFAULT 'executive' CHECK (summary_style IN ('brief', 'detailed', 'executive')),
    strategy_style TEXT DEFAULT 'actionable' CHECK (strategy_style IN ('actionable', 'analytical', 'creative')),
    telegram_brief_style TEXT DEFAULT 'mixed' CHECK (telegram_brief_style IN ('bullet', 'narrative', 'mixed')),
    
    -- Approval and routing
    require_manual_approval_for_rag BOOLEAN DEFAULT false,
    allow_auto_route_to_rag BOOLEAN DEFAULT true,
    allow_make_me_smarter BOOLEAN DEFAULT true,
    
    -- Processing preferences
    parsing_depth TEXT DEFAULT 'medium' CHECK (parsing_depth IN ('shallow', 'medium', 'deep')),
    transcript_priority TEXT DEFAULT 'medium' CHECK (transcript_priority IN ('high', 'medium', 'low')),
    translation_enabled BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_kora_filters_tenant ON public.kora_intelligence_filters(tenant_id);
CREATE INDEX idx_kora_filters_default ON public.kora_intelligence_filters(is_default) WHERE is_default = true;

-- =============================================================================
-- ENRICHMENT QUEUE (Items pending enrichment)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_enrichment_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intelligence_item_id UUID NOT NULL REFERENCES public.kora_global_intelligence_pool(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    enrichment_type TEXT NOT NULL CHECK (enrichment_type IN ('make_smarter', 'telegram_brief', 'strategy_candidate', 'rag_addition', 'review')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    priority INTEGER DEFAULT 5,
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_kora_enrichment_status ON public.kora_enrichment_queue(status);
CREATE INDEX idx_kora_enrichment_tenant ON public.kora_enrichment_queue(tenant_id);
CREATE INDEX idx_kora_enrichment_priority ON public.kora_enrichment_queue(priority DESC, created_at ASC) WHERE status = 'pending';

-- =============================================================================
-- EVENTS QUEUE (Event marketplace items)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_events_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intelligence_item_id UUID REFERENCES public.kora_global_intelligence_pool(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    event_date TIMESTAMPTZ,
    event_end_date TIMESTAMPTZ,
    location TEXT,
    is_virtual BOOLEAN DEFAULT false,
    source TEXT,
    source_url TEXT,
    registration_url TEXT,
    price TEXT,
    organizer TEXT,
    description TEXT,
    tenant_relevance JSONB DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered', 'reviewed', 'pushed_to_strategy', 'pushed_to_telegram', 'archived')),
    pushed_to_tenant_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    pushed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kora_events_date ON public.kora_events_queue(event_date);
CREATE INDEX idx_kora_events_status ON public.kora_events_queue(status);

-- =============================================================================
-- INGEST RUNS (Track ingestion jobs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_ingest_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    tenant_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    trigger_source TEXT NOT NULL DEFAULT 'scheduled' CHECK (trigger_source IN ('scheduled', 'manual', 'webhook', 'event')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    sources_processed INTEGER DEFAULT 0,
    items_discovered INTEGER DEFAULT 0,
    items_processed INTEGER DEFAULT 0,
    items_embedded INTEGER DEFAULT 0,
    items_routed INTEGER DEFAULT 0,
    telegram_sends INTEGER DEFAULT 0,
    llm_tokens_used INTEGER DEFAULT 0,
    llm_cost_estimate DECIMAL(10,4) DEFAULT 0,
    model_usage JSONB DEFAULT '{}',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kora_runs_agent ON public.kora_ingest_runs(agent_id);
CREATE INDEX idx_kora_runs_tenant ON public.kora_ingest_runs(tenant_id);
CREATE INDEX idx_kora_runs_status ON public.kora_ingest_runs(status);
CREATE INDEX idx_kora_runs_started ON public.kora_ingest_runs(started_at DESC);

-- =============================================================================
-- LLM USAGE (Cost and usage tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_llm_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    tenant_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    run_id UUID REFERENCES public.kora_ingest_runs(id) ON DELETE SET NULL,
    task_type TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'anthropic')),
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
    latency_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kora_llm_agent ON public.kora_llm_usage(agent_id);
CREATE INDEX idx_kora_llm_tenant ON public.kora_llm_usage(tenant_id);
CREATE INDEX idx_kora_llm_provider ON public.kora_llm_usage(provider);
CREATE INDEX idx_kora_llm_created ON public.kora_llm_usage(created_at DESC);
CREATE INDEX idx_kora_llm_task ON public.kora_llm_usage(task_type);

-- =============================================================================
-- TELEGRAM PREFERENCES (Enhanced telegram settings)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_telegram_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    chat_id TEXT,
    is_active BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    
    -- Delivery preferences
    delivery_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (delivery_frequency IN ('daily', 'weekly', 'none')),
    briefing_time TIME DEFAULT '07:00:00',
    timezone TEXT DEFAULT 'America/Puerto_Rico',
    
    -- Content preferences
    include_content_strategy BOOLEAN DEFAULT true,
    include_industry_insights BOOLEAN DEFAULT true,
    include_client_updates BOOLEAN DEFAULT false,
    include_event_alerts BOOLEAN DEFAULT true,
    
    -- Make Me Smarter
    allow_make_me_smarter BOOLEAN DEFAULT true,
    auto_approve_high_relevance BOOLEAN DEFAULT false,
    high_relevance_threshold DECIMAL(3,2) DEFAULT 0.85,
    
    -- Status tracking
    last_message_sent_at TIMESTAMPTZ,
    last_message_id TEXT,
    next_scheduled_at TIMESTAMPTZ,
    consecutive_failures INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_kora_telegram_user ON public.kora_telegram_preferences(user_id);
CREATE INDEX idx_kora_telegram_tenant ON public.kora_telegram_preferences(tenant_id);
CREATE INDEX idx_kora_telegram_active ON public.kora_telegram_preferences(is_active) WHERE is_active = true;

-- =============================================================================
-- APPROVAL HISTORY (Track approval/rejection history)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('source', 'intelligence', 'strategy', 'campaign', 'enrichment')),
    target_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'archived', 'restored')),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kora_approval_tenant ON public.kora_approval_history(tenant_id);
CREATE INDEX idx_kora_approval_user ON public.kora_approval_history(user_id);
CREATE INDEX idx_kora_approval_target ON public.kora_approval_history(target_type, target_id);
CREATE INDEX idx_kora_approval_created ON public.kora_approval_history(created_at DESC);

-- =============================================================================
-- USER ACTIVITY (Track active days for rating popup)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'generated_strategy', 'approved_telegram_insight', 'used_rag',
        'created_campaign', 'viewed_deliverable', 'approved_source',
        'rejected_source', 'updated_filters', 'login'
    )),
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kora_activity_user ON public.kora_user_activity(user_id);
CREATE INDEX idx_kora_activity_tenant ON public.kora_user_activity(tenant_id);
CREATE INDEX idx_kora_activity_date ON public.kora_user_activity(activity_date);
CREATE INDEX idx_kora_activity_type ON public.kora_user_activity(activity_type);
CREATE UNIQUE INDEX idx_kora_activity_unique ON public.kora_user_activity(user_id, tenant_id, activity_type, activity_date);

-- =============================================================================
-- KORA EVENTS (Job queue for inter-agent communication)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    tenant_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    agent_id TEXT,
    correlation_id UUID,
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_kora_events_type ON public.kora_events(event_type);
CREATE INDEX idx_kora_events_status ON public.kora_events(status);
CREATE INDEX idx_kora_events_tenant ON public.kora_events(tenant_id);
CREATE INDEX idx_kora_events_correlation ON public.kora_events(correlation_id);
CREATE INDEX idx_kora_events_pending ON public.kora_events(created_at ASC) WHERE status = 'pending';

-- =============================================================================
-- AGENT CONFIGURATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_agent_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT true,
    schedule_cron TEXT,
    max_concurrent INTEGER DEFAULT 1,
    timeout_ms INTEGER DEFAULT 300000,
    retry_attempts INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 1000,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default agent configurations
INSERT INTO public.kora_agent_configs (agent_id, enabled, schedule_cron, config) VALUES
('source-discovery', true, '0 */4 * * *', '{"max_sources_per_run": 100}'),
('source-processing', true, NULL, '{"batch_size": 10}'),
('core-intelligence', true, NULL, '{"min_relevance_score": 0.5}'),
('content-strategy', true, NULL, '{"default_window_days": 30}'),
('campaign-assembly', true, NULL, '{}'),
('telegram-delivery', true, '0 7 * * *', '{"default_timezone": "America/Puerto_Rico"}'),
('rag-intelligence', true, NULL, '{"max_documents_per_tenant": 1000}'),
('intake-clarifier', true, NULL, '{}')
ON CONFLICT (agent_id) DO NOTHING;

-- =============================================================================
-- LLM ROUTER CONFIGURATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_llm_router_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type TEXT NOT NULL UNIQUE,
    primary_provider TEXT NOT NULL DEFAULT 'openai',
    primary_model TEXT NOT NULL,
    fallback_provider TEXT,
    fallback_model TEXT,
    max_tokens INTEGER DEFAULT 2000,
    temperature DECIMAL(2,1) DEFAULT 0.5,
    use_for_long_context BOOLEAN DEFAULT false,
    cost_per_1k_tokens DECIMAL(10,6) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default LLM router configurations
INSERT INTO public.kora_llm_router_config (task_type, primary_provider, primary_model, fallback_provider, fallback_model, max_tokens, temperature, use_for_long_context, cost_per_1k_tokens) VALUES
('embeddings', 'openai', 'text-embedding-3-small', NULL, NULL, 8192, 0, false, 0.00002),
('classification', 'openai', 'gpt-4o-mini', 'gemini', 'gemini-1.5-flash', 1000, 0, false, 0.00015),
('tagging', 'openai', 'gpt-4o-mini', 'gemini', 'gemini-1.5-flash', 500, 0, false, 0.00015),
('relevance_scoring', 'openai', 'gpt-4o-mini', 'gemini', 'gemini-1.5-flash', 200, 0, false, 0.00015),
('summarization', 'openai', 'gpt-4o-mini', 'gemini', 'gemini-1.5-flash', 2000, 0.3, false, 0.00015),
('transcript_digestion', 'gemini', 'gemini-1.5-pro', 'openai', 'gpt-4o', 8000, 0.3, true, 0.00125),
('long_form_synthesis', 'gemini', 'gemini-1.5-pro', 'openai', 'gpt-4o', 4000, 0.5, true, 0.00125),
('weekly_brief', 'gemini', 'gemini-1.5-pro', 'openai', 'gpt-4o', 6000, 0.5, true, 0.00125),
('strategy_generation', 'gemini', 'gemini-1.5-pro', 'openai', 'gpt-4o', 4000, 0.7, true, 0.00125),
('structured_output', 'openai', 'gpt-4o', 'gemini', 'gemini-1.5-pro', 2000, 0, false, 0.005),
('translation', 'gemini', 'gemini-1.5-flash', 'openai', 'gpt-4o-mini', 4000, 0.1, true, 0.000075),
('entity_extraction', 'openai', 'gpt-4o-mini', 'gemini', 'gemini-1.5-flash', 1000, 0, false, 0.00015),
('sentiment_analysis', 'openai', 'gpt-4o-mini', 'gemini', 'gemini-1.5-flash', 200, 0, false, 0.00015)
ON CONFLICT (task_type) DO NOTHING;

-- =============================================================================
-- ENABLE RLS ON ALL NEW TABLES
-- =============================================================================

ALTER TABLE public.kora_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_global_intelligence_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_tenant_rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_intelligence_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_enrichment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_events_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_ingest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_llm_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_telegram_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kora_llm_router_config ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Sources: Admins can manage all, users see tenant sources
CREATE POLICY "Admins can manage all sources" ON public.kora_sources
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view tenant sources" ON public.kora_sources
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- Global Intelligence Pool: Admin only
CREATE POLICY "Admins can manage intelligence pool" ON public.kora_global_intelligence_pool
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Tenant RAG Documents: Admins full access, users see their tenant
CREATE POLICY "Admins can manage all RAG docs" ON public.kora_tenant_rag_documents
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view tenant RAG docs" ON public.kora_tenant_rag_documents
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- Intelligence Filters: Admins full access, users manage their tenant filters
CREATE POLICY "Admins can manage all filters" ON public.kora_intelligence_filters
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can manage tenant filters" ON public.kora_intelligence_filters
    FOR ALL TO authenticated
    USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- Enrichment Queue: Admin only
CREATE POLICY "Admins can manage enrichment queue" ON public.kora_enrichment_queue
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Events Queue: Admin only
CREATE POLICY "Admins can manage events queue" ON public.kora_events_queue
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Ingest Runs: Admin only
CREATE POLICY "Admins can manage ingest runs" ON public.kora_ingest_runs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- LLM Usage: Admin only
CREATE POLICY "Admins can view LLM usage" ON public.kora_llm_usage
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Telegram Preferences: Users manage their own
CREATE POLICY "Users can manage their telegram preferences" ON public.kora_telegram_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Approval History: Admins see all, users see their tenant
CREATE POLICY "Admins can view all approvals" ON public.kora_approval_history
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view tenant approvals" ON public.kora_approval_history
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can create approvals" ON public.kora_approval_history
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- User Activity: Users manage their own
CREATE POLICY "Users can manage their activity" ON public.kora_user_activity
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Events: Admin only
CREATE POLICY "Admins can manage events" ON public.kora_events
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Agent Configs: Admin only
CREATE POLICY "Admins can manage agent configs" ON public.kora_agent_configs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- LLM Router Config: Admin only
CREATE POLICY "Admins can manage LLM router config" ON public.kora_llm_router_config
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get active days count for rating popup
CREATE OR REPLACE FUNCTION get_user_active_days(
    p_user_id UUID,
    p_tenant_id UUID,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_active_days BIGINT,
    consecutive_active_days INTEGER,
    last_active_date DATE,
    should_show_rating BOOLEAN
) AS $$
DECLARE
    v_last_date DATE;
    v_consecutive INTEGER := 0;
    v_current_date DATE;
    v_prev_date DATE;
BEGIN
    -- Get total unique active days
    SELECT COUNT(DISTINCT activity_date), MAX(activity_date)
    INTO total_active_days, v_last_date
    FROM public.kora_user_activity
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND activity_date >= CURRENT_DATE - p_days_back;
    
    last_active_date := v_last_date;
    
    -- Calculate consecutive days
    IF v_last_date IS NOT NULL THEN
        v_consecutive := 1;
        v_prev_date := v_last_date;
        
        FOR v_current_date IN
            SELECT DISTINCT activity_date
            FROM public.kora_user_activity
            WHERE user_id = p_user_id
              AND tenant_id = p_tenant_id
              AND activity_date < v_last_date
            ORDER BY activity_date DESC
        LOOP
            IF v_current_date = v_prev_date - 1 THEN
                v_consecutive := v_consecutive + 1;
                v_prev_date := v_current_date;
            ELSE
                EXIT;
            END IF;
        END LOOP;
    END IF;
    
    consecutive_active_days := v_consecutive;
    should_show_rating := total_active_days >= 5;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record user activity
CREATE OR REPLACE FUNCTION record_user_activity(
    p_user_id UUID,
    p_tenant_id UUID,
    p_activity_type TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.kora_user_activity (user_id, tenant_id, activity_type, metadata)
    VALUES (p_user_id, p_tenant_id, p_activity_type, p_metadata)
    ON CONFLICT (user_id, tenant_id, activity_type, activity_date) DO UPDATE
    SET metadata = kora_user_activity.metadata || p_metadata
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ADD FOREIGN KEY CONSTRAINT FOR FILTER PROFILE
-- =============================================================================

ALTER TABLE public.kora_sources 
ADD CONSTRAINT fk_sources_filter_profile 
FOREIGN KEY (filter_profile_id) 
REFERENCES public.kora_intelligence_filters(id) 
ON DELETE SET NULL;

-- =============================================================================
-- UPDATE TRIGGER FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_kora_sources_updated_at BEFORE UPDATE ON public.kora_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kora_gip_updated_at BEFORE UPDATE ON public.kora_global_intelligence_pool FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kora_rag_docs_updated_at BEFORE UPDATE ON public.kora_tenant_rag_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kora_filters_updated_at BEFORE UPDATE ON public.kora_intelligence_filters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kora_events_queue_updated_at BEFORE UPDATE ON public.kora_events_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kora_telegram_updated_at BEFORE UPDATE ON public.kora_telegram_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kora_agent_configs_updated_at BEFORE UPDATE ON public.kora_agent_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kora_llm_router_updated_at BEFORE UPDATE ON public.kora_llm_router_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- DEFAULT JAHKNOWSPR INTELLIGENCE FILTER PROFILE
-- =============================================================================
-- This is the default filter profile optimized for PR, marketing, and creator economy insights
-- It will be assigned to tenants who don't have a custom filter profile

INSERT INTO public.kora_intelligence_filters (
    name,
    description,
    tenant_id,
    is_default,
    is_active,
    include_topics,
    exclude_topics,
    include_keywords,
    exclude_keywords,
    preferred_source_types,
    ignored_source_types,
    include_entities,
    exclude_entities,
    audience_focus,
    platform_focus,
    industry_focus,
    geography_focus,
    signal_types_to_prioritize,
    signal_types_to_ignore,
    max_sources_per_run,
    max_items_per_source,
    summary_style,
    strategy_style,
    telegram_brief_style,
    require_manual_approval_for_rag,
    allow_auto_route_to_rag,
    allow_make_me_smarter,
    parsing_depth,
    transcript_priority,
    translation_enabled
) VALUES (
    'JahKnowsPR Home Profile',
    'Default intelligence filter profile optimized for PR, marketing, and creator economy insights',
    NULL, -- Global default, not tied to a specific tenant
    true,
    true,
    -- include_topics
    ARRAY[
        'creators',
        'influencers',
        'viral marketing',
        'brand controversies',
        'PR crises',
        'celebrity cultural moments',
        'creator economy',
        'social media platform changes',
        'AI in marketing',
        'technology affecting marketing',
        'startups building brands',
        'founders',
        'personal branding',
        'content strategy',
        'audience growth',
        'engagement tactics',
        'brand partnerships',
        'influencer marketing',
        'social media trends',
        'digital PR'
    ],
    -- exclude_topics
    ARRAY[
        'corporate earnings',
        'internal agency hires',
        'boring acquisitions',
        'unrelated finance news',
        'stock market analysis',
        'corporate restructuring',
        'regulatory compliance',
        'internal memos',
        'HR announcements',
        'office relocations'
    ],
    -- include_keywords
    ARRAY[
        'viral',
        'trending',
        'creator',
        'influencer',
        'brand deal',
        'controversy',
        'backlash',
        'campaign',
        'launch',
        'rebrand',
        'social media',
        'TikTok',
        'Instagram',
        'YouTube',
        'content creator',
        'brand ambassador',
        'PR crisis',
        'reputation'
    ],
    -- exclude_keywords
    ARRAY[
        'quarterly earnings',
        'shareholder',
        'dividend',
        'SEC filing',
        'merger agreement',
        'layoffs',
        'downsizing'
    ],
    -- preferred_source_types
    ARRAY['rss', 'youtube', 'social', 'web'],
    -- ignored_source_types
    ARRAY[]::TEXT[],
    -- include_entities
    ARRAY[]::TEXT[],
    -- exclude_entities
    ARRAY[]::TEXT[],
    -- audience_focus
    ARRAY[
        'content creators',
        'brand marketers',
        'PR professionals',
        'social media managers',
        'small business owners',
        'entrepreneurs'
    ],
    -- platform_focus
    ARRAY['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'X'],
    -- industry_focus
    ARRAY[
        'Marketing',
        'Public Relations',
        'Creator Economy',
        'Social Media',
        'Advertising',
        'Entertainment'
    ],
    -- geography_focus
    ARRAY['United States', 'Global'],
    -- signal_types_to_prioritize
    ARRAY[
        'viral_content',
        'trending_topic',
        'controversy',
        'cultural_moment',
        'creator_spotlight',
        'platform_update',
        'brand_mention'
    ],
    -- signal_types_to_ignore
    ARRAY[]::TEXT[],
    -- max_sources_per_run
    50,
    -- max_items_per_source
    20,
    -- summary_style
    'executive',
    -- strategy_style
    'actionable',
    -- telegram_brief_style
    'mixed',
    -- require_manual_approval_for_rag
    false,
    -- allow_auto_route_to_rag
    true,
    -- allow_make_me_smarter
    true,
    -- parsing_depth
    'deep',
    -- transcript_priority
    'high',
    -- translation_enabled
    true
);

-- =============================================================================
-- KORA RATINGS TABLE (for user feedback after 5 active days)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kora_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    active_days_at_rating INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kora_ratings_user ON public.kora_ratings(user_id);
CREATE INDEX idx_kora_ratings_rating ON public.kora_ratings(rating);

-- RLS for ratings
ALTER TABLE public.kora_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own ratings" ON public.kora_ratings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all ratings" ON public.kora_ratings
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
