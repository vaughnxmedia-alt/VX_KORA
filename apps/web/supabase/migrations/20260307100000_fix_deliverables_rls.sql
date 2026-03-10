-- Fix RLS Policies for Deliverables Tables
-- Allows authenticated users to view their own data via the customers table relationship

-- =============================================================================
-- DROP OLD OVERLY PERMISSIVE POLICIES
-- =============================================================================

-- Note: These policies allow all access which only works for service_role
-- We need to add proper user-scoped policies

-- =============================================================================
-- BRAND BLUEPRINTS - User Access Policies
-- =============================================================================

-- Users can view their own blueprints (via customer relationship)
CREATE POLICY "Users can view their own brand blueprints"
ON brand_blueprints
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
);

-- Admins can view all blueprints
CREATE POLICY "Admins can view all brand blueprints"
ON brand_blueprints
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can manage all blueprints
CREATE POLICY "Admins can manage all brand blueprints"
ON brand_blueprints
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

-- =============================================================================
-- CONTENT STRATEGIES - User Access Policies
-- =============================================================================

-- Users can view their own strategies (via customer relationship)
CREATE POLICY "Users can view their own content strategies"
ON content_strategies
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
);

-- Admins can view all strategies
CREATE POLICY "Admins can view all content strategies"
ON content_strategies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can manage all strategies
CREATE POLICY "Admins can manage all content strategies"
ON content_strategies
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

-- =============================================================================
-- AUDIENCE ANALYSES - User Access Policies
-- =============================================================================

-- Users can view their own analyses (via customer relationship)
CREATE POLICY "Users can view their own audience analyses"
ON audience_analyses
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
);

-- Admins can view all analyses
CREATE POLICY "Admins can view all audience analyses"
ON audience_analyses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can manage all analyses
CREATE POLICY "Admins can manage all audience analyses"
ON audience_analyses
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

-- =============================================================================
-- CUSTOMERS TABLE - Add telegram_id index for faster lookups
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_customers_telegram_id ON customers(telegram_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- =============================================================================
-- CONTENT INTELLIGENCE PREFERENCES - User Access Policies  
-- =============================================================================

-- Users can view their own preferences
CREATE POLICY "Users can view their own content intel prefs"
ON content_intelligence_preferences
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
);

-- Admins can manage all preferences
CREATE POLICY "Admins can manage all content intel prefs"
ON content_intelligence_preferences
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

-- =============================================================================
-- SOURCE RECOMMENDATIONS - User Access Policies
-- =============================================================================

-- Users can view their own recommendations
CREATE POLICY "Users can view their own source recommendations"
ON source_recommendations
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
);

-- Users can update their own recommendations (approve/reject)
CREATE POLICY "Users can update their own source recommendations"
ON source_recommendations
FOR UPDATE
TO authenticated
USING (
  client_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  client_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
);

-- Admins can manage all recommendations
CREATE POLICY "Admins can manage all source recommendations"
ON source_recommendations
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

-- =============================================================================
-- TELEGRAM INTAKE SESSIONS - User Access Policies
-- =============================================================================

-- Users can view their own intake sessions
CREATE POLICY "Users can view their own intake sessions"
ON telegram_intake_sessions
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
);

-- Admins can view all intake sessions
CREATE POLICY "Admins can view all intake sessions"
ON telegram_intake_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can manage all intake sessions
CREATE POLICY "Admins can manage all intake sessions"
ON telegram_intake_sessions
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
