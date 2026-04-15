-- Telegram subscription checkout + bot onboarding linkage

CREATE TABLE IF NOT EXISTS public.telegram_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  provider TEXT NOT NULL DEFAULT 'square',
  square_customer_id TEXT,
  square_card_id TEXT,
  square_subscription_id TEXT UNIQUE,
  square_status TEXT,
  plan_variation_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 1500,
  currency TEXT NOT NULL DEFAULT 'USD',
  access_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS telegram_subscriptions_email_idx
  ON public.telegram_subscriptions (email);

CREATE TABLE IF NOT EXISTS public.telegram_access_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.telegram_subscriptions(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  token TEXT NOT NULL UNIQUE,
  claimed_at TIMESTAMPTZ,
  claimed_telegram_id BIGINT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS telegram_access_invites_email_idx
  ON public.telegram_access_invites (email);

ALTER TABLE public.telegram_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_access_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select telegram_subscriptions" ON public.telegram_subscriptions;
CREATE POLICY "Admins can select telegram_subscriptions"
  ON public.telegram_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can select telegram_access_invites" ON public.telegram_access_invites;
CREATE POLICY "Admins can select telegram_access_invites"
  ON public.telegram_access_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

GRANT SELECT ON public.telegram_subscriptions TO authenticated;
GRANT SELECT ON public.telegram_access_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_access_invites TO service_role;
