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
