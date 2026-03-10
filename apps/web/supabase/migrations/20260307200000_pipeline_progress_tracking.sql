-- Pipeline Progress Tracking
-- Enables real-time progress tracking for deep research pipeline

-- Pipeline progress table with granular tracking
CREATE TABLE IF NOT EXISTS pipeline_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Overall progress
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    current_phase INTEGER DEFAULT 0,
    current_step INTEGER DEFAULT 0,
    total_phases INTEGER DEFAULT 6,
    total_steps INTEGER DEFAULT 51,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    
    -- Phase-specific tracking
    phase_name TEXT,
    step_name TEXT,
    step_started_at TIMESTAMPTZ,
    
    -- Research metrics
    queries_executed INTEGER DEFAULT 0,
    sources_found INTEGER DEFAULT 0,
    claims_extracted INTEGER DEFAULT 0,
    evidence_bundles INTEGER DEFAULT 0,
    
    -- Quality metrics
    current_confidence DECIMAL(3,2),
    quality_iterations INTEGER DEFAULT 0,
    quality_passed BOOLEAN,
    
    -- Timing
    estimated_completion_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error tracking
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Metadata
    pipeline_type TEXT DEFAULT 'deep_research',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_pipeline_progress_tenant ON pipeline_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_progress_status ON pipeline_progress(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_progress_created ON pipeline_progress(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_progress_active ON pipeline_progress(tenant_id, status) 
    WHERE status IN ('queued', 'running');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_pipeline_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pipeline_progress_updated_at ON pipeline_progress;
CREATE TRIGGER update_pipeline_progress_updated_at
    BEFORE UPDATE ON pipeline_progress
    FOR EACH ROW EXECUTE FUNCTION update_pipeline_progress_updated_at();

-- Enable Row Level Security
ALTER TABLE pipeline_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own pipeline progress
CREATE POLICY "Users can view their own pipeline progress"
ON pipeline_progress
FOR SELECT
TO authenticated
USING (
    tenant_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
    )
);

-- Admins can view all pipeline progress
CREATE POLICY "Admins can view all pipeline progress"
ON pipeline_progress
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Admins can manage all pipeline progress
CREATE POLICY "Admins can manage all pipeline progress"
ON pipeline_progress
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Service role has full access (for telegram bot)
CREATE POLICY "Service role has full access to pipeline progress"
ON pipeline_progress
FOR ALL
USING (true)
WITH CHECK (true);

-- Pipeline phase history for detailed tracking
CREATE TABLE IF NOT EXISTS pipeline_phase_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progress_id UUID NOT NULL REFERENCES pipeline_progress(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    phase_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    steps_completed INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase_history_progress ON pipeline_phase_history(progress_id);
CREATE INDEX IF NOT EXISTS idx_phase_history_phase ON pipeline_phase_history(progress_id, phase_number);

-- Enable RLS on phase history
ALTER TABLE pipeline_phase_history ENABLE ROW LEVEL SECURITY;

-- Phase history follows parent progress permissions
CREATE POLICY "Users can view their pipeline phase history"
ON pipeline_phase_history
FOR SELECT
TO authenticated
USING (
    progress_id IN (
        SELECT p.id FROM pipeline_progress p
        JOIN customers c ON p.tenant_id = c.id
        WHERE c.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all pipeline phase history"
ON pipeline_phase_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Service role has full access to phase history"
ON pipeline_phase_history
FOR ALL
USING (true)
WITH CHECK (true);

-- Helper function to get active pipeline for a tenant
CREATE OR REPLACE FUNCTION get_active_pipeline_progress(p_tenant_id UUID)
RETURNS pipeline_progress AS $$
DECLARE
    result pipeline_progress;
BEGIN
    SELECT * INTO result
    FROM pipeline_progress
    WHERE tenant_id = p_tenant_id
      AND status IN ('queued', 'running')
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate estimated completion time
CREATE OR REPLACE FUNCTION estimate_pipeline_completion(
    p_started_at TIMESTAMPTZ,
    p_progress_percent INTEGER,
    p_total_steps INTEGER,
    p_current_step INTEGER
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    elapsed_ms BIGINT;
    estimated_total_ms BIGINT;
BEGIN
    IF p_progress_percent <= 0 OR p_started_at IS NULL THEN
        RETURN NULL;
    END IF;
    
    elapsed_ms := EXTRACT(EPOCH FROM (NOW() - p_started_at)) * 1000;
    estimated_total_ms := (elapsed_ms * 100) / p_progress_percent;
    
    RETURN p_started_at + (estimated_total_ms * INTERVAL '1 millisecond');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
