-- ============================================================================
-- KORA Data Access Fix - Apply this in Supabase SQL Editor
-- ============================================================================
-- This SQL enables authenticated users to see their own deliverables 
-- (brand_blueprints, content_strategies, audience_analyses) on the dashboard.
--
-- The key relationship is:
--   auth.uid() -> customers.user_id -> deliverables.client_id
-- ============================================================================

-- First, let's check what policies exist
-- SELECT tablename, policyname, cmd FROM pg_policies 
-- WHERE tablename IN ('brand_blueprints', 'content_strategies', 'audience_analyses', 'customers');

-- ============================================================================
-- CUSTOMERS TABLE - Ensure users can read their own customer records
-- ============================================================================

-- Drop any conflicting policies first (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can view their own customer record" ON customers;
DROP POLICY IF EXISTS "Users can view their own customer records" ON customers;
DROP POLICY IF EXISTS "Users can view own customer" ON customers;

-- Allow authenticated users to read their own customer record(s)
CREATE POLICY "Users can view their own customer records"
ON customers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- BRAND BLUEPRINTS - Enable access for users via customer relationship
-- ============================================================================

-- Drop any old/conflicting policies
DROP POLICY IF EXISTS "Users can view their own brand blueprints" ON brand_blueprints;
DROP POLICY IF EXISTS "Enable read access for all users" ON brand_blueprints;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON brand_blueprints;
DROP POLICY IF EXISTS "Enable update for users based on email" ON brand_blueprints;

-- Users can view blueprints belonging to their customer records
CREATE POLICY "Users can view their own brand blueprints"
ON brand_blueprints
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
);

-- Service role / admins can do everything (for the telegram bot)
DROP POLICY IF EXISTS "Service role full access brand blueprints" ON brand_blueprints;
CREATE POLICY "Service role full access brand blueprints"
ON brand_blueprints
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- AUDIENCE ANALYSES - Enable access for users via customer relationship
-- ============================================================================

-- Drop any old/conflicting policies
DROP POLICY IF EXISTS "Users can view their own audience analyses" ON audience_analyses;
DROP POLICY IF EXISTS "Enable read access for all users" ON audience_analyses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON audience_analyses;

-- Users can view analyses belonging to their customer records
CREATE POLICY "Users can view their own audience analyses"
ON audience_analyses
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
);

-- Service role / admins can do everything
DROP POLICY IF EXISTS "Service role full access audience analyses" ON audience_analyses;
CREATE POLICY "Service role full access audience analyses"
ON audience_analyses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- CONTENT STRATEGIES (telegram intake version) - Enable access
-- Note: There may be two content_strategies tables with different schemas
-- ============================================================================

-- Drop any old/conflicting policies on the telegram intake content_strategies
DROP POLICY IF EXISTS "Users can view their own content strategies" ON content_strategies;
DROP POLICY IF EXISTS "Enable read access for all users" ON content_strategies;

-- Check if the table has client_id column (telegram intake version)
-- If it does, apply the policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_strategies' AND column_name = 'client_id'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users can view their own content strategies"
      ON content_strategies
      FOR SELECT
      TO authenticated
      USING (
        client_id IN (
          SELECT id FROM customers WHERE user_id = auth.uid()
        )
      )
    ';
  END IF;
END $$;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access content strategies" ON content_strategies;
CREATE POLICY "Service role full access content strategies"
ON content_strategies
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PIPELINE PROGRESS - Enable access for users via customer relationship
-- ============================================================================

-- Check if pipeline_progress table exists first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'pipeline_progress'
  ) THEN
    -- Drop old policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own pipeline progress" ON pipeline_progress';
    
    -- Users can view their own pipeline progress
    EXECUTE '
      CREATE POLICY "Users can view their own pipeline progress"
      ON pipeline_progress
      FOR SELECT
      TO authenticated
      USING (
        tenant_id IN (
          SELECT id FROM customers WHERE user_id = auth.uid()
        )
      )
    ';
    
    -- Service role full access
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access pipeline progress" ON pipeline_progress';
    EXECUTE '
      CREATE POLICY "Service role full access pipeline progress"
      ON pipeline_progress
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    ';
  END IF;
END $$;

-- ============================================================================
-- Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_blueprints_client_id ON brand_blueprints(client_id);
CREATE INDEX IF NOT EXISTS idx_audience_analyses_client_id ON audience_analyses(client_id);
CREATE INDEX IF NOT EXISTS idx_content_strategies_client_id ON content_strategies(client_id);

-- ============================================================================
-- VERIFICATION - Run these queries to confirm policies are in place
-- ============================================================================

