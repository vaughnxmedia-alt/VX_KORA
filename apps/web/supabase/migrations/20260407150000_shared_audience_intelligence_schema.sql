-- Shared Audience Intelligence schema for Main Site + Mission Control

CREATE OR REPLACE FUNCTION public.is_dashboard_operator(_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _uid
      AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  );
$$;

CREATE TABLE IF NOT EXISTS public.audience_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  audience_name TEXT NOT NULL,
  audience_type TEXT NOT NULL DEFAULT 'ai_generated' CHECK (audience_type IN ('ai_generated', 'custom', 'hybrid')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','in_progress','needs_review','complete','approved','activation_ready','synced','failed')),
  offer_id UUID,
  service_id UUID,
  product_id UUID,
  campaign_id UUID,
  confidence_score NUMERIC,
  completeness_score NUMERIC,
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_audience_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_profile_id UUID NOT NULL REFERENCES public.audience_profiles(id) ON DELETE CASCADE,
  based_on_version_id UUID REFERENCES public.custom_audience_versions(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('ai_generated', 'custom', 'hybrid')),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_notes TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','in_progress','needs_review','complete','approved','activation_ready','synced','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audience_profile_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_profile_id UUID NOT NULL REFERENCES public.audience_profiles(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.custom_audience_versions(id) ON DELETE SET NULL,
  segment_name TEXT NOT NULL,
  description TEXT,
  pain_point TEXT,
  why_they_follow TEXT,
  why_they_hesitate TEXT,
  buying_motivation TEXT,
  best_content_angle TEXT,
  best_cta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audience_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_profile_id UUID NOT NULL REFERENCES public.audience_profiles(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.custom_audience_versions(id) ON DELETE SET NULL,
  persona_name TEXT NOT NULL,
  role_title TEXT,
  stage_of_business TEXT,
  goals TEXT[],
  fears TEXT[],
  objections TEXT[],
  platforms_used TEXT[],
  resonant_messaging TEXT[],
  offer_fit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audience_psychology_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_profile_id UUID NOT NULL REFERENCES public.audience_profiles(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.custom_audience_versions(id) ON DELETE SET NULL,
  motivations TEXT[],
  fears TEXT[],
  trust_drivers TEXT[],
  emotional_triggers TEXT[],
  buying_barriers TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audience_profile_id, version_id)
);

CREATE TABLE IF NOT EXISTS public.message_angles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_profile_id UUID NOT NULL REFERENCES public.audience_profiles(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.custom_audience_versions(id) ON DELETE SET NULL,
  hooks TEXT[],
  story_angles TEXT[],
  educational_themes TEXT[],
  trust_building TEXT[],
  conversion_content TEXT[],
  content_to_avoid TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audience_profile_id, version_id)
);

CREATE TABLE IF NOT EXISTS public.platform_activation_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_profile_id UUID NOT NULL REFERENCES public.audience_profiles(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.custom_audience_versions(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta','tiktok','linkedin')),
  relevance_score NUMERIC,
  best_content_type TEXT,
  tone_style TEXT,
  conversion_role TEXT,
  activation_status TEXT NOT NULL DEFAULT 'draft' CHECK (activation_status IN ('draft','queued','in_progress','needs_review','complete','approved','activation_ready','synced','failed')),
  sync_log TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audience_profile_id, version_id, platform)
);

CREATE TABLE IF NOT EXISTS public.audience_analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_profile_id UUID NOT NULL REFERENCES public.audience_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('draft','queued','in_progress','needs_review','complete','approved','activation_ready','synced','failed')),
  trigger_source TEXT NOT NULL DEFAULT 'main_site' CHECK (trigger_source IN ('main_site','mission_control','intake','brand_strategy_session','manual')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confidence_score NUMERIC,
  version_id UUID REFERENCES public.custom_audience_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_reason TEXT
);

