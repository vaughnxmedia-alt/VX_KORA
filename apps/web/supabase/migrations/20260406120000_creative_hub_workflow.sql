-- Creative Hub: content plans, operational campaigns, logistics, chat history, calendar linkage.

-- 1) Content plans
CREATE TABLE public.content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  workspace_id UUID,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  objective TEXT,
  primary_platform TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'submitted')),
  assigned_agent TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  linked_campaign_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_plans_created_by_idx ON public.content_plans(created_by);
CREATE INDEX IF NOT EXISTS content_plans_status_idx ON public.content_plans(status);

-- 2) Campaigns (operational; distinct from in-app mock campaign war-room)
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  workspace_id UUID,
  content_plan_id UUID REFERENCES public.content_plans(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  objective TEXT,
  primary_platform TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'scheduled', 'live', 'completed', 'archived')),
  logistics_status TEXT NOT NULL DEFAULT 'unset' CHECK (logistics_status IN ('unset', 'needed', 'not_needed_now', 'created')),
  live_at TIMESTAMPTZ,
  first_published_at TIMESTAMPTZ,
  published_post_count INTEGER NOT NULL DEFAULT 0,
  scheduled_post_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_content_plan_id_idx ON public.campaigns(content_plan_id);
CREATE INDEX IF NOT EXISTS campaigns_created_by_idx ON public.campaigns(created_by);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON public.campaigns(status);

-- Back-link from plan to campaign (after conversion)
ALTER TABLE public.content_plans
  ADD CONSTRAINT content_plans_linked_campaign_id_fkey
  FOREIGN KEY (linked_campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- 3) Content plan items
CREATE TABLE public.content_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_plan_id UUID NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  title TEXT,
  pillar TEXT,
  angle TEXT,
  hook TEXT,
  caption TEXT,
  hashtags TEXT,
  platform TEXT,
  format TEXT,
  cta TEXT,
  objective TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'kora_chat', 'telegram', 'mission_control', 'event_source')),
  source_reference TEXT,
  event_id UUID,
  status TEXT NOT NULL DEFAULT 'draft',
  planned_date DATE,
  notes TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_plan_items_plan_idx ON public.content_plan_items(content_plan_id);

-- 4) Campaign logistics (optional execution workspace)
CREATE TABLE public.campaign_logistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL UNIQUE REFERENCES public.campaigns(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  shoot_times TEXT,
  locations TEXT,
  vendors TEXT,
  rentals TEXT,
  booking_links TEXT,
  production_notes TEXT,
  talent TEXT,
  props TEXT,
  budget_notes TEXT,
  miscellaneous TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Chat messages for Creative Hub (RAG-ready fields)
CREATE TABLE public.content_plan_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_plan_id UUID NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  structured_output JSONB,
  was_applied_to_plan BOOLEAN NOT NULL DEFAULT false,
  memory_candidate BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_plan_chat_messages_plan_idx ON public.content_plan_chat_messages(content_plan_id);

-- 6) Link scheduled posts to campaigns
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS content_plan_item_id UUID REFERENCES public.content_plan_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS scheduled_posts_campaign_id_idx ON public.scheduled_posts(campaign_id);

-- 7) When a calendar post goes live, update campaign aggregates
CREATE OR REPLACE FUNCTION public.handle_scheduled_post_campaign_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.campaign_id IS NOT NULL
     AND NEW.status = 'published'
     AND (OLD.status IS DISTINCT FROM NEW.status)
  THEN
    UPDATE public.campaigns c
    SET
      published_post_count = COALESCE(c.published_post_count, 0) + 1,
      first_published_at = COALESCE(c.first_published_at, now()),
      live_at = COALESCE(c.live_at, now()),
      status = CASE
        WHEN c.status IN ('draft', 'ready', 'scheduled') THEN 'live'
        ELSE c.status
      END,
      updated_at = now()
    WHERE c.id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_scheduled_posts_campaign_publish ON public.scheduled_posts;
CREATE TRIGGER tr_scheduled_posts_campaign_publish
  AFTER UPDATE OF status ON public.scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_scheduled_post_campaign_publish();

COMMENT ON TABLE public.content_plans IS 'Creative Hub content plans before campaign conversion.';
COMMENT ON TABLE public.campaigns IS 'Operational campaigns linked to content plans and calendar.';
COMMENT ON COLUMN public.scheduled_posts.campaign_id IS 'FK for calendar items originating from a campaign; display name in campaign_name_snapshot.';

-- 8) RLS: dashboard roles (admin, author, intern, 3pv)
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plan_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dashboard staff manage content_plans"
ON public.content_plans FOR ALL TO authenticated
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

CREATE POLICY "Dashboard staff manage content_plan_items"
ON public.content_plan_items FOR ALL TO authenticated
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

CREATE POLICY "Dashboard staff manage campaigns"
ON public.campaigns FOR ALL TO authenticated
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

CREATE POLICY "Dashboard staff manage campaign_logistics"
ON public.campaign_logistics FOR ALL TO authenticated
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

CREATE POLICY "Dashboard staff manage content_plan_chat_messages"
ON public.content_plan_chat_messages FOR ALL TO authenticated
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
