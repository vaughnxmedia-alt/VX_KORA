-- Native KORA publishing core (no n8n): orgs, social accounts/tokens, content, jobs, attempts, and calendar events.

-- 1) Core org entities
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'publisher', 'contributor', 'viewer')),
  can_connect_accounts BOOLEAN NOT NULL DEFAULT false,
  can_publish BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- 2) Social account + token entities
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'linkedin', 'youtube', 'tiktok', 'x')),
  account_type TEXT NOT NULL CHECK (account_type IN ('facebook_page', 'instagram_professional', 'linkedin_member', 'youtube_channel', 'tiktok_account', 'x_account')),
  external_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  username TEXT,
  capability_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'expired', 'disconnected', 'action_required')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_account_id)
);

CREATE TABLE IF NOT EXISTS public.social_account_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  encrypted_access_token TEXT,
  encrypted_refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  refresh_error TEXT,
  token_status TEXT NOT NULL DEFAULT 'valid' CHECK (token_status IN ('valid', 'expired', 'refresh_failed', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (social_account_id)
);

-- 3) Content + variant entities
CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'linkedin', 'youtube', 'tiktok', 'x', 'blog')),
  body_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_item_id, provider)
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  storage_provider TEXT NOT NULL DEFAULT 's3' CHECK (storage_provider IN ('s3', 'supabase_storage')),
  storage_key TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  processing_status TEXT NOT NULL DEFAULT 'ready' CHECK (processing_status IN ('queued', 'processing', 'ready', 'failed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Scheduling + execution entities
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('social_publish', 'blog_publish', 'campaign_milestone')),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_item_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  content_variant_id UUID NOT NULL REFERENCES public.content_variants(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'linkedin', 'youtube', 'tiktok', 'x', 'blog')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'queued', 'running', 'published', 'failed', 'canceled', 'action_required', 'dead_letter')),
  priority INTEGER NOT NULL DEFAULT 100,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  lock_owner TEXT,
  lock_acquired_at TIMESTAMPTZ,
  provider_post_id TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.publish_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_job_id UUID NOT NULL REFERENCES public.publish_jobs(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'retrying')),
  provider_response JSONB,
  error_category TEXT CHECK (error_category IN ('transient', 'auth', 'validation', 'quota', 'unknown')),
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Approval table retained for later expansion; not required in current autonomous MVP path.
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_item_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'canceled')),
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Extend existing scheduled_posts to support blog scheduling lane in calendar UI
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'social'
  CHECK (post_type IN ('social', 'blog'));

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS scheduled_posts_post_type_idx ON public.scheduled_posts(post_type);
CREATE INDEX IF NOT EXISTS scheduled_posts_blog_post_id_idx ON public.scheduled_posts(blog_post_id);

-- 6) Indices
CREATE INDEX IF NOT EXISTS organization_users_org_idx ON public.organization_users(organization_id);
CREATE INDEX IF NOT EXISTS organization_users_user_idx ON public.organization_users(user_id);
CREATE INDEX IF NOT EXISTS social_accounts_org_provider_idx ON public.social_accounts(organization_id, provider);
CREATE INDEX IF NOT EXISTS content_items_org_status_idx ON public.content_items(organization_id, status);
CREATE INDEX IF NOT EXISTS calendar_events_org_start_idx ON public.calendar_events(organization_id, starts_at);
CREATE INDEX IF NOT EXISTS publish_jobs_schedule_idx ON public.publish_jobs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS publish_jobs_org_idx ON public.publish_jobs(organization_id);
CREATE INDEX IF NOT EXISTS publish_attempts_job_idx ON public.publish_attempts(publish_job_id);

-- 7) RLS baseline
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_account_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard roles can manage organizations" ON public.organizations;
CREATE POLICY "Dashboard roles can manage organizations"
ON public.organizations
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

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'organization_users',
      'social_accounts',
      'social_account_tokens',
      'content_items',
      'content_variants',
      'media_assets',
      'calendar_events',
      'publish_jobs',
      'publish_attempts',
      'approval_requests'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Dashboard roles can manage %I" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Dashboard roles can manage %I" ON public.%I FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN (''admin'', ''author'', ''intern'', ''3pv''))
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN (''admin'', ''author'', ''intern'', ''3pv''))
      );',
      t, t
    );
  END LOOP;
END $$;

-- 8) Trigger timestamps
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_users_updated_at ON public.organization_users;
CREATE TRIGGER update_organization_users_updated_at
BEFORE UPDATE ON public.organization_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_accounts_updated_at ON public.social_accounts;
CREATE TRIGGER update_social_accounts_updated_at
BEFORE UPDATE ON public.social_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_account_tokens_updated_at ON public.social_account_tokens;
CREATE TRIGGER update_social_account_tokens_updated_at
BEFORE UPDATE ON public.social_account_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_items_updated_at ON public.content_items;
CREATE TRIGGER update_content_items_updated_at
BEFORE UPDATE ON public.content_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_variants_updated_at ON public.content_variants;
CREATE TRIGGER update_content_variants_updated_at
BEFORE UPDATE ON public.content_variants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER update_media_assets_updated_at
BEFORE UPDATE ON public.media_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_publish_jobs_updated_at ON public.publish_jobs;
CREATE TRIGGER update_publish_jobs_updated_at
BEFORE UPDATE ON public.publish_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_approval_requests_updated_at ON public.approval_requests;
CREATE TRIGGER update_approval_requests_updated_at
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

