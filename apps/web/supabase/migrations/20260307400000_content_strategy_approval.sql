-- ============================================================================
-- Content Strategy Approval Flow
-- ============================================================================
-- Adds approval workflow to content_strategies table
-- Only approved strategies can be used to create campaigns
-- ============================================================================

-- Add approval columns to content_strategies
ALTER TABLE content_strategies 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

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
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' 
  CHECK (status IN ('draft', 'active', 'archived'));

-- Create index for faster approval queries
CREATE INDEX IF NOT EXISTS idx_content_strategies_approval 
  ON content_strategies(client_id, approval_status);

CREATE INDEX IF NOT EXISTS idx_content_strategies_telegram_approved 
  ON content_strategies(client_id, telegram_approved) 
  WHERE telegram_approved = TRUE;

-- ============================================================================
-- Approval History Table
-- ============================================================================
-- Track all approvals/rejections for audit trail

CREATE TABLE IF NOT EXISTS strategy_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES content_strategies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'pending')),
  approved_via TEXT NOT NULL CHECK (approved_via IN ('telegram', 'web', 'api')),
  
  telegram_chat_id BIGINT,
  telegram_message_id BIGINT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE strategy_approvals ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own approval history" ON strategy_approvals;
CREATE POLICY "Users can view their own approval history"
ON strategy_approvals
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id::text FROM customers WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role full access strategy approvals" ON strategy_approvals;
CREATE POLICY "Service role full access strategy approvals"
ON strategy_approvals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_strategy_approvals_strategy 
  ON strategy_approvals(strategy_id);

CREATE INDEX IF NOT EXISTS idx_strategy_approvals_client 
  ON strategy_approvals(client_id, created_at DESC);

-- ============================================================================
-- Function to approve a strategy via Telegram
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_strategy_via_telegram(
  p_strategy_id UUID,
  p_telegram_chat_id BIGINT,
  p_telegram_message_id BIGINT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_client_id TEXT;
BEGIN
  -- Get the client_id for this strategy
  SELECT client_id INTO v_client_id 
  FROM content_strategies 
  WHERE id = p_strategy_id;
  
  IF v_client_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update the strategy
  UPDATE content_strategies
  SET 
    approval_status = 'approved',
    telegram_approved = TRUE,
    telegram_approved_at = NOW(),
    telegram_message_id = p_telegram_message_id,
    status = 'active'
  WHERE id = p_strategy_id;
  
  -- Record in approval history
  INSERT INTO strategy_approvals (
    strategy_id, 
    client_id, 
    action, 
    approved_via, 
    telegram_chat_id, 
    telegram_message_id
  )
  VALUES (
    p_strategy_id, 
    v_client_id, 
    'approved', 
    'telegram', 
    p_telegram_chat_id, 
    p_telegram_message_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function to reject a strategy via Telegram
-- ============================================================================

CREATE OR REPLACE FUNCTION reject_strategy_via_telegram(
  p_strategy_id UUID,
  p_telegram_chat_id BIGINT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_client_id TEXT;
BEGIN
  -- Get the client_id for this strategy
  SELECT client_id INTO v_client_id 
  FROM content_strategies 
  WHERE id = p_strategy_id;
  
  IF v_client_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update the strategy
  UPDATE content_strategies
  SET 
    approval_status = 'rejected',
    telegram_approved = FALSE
  WHERE id = p_strategy_id;
  
  -- Record in approval history
  INSERT INTO strategy_approvals (
    strategy_id, 
    client_id, 
    action, 
    approved_via, 
    telegram_chat_id,
    notes
  )
  VALUES (
    p_strategy_id, 
    v_client_id, 
    'rejected', 
    'telegram', 
    p_telegram_chat_id,
    p_notes
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comment for documentation
-- ============================================================================

COMMENT ON TABLE strategy_approvals IS 'Audit trail for content strategy approvals and rejections';
COMMENT ON COLUMN content_strategies.approval_status IS 'pending = awaiting user approval, approved = can be used for campaigns, rejected = user declined';
COMMENT ON COLUMN content_strategies.telegram_approved IS 'True if approved via Telegram bot';
