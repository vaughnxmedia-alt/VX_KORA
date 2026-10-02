-- Communications Intelligence V1 — schema + RLS foundation
-- Additive only: does not alter/drop existing production tables (hq_*, customers, etc.).
-- Client portal: invite-only via ci_organization_members (active membership required).
-- Admin access: reuses is_hq_staff() / JahKnowsPR HQ staff gate.
-- Internal notes: ci_admin_notes is admin-only (no client SELECT).
-- Prerequisite: 20261002180000_jahknowspr_hq_v1.sql (hq_clients, is_hq_staff).

DO $$
BEGIN
  IF to_regclass('public.hq_clients') IS NULL THEN
    RAISE EXCEPTION 'Communications Intelligence requires hq_clients. Apply JahKnowsPR HQ V1 migration first.';
  END IF;
  IF to_regprocedure('public.is_hq_staff(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Communications Intelligence requires is_hq_staff(uuid). Apply JahKnowsPR HQ V1 migration first.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Early helpers (no dependency on CI tables)
-- Membership helpers are created after ci_organization_members exists.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_ci_admin(check_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- JahKnowsPR staff (HQ) administer Communications Intelligence.
  SELECT COALESCE(public.is_hq_staff(check_uid), false);
$$;

REVOKE ALL ON FUNCTION public.is_ci_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_ci_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ci_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- ci_organizations (tenant root; optional link to hq_clients)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hq_client_id uuid UNIQUE REFERENCES public.hq_clients (id) ON DELETE SET NULL,
  name text NOT NULL,
  industry text,
  organization_type text
    CHECK (
      organization_type IS NULL
      OR organization_type IN (
        'small_business',
        'nonprofit',
        'church',
        'community_organization',
        'personal_brand',
        'startup',
        'other'
      )
    ),
  description text,
  website text,
  location text,
  primary_audiences text,
  communication_goals text,
  major_challenges text,
  upcoming_events text,
  key_spokespersons jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_channels jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_organizations_status_idx
  ON public.ci_organizations (status);
CREATE INDEX IF NOT EXISTS ci_organizations_hq_client_id_idx
  ON public.ci_organizations (hq_client_id)
  WHERE hq_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ci_organizations_created_at_idx
  ON public.ci_organizations (created_at DESC);

COMMENT ON TABLE public.ci_organizations IS
  'Communications Intelligence tenant. Optionally linked 1:1 to hq_clients; portal access is via ci_organization_members only.';
COMMENT ON COLUMN public.ci_organizations.hq_client_id IS
  'Optional link to JahKnowsPR HQ CRM client. Unique when set.';

DROP TRIGGER IF EXISTS ci_organizations_updated_at ON public.ci_organizations;
CREATE TRIGGER ci_organizations_updated_at
  BEFORE UPDATE ON public.ci_organizations
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

-- ---------------------------------------------------------------------------
-- ci_organization_members (invite-only portal access)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'member'
    CHECK (member_role IN ('owner', 'admin', 'member', 'viewer')),
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'revoked')),
  invited_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS ci_organization_members_user_idx
  ON public.ci_organization_members (user_id);
CREATE INDEX IF NOT EXISTS ci_organization_members_org_status_idx
  ON public.ci_organization_members (organization_id, status);
CREATE INDEX IF NOT EXISTS ci_organization_members_active_user_idx
  ON public.ci_organization_members (user_id, organization_id)
  WHERE status = 'active';

COMMENT ON TABLE public.ci_organization_members IS
  'Invite-only portal membership. Only status=active grants org access. Roles reserved for future ACL; MVP treats all active members as read-mostly clients.';

DROP TRIGGER IF EXISTS ci_organization_members_updated_at ON public.ci_organization_members;
CREATE TRIGGER ci_organization_members_updated_at
  BEFORE UPDATE ON public.ci_organization_members
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

