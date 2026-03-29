-- Intel Delivery Schedules
-- Enables scheduled delivery of industry insights and content strategies via Telegram

-- =============================================================================
-- DELIVERY SCHEDULES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS intel_delivery_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    
    -- Schedule configuration
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly')),
    delivery_time TIME NOT NULL DEFAULT '09:00:00',
    delivery_day TEXT CHECK (
        delivery_day IS NULL OR 
        delivery_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    ),
    timezone TEXT NOT NULL DEFAULT 'America/Chicago',
    
    -- Report type
    report_type TEXT NOT NULL CHECK (report_type IN ('insight', 'content_3day', 'content_5day')),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_delivered_at TIMESTAMPTZ,
    next_delivery_at TIMESTAMPTZ,
    delivery_count INTEGER DEFAULT 0,
    
    -- Error tracking
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_delivery_schedules_tenant ON intel_delivery_schedules(tenant_id);
CREATE INDEX idx_delivery_schedules_telegram ON intel_delivery_schedules(telegram_id);
CREATE INDEX idx_delivery_schedules_next_delivery ON intel_delivery_schedules(next_delivery_at) WHERE is_active = TRUE;
CREATE INDEX idx_delivery_schedules_active ON intel_delivery_schedules(is_active, schedule_type);

-- Updated_at trigger
CREATE TRIGGER update_delivery_schedules_updated_at
    BEFORE UPDATE ON intel_delivery_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- CONTENT PREFERENCES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS intel_content_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Primary use case
    primary_use_case TEXT NOT NULL DEFAULT 'general' CHECK (
        primary_use_case IN ('pr_industry', 'podcast_creator', 'general')
    ),
    
    -- Platform priorities (ordered array)
    platform_priority TEXT[] DEFAULT ARRAY['instagram', 'linkedin'],
    
    -- Content tone
    content_tone TEXT NOT NULL DEFAULT 'professional' CHECK (
        content_tone IN ('professional', 'casual', 'creator')
    ),
    
    -- Focus topics
    focus_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Podcast-specific (for creators like Juss)
    podcast_name TEXT,
    podcast_themes TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Industry-specific (for PR like Jocelyn)
    industry_focus TEXT[] DEFAULT ARRAY['marketing', 'public_relations'],
    news_sources_priority TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Content generation preferences
    include_hashtags BOOLEAN DEFAULT TRUE,
    include_posting_times BOOLEAN DEFAULT TRUE,
    include_visual_suggestions BOOLEAN DEFAULT TRUE,
    preferred_content_length TEXT DEFAULT 'medium' CHECK (
        preferred_content_length IN ('short', 'medium', 'long')
    ),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_tenant_preferences UNIQUE (tenant_id)
);

-- Index
CREATE INDEX idx_content_preferences_tenant ON intel_content_preferences(tenant_id);

-- Updated_at trigger
CREATE TRIGGER update_content_preferences_updated_at
    BEFORE UPDATE ON intel_content_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INSIGHT REPORTS TABLE (stores generated reports)
-- =============================================================================

CREATE TABLE IF NOT EXISTS intel_insight_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Report metadata
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    report_type TEXT NOT NULL DEFAULT 'daily' CHECK (report_type IN ('daily', 'weekly', 'on_demand')),
    
    -- Content
    top_stories JSONB DEFAULT '[]'::JSONB,
    strategic_takeaways TEXT[] DEFAULT ARRAY[]::TEXT[],
    trending_topics JSONB DEFAULT '[]'::JSONB,
    content_opportunities JSONB DEFAULT '[]'::JSONB,
    
    -- Sources used
    sources_referenced TEXT[] DEFAULT ARRAY[]::TEXT[],
    news_api_queries TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Quality metrics
    confidence_score DECIMAL(3,2),
    relevance_score DECIMAL(3,2),
    
    -- Delivery status
    telegram_message_id BIGINT,
    delivered_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_insight_reports_tenant ON intel_insight_reports(tenant_id);
CREATE INDEX idx_insight_reports_date ON intel_insight_reports(report_date DESC);
CREATE INDEX idx_insight_reports_tenant_date ON intel_insight_reports(tenant_id, report_date DESC);

-- =============================================================================
-- CONTENT DRAFTS TABLE (stores generated content)
-- =============================================================================

