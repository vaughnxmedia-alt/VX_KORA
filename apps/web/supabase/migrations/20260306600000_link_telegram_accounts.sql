-- Link Telegram accounts to main site user accounts
-- This migration creates customer records linking Telegram IDs to auth users
-- for Juss (Justicevaughn7@gmail.com) and Jocelyn (jocelyncavinessbrigman@gmail.com)

-- Create or update function to link telegram to auth user via email
CREATE OR REPLACE FUNCTION link_telegram_to_auth_user(
  p_telegram_id BIGINT,
  p_email TEXT,
  p_business_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_auth_user_id UUID;
  v_customer_id UUID;
BEGIN
  -- Find auth user by email
  SELECT id INTO v_auth_user_id 
  FROM auth.users 
  WHERE email = lower(p_email);
  
  IF v_auth_user_id IS NULL THEN
    RAISE NOTICE 'No auth user found for email: %', p_email;
    RETURN NULL;
  END IF;
  
  -- Check if customer record exists for this auth user
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE user_id = v_auth_user_id;
  
  IF v_customer_id IS NOT NULL THEN
    -- Update existing customer with telegram_id
    UPDATE public.customers
    SET 
      telegram_id = p_telegram_id,
      business_name = COALESCE(business_name, p_business_name)
    WHERE id = v_customer_id;
    
    RAISE NOTICE 'Updated existing customer % with telegram_id %', v_customer_id, p_telegram_id;
    RETURN v_customer_id;
  ELSE
    -- Create new customer record
    INSERT INTO public.customers (
      user_id,
      telegram_id,
      business_name,
      email,
      created_at
    ) VALUES (
      v_auth_user_id,
      p_telegram_id,
      p_business_name,
      p_email,
      NOW()
    ) RETURNING id INTO v_customer_id;
    
    RAISE NOTICE 'Created new customer % for auth user %', v_customer_id, v_auth_user_id;
    RETURN v_customer_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add email column to customers if not exists
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;

-- Add unique constraint on telegram_id for customers
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_telegram_id_unique 
ON public.customers(telegram_id) 
WHERE telegram_id IS NOT NULL;

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- Update brand_blueprints to support upserting by telegram_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_blueprints_telegram_id_unique
ON brand_blueprints(telegram_id) 
WHERE telegram_id IS NOT NULL;

-- Update content_strategies to support upserting by telegram_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_strategies_telegram_id_unique
ON content_strategies(telegram_id) 
WHERE telegram_id IS NOT NULL;

-- Update audience_analyses to support upserting by telegram_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_audience_analyses_telegram_id_unique
ON audience_analyses(telegram_id) 
WHERE telegram_id IS NOT NULL;

-- RLS Policy updates: Users can view their own data via telegram_id
CREATE POLICY "Users can view own blueprints via telegram_id" 
ON brand_blueprints FOR SELECT TO authenticated
USING (
  client_id IN (
    SELECT c.id FROM customers c 
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own strategies via telegram_id" 
ON content_strategies FOR SELECT TO authenticated
USING (
  client_id IN (
    SELECT c.id FROM customers c 
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own audiences via telegram_id" 
ON audience_analyses FOR SELECT TO authenticated
USING (
  client_id IN (
    SELECT c.id FROM customers c 
    WHERE c.user_id = auth.uid()
  )
);

-- Admin policies for full access
CREATE POLICY "Admins can manage all blueprints"
ON brand_blueprints FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage all strategies"
ON content_strategies FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage all audiences"
ON audience_analyses FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Service role bypass for all tables
CREATE POLICY "Service role bypass for blueprints" ON brand_blueprints
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass for strategies" ON content_strategies
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass for audiences" ON audience_analyses
FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON FUNCTION link_telegram_to_auth_user IS 
'Links a Telegram account to an existing auth user by email. Creates or updates customer record.';