-- Membership / access helpers (require ci_organization_members)
CREATE OR REPLACE FUNCTION public.is_ci_org_member(
  org_id uuid,
  check_uid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.ci_organization_members m
      WHERE m.organization_id = org_id
        AND m.user_id = check_uid
        AND m.status = 'active'
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.ci_org_member_role(
  org_id uuid,
  check_uid uuid DEFAULT auth.uid()
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.member_role
  FROM public.ci_organization_members m
  WHERE m.organization_id = org_id
    AND m.user_id = check_uid
    AND m.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_ci_org(
  org_id uuid,
  check_uid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.is_ci_admin(check_uid)
    OR public.is_ci_org_member(org_id, check_uid),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_ci_org_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ci_org_member_role(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_ci_org(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_ci_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ci_org_member_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_ci_org(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- ci_intelligence_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_intelligence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL
    CHECK (category IN (
      'opportunity',
      'needs_attention',
      'upcoming',
      'recommendation',
      'reputation',
      'messaging',
      'media',
      'crisis_readiness',
      'visibility'
    )),
  description text,
  why_it_matters text,
  recommended_action text,
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'in_progress', 'completed', 'dismissed')),
  due_date date,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_intelligence_items_org_idx
  ON public.ci_intelligence_items (organization_id);
CREATE INDEX IF NOT EXISTS ci_intelligence_items_org_status_idx
  ON public.ci_intelligence_items (organization_id, status);
CREATE INDEX IF NOT EXISTS ci_intelligence_items_org_category_idx
  ON public.ci_intelligence_items (organization_id, category);
CREATE INDEX IF NOT EXISTS ci_intelligence_items_org_priority_idx
  ON public.ci_intelligence_items (organization_id, priority);
CREATE INDEX IF NOT EXISTS ci_intelligence_items_due_date_idx
  ON public.ci_intelligence_items (due_date)
  WHERE due_date IS NOT NULL;

DROP TRIGGER IF EXISTS ci_intelligence_items_updated_at ON public.ci_intelligence_items;
CREATE TRIGGER ci_intelligence_items_updated_at
  BEFORE UPDATE ON public.ci_intelligence_items
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

-- ---------------------------------------------------------------------------
-- ci_health_checks (one row per org + category)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  category text NOT NULL
    CHECK (category IN (
      'messaging',
      'visibility',
      'reputation',
      'media_readiness',
      'crisis_readiness',
      'brand_consistency'
    )),
  score smallint
    CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  status_label text
    CHECK (
      status_label IS NULL
      OR status_label IN ('strong', 'stable', 'needs_work', 'critical', 'unknown')
    ),
  explanation text,
  recommended_improvement text,
  assessed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  assessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, category)
);

CREATE INDEX IF NOT EXISTS ci_health_checks_org_idx
  ON public.ci_health_checks (organization_id);

COMMENT ON TABLE public.ci_health_checks IS
  'Manual Communications Health Check entries. Scores are secondary to explanation + recommended_improvement.';

DROP TRIGGER IF EXISTS ci_health_checks_updated_at ON public.ci_health_checks;
CREATE TRIGGER ci_health_checks_updated_at
  BEFORE UPDATE ON public.ci_health_checks
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

-- ---------------------------------------------------------------------------
-- ci_messaging_entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_messaging_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  entry_type text NOT NULL
    CHECK (entry_type IN (
      'organization_description',
      'boilerplate',
      'founder_executive_bio',
      'key_messages',
      'talking_points',
      'faq_responses',
      'approved_statements',
      'media_bio'
    )),
  title text,
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_messaging_entries_org_type_idx
  ON public.ci_messaging_entries (organization_id, entry_type, sort_order);

DROP TRIGGER IF EXISTS ci_messaging_entries_updated_at ON public.ci_messaging_entries;
CREATE TRIGGER ci_messaging_entries_updated_at
  BEFORE UPDATE ON public.ci_messaging_entries
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

-- ---------------------------------------------------------------------------
-- ci_opportunities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  title text NOT NULL,
  opportunity_type text NOT NULL
    CHECK (opportunity_type IN (
      'media',
      'speaking',
      'partnership',
      'sponsorship',
      'award',
      'community_event',
      'announcement',
      'storytelling',
      'thought_leadership',
      'other'
    )),
  description text,
  why_it_matters text,
  recommended_action text,
  deadline date,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'pursuing', 'won', 'passed', 'closed')),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_opportunities_org_idx
  ON public.ci_opportunities (organization_id);
