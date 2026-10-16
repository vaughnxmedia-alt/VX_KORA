-- JahKnowsPR HQ — Client Journey Management
-- Additive. Does not rewrite hq_leads, hq_clients, hq_tasks, or hq_activity_log.
-- Engagement stages and tasks are copied from a template version at open time.
-- Later template versions do not change engagements already opened.
-- Prerequisite: 20261002180000_jahknowspr_hq_v1.sql

DO $$
BEGIN
  IF to_regclass('public.hq_clients') IS NULL THEN
    RAISE EXCEPTION 'Client journeys require hq_clients. Apply JahKnowsPR HQ V1 first.';
  END IF;
  IF to_regprocedure('public.is_hq_staff(uuid)') IS NULL
     OR to_regprocedure('public.get_hq_role(uuid)') IS NULL
     OR to_regprocedure('public.hq_log_activity(text, text, uuid, text, jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Client journeys require HQ helper functions. Apply JahKnowsPR HQ V1 first.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Helpers that do not depend on the new tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hq_is_journey_manager(p_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.get_hq_role(p_uid) IN ('owner', 'strategist')
    OR public.get_user_role(p_uid) = 'admin',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.hq_is_journey_approver(p_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.get_hq_role(p_uid) = 'owner'
    OR public.get_user_role(p_uid) = 'admin',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.hq_uuid_or_null(p_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RETURN NULL;
  END IF;
  RETURN btrim(p_value)::uuid;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_block_history_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Historical records cannot be edited or deleted';
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_prevent_client_delete_with_engagements()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.hq_engagements e WHERE e.client_id = OLD.id) THEN
    RAISE EXCEPTION 'This client has engagements and cannot be deleted. Archive the client instead.';
  END IF;
  RETURN OLD;
END;
$$;

-- ---------------------------------------------------------------------------
-- Versioned templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_journey_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL
    CHECK (service_key IN ('session', 'project', 'counsel')),
  version integer NOT NULL CHECK (version > 0),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_key, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS hq_journey_templates_one_active_idx
  ON public.hq_journey_templates (service_key)
  WHERE is_active;

CREATE TABLE IF NOT EXISTS public.hq_journey_template_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.hq_journey_templates (id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  name text NOT NULL,
  description text,
  requires_approval boolean NOT NULL DEFAULT false,
  UNIQUE (template_id, position)
);

CREATE TABLE IF NOT EXISTS public.hq_journey_template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.hq_journey_template_stages (id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL,
  description text,
  is_milestone boolean NOT NULL DEFAULT false,
  is_deliverable boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT false,
  relative_due_days integer,
  UNIQUE (stage_id, position)
);

-- ---------------------------------------------------------------------------
-- Engagements (many per client). Stages and tasks are copies.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.hq_clients (id) ON DELETE RESTRICT,
  template_id uuid REFERENCES public.hq_journey_templates (id) ON DELETE RESTRICT,
  service_key text NOT NULL
    CHECK (service_key IN ('session', 'project', 'counsel')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN (
      'not_started', 'in_progress', 'awaiting_client', 'internal_review',
      'blocked', 'completed', 'on_hold', 'cancelled'
    )),
  owner_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  start_date date,
  target_end_date date,
  follow_up_date date,
  current_stage_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_engagements_client_idx ON public.hq_engagements (client_id);
CREATE INDEX IF NOT EXISTS hq_engagements_owner_idx ON public.hq_engagements (owner_id);
CREATE INDEX IF NOT EXISTS hq_engagements_status_idx ON public.hq_engagements (status);
CREATE INDEX IF NOT EXISTS hq_engagements_service_idx ON public.hq_engagements (service_key);
CREATE INDEX IF NOT EXISTS hq_engagements_follow_up_idx ON public.hq_engagements (follow_up_date);

CREATE TABLE IF NOT EXISTS public.hq_engagement_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.hq_engagements (id) ON DELETE CASCADE,
  source_template_stage_id uuid REFERENCES public.hq_journey_template_stages (id) ON DELETE SET NULL,
  position integer NOT NULL CHECK (position > 0),
  name text NOT NULL,
  description text,
  requires_approval boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN (
      'not_started', 'in_progress', 'awaiting_client', 'internal_review',
      'blocked', 'completed', 'on_hold', 'cancelled'
    )),
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, position)
);

CREATE INDEX IF NOT EXISTS hq_engagement_stages_engagement_idx
  ON public.hq_engagement_stages (engagement_id, position);

ALTER TABLE public.hq_engagements
  DROP CONSTRAINT IF EXISTS hq_engagements_current_stage_id_fkey;