-- Existing approval_requests table can be shared across domains; add audience linkage fields if missing.
ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS audience_profile_id UUID REFERENCES public.audience_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS analysis_run_id UUID REFERENCES public.audience_analysis_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES public.custom_audience_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_audience_profiles_client_id ON public.audience_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_audience_runs_client_status ON public.audience_analysis_runs(client_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audience_runs_profile_id ON public.audience_analysis_runs(audience_profile_id);

ALTER TABLE public.audience_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_audience_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_psychology_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_angles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_activation_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_analysis_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audience profiles admin manage" ON public.audience_profiles;
CREATE POLICY "Audience profiles admin manage" ON public.audience_profiles
FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "Audience profiles client read" ON public.audience_profiles;
CREATE POLICY "Audience profiles client read" ON public.audience_profiles
FOR SELECT TO authenticated
USING (client_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Audience profiles client create" ON public.audience_profiles;
CREATE POLICY "Audience profiles client create" ON public.audience_profiles
FOR INSERT TO authenticated
WITH CHECK (client_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Audience profiles client update" ON public.audience_profiles;
CREATE POLICY "Audience profiles client update" ON public.audience_profiles
FOR UPDATE TO authenticated
USING (client_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()))
WITH CHECK (client_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- Child-table policies mirror the parent profile visibility.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'custom_audience_versions',
    'audience_segments',
    'audience_personas',
    'audience_psychology_signals',
    'message_angles',
    'platform_activation_specs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%%I admin manage" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%I admin manage" ON public.%I FOR ALL TO authenticated USING (public.is_dashboard_operator(auth.uid())) WITH CHECK (public.is_dashboard_operator(auth.uid()))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%I client view" ON public.%I', t, t);
    EXECUTE format($f$
      CREATE POLICY "%1$s client view" ON public.%1$s
      FOR SELECT TO authenticated
      USING (
        audience_profile_id IN (
          SELECT ap.id FROM public.audience_profiles ap
          WHERE ap.client_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
        )
      )
    $f$, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Audience runs admin manage" ON public.audience_analysis_runs;
CREATE POLICY "Audience runs admin manage" ON public.audience_analysis_runs
FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "Audience runs client view" ON public.audience_analysis_runs;
CREATE POLICY "Audience runs client view" ON public.audience_analysis_runs
FOR SELECT TO authenticated
USING (client_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Audience runs client create" ON public.audience_analysis_runs;
CREATE POLICY "Audience runs client create" ON public.audience_analysis_runs
FOR INSERT TO authenticated
WITH CHECK (client_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Audience runs client update" ON public.audience_analysis_runs;
CREATE POLICY "Audience runs client update" ON public.audience_analysis_runs
FOR UPDATE TO authenticated
USING (client_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()))
WITH CHECK (client_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Approval requests audience shared" ON public.approval_requests;
CREATE POLICY "Approval requests audience shared" ON public.approval_requests
FOR ALL TO authenticated
USING (
  public.is_dashboard_operator(auth.uid())
  OR (
    audience_profile_id IS NOT NULL
    AND audience_profile_id IN (
      SELECT ap.id FROM public.audience_profiles ap
      WHERE ap.client_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    )
  )
)
WITH CHECK (
  public.is_dashboard_operator(auth.uid())
  OR (
    audience_profile_id IS NOT NULL
    AND audience_profile_id IN (
      SELECT ap.id FROM public.audience_profiles ap
      WHERE ap.client_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    )
  )
);

-- Updated-at triggers
DROP TRIGGER IF EXISTS trg_audience_profiles_updated_at ON public.audience_profiles;
CREATE TRIGGER trg_audience_profiles_updated_at
BEFORE UPDATE ON public.audience_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_custom_audience_versions_updated_at ON public.custom_audience_versions;
CREATE TRIGGER trg_custom_audience_versions_updated_at
BEFORE UPDATE ON public.custom_audience_versions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audience_segments_updated_at ON public.audience_segments;
CREATE TRIGGER trg_audience_segments_updated_at
BEFORE UPDATE ON public.audience_segments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audience_personas_updated_at ON public.audience_personas;
CREATE TRIGGER trg_audience_personas_updated_at
BEFORE UPDATE ON public.audience_personas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audience_psychology_signals_updated_at ON public.audience_psychology_signals;
CREATE TRIGGER trg_audience_psychology_signals_updated_at
BEFORE UPDATE ON public.audience_psychology_signals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_message_angles_updated_at ON public.message_angles;
CREATE TRIGGER trg_message_angles_updated_at
BEFORE UPDATE ON public.message_angles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_platform_activation_specs_updated_at ON public.platform_activation_specs;
CREATE TRIGGER trg_platform_activation_specs_updated_at
BEFORE UPDATE ON public.platform_activation_specs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audience_analysis_runs_updated_at ON public.audience_analysis_runs;
CREATE TRIGGER trg_audience_analysis_runs_updated_at
BEFORE UPDATE ON public.audience_analysis_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