CREATE INDEX IF NOT EXISTS ci_opportunities_org_status_idx
  ON public.ci_opportunities (organization_id, status);
CREATE INDEX IF NOT EXISTS ci_opportunities_deadline_idx
  ON public.ci_opportunities (deadline)
  WHERE deadline IS NOT NULL;

DROP TRIGGER IF EXISTS ci_opportunities_updated_at ON public.ci_opportunities;
CREATE TRIGGER ci_opportunities_updated_at
  BEFORE UPDATE ON public.ci_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

-- ---------------------------------------------------------------------------
-- ci_action_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  reason text,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_action_items_org_idx
  ON public.ci_action_items (organization_id);
CREATE INDEX IF NOT EXISTS ci_action_items_org_status_idx
  ON public.ci_action_items (organization_id, status);
CREATE INDEX IF NOT EXISTS ci_action_items_due_date_idx
  ON public.ci_action_items (due_date)
  WHERE due_date IS NOT NULL;

DROP TRIGGER IF EXISTS ci_action_items_updated_at ON public.ci_action_items;
CREATE TRIGGER ci_action_items_updated_at
  BEFORE UPDATE ON public.ci_action_items
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

-- Clients may only change status (and completed_at derived); admins unrestricted.
CREATE OR REPLACE FUNCTION public.ci_guard_action_item_client_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_ci_admin(auth.uid()) THEN
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
      NEW.completed_at = COALESCE(NEW.completed_at, now());
    ELSIF NEW.status IS DISTINCT FROM 'completed' THEN
      NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT public.is_ci_org_member(OLD.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to update this action item';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.due_date IS DISTINCT FROM OLD.due_date
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION 'Clients may only update action item status';
  END IF;

  IF NEW.status NOT IN ('not_started', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid action item status';
  END IF;

  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at = now();
  ELSIF NEW.status IS DISTINCT FROM 'completed' THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ci_action_items_client_guard ON public.ci_action_items;
CREATE TRIGGER ci_action_items_client_guard
  BEFORE UPDATE ON public.ci_action_items
  FOR EACH ROW EXECUTE FUNCTION public.ci_guard_action_item_client_update();

-- ---------------------------------------------------------------------------
-- ci_counsel_requests (Ask JahKnowsPR)
-- Internal notes live in ci_admin_notes — never on this table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_counsel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  urgency text NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  link_url text,
  attachment_path text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewing', 'response_ready', 'closed')),
  response text,
  responded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  responded_at timestamptz,
  submitted_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_counsel_requests_org_idx
  ON public.ci_counsel_requests (organization_id);
CREATE INDEX IF NOT EXISTS ci_counsel_requests_org_status_idx
  ON public.ci_counsel_requests (organization_id, status);
CREATE INDEX IF NOT EXISTS ci_counsel_requests_submitted_by_idx
  ON public.ci_counsel_requests (submitted_by);
CREATE INDEX IF NOT EXISTS ci_counsel_requests_created_at_idx
  ON public.ci_counsel_requests (created_at DESC);

COMMENT ON TABLE public.ci_counsel_requests IS
  'Ask JahKnowsPR counsel requests. Client-visible response fields only; staff notes use ci_admin_notes.';
COMMENT ON COLUMN public.ci_counsel_requests.attachment_path IS
  'Path inside storage bucket ci-counsel-attachments: {organization_id}/{request_id}/filename';

DROP TRIGGER IF EXISTS ci_counsel_requests_updated_at ON public.ci_counsel_requests;
CREATE TRIGGER ci_counsel_requests_updated_at
  BEFORE UPDATE ON public.ci_counsel_requests
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

-- Clients cannot alter staff response fields or move requests across orgs.
CREATE OR REPLACE FUNCTION public.ci_guard_counsel_request_client_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_ci_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- MVP: clients cannot UPDATE counsel requests (status/response are staff-controlled).
  RAISE EXCEPTION 'Clients cannot update counsel requests';
END;
$$;

DROP TRIGGER IF EXISTS ci_counsel_requests_client_guard ON public.ci_counsel_requests;
CREATE TRIGGER ci_counsel_requests_client_guard
  BEFORE UPDATE ON public.ci_counsel_requests
  FOR EACH ROW EXECUTE FUNCTION public.ci_guard_counsel_request_client_update();

-- ---------------------------------------------------------------------------
-- ci_admin_notes (staff-only; never exposed to clients)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ci_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  entity_type text NOT NULL
    CHECK (entity_type IN (
      'organization',
      'intelligence_item',
      'health_check',
      'messaging_entry',
      'opportunity',
      'action_item',
      'counsel_request',
      'general'
    )),
  entity_id uuid,
  body text NOT NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_admin_notes_org_idx
  ON public.ci_admin_notes (organization_id);
CREATE INDEX IF NOT EXISTS ci_admin_notes_entity_idx
  ON public.ci_admin_notes (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ci_admin_notes_created_at_idx
  ON public.ci_admin_notes (created_at DESC);

COMMENT ON TABLE public.ci_admin_notes IS
  'Internal JahKnowsPR notes. RLS denies all client access.';

DROP TRIGGER IF EXISTS ci_admin_notes_updated_at ON public.ci_admin_notes;
CREATE TRIGGER ci_admin_notes_updated_at
  BEFORE UPDATE ON public.ci_admin_notes
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_intelligence_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_health_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_messaging_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_opportunities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_action_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_counsel_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_admin_notes TO authenticated;

GRANT ALL ON public.ci_organizations TO service_role;
GRANT ALL ON public.ci_organization_members TO service_role;
GRANT ALL ON public.ci_intelligence_items TO service_role;
GRANT ALL ON public.ci_health_checks TO service_role;
GRANT ALL ON public.ci_messaging_entries TO service_role;
GRANT ALL ON public.ci_opportunities TO service_role;
GRANT ALL ON public.ci_action_items TO service_role;
GRANT ALL ON public.ci_counsel_requests TO service_role;
GRANT ALL ON public.ci_admin_notes TO service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.ci_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_intelligence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_messaging_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_counsel_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_admin_notes ENABLE ROW LEVEL SECURITY;

-- ---- organizations ----
DROP POLICY IF EXISTS ci_organizations_select ON public.ci_organizations;
CREATE POLICY ci_organizations_select ON public.ci_organizations
  FOR SELECT TO authenticated
  USING (public.can_access_ci_org(id, auth.uid()));

DROP POLICY IF EXISTS ci_organizations_insert ON public.ci_organizations;
CREATE POLICY ci_organizations_insert ON public.ci_organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_organizations_update ON public.ci_organizations;
CREATE POLICY ci_organizations_update ON public.ci_organizations
  FOR UPDATE TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_organizations_delete ON public.ci_organizations;
CREATE POLICY ci_organizations_delete ON public.ci_organizations
  FOR DELETE TO authenticated
  USING (public.is_ci_admin(auth.uid()));

-- ---- members (invite management is admin-only; users may read own rows) ----
DROP POLICY IF EXISTS ci_organization_members_select ON public.ci_organization_members;
CREATE POLICY ci_organization_members_select ON public.ci_organization_members
  FOR SELECT TO authenticated
  USING (
    public.is_ci_admin(auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS ci_organization_members_insert ON public.ci_organization_members;
CREATE POLICY ci_organization_members_insert ON public.ci_organization_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_organization_members_update ON public.ci_organization_members;
CREATE POLICY ci_organization_members_update ON public.ci_organization_members
  FOR UPDATE TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_organization_members_delete ON public.ci_organization_members;
CREATE POLICY ci_organization_members_delete ON public.ci_organization_members
  FOR DELETE TO authenticated
  USING (public.is_ci_admin(auth.uid()));

-- ---- intelligence items (admin write; members read) ----
DROP POLICY IF EXISTS ci_intelligence_items_select ON public.ci_intelligence_items;
CREATE POLICY ci_intelligence_items_select ON public.ci_intelligence_items
  FOR SELECT TO authenticated
  USING (public.can_access_ci_org(organization_id, auth.uid()));

DROP POLICY IF EXISTS ci_intelligence_items_insert ON public.ci_intelligence_items;
CREATE POLICY ci_intelligence_items_insert ON public.ci_intelligence_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_intelligence_items_update ON public.ci_intelligence_items;
CREATE POLICY ci_intelligence_items_update ON public.ci_intelligence_items
  FOR UPDATE TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_intelligence_items_delete ON public.ci_intelligence_items;
CREATE POLICY ci_intelligence_items_delete ON public.ci_intelligence_items
  FOR DELETE TO authenticated
  USING (public.is_ci_admin(auth.uid()));

-- ---- health checks ----
DROP POLICY IF EXISTS ci_health_checks_select ON public.ci_health_checks;
CREATE POLICY ci_health_checks_select ON public.ci_health_checks
  FOR SELECT TO authenticated
  USING (public.can_access_ci_org(organization_id, auth.uid()));

DROP POLICY IF EXISTS ci_health_checks_insert ON public.ci_health_checks;
CREATE POLICY ci_health_checks_insert ON public.ci_health_checks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_health_checks_update ON public.ci_health_checks;
CREATE POLICY ci_health_checks_update ON public.ci_health_checks
  FOR UPDATE TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_health_checks_delete ON public.ci_health_checks;
CREATE POLICY ci_health_checks_delete ON public.ci_health_checks
  FOR DELETE TO authenticated
  USING (public.is_ci_admin(auth.uid()));

-- ---- messaging ----
DROP POLICY IF EXISTS ci_messaging_entries_select ON public.ci_messaging_entries;
CREATE POLICY ci_messaging_entries_select ON public.ci_messaging_entries
  FOR SELECT TO authenticated
  USING (
    public.is_ci_admin(auth.uid())
    OR (
      public.is_ci_org_member(organization_id, auth.uid())
      AND is_published = true
    )
  );

DROP POLICY IF EXISTS ci_messaging_entries_insert ON public.ci_messaging_entries;
CREATE POLICY ci_messaging_entries_insert ON public.ci_messaging_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_messaging_entries_update ON public.ci_messaging_entries;
CREATE POLICY ci_messaging_entries_update ON public.ci_messaging_entries
  FOR UPDATE TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_messaging_entries_delete ON public.ci_messaging_entries;
CREATE POLICY ci_messaging_entries_delete ON public.ci_messaging_entries
  FOR DELETE TO authenticated
  USING (public.is_ci_admin(auth.uid()));

-- ---- opportunities ----
DROP POLICY IF EXISTS ci_opportunities_select ON public.ci_opportunities;
CREATE POLICY ci_opportunities_select ON public.ci_opportunities
  FOR SELECT TO authenticated
  USING (public.can_access_ci_org(organization_id, auth.uid()));

DROP POLICY IF EXISTS ci_opportunities_insert ON public.ci_opportunities;
CREATE POLICY ci_opportunities_insert ON public.ci_opportunities
  FOR INSERT TO authenticated
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_opportunities_update ON public.ci_opportunities;
CREATE POLICY ci_opportunities_update ON public.ci_opportunities
  FOR UPDATE TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_opportunities_delete ON public.ci_opportunities;
CREATE POLICY ci_opportunities_delete ON public.ci_opportunities
  FOR DELETE TO authenticated
  USING (public.is_ci_admin(auth.uid()));

-- ---- action items (members may UPDATE status; guarded by trigger) ----
DROP POLICY IF EXISTS ci_action_items_select ON public.ci_action_items;
CREATE POLICY ci_action_items_select ON public.ci_action_items
  FOR SELECT TO authenticated
  USING (public.can_access_ci_org(organization_id, auth.uid()));

DROP POLICY IF EXISTS ci_action_items_insert ON public.ci_action_items;
CREATE POLICY ci_action_items_insert ON public.ci_action_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_action_items_update ON public.ci_action_items;
CREATE POLICY ci_action_items_update ON public.ci_action_items
  FOR UPDATE TO authenticated
  USING (public.can_access_ci_org(organization_id, auth.uid()))
  WITH CHECK (public.can_access_ci_org(organization_id, auth.uid()));

DROP POLICY IF EXISTS ci_action_items_delete ON public.ci_action_items;
CREATE POLICY ci_action_items_delete ON public.ci_action_items
  FOR DELETE TO authenticated
  USING (public.is_ci_admin(auth.uid()));

-- ---- counsel requests ----
DROP POLICY IF EXISTS ci_counsel_requests_select ON public.ci_counsel_requests;
CREATE POLICY ci_counsel_requests_select ON public.ci_counsel_requests
  FOR SELECT TO authenticated
  USING (public.can_access_ci_org(organization_id, auth.uid()));

DROP POLICY IF EXISTS ci_counsel_requests_insert ON public.ci_counsel_requests;
CREATE POLICY ci_counsel_requests_insert ON public.ci_counsel_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ci_admin(auth.uid())
    OR (
      public.is_ci_org_member(organization_id, auth.uid())
      AND submitted_by = auth.uid()
      AND status = 'submitted'
      AND response IS NULL
      AND responded_by IS NULL
      AND responded_at IS NULL
    )
  );

DROP POLICY IF EXISTS ci_counsel_requests_update ON public.ci_counsel_requests;
CREATE POLICY ci_counsel_requests_update ON public.ci_counsel_requests
  FOR UPDATE TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_counsel_requests_delete ON public.ci_counsel_requests;
CREATE POLICY ci_counsel_requests_delete ON public.ci_counsel_requests
  FOR DELETE TO authenticated
  USING (public.is_ci_admin(auth.uid()));

-- ---- admin notes (NO client policies) ----
DROP POLICY IF EXISTS ci_admin_notes_select ON public.ci_admin_notes;
CREATE POLICY ci_admin_notes_select ON public.ci_admin_notes
  FOR SELECT TO authenticated
  USING (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_admin_notes_insert ON public.ci_admin_notes;
CREATE POLICY ci_admin_notes_insert ON public.ci_admin_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ci_admin(auth.uid())
    AND (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS ci_admin_notes_update ON public.ci_admin_notes;
CREATE POLICY ci_admin_notes_update ON public.ci_admin_notes
  FOR UPDATE TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_admin_notes_delete ON public.ci_admin_notes;
CREATE POLICY ci_admin_notes_delete ON public.ci_admin_notes
  FOR DELETE TO authenticated
  USING (public.is_ci_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage: counsel attachments
-- Path convention: {organization_id}/{request_id_or_upload_id}/{filename}
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ci-counsel-attachments',
  'ci-counsel-attachments',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/heic',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.ci_storage_org_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  folder text;
  org uuid;
BEGIN
  folder := (storage.foldername(object_name))[1];
  IF folder IS NULL OR folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  org := folder::uuid;
  RETURN org;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.ci_storage_org_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ci_storage_org_id(text) TO authenticated;

DROP POLICY IF EXISTS "CI admin read counsel attachments" ON storage.objects;
CREATE POLICY "CI admin read counsel attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ci-counsel-attachments'
  AND public.is_ci_admin(auth.uid())
);

DROP POLICY IF EXISTS "CI member read counsel attachments" ON storage.objects;
CREATE POLICY "CI member read counsel attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ci-counsel-attachments'
  AND public.is_ci_org_member(public.ci_storage_org_id(name), auth.uid())
);

DROP POLICY IF EXISTS "CI admin upload counsel attachments" ON storage.objects;
CREATE POLICY "CI admin upload counsel attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ci-counsel-attachments'
  AND public.is_ci_admin(auth.uid())
);

DROP POLICY IF EXISTS "CI member upload counsel attachments" ON storage.objects;
CREATE POLICY "CI member upload counsel attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ci-counsel-attachments'
  AND public.is_ci_org_member(public.ci_storage_org_id(name), auth.uid())
);

DROP POLICY IF EXISTS "CI admin update counsel attachments" ON storage.objects;
CREATE POLICY "CI admin update counsel attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'ci-counsel-attachments'
  AND public.is_ci_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'ci-counsel-attachments'
  AND public.is_ci_admin(auth.uid())
);

DROP POLICY IF EXISTS "CI admin delete counsel attachments" ON storage.objects;
CREATE POLICY "CI admin delete counsel attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ci-counsel-attachments'
  AND public.is_ci_admin(auth.uid())
);

DROP POLICY IF EXISTS "CI member delete own counsel attachments" ON storage.objects;
CREATE POLICY "CI member delete own counsel attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ci-counsel-attachments'
  AND owner = auth.uid()
  AND public.is_ci_org_member(public.ci_storage_org_id(name), auth.uid())
);