-- Check policies
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('brand_blueprints', 'content_strategies', 'audience_analyses', 'customers', 'pipeline_progress')
ORDER BY tablename, policyname;

-- Check RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname IN ('brand_blueprints', 'content_strategies', 'audience_analyses', 'customers')
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- CONTENT STRATEGY APPROVAL WORKFLOW
-- ============================================================================
-- Only approved strategies can be used to create campaigns
-- Strategies are approved via Telegram
-- ============================================================================

-- Add approval columns to content_strategies
ALTER TABLE content_strategies 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';

ALTER TABLE content_strategies 
ADD COLUMN IF NOT EXISTS telegram_approved BOOLEAN DEFAULT FALSE;

ALTER TABLE content_strategies 
ADD COLUMN IF NOT EXISTS telegram_approved_at TIMESTAMPTZ;

ALTER TABLE content_strategies 
ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT;

ALTER TABLE content_strategies 
ADD COLUMN IF NOT EXISTS source_insight TEXT;

ALTER TABLE content_strategies 
ADD COLUMN IF NOT EXISTS strategy_name TEXT;

ALTER TABLE content_strategies 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Create index for faster approval queries
CREATE INDEX IF NOT EXISTS idx_content_strategies_approval 
  ON content_strategies(client_id, approval_status);

CREATE INDEX IF NOT EXISTS idx_content_strategies_telegram_approved 
  ON content_strategies(client_id, telegram_approved) 
  WHERE telegram_approved = TRUE;

-- Strategy approvals audit table (optional - skip if errors)
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS strategy_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID,
    client_id TEXT,
    action TEXT,
    approved_via TEXT,
    telegram_chat_id BIGINT,
    telegram_message_id BIGINT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'strategy_approvals table may already exist or error: %', SQLERRM;
END $$;

-- Enable RLS on strategy_approvals (ignore if fails)
DO $$
BEGIN
  ALTER TABLE strategy_approvals ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not enable RLS on strategy_approvals: %', SQLERRM;
END $$;

-- Service role full access (most important policy)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role full access strategy approvals" ON strategy_approvals;
  CREATE POLICY "Service role full access strategy approvals"
  ON strategy_approvals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create strategy_approvals policy: %', SQLERRM;
END $$;

-- Indexes (optional)
CREATE INDEX IF NOT EXISTS idx_strategy_approvals_strategy 
  ON strategy_approvals(strategy_id);

CREATE INDEX IF NOT EXISTS idx_strategy_approvals_client 
  ON strategy_approvals(client_id, created_at DESC);

-- ============================================================================
-- CONVERSATIONAL INTELLIGENCE FOR KORA
-- ============================================================================
-- Enables natural language conversation with persistent learning
-- KORA learns from every interaction to personalize future insights
-- ============================================================================

-- Conversation context (session-like, recent state)
CREATE TABLE IF NOT EXISTS intel_conversation_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  tenant_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Last insight context (for follow-ups)
  last_insight_report JSONB,
  last_insight_at TIMESTAMPTZ,
  last_search_queries TEXT[],
  last_topics TEXT[],
  
  -- Conversation memory (rolling window of last 50 messages)
  recent_messages JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(telegram_id)
);

-- Learned signals (permanent, always growing)
CREATE TABLE IF NOT EXISTS intel_learned_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  tenant_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Signal type: topic_interest, perspective_preference, source_preference, 
  -- negative_signal, tone_preference, timing_signal
  signal_type TEXT NOT NULL,
  signal_key TEXT NOT NULL,  -- e.g., 'african_american', 'tech_industry', 'forbes'
  signal_value FLOAT DEFAULT 1.0, -- weight/score (can increase over time)
  
  -- Context for learning
  source_message TEXT,       -- the user message that generated this signal
  source_context JSONB,      -- what they were responding to
  
  -- Decay tracking (signals can weaken if not reinforced)
  last_reinforced_at TIMESTAMPTZ DEFAULT NOW(),
  reinforcement_count INT DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(telegram_id, signal_type, signal_key)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_conversation_context_telegram 
  ON intel_conversation_context(telegram_id);

CREATE INDEX IF NOT EXISTS idx_learned_signals_telegram 
  ON intel_learned_signals(telegram_id);

CREATE INDEX IF NOT EXISTS idx_learned_signals_type 
  ON intel_learned_signals(telegram_id, signal_type);

CREATE INDEX IF NOT EXISTS idx_learned_signals_value 
  ON intel_learned_signals(telegram_id, signal_value DESC);

