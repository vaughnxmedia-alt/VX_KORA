-- JahKnowsPR HQ V1 foundation
-- Roles, CRM (leads/clients), tasks, activity log, content series on blog_posts

-- ---------------------------------------------------------------------------
-- HQ staff role on profiles (Owner / Strategist / Creative / Intern)
-- Admins without hq_role still get Owner-level HQ access via is_hq_staff().
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'hq_role'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN hq_role text
      CHECK (hq_role IS NULL OR hq_role IN ('owner', 'strategist', 'creative', 'intern'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.hq_role IS
  'JahKnowsPR HQ role: owner | strategist | creative | intern. Null = no HQ access (unless admin).';

-- Seed owners from existing app owners / admins (idempotent best-effort)
UPDATE public.profiles p
SET hq_role = 'owner'
WHERE p.hq_role IS NULL
  AND (
    public.is_dashboard_app_owner(p.id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_hq_staff(check_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.get_user_role(check_uid) = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = check_uid
        AND p.hq_role IN ('owner', 'strategist', 'creative', 'intern')
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.get_hq_role(check_uid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.get_user_role(check_uid) = 'admin' THEN COALESCE(
      (SELECT p.hq_role FROM public.profiles p WHERE p.id = check_uid),
      'owner'
    )
    ELSE (SELECT p.hq_role FROM public.profiles p WHERE p.id = check_uid)
  END;
$$;

REVOKE ALL ON FUNCTION public.is_hq_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_hq_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_hq_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hq_role(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Content series on blog_posts (public site reads published only)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD COLUMN content_type text NOT NULL DEFAULT 'the-brief'
      CHECK (content_type IN ('the-brief', 'spam-report', 'pr-court', 'case-study', 'firm-news'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'seo_title'
  ) THEN
    ALTER TABLE public.blog_posts ADD COLUMN seo_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'seo_description'
  ) THEN
    ALTER TABLE public.blog_posts ADD COLUMN seo_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'hq_client_id'
  ) THEN
    -- FK added after hq_clients exists
    ALTER TABLE public.blog_posts ADD COLUMN hq_client_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS blog_posts_content_type_idx ON public.blog_posts (content_type);
CREATE INDEX IF NOT EXISTS blog_posts_publication_status_idx ON public.blog_posts (publication_status);

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  company text,
  email text,
  phone text,
  lead_source text NOT NULL DEFAULT 'other'
    CHECK (lead_source IN (
      'referral', 'website', 'social_media', 'networking',
      'media_contact', 'existing_client', 'other'
    )),
  interested_service text NOT NULL DEFAULT 'other'
    CHECK (interested_service IN (
      'session', 'project', 'counsel', 'other'
    )),
  estimated_value numeric(12, 2),
  stage text NOT NULL DEFAULT 'new_lead'
    CHECK (stage IN (
      'new_lead', 'contacted', 'conversation', 'strategic_session',
      'proposal', 'project', 'ongoing_counsel', 'closed'
    )),
  last_contact_date date,
  next_follow_up_date date,
  notes text,
  converted_client_id uuid,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_leads_stage_idx ON public.hq_leads (stage);
CREATE INDEX IF NOT EXISTS hq_leads_follow_up_idx ON public.hq_leads (next_follow_up_date);
CREATE INDEX IF NOT EXISTS hq_leads_created_at_idx ON public.hq_leads (created_at DESC);

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  company text,
  primary_contact text,
  email text,
  phone text,
  website text,
  industry text,
  service text
    CHECK (service IS NULL OR service IN ('session', 'project', 'counsel', 'other')),
  status text NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('active', 'prospect', 'paused', 'completed', 'archived')),
  start_date date,
  contract_value numeric(12, 2),
  notes text,
  source_lead_id uuid REFERENCES public.hq_leads (id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_clients_status_idx ON public.hq_clients (status);
CREATE INDEX IF NOT EXISTS hq_clients_created_at_idx ON public.hq_clients (created_at DESC);

ALTER TABLE public.hq_leads
  DROP CONSTRAINT IF EXISTS hq_leads_converted_client_id_fkey;
ALTER TABLE public.hq_leads
  ADD CONSTRAINT hq_leads_converted_client_id_fkey
  FOREIGN KEY (converted_client_id) REFERENCES public.hq_clients (id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'hq_client_id'
  ) THEN
    ALTER TABLE public.blog_posts
      DROP CONSTRAINT IF EXISTS blog_posts_hq_client_id_fkey;
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_hq_client_id_fkey
      FOREIGN KEY (hq_client_id) REFERENCES public.hq_clients (id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  client_id uuid REFERENCES public.hq_clients (id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  due_date date,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'waiting', 'complete')),
  notes text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_tasks_status_idx ON public.hq_tasks (status);
CREATE INDEX IF NOT EXISTS hq_tasks_due_date_idx ON public.hq_tasks (due_date);
CREATE INDEX IF NOT EXISTS hq_tasks_assignee_idx ON public.hq_tasks (assignee_id);

-- ---------------------------------------------------------------------------
-- Activity log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_activity_log_created_at_idx
  ON public.hq_activity_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.hq_log_activity(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_summary text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_hq_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.hq_activity_log (actor_id, action, entity_type, entity_id, summary, metadata)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_summary, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.hq_log_activity(text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hq_log_activity(text, text, uuid, text, jsonb) TO authenticated;

-- updated_at touch
CREATE OR REPLACE FUNCTION public.hq_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hq_leads_updated_at ON public.hq_leads;
CREATE TRIGGER hq_leads_updated_at
  BEFORE UPDATE ON public.hq_leads
  FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();

DROP TRIGGER IF EXISTS hq_clients_updated_at ON public.hq_clients;
CREATE TRIGGER hq_clients_updated_at
  BEFORE UPDATE ON public.hq_clients
  FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();

DROP TRIGGER IF EXISTS hq_tasks_updated_at ON public.hq_tasks;
CREATE TRIGGER hq_tasks_updated_at
  BEFORE UPDATE ON public.hq_tasks
  FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.hq_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_activity_log ENABLE ROW LEVEL SECURITY;

-- Leads: owner + strategist full; creative/intern no lead write (read limited for creative none)
DROP POLICY IF EXISTS hq_leads_select ON public.hq_leads;
CREATE POLICY hq_leads_select ON public.hq_leads
  FOR SELECT TO authenticated
  USING (
    public.get_hq_role(auth.uid()) IN ('owner', 'strategist')
    OR public.get_user_role(auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS hq_leads_write ON public.hq_leads;
CREATE POLICY hq_leads_write ON public.hq_leads
  FOR ALL TO authenticated
  USING (
    public.get_hq_role(auth.uid()) IN ('owner', 'strategist')
    OR public.get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    public.get_hq_role(auth.uid()) IN ('owner', 'strategist')
    OR public.get_user_role(auth.uid()) = 'admin'
  );

-- Clients: owner + strategist full; creative can read assigned later (V1: owned+strategist+admin)
DROP POLICY IF EXISTS hq_clients_select ON public.hq_clients;
CREATE POLICY hq_clients_select ON public.hq_clients
  FOR SELECT TO authenticated
  USING (
    public.get_hq_role(auth.uid()) IN ('owner', 'strategist', 'creative')
    OR public.get_user_role(auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS hq_clients_write ON public.hq_clients;
CREATE POLICY hq_clients_write ON public.hq_clients
  FOR ALL TO authenticated
  USING (
    public.get_hq_role(auth.uid()) IN ('owner', 'strategist')
    OR public.get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    public.get_hq_role(auth.uid()) IN ('owner', 'strategist')
    OR public.get_user_role(auth.uid()) = 'admin'
  );

-- Tasks: staff see all V1 for owner/strategist; creative/intern see assigned or created
DROP POLICY IF EXISTS hq_tasks_select ON public.hq_tasks;
CREATE POLICY hq_tasks_select ON public.hq_tasks
  FOR SELECT TO authenticated
  USING (
    public.get_hq_role(auth.uid()) IN ('owner', 'strategist')
    OR public.get_user_role(auth.uid()) = 'admin'
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS hq_tasks_insert ON public.hq_tasks;
CREATE POLICY hq_tasks_insert ON public.hq_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_hq_staff(auth.uid())
    AND (
      public.get_hq_role(auth.uid()) IN ('owner', 'strategist')
      OR public.get_user_role(auth.uid()) = 'admin'
      OR assignee_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS hq_tasks_update ON public.hq_tasks;
CREATE POLICY hq_tasks_update ON public.hq_tasks
  FOR UPDATE TO authenticated
  USING (
    public.get_hq_role(auth.uid()) IN ('owner', 'strategist')
    OR public.get_user_role(auth.uid()) = 'admin'
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.get_hq_role(auth.uid()) IN ('owner', 'strategist')
    OR public.get_user_role(auth.uid()) = 'admin'
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS hq_tasks_delete ON public.hq_tasks;
CREATE POLICY hq_tasks_delete ON public.hq_tasks
  FOR DELETE TO authenticated
  USING (
    public.get_hq_role(auth.uid()) IN ('owner', 'strategist')
    OR public.get_user_role(auth.uid()) = 'admin'
  );

-- Activity: HQ staff read; insert via SECURITY DEFINER function or staff insert
DROP POLICY IF EXISTS hq_activity_select ON public.hq_activity_log;
CREATE POLICY hq_activity_select ON public.hq_activity_log
  FOR SELECT TO authenticated
  USING (public.is_hq_staff(auth.uid()));

DROP POLICY IF EXISTS hq_activity_insert ON public.hq_activity_log;
CREATE POLICY hq_activity_insert ON public.hq_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hq_staff(auth.uid()) AND actor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Seed content series categories (blog_categories) if table exists
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'blog_categories'
  ) THEN
    INSERT INTO public.blog_categories (name, slug, sort_order, is_active, featured_insights_eligible)
    VALUES
      ('The Brief', 'the-brief', 10, true, true),
      ('SPAM Report', 'spam-report', 20, true, true),
      ('PR Court', 'pr-court', 30, true, true),
      ('Case Studies', 'case-studies', 40, true, true),
      ('Firm News', 'firm-news', 50, true, false)
    ON CONFLICT DO NOTHING;
  END IF;
EXCEPTION
  WHEN unique_violation THEN NULL;
  WHEN undefined_column THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;