CREATE TABLE IF NOT EXISTS intel_content_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Draft metadata
    strategy_type TEXT NOT NULL CHECK (strategy_type IN ('3day', '5day')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Content by day (JSONB array with full post content)
    daily_content JSONB NOT NULL DEFAULT '[]'::JSONB,
    
    -- Summary
    theme_overview TEXT,
    content_pillars_used TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Quality metrics
    confidence_score DECIMAL(3,2),
    
    -- Delivery status
    telegram_message_ids BIGINT[] DEFAULT ARRAY[]::BIGINT[],
    delivered_at TIMESTAMPTZ,
    
    -- User feedback
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_drafts_tenant ON intel_content_drafts(tenant_id);
CREATE INDEX idx_content_drafts_date ON intel_content_drafts(start_date DESC);
CREATE INDEX idx_content_drafts_tenant_date ON intel_content_drafts(tenant_id, start_date DESC);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE intel_delivery_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_content_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_insight_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_content_drafts ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access delivery schedules"
ON intel_delivery_schedules FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access content preferences"
ON intel_content_preferences FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access insight reports"
ON intel_insight_reports FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access content drafts"
ON intel_content_drafts FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- User access policies
CREATE POLICY "Users can view their own delivery schedules"
ON intel_delivery_schedules FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own content preferences"
ON intel_content_preferences FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own insight reports"
ON intel_insight_reports FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own content drafts"
ON intel_content_drafts FOR SELECT TO authenticated
USING (tenant_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- =============================================================================
-- SEED DEFAULT PREFERENCES FOR EXISTING TEST USERS
-- =============================================================================

-- Jocelyn (JahknowsPR) - PR Industry Focus
INSERT INTO intel_content_preferences (
    tenant_id,
    primary_use_case,
    platform_priority,
    content_tone,
    focus_topics,
    industry_focus,
    news_sources_priority
) 
SELECT 
    id,
    'pr_industry',
    ARRAY['linkedin', 'instagram', 'twitter'],
    'professional',
    ARRAY['creator economy', 'brand controversies', 'PR crises', 'viral marketing', 'influencer partnerships'],
    ARRAY['marketing', 'public_relations', 'creator_economy', 'social_media'],
    ARRAY['PR Week', 'Ad Age', 'Marketing Week', 'Digiday']
FROM customers 
WHERE telegram_id = 8697293004
ON CONFLICT (tenant_id) DO NOTHING;

-- Juss - Podcast/Creator Focus
INSERT INTO intel_content_preferences (
    tenant_id,
    primary_use_case,
    platform_priority,
    content_tone,
    focus_topics,
    podcast_name,
    podcast_themes
) 
SELECT 
    id,
    'podcast_creator',
    ARRAY['youtube', 'tiktok', 'instagram'],
    'creator',
    ARRAY['filmmaking', 'content creation', 'AI tools', 'video production', 'storytelling'],
    'The Creative Tech Show',
    ARRAY['filmmaking techniques', 'content creation technology', 'AI in media', 'managing content workflows']
FROM customers 
WHERE telegram_id = 8216104620
ON CONFLICT (tenant_id) DO NOTHING;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Calculate next delivery time
CREATE OR REPLACE FUNCTION calculate_next_delivery(
    p_schedule_type TEXT,
    p_delivery_time TIME,
    p_delivery_day TEXT,
    p_timezone TEXT
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_now TIMESTAMPTZ;
    v_next TIMESTAMPTZ;
    v_target_dow INTEGER;
BEGIN
    v_now := NOW() AT TIME ZONE p_timezone;
    
    IF p_schedule_type = 'daily' THEN
        -- Next occurrence of delivery_time
        v_next := (v_now::DATE + p_delivery_time)::TIMESTAMPTZ;
        IF v_next <= v_now THEN
            v_next := v_next + INTERVAL '1 day';
        END IF;
    ELSIF p_schedule_type = 'weekly' THEN
        -- Map day name to day of week (0 = Sunday)
        v_target_dow := CASE p_delivery_day
            WHEN 'sunday' THEN 0
            WHEN 'monday' THEN 1
            WHEN 'tuesday' THEN 2
            WHEN 'wednesday' THEN 3
            WHEN 'thursday' THEN 4
            WHEN 'friday' THEN 5
            WHEN 'saturday' THEN 6
        END;
        
        -- Calculate days until target day
        v_next := (v_now::DATE + ((v_target_dow - EXTRACT(DOW FROM v_now)::INTEGER + 7) % 7) * INTERVAL '1 day' + p_delivery_time)::TIMESTAMPTZ;
        IF v_next <= v_now THEN
            v_next := v_next + INTERVAL '7 days';
        END IF;
    END IF;
    
    RETURN v_next AT TIME ZONE p_timezone AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;

-- Get due deliveries
CREATE OR REPLACE FUNCTION get_due_deliveries()
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    telegram_id BIGINT,
    report_type TEXT,
    schedule_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.tenant_id,
        ds.telegram_id,
        ds.report_type,
        ds.schedule_type
    FROM intel_delivery_schedules ds
    WHERE ds.is_active = TRUE
      AND ds.next_delivery_at <= NOW()
    ORDER BY ds.next_delivery_at ASC;
END;
$$ LANGUAGE plpgsql;