-- Enable RLS
ALTER TABLE intel_conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_learned_signals ENABLE ROW LEVEL SECURITY;

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access conversation context" ON intel_conversation_context;
CREATE POLICY "Service role full access conversation context" 
  ON intel_conversation_context FOR ALL TO service_role 
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access learned signals" ON intel_learned_signals;
CREATE POLICY "Service role full access learned signals" 
  ON intel_learned_signals FOR ALL TO service_role 
  USING (true) WITH CHECK (true);

-- Function to update conversation context
CREATE OR REPLACE FUNCTION update_conversation_context(
  p_telegram_id BIGINT,
  p_tenant_id UUID,
  p_last_insight JSONB DEFAULT NULL,
  p_search_queries TEXT[] DEFAULT NULL,
  p_topics TEXT[] DEFAULT NULL,
  p_message JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_context_id UUID;
  v_messages JSONB;
BEGIN
  -- Get or create context
  INSERT INTO intel_conversation_context (telegram_id, tenant_id)
  VALUES (p_telegram_id, p_tenant_id)
  ON CONFLICT (telegram_id) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_context_id;

  -- Update insight context if provided
  IF p_last_insight IS NOT NULL THEN
    UPDATE intel_conversation_context
    SET last_insight_report = p_last_insight,
        last_insight_at = NOW(),
        last_search_queries = COALESCE(p_search_queries, last_search_queries),
        last_topics = COALESCE(p_topics, last_topics),
        updated_at = NOW()
    WHERE id = v_context_id;
  END IF;

  -- Add message to rolling window if provided
  IF p_message IS NOT NULL THEN
    SELECT recent_messages INTO v_messages
    FROM intel_conversation_context WHERE id = v_context_id;
    
    -- Keep last 50 messages
    v_messages := jsonb_build_array(p_message) || COALESCE(v_messages, '[]'::jsonb);
    IF jsonb_array_length(v_messages) > 50 THEN
      v_messages := (
        SELECT jsonb_agg(elem)
        FROM (SELECT elem FROM jsonb_array_elements(v_messages) WITH ORDINALITY AS t(elem, ord) LIMIT 50) sub
      );
    END IF;
    
    UPDATE intel_conversation_context
    SET recent_messages = v_messages, updated_at = NOW()
    WHERE id = v_context_id;
  END IF;

  RETURN v_context_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add or reinforce a learned signal
CREATE OR REPLACE FUNCTION upsert_learned_signal(
  p_telegram_id BIGINT,
  p_tenant_id UUID,
  p_signal_type TEXT,
  p_signal_key TEXT,
  p_signal_value FLOAT DEFAULT 1.0,
  p_source_message TEXT DEFAULT NULL,
  p_source_context JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_signal_id UUID;
  v_current_value FLOAT;
  v_reinforcement_count INT;
BEGIN
  -- Check if signal exists
  SELECT id, signal_value, reinforcement_count 
  INTO v_signal_id, v_current_value, v_reinforcement_count
  FROM intel_learned_signals
  WHERE telegram_id = p_telegram_id 
    AND signal_type = p_signal_type 
    AND signal_key = p_signal_key;

  IF v_signal_id IS NOT NULL THEN
    -- Reinforce existing signal (diminishing returns)
    UPDATE intel_learned_signals
    SET signal_value = v_current_value + (p_signal_value / (v_reinforcement_count + 1)),
        reinforcement_count = v_reinforcement_count + 1,
        last_reinforced_at = NOW(),
        source_message = COALESCE(p_source_message, source_message),
        source_context = COALESCE(p_source_context, source_context)
    WHERE id = v_signal_id;
  ELSE
    -- Create new signal
    INSERT INTO intel_learned_signals (
      telegram_id, tenant_id, signal_type, signal_key, 
      signal_value, source_message, source_context
    ) VALUES (
      p_telegram_id, p_tenant_id, p_signal_type, p_signal_key,
      p_signal_value, p_source_message, p_source_context
    )
    RETURNING id INTO v_signal_id;
  END IF;

  RETURN v_signal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all learned preferences for a user
CREATE OR REPLACE FUNCTION get_learned_preferences(p_telegram_id BIGINT)
RETURNS TABLE (
  signal_type TEXT,
  signal_key TEXT,
  signal_value FLOAT,
  reinforcement_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.signal_type,
    ls.signal_key,
    ls.signal_value,
    ls.reinforcement_count
  FROM intel_learned_signals ls
  WHERE ls.telegram_id = p_telegram_id
    AND ls.signal_value > 0  -- Exclude fully decayed signals
  ORDER BY ls.signal_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_conversation_context TO service_role;
GRANT EXECUTE ON FUNCTION upsert_learned_signal TO service_role;
GRANT EXECUTE ON FUNCTION get_learned_preferences TO service_role;
