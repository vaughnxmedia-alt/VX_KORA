-- Meta OAuth state tracking + analytics snapshots.

CREATE TABLE IF NOT EXISTS public.social_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'linkedin', 'youtube', 'tiktok', 'x')),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_oauth_states_provider_state_idx
  ON public.social_oauth_states(provider, state);

CREATE INDEX IF NOT EXISTS social_oauth_states_expires_idx
  ON public.social_oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS public.social_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'linkedin', 'youtube', 'tiktok', 'x')),
  metric_date DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (social_account_id, metric_date)
);

CREATE INDEX IF NOT EXISTS social_metrics_org_date_idx
  ON public.social_metrics_snapshots(organization_id, metric_date DESC);

ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_metrics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard roles can manage social_oauth_states" ON public.social_oauth_states;
CREATE POLICY "Dashboard roles can manage social_oauth_states"
ON public.social_oauth_states
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);

DROP POLICY IF EXISTS "Dashboard roles can read social_metrics_snapshots" ON public.social_metrics_snapshots;
CREATE POLICY "Dashboard roles can read social_metrics_snapshots"
ON public.social_metrics_snapshots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);

DROP POLICY IF EXISTS "Service role can manage social_metrics_snapshots" ON public.social_metrics_snapshots;
CREATE POLICY "Service role can manage social_metrics_snapshots"
ON public.social_metrics_snapshots
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