ALTER TABLE public.hq_engagements
  ADD CONSTRAINT hq_engagements_current_stage_id_fkey
  FOREIGN KEY (current_stage_id) REFERENCES public.hq_engagement_stages (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.hq_engagement_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.hq_engagements (id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.hq_engagement_stages (id) ON DELETE CASCADE,
  source_template_task_id uuid REFERENCES public.hq_journey_template_tasks (id) ON DELETE SET NULL,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN (
      'not_started', 'in_progress', 'awaiting_client', 'internal_review',
      'blocked', 'completed', 'on_hold', 'cancelled'
    )),
  assignee_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  due_date date,
  is_milestone boolean NOT NULL DEFAULT false,
  is_deliverable boolean NOT NULL DEFAULT false,
  requires_approval boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'not_required'
    CHECK (approval_status IN ('not_required', 'pending', 'approved', 'changes_requested')),
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_engagement_tasks_engagement_idx
  ON public.hq_engagement_tasks (engagement_id, position);
CREATE INDEX IF NOT EXISTS hq_engagement_tasks_stage_idx
  ON public.hq_engagement_tasks (stage_id, position);
CREATE INDEX IF NOT EXISTS hq_engagement_tasks_assignee_idx
  ON public.hq_engagement_tasks (assignee_id);
CREATE INDEX IF NOT EXISTS hq_engagement_tasks_due_idx
  ON public.hq_engagement_tasks (due_date);

CREATE TABLE IF NOT EXISTS public.hq_engagement_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.hq_engagements (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  assignment_role text NOT NULL DEFAULT 'contributor'
    CHECK (assignment_role IN ('lead', 'contributor')),
  assigned_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.hq_engagement_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.hq_engagements (id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.hq_engagement_tasks (id) ON DELETE SET NULL,
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'note'
    CHECK (kind IN ('meeting', 'decision', 'next_step', 'note')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_engagement_notes_engagement_idx
  ON public.hq_engagement_notes (engagement_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.hq_engagement_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.hq_clients (id) ON DELETE RESTRICT,
  engagement_id uuid REFERENCES public.hq_engagements (id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'note'
    CHECK (channel IN ('email', 'call', 'meeting', 'message')),
  subject text,
  body text NOT NULL,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_engagement_communications_client_idx
  ON public.hq_engagement_communications (client_id, occurred_on DESC);

CREATE TABLE IF NOT EXISTS public.hq_engagement_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.hq_engagements (id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.hq_engagement_tasks (id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_engagement_documents_engagement_idx
  ON public.hq_engagement_documents (engagement_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Access helper (security definer so policies do not recurse)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hq_can_access_engagement(p_engagement_id uuid, p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    p_engagement_id IS NOT NULL
    AND p_uid IS NOT NULL
    AND (
      public.hq_is_journey_manager(p_uid)
      OR EXISTS (
        SELECT 1 FROM public.hq_engagements e
        WHERE e.id = p_engagement_id AND e.owner_id = p_uid
      )
      OR EXISTS (
        SELECT 1 FROM public.hq_engagement_assignments a
        WHERE a.engagement_id = p_engagement_id AND a.user_id = p_uid
      )
      OR EXISTS (
        SELECT 1 FROM public.hq_engagement_tasks t
        WHERE t.engagement_id = p_engagement_id AND t.assignee_id = p_uid
      )
    ),
    false
  );
$$;

DROP TRIGGER IF EXISTS hq_engagements_updated_at ON public.hq_engagements;
CREATE TRIGGER hq_engagements_updated_at
  BEFORE UPDATE ON public.hq_engagements
  FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();

DROP TRIGGER IF EXISTS hq_engagement_stages_updated_at ON public.hq_engagement_stages;
CREATE TRIGGER hq_engagement_stages_updated_at
  BEFORE UPDATE ON public.hq_engagement_stages
  FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();

DROP TRIGGER IF EXISTS hq_engagement_tasks_updated_at ON public.hq_engagement_tasks;
CREATE TRIGGER hq_engagement_tasks_updated_at
  BEFORE UPDATE ON public.hq_engagement_tasks
  FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();

DROP TRIGGER IF EXISTS hq_clients_keep_engagement_history ON public.hq_clients;
CREATE TRIGGER hq_clients_keep_engagement_history
  BEFORE DELETE ON public.hq_clients
  FOR EACH ROW EXECUTE FUNCTION public.hq_prevent_client_delete_with_engagements();

DROP TRIGGER IF EXISTS hq_activity_log_block_history ON public.hq_activity_log;
CREATE TRIGGER hq_activity_log_block_history
  BEFORE UPDATE OR DELETE ON public.hq_activity_log
  FOR EACH ROW EXECUTE FUNCTION public.hq_block_history_change();

DROP TRIGGER IF EXISTS hq_engagement_notes_block_history ON public.hq_engagement_notes;
CREATE TRIGGER hq_engagement_notes_block_history
  BEFORE UPDATE OR DELETE ON public.hq_engagement_notes
  FOR EACH ROW EXECUTE FUNCTION public.hq_block_history_change();

DROP TRIGGER IF EXISTS hq_engagement_communications_block_history ON public.hq_engagement_communications;
CREATE TRIGGER hq_engagement_communications_block_history
  BEFORE UPDATE OR DELETE ON public.hq_engagement_communications
  FOR EACH ROW EXECUTE FUNCTION public.hq_block_history_change();

-- ---------------------------------------------------------------------------
-- Workflow functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hq_list_staff()
RETURNS TABLE (id uuid, full_name text, hq_role text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_hq_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.hq_role
  FROM public.profiles p
  WHERE p.hq_role IN ('owner', 'strategist', 'creative', 'intern')
     OR public.get_user_role(p.id) = 'admin'
  ORDER BY p.full_name NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_open_engagement(
  p_client_id uuid,
  p_template_id uuid,
  p_owner_id uuid,
  p_title text,
  p_start_date date,
  p_target_end_date date,
  p_follow_up_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tpl public.hq_journey_templates%ROWTYPE;
  v_stage public.hq_journey_template_stages%ROWTYPE;
  v_task public.hq_journey_template_tasks%ROWTYPE;
  v_id uuid;
  v_stage_id uuid;
  v_first_stage uuid;
  v_status text;
  v_title text;
BEGIN
  IF NOT public.hq_is_journey_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can open an engagement';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.hq_clients c WHERE c.id = p_client_id) THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
  IF p_owner_id IS NULL OR NOT public.is_hq_staff(p_owner_id) THEN
    RAISE EXCEPTION 'Choose an HQ employee to own this engagement';
  END IF;

  SELECT * INTO v_tpl
  FROM public.hq_journey_templates
  WHERE id = p_template_id AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Choose an active service template';
  END IF;

  v_status := CASE
    WHEN p_start_date IS NULL OR p_start_date <= CURRENT_DATE THEN 'in_progress'
    ELSE 'not_started'
  END;
  v_title := COALESCE(NULLIF(btrim(p_title), ''), v_tpl.name);

  INSERT INTO public.hq_engagements (
    client_id, template_id, service_key, title, status, owner_id,
    start_date, target_end_date, follow_up_date, created_by
  ) VALUES (
    p_client_id, v_tpl.id, v_tpl.service_key, v_title, v_status, p_owner_id,
    p_start_date, p_target_end_date, p_follow_up_date, auth.uid()
  ) RETURNING id INTO v_id;

  FOR v_stage IN
    SELECT * FROM public.hq_journey_template_stages
    WHERE template_id = v_tpl.id
    ORDER BY position
  LOOP
    INSERT INTO public.hq_engagement_stages (
      engagement_id, source_template_stage_id, position, name, description,
      requires_approval, status
    ) VALUES (
      v_id, v_stage.id, v_stage.position, v_stage.name, v_stage.description,
      v_stage.requires_approval,
      CASE WHEN v_first_stage IS NULL AND v_status = 'in_progress' THEN 'in_progress' ELSE 'not_started' END
    ) RETURNING id INTO v_stage_id;

    IF v_first_stage IS NULL THEN
      v_first_stage := v_stage_id;
    END IF;

    FOR v_task IN
      SELECT * FROM public.hq_journey_template_tasks
      WHERE stage_id = v_stage.id
      ORDER BY position
    LOOP
      INSERT INTO public.hq_engagement_tasks (
        engagement_id, stage_id, source_template_task_id, position, title, description,
        status, assignee_id, due_date, is_milestone, is_deliverable, requires_approval,
        approval_status, created_by
      ) VALUES (
        v_id,
        v_stage_id,
        v_task.id,
        v_task.position,
        v_task.title,
        v_task.description,
        'not_started',
        p_owner_id,
        CASE
          WHEN p_start_date IS NOT NULL AND v_task.relative_due_days IS NOT NULL
            THEN p_start_date + v_task.relative_due_days
          ELSE NULL
        END,
        v_task.is_milestone,
        v_task.is_deliverable,
        v_task.requires_approval,
        'not_required',
        auth.uid()
      );
    END LOOP;
  END LOOP;

  IF v_first_stage IS NULL THEN
    RAISE EXCEPTION 'Template has no stages';
  END IF;

  UPDATE public.hq_engagements
  SET current_stage_id = v_first_stage
  WHERE id = v_id;

  INSERT INTO public.hq_engagement_assignments (engagement_id, user_id, assignment_role, assigned_by)
  VALUES (v_id, p_owner_id, 'lead', auth.uid())
  ON CONFLICT (engagement_id, user_id) DO UPDATE
  SET assignment_role = 'lead';

  PERFORM public.hq_log_activity(
    'engagement_opened',
    'engagement',
    v_id,
    'Opened engagement: ' || v_title,
    jsonb_build_object(
      'engagement_id', v_id,
      'client_id', p_client_id,
      'template_id', v_tpl.id,
      'template_version', v_tpl.version,
      'service_key', v_tpl.service_key
    )
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_set_engagement_status(p_engagement_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hq_engagements%ROWTYPE;
BEGIN
  IF p_status NOT IN (
    'not_started', 'in_progress', 'awaiting_client', 'internal_review',
    'blocked', 'completed', 'on_hold', 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Unknown engagement status';
  END IF;
  IF NOT public.hq_is_journey_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can change engagement status';
  END IF;
  IF p_status = 'completed' AND NOT public.hq_is_journey_approver(auth.uid()) THEN
    RAISE EXCEPTION 'Only an owner can mark an engagement completed directly';
  END IF;

  SELECT * INTO v_row FROM public.hq_engagements WHERE id = p_engagement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Engagement not found';
  END IF;

  UPDATE public.hq_engagements SET status = p_status WHERE id = p_engagement_id;

  PERFORM public.hq_log_activity(
    'engagement_status',
    'engagement',
    p_engagement_id,
    'Engagement status: ' || v_row.status || ' → ' || p_status,
    jsonb_build_object('engagement_id', p_engagement_id, 'from', v_row.status, 'to', p_status)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_reassign_engagement(p_engagement_id uuid, p_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.hq_is_journey_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can reassign an engagement';
  END IF;
  IF p_owner_id IS NULL OR NOT public.is_hq_staff(p_owner_id) THEN
    RAISE EXCEPTION 'Choose an HQ employee';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.hq_engagements WHERE id = p_engagement_id) THEN
    RAISE EXCEPTION 'Engagement not found';
  END IF;

  UPDATE public.hq_engagements SET owner_id = p_owner_id WHERE id = p_engagement_id;
  UPDATE public.hq_engagement_assignments
  SET assignment_role = 'contributor'
  WHERE engagement_id = p_engagement_id AND assignment_role = 'lead' AND user_id <> p_owner_id;

  INSERT INTO public.hq_engagement_assignments (engagement_id, user_id, assignment_role, assigned_by)
  VALUES (p_engagement_id, p_owner_id, 'lead', auth.uid())
  ON CONFLICT (engagement_id, user_id) DO UPDATE
  SET assignment_role = 'lead', assigned_by = auth.uid(), assigned_at = now();

  PERFORM public.hq_log_activity(
    'engagement_reassigned',
    'engagement',
    p_engagement_id,
    'Reassigned engagement',
    jsonb_build_object('engagement_id', p_engagement_id, 'owner_id', p_owner_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_set_task_status(p_task_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.hq_engagement_tasks%ROWTYPE;
BEGIN
  IF p_status NOT IN (
    'not_started', 'in_progress', 'awaiting_client', 'internal_review',
    'blocked', 'completed', 'on_hold', 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Unknown task status';
  END IF;

  SELECT * INTO v_task FROM public.hq_engagement_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF NOT public.hq_can_access_engagement(v_task.engagement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_status = 'cancelled' AND NOT public.hq_is_journey_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can cancel a task';
  END IF;
  IF p_status = 'completed' AND v_task.requires_approval AND v_task.approval_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'This deliverable must be approved before it can be completed';
  END IF;

  UPDATE public.hq_engagement_tasks
  SET
    status = p_status,
    completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE completed_at END
  WHERE id = p_task_id;

  PERFORM public.hq_log_activity(
    'task_status',
    'engagement_task',
    p_task_id,
    'Task "' || v_task.title || '": ' || v_task.status || ' → ' || p_status,
    jsonb_build_object(
      'engagement_id', v_task.engagement_id,
      'task_id', p_task_id,
      'from', v_task.status,
      'to', p_status
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_submit_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.hq_engagement_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM public.hq_engagement_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF NOT public.hq_can_access_engagement(v_task.engagement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT v_task.requires_approval THEN
    RAISE EXCEPTION 'This task does not require approval';
  END IF;

  UPDATE public.hq_engagement_tasks
  SET status = 'internal_review', approval_status = 'pending'
  WHERE id = p_task_id;

  PERFORM public.hq_log_activity(
    'task_submitted',
    'engagement_task',
    p_task_id,
    'Submitted for approval: ' || v_task.title,
    jsonb_build_object('engagement_id', v_task.engagement_id, 'task_id', p_task_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_review_task(p_task_id uuid, p_decision text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.hq_engagement_tasks%ROWTYPE;
BEGIN
  IF p_decision NOT IN ('approved', 'changes_requested') THEN
    RAISE EXCEPTION 'Unknown review decision';
  END IF;
  IF NOT public.hq_is_journey_approver(auth.uid()) THEN
    RAISE EXCEPTION 'Only an owner can approve deliverables';
  END IF;

  SELECT * INTO v_task FROM public.hq_engagement_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF v_task.approval_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'This deliverable is not waiting for review';
  END IF;

  IF p_decision = 'approved' THEN
    UPDATE public.hq_engagement_tasks
    SET
      approval_status = 'approved',
      status = 'completed',
      approved_by = auth.uid(),
      approved_at = now(),
      completed_at = now()
    WHERE id = p_task_id;
  ELSE
    UPDATE public.hq_engagement_tasks
    SET approval_status = 'changes_requested', status = 'in_progress'
    WHERE id = p_task_id;
  END IF;

  PERFORM public.hq_log_activity(
    'task_reviewed',
    'engagement_task',
    p_task_id,
    CASE WHEN p_decision = 'approved' THEN 'Approved: ' ELSE 'Changes requested: ' END || v_task.title,
    jsonb_build_object(
      'engagement_id', v_task.engagement_id,
      'task_id', p_task_id,
      'decision', p_decision
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_approve_stage(p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage public.hq_engagement_stages%ROWTYPE;
  v_current uuid;
BEGIN
  IF NOT public.hq_is_journey_approver(auth.uid()) THEN
    RAISE EXCEPTION 'Only an owner can approve a stage';
  END IF;

  SELECT * INTO v_stage FROM public.hq_engagement_stages WHERE id = p_stage_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stage not found';
  END IF;
  IF NOT v_stage.requires_approval THEN
    RAISE EXCEPTION 'This stage does not require approval';
  END IF;

  SELECT current_stage_id INTO v_current FROM public.hq_engagements WHERE id = v_stage.engagement_id;
  IF v_current IS DISTINCT FROM p_stage_id THEN
    RAISE EXCEPTION 'Only the current stage can be approved';
  END IF;

  UPDATE public.hq_engagement_stages
  SET approved_by = auth.uid(), approved_at = now(), status = 'internal_review'
  WHERE id = p_stage_id;

  PERFORM public.hq_log_activity(
    'stage_approved',
    'engagement_stage',
    p_stage_id,
    'Approved stage: ' || v_stage.name,
    jsonb_build_object('engagement_id', v_stage.engagement_id, 'stage_id', p_stage_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_advance_stage(p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage public.hq_engagement_stages%ROWTYPE;
  v_engagement public.hq_engagements%ROWTYPE;
  v_next uuid;
BEGIN
  SELECT * INTO v_stage FROM public.hq_engagement_stages WHERE id = p_stage_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stage not found';
  END IF;

  SELECT * INTO v_engagement FROM public.hq_engagements WHERE id = v_stage.engagement_id;
  IF v_engagement.current_stage_id IS DISTINCT FROM p_stage_id THEN
    RAISE EXCEPTION 'Only the current stage can be advanced';
  END IF;
  IF NOT (
    public.hq_is_journey_manager(auth.uid())
    OR v_engagement.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to advance this stage';
  END IF;
  IF v_stage.requires_approval AND v_stage.approved_at IS NULL THEN
    RAISE EXCEPTION 'This stage requires owner approval before it can advance';
  END IF;

  UPDATE public.hq_engagement_stages SET status = 'completed' WHERE id = p_stage_id;

  SELECT s.id INTO v_next
  FROM public.hq_engagement_stages s
  WHERE s.engagement_id = v_stage.engagement_id
    AND s.position > v_stage.position
  ORDER BY s.position
  LIMIT 1;

  IF v_next IS NULL THEN
    UPDATE public.hq_engagements
    SET status = 'completed', current_stage_id = p_stage_id
    WHERE id = v_stage.engagement_id;
  ELSE
    UPDATE public.hq_engagement_stages SET status = 'in_progress' WHERE id = v_next;
    UPDATE public.hq_engagements
    SET status = 'in_progress', current_stage_id = v_next
    WHERE id = v_stage.engagement_id;
  END IF;

  PERFORM public.hq_log_activity(
    'stage_advanced',
    'engagement_stage',
    p_stage_id,
    'Advanced stage: ' || v_stage.name,
    jsonb_build_object(
      'engagement_id', v_stage.engagement_id,
      'stage_id', p_stage_id,
      'next_stage_id', v_next
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_add_engagement_task(
  p_stage_id uuid,
  p_title text,
  p_description text,
  p_due_date date,
  p_is_milestone boolean,
  p_is_deliverable boolean,
  p_requires_approval boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage public.hq_engagement_stages%ROWTYPE;
  v_id uuid;
  v_pos integer;
BEGIN
  IF NOT public.hq_is_journey_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can customize a journey';
  END IF;
  IF NULLIF(btrim(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'Task title is required';
  END IF;

  SELECT * INTO v_stage FROM public.hq_engagement_stages WHERE id = p_stage_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stage not found';
  END IF;

  SELECT COALESCE(MAX(position), 0) + 1 INTO v_pos
  FROM public.hq_engagement_tasks
  WHERE stage_id = p_stage_id;

  INSERT INTO public.hq_engagement_tasks (
    engagement_id, stage_id, position, title, description, due_date,
    is_milestone, is_deliverable, requires_approval, approval_status,
    assignee_id, created_by
  ) VALUES (
    v_stage.engagement_id, p_stage_id, v_pos, btrim(p_title), NULLIF(btrim(p_description), ''),
    p_due_date, COALESCE(p_is_milestone, false), COALESCE(p_is_deliverable, false),
    COALESCE(p_requires_approval, false), 'not_required',
    (SELECT owner_id FROM public.hq_engagements WHERE id = v_stage.engagement_id),
    auth.uid()
  ) RETURNING id INTO v_id;

  PERFORM public.hq_log_activity(
    'task_added',
    'engagement_task',
    v_id,
    'Added task: ' || btrim(p_title),
    jsonb_build_object('engagement_id', v_stage.engagement_id, 'stage_id', p_stage_id, 'task_id', v_id)
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_assign_task(p_task_id uuid, p_assignee_id uuid, p_due_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.hq_engagement_tasks%ROWTYPE;
BEGIN
  IF NOT public.hq_is_journey_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can reassign task work';
  END IF;
  IF p_assignee_id IS NOT NULL AND NOT public.is_hq_staff(p_assignee_id) THEN
    RAISE EXCEPTION 'Choose an HQ employee';
  END IF;

  SELECT * INTO v_task FROM public.hq_engagement_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  UPDATE public.hq_engagement_tasks
  SET assignee_id = p_assignee_id, due_date = p_due_date
  WHERE id = p_task_id;

  IF p_assignee_id IS NOT NULL THEN
    INSERT INTO public.hq_engagement_assignments (engagement_id, user_id, assignment_role, assigned_by)
    VALUES (v_task.engagement_id, p_assignee_id, 'contributor', auth.uid())
    ON CONFLICT (engagement_id, user_id) DO NOTHING;
  END IF;

  PERFORM public.hq_log_activity(
    'task_assigned',
    'engagement_task',
    p_task_id,
    'Updated assignment: ' || v_task.title,
    jsonb_build_object(
      'engagement_id', v_task.engagement_id,
      'task_id', p_task_id,
      'assignee_id', p_assignee_id,
      'due_date', p_due_date
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_add_note(
  p_engagement_id uuid,
  p_task_id uuid,
  p_kind text,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_kind NOT IN ('meeting', 'decision', 'next_step', 'note') THEN
    RAISE EXCEPTION 'Unknown note type';
  END IF;
  IF NULLIF(btrim(p_body), '') IS NULL THEN
    RAISE EXCEPTION 'Write a note before saving';
  END IF;
  IF NOT public.hq_can_access_engagement(p_engagement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_task_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.hq_engagement_tasks t
    WHERE t.id = p_task_id AND t.engagement_id = p_engagement_id
  ) THEN
    RAISE EXCEPTION 'Task is not on this engagement';
  END IF;

  INSERT INTO public.hq_engagement_notes (engagement_id, task_id, author_id, kind, body)
  VALUES (p_engagement_id, p_task_id, auth.uid(), p_kind, btrim(p_body))
  RETURNING id INTO v_id;

  PERFORM public.hq_log_activity(
    'note_added',
    'engagement_note',
    v_id,
    'Recorded ' || replace(p_kind, '_', ' '),
    jsonb_build_object('engagement_id', p_engagement_id, 'note_id', v_id, 'kind', p_kind)
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_add_communication(
  p_engagement_id uuid,
  p_channel text,
  p_subject text,
  p_body text,
  p_occurred_on date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
  v_id uuid;
BEGIN
  IF p_channel NOT IN ('email', 'call', 'meeting', 'message') THEN
    RAISE EXCEPTION 'Unknown communication channel';
  END IF;
  IF NULLIF(btrim(p_body), '') IS NULL THEN
    RAISE EXCEPTION 'Write what was communicated';
  END IF;
  IF NOT public.hq_can_access_engagement(p_engagement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT client_id INTO v_client FROM public.hq_engagements WHERE id = p_engagement_id;
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'Engagement not found';
  END IF;

  INSERT INTO public.hq_engagement_communications (
    client_id, engagement_id, author_id, channel, subject, body, occurred_on
  ) VALUES (
    v_client, p_engagement_id, auth.uid(), p_channel,
    NULLIF(btrim(p_subject), ''), btrim(p_body), COALESCE(p_occurred_on, CURRENT_DATE)
  ) RETURNING id INTO v_id;

  PERFORM public.hq_log_activity(
    'communication_logged',
    'engagement_communication',
    v_id,
    'Logged ' || p_channel,
    jsonb_build_object('engagement_id', p_engagement_id, 'client_id', v_client, 'communication_id', v_id)
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_register_document(
  p_engagement_id uuid,
  p_task_id uuid,
  p_file_name text,
  p_storage_path text,
  p_mime_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.hq_can_access_engagement(p_engagement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_storage_path IS NULL OR split_part(p_storage_path, '/', 1) IS DISTINCT FROM p_engagement_id::text THEN
    RAISE EXCEPTION 'Document path must stay inside this engagement';
  END IF;
  IF NULLIF(btrim(p_file_name), '') IS NULL THEN
    RAISE EXCEPTION 'File name is required';
  END IF;
  IF p_task_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.hq_engagement_tasks t
    WHERE t.id = p_task_id AND t.engagement_id = p_engagement_id
  ) THEN
    RAISE EXCEPTION 'Task is not on this engagement';
  END IF;

  INSERT INTO public.hq_engagement_documents (
    engagement_id, task_id, uploaded_by, file_name, storage_path, mime_type
  ) VALUES (
    p_engagement_id, p_task_id, auth.uid(), btrim(p_file_name), p_storage_path, NULLIF(btrim(p_mime_type), '')
  ) RETURNING id INTO v_id;

  PERFORM public.hq_log_activity(
    'document_added',
    'engagement_document',
    v_id,
    'Attached ' || btrim(p_file_name),
    jsonb_build_object('engagement_id', p_engagement_id, 'document_id', v_id, 'task_id', p_task_id)
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_save_template_version(
  p_service_key text,
  p_name text,
  p_description text,
  p_stages jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version integer;
  v_template uuid;
  v_stage jsonb;
  v_task jsonb;
  v_stage_id uuid;
  v_pos integer := 0;
  v_tpos integer;
BEGIN
  IF NOT public.hq_is_journey_approver(auth.uid()) THEN
    RAISE EXCEPTION 'Only an owner can publish journey templates';
  END IF;
  IF p_service_key NOT IN ('session', 'project', 'counsel') THEN
    RAISE EXCEPTION 'Unknown service';
  END IF;
  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Template name is required';
  END IF;
  IF jsonb_typeof(p_stages) IS DISTINCT FROM 'array' OR jsonb_array_length(p_stages) = 0 THEN
    RAISE EXCEPTION 'A template needs at least one stage';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM public.hq_journey_templates
  WHERE service_key = p_service_key;

  UPDATE public.hq_journey_templates
  SET is_active = false
  WHERE service_key = p_service_key AND is_active;

  INSERT INTO public.hq_journey_templates (service_key, version, name, description, is_active, created_by)
  VALUES (p_service_key, v_version, btrim(p_name), NULLIF(btrim(p_description), ''), true, auth.uid())
  RETURNING id INTO v_template;

  FOR v_stage IN SELECT value FROM jsonb_array_elements(p_stages)
  LOOP
    v_pos := v_pos + 1;
    IF NULLIF(btrim(v_stage->>'name'), '') IS NULL THEN
      RAISE EXCEPTION 'Every stage needs a name';
    END IF;
    INSERT INTO public.hq_journey_template_stages (template_id, position, name, description, requires_approval)
    VALUES (
      v_template,
      v_pos,
      btrim(v_stage->>'name'),
      NULLIF(btrim(v_stage->>'description'), ''),
      COALESCE(v_stage->>'requires_approval', 'false')::boolean
    ) RETURNING id INTO v_stage_id;

    v_tpos := 0;
    FOR v_task IN SELECT value FROM jsonb_array_elements(COALESCE(v_stage->'tasks', '[]'::jsonb))
    LOOP
      v_tpos := v_tpos + 1;
      IF NULLIF(btrim(v_task->>'title'), '') IS NULL THEN
        RAISE EXCEPTION 'Every task needs a title';
      END IF;
      INSERT INTO public.hq_journey_template_tasks (
        stage_id, position, title, description, is_milestone, is_deliverable,
        requires_approval, relative_due_days
      ) VALUES (
        v_stage_id,
        v_tpos,
        btrim(v_task->>'title'),
        NULLIF(btrim(v_task->>'description'), ''),
        COALESCE(v_task->>'is_milestone', 'false')::boolean,
        COALESCE(v_task->>'is_deliverable', 'false')::boolean,
        COALESCE(v_task->>'requires_approval', 'false')::boolean,
        NULLIF(v_task->>'relative_due_days', '')::integer
      );
    END LOOP;
  END LOOP;

  PERFORM public.hq_log_activity(
    'template_published',
    'journey_template',
    v_template,
    'Published template ' || btrim(p_name) || ' v' || v_version::text,
    jsonb_build_object('service_key', p_service_key, 'version', v_version)
  );
  RETURN v_template;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_engagement_timeline(p_engagement_id uuid)
RETURNS SETOF public.hq_activity_log
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.hq_can_access_engagement(p_engagement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT a.*
  FROM public.hq_activity_log a
  WHERE a.metadata->>'engagement_id' = p_engagement_id::text
     OR a.entity_id = p_engagement_id
  ORDER BY a.created_at DESC
  LIMIT 100;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.hq_is_journey_manager(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_is_journey_approver(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_uuid_or_null(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_can_access_engagement(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_list_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_open_engagement(uuid, uuid, uuid, text, date, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_set_engagement_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_reassign_engagement(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_set_task_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_submit_task(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_review_task(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_approve_stage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_advance_stage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_add_engagement_task(uuid, text, text, date, boolean, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_assign_task(uuid, uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_add_note(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_add_communication(uuid, text, text, text, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_register_document(uuid, uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_save_template_version(text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_engagement_timeline(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.hq_is_journey_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_is_journey_approver(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_uuid_or_null(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_can_access_engagement(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_list_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_open_engagement(uuid, uuid, uuid, text, date, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_set_engagement_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_reassign_engagement(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_set_task_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_submit_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_review_task(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_approve_stage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_advance_stage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_add_engagement_task(uuid, text, text, date, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_assign_task(uuid, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_add_note(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_add_communication(uuid, text, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_register_document(uuid, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_save_template_version(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_engagement_timeline(uuid) TO authenticated;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hq_journey_templates',
    'hq_journey_template_stages',
    'hq_journey_template_tasks',
    'hq_engagements',
    'hq_engagement_stages',
    'hq_engagement_tasks',
    'hq_engagement_assignments',
    'hq_engagement_notes',
    'hq_engagement_communications',
    'hq_engagement_documents'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Templates: staff can read. Writes go through hq_save_template_version.
DROP POLICY IF EXISTS hq_journey_templates_select ON public.hq_journey_templates;
CREATE POLICY hq_journey_templates_select ON public.hq_journey_templates
  FOR SELECT TO authenticated
  USING (public.is_hq_staff(auth.uid()));

DROP POLICY IF EXISTS hq_journey_template_stages_select ON public.hq_journey_template_stages;
CREATE POLICY hq_journey_template_stages_select ON public.hq_journey_template_stages
  FOR SELECT TO authenticated
  USING (public.is_hq_staff(auth.uid()));

DROP POLICY IF EXISTS hq_journey_template_tasks_select ON public.hq_journey_template_tasks;
CREATE POLICY hq_journey_template_tasks_select ON public.hq_journey_template_tasks
  FOR SELECT TO authenticated
  USING (public.is_hq_staff(auth.uid()));

DROP POLICY IF EXISTS hq_engagements_select ON public.hq_engagements;
CREATE POLICY hq_engagements_select ON public.hq_engagements
  FOR SELECT TO authenticated
  USING (public.hq_can_access_engagement(id, auth.uid()));

DROP POLICY IF EXISTS hq_engagement_stages_select ON public.hq_engagement_stages;
CREATE POLICY hq_engagement_stages_select ON public.hq_engagement_stages
  FOR SELECT TO authenticated
  USING (public.hq_can_access_engagement(engagement_id, auth.uid()));

DROP POLICY IF EXISTS hq_engagement_tasks_select ON public.hq_engagement_tasks;
CREATE POLICY hq_engagement_tasks_select ON public.hq_engagement_tasks
  FOR SELECT TO authenticated
  USING (public.hq_can_access_engagement(engagement_id, auth.uid()));

DROP POLICY IF EXISTS hq_engagement_assignments_select ON public.hq_engagement_assignments;
CREATE POLICY hq_engagement_assignments_select ON public.hq_engagement_assignments
  FOR SELECT TO authenticated
  USING (public.hq_can_access_engagement(engagement_id, auth.uid()));

DROP POLICY IF EXISTS hq_engagement_notes_select ON public.hq_engagement_notes;
CREATE POLICY hq_engagement_notes_select ON public.hq_engagement_notes
  FOR SELECT TO authenticated
  USING (public.hq_can_access_engagement(engagement_id, auth.uid()));

DROP POLICY IF EXISTS hq_engagement_communications_select ON public.hq_engagement_communications;
CREATE POLICY hq_engagement_communications_select ON public.hq_engagement_communications
  FOR SELECT TO authenticated
  USING (
    (
      engagement_id IS NOT NULL
      AND public.hq_can_access_engagement(engagement_id, auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.hq_engagements e
      WHERE e.client_id = hq_engagement_communications.client_id
        AND public.hq_can_access_engagement(e.id, auth.uid())
    )
  );

DROP POLICY IF EXISTS hq_engagement_documents_select ON public.hq_engagement_documents;
CREATE POLICY hq_engagement_documents_select ON public.hq_engagement_documents
  FOR SELECT TO authenticated
  USING (public.hq_can_access_engagement(engagement_id, auth.uid()));

-- No INSERT/UPDATE/DELETE policies. Mutations go through security-definer functions,
-- which enforce approvals. Notes, communications, and the activity log are append-only.

-- Assigned employees can read the client they are working, without seeing every client.
DROP POLICY IF EXISTS hq_clients_select_assigned ON public.hq_clients;
CREATE POLICY hq_clients_select_assigned ON public.hq_clients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hq_engagements e
      WHERE e.client_id = hq_clients.id
        AND public.hq_can_access_engagement(e.id, auth.uid())
    )
  );

-- Activity feed: management sees the firm. Other staff see their own work and engagements they can access.
DROP POLICY IF EXISTS hq_activity_select ON public.hq_activity_log;
CREATE POLICY hq_activity_select ON public.hq_activity_log
  FOR SELECT TO authenticated
  USING (
    public.hq_is_journey_manager(auth.uid())
    OR actor_id = auth.uid()
    OR (
      entity_type = 'task'
      AND EXISTS (
        SELECT 1 FROM public.hq_tasks t
        WHERE t.id = hq_activity_log.entity_id
          AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid())
      )
    )
    OR public.hq_can_access_engagement(public.hq_uuid_or_null(metadata->>'engagement_id'), auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Private document bucket. Path: {engagement_id}/{file}
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hq-engagement-docs',
  'hq-engagement-docs',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "HQ staff read engagement docs" ON storage.objects;
CREATE POLICY "HQ staff read engagement docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'hq-engagement-docs'
  AND public.hq_can_access_engagement(public.hq_uuid_or_null((storage.foldername(name))[1]), auth.uid())
);

DROP POLICY IF EXISTS "HQ staff upload engagement docs" ON storage.objects;
CREATE POLICY "HQ staff upload engagement docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hq-engagement-docs'
  AND public.hq_can_access_engagement(public.hq_uuid_or_null((storage.foldername(name))[1]), auth.uid())
);

-- ---------------------------------------------------------------------------
-- Seed the three service templates (first version only)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_template uuid;
  v_stage uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.hq_journey_templates WHERE service_key = 'session') THEN
    RETURN;
  END IF;

  INSERT INTO public.hq_journey_templates (service_key, version, name, description, is_active)
  VALUES (
    'session', 1, 'Strategic Communications Session',
    'A single advisory session from inquiry through recommendations and follow-up.',
    true
  ) RETURNING id INTO v_template;

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, description, requires_approval)
  VALUES (v_template, 1, 'Inquiry', 'Confirm the request and put the session on the calendar.', false)
  RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, is_milestone, relative_due_days)
  VALUES
    (v_stage, 1, 'Confirm inquiry details', false, 1),
    (v_stage, 2, 'Schedule the session', true, 3);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, description, requires_approval)
  VALUES (v_template, 2, 'Preparation', 'Give the client a way to prepare and review what they send.', false)
  RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, relative_due_days)
  VALUES
    (v_stage, 1, 'Send the preparation brief', 5),
    (v_stage, 2, 'Review client materials', 7);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, description, requires_approval)
  VALUES (v_template, 3, 'Session', 'Hold the session and capture decisions.', false)
  RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, is_milestone, relative_due_days)
  VALUES
    (v_stage, 1, 'Conduct the strategic communications session', true, 10),
    (v_stage, 2, 'Record decisions and next steps', false, 10);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, description, requires_approval)
  VALUES (v_template, 4, 'Recommendations', 'Write the recommendation and have an owner approve it before it goes to the client.', true)
  RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, is_deliverable, requires_approval, relative_due_days)
  VALUES (v_stage, 1, 'Draft session recommendations', true, true, 14);
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, relative_due_days)
  VALUES (v_stage, 2, 'Deliver recommendations to the client', 16);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, description, requires_approval)
  VALUES (v_template, 5, 'Follow-up', 'Close the loop and name any future engagement.', false)
  RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, relative_due_days)
  VALUES
    (v_stage, 1, 'Schedule follow-up', 21),
    (v_stage, 2, 'Identify a future engagement', 21);

  INSERT INTO public.hq_journey_templates (service_key, version, name, description, is_active)
  VALUES (
    'project', 1, 'Strategic Communications + PR Project',
    'A defined project from kickoff through execution, results, and closeout.',
    true
  ) RETURNING id INTO v_template;

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, requires_approval)
  VALUES (v_template, 1, 'Kickoff', false) RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, is_milestone, relative_due_days)
  VALUES
    (v_stage, 1, 'Confirm scope and dates', false, 2),
    (v_stage, 2, 'Hold the kickoff meeting', true, 5);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, requires_approval)
  VALUES (v_template, 2, 'Research', false) RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, relative_due_days)
  VALUES
    (v_stage, 1, 'Landscape and audience review', 12),
    (v_stage, 2, 'Message audit', 14);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, description, requires_approval)
  VALUES (v_template, 3, 'Strategy', 'The strategy does not go to the client until an owner approves it.', true)
  RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks
    (stage_id, position, title, is_deliverable, requires_approval, is_milestone, relative_due_days)
  VALUES
    (v_stage, 1, 'Draft the communications strategy', true, true, false, 21),
    (v_stage, 2, 'Internal strategy review', false, true, true, 23);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, requires_approval)
  VALUES (v_template, 4, 'Execution', false) RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, is_deliverable, relative_due_days)
  VALUES
    (v_stage, 1, 'Build materials', true, 35),
    (v_stage, 2, 'Stakeholder and media outreach', false, 40);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, requires_approval)
  VALUES (v_template, 5, 'Results', true) RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks
    (stage_id, position, title, is_deliverable, requires_approval, relative_due_days)
  VALUES (v_stage, 1, 'Compile the outcome report', true, true, 55);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, requires_approval)
  VALUES (v_template, 6, 'Closeout', false) RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, is_milestone, relative_due_days)
  VALUES
    (v_stage, 1, 'Hold the closeout meeting', true, 60),
    (v_stage, 2, 'Confirm follow-up and future counsel', false, 65);

  INSERT INTO public.hq_journey_templates (service_key, version, name, description, is_active)
  VALUES (
    'counsel', 1, 'Ongoing Strategic Communications Counsel',
    'A retained counsel relationship with a repeating review and a continuation decision.',
    true
  ) RETURNING id INTO v_template;

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, requires_approval)
  VALUES (v_template, 1, 'Onboarding', false) RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, is_deliverable, relative_due_days)
  VALUES
    (v_stage, 1, 'Confirm counsel scope', false, 3),
    (v_stage, 2, 'Baseline communications review', true, 10);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, requires_approval)
  VALUES (v_template, 2, 'Active counsel', false) RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, relative_due_days)
  VALUES
    (v_stage, 1, 'Standing counsel check-in', 30),
    (v_stage, 2, 'Keep the decision log current', 30);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, description, requires_approval)
  VALUES (
    v_template, 3, 'Review',
    'The quarterly review is a milestone and needs owner approval before it is shared.',
    true
  ) RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks
    (stage_id, position, title, is_milestone, is_deliverable, requires_approval, relative_due_days)
  VALUES (v_stage, 1, 'Quarterly communications review', true, true, true, 90);

  INSERT INTO public.hq_journey_template_stages (template_id, position, name, requires_approval)
  VALUES (v_template, 4, 'Continuation', false) RETURNING id INTO v_stage;
  INSERT INTO public.hq_journey_template_tasks (stage_id, position, title, relative_due_days)
  VALUES
    (v_stage, 1, 'Renewal or close conversation', 100),
    (v_stage, 2, 'Set the next follow-up', 100);
END $$;
