-- Journey Template Builder
-- Reuses hq_journey_templates and the engagement snapshot created by hq_open_engagement.
-- Editing a template that already has engagements forks a new version.
-- The previous version stays in place, so open engagements do not change.
-- Templates are archived, not deleted.

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hq_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.hq_services (service_key, name, description)
VALUES
  ('session', 'Strategic Communications Session', 'A defined advisory session.'),
  ('project', 'Strategic Communications + PR Project', 'A project from proposal through closeout.'),
  ('counsel', 'Ongoing Strategic Communications Counsel', 'Retained counsel with review and renewal.')
ON CONFLICT (service_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname, rel.relname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public'
      AND rel.relname IN ('hq_journey_templates', 'hq_engagements')
      AND pg_get_constraintdef(con.oid) ILIKE '%service_key%'
      AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.relname, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.hq_journey_templates
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.hq_services (id),
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE public.hq_journey_templates t
SET service_id = s.id
FROM public.hq_services s
WHERE t.service_id IS NULL AND t.service_key = s.service_key;

UPDATE public.hq_journey_templates
SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END
WHERE status IS NULL;

ALTER TABLE public.hq_journey_templates
  ALTER COLUMN status SET DEFAULT 'inactive';

ALTER TABLE public.hq_journey_templates
  DROP CONSTRAINT IF EXISTS hq_journey_templates_status_check;
ALTER TABLE public.hq_journey_templates
  ADD CONSTRAINT hq_journey_templates_status_check
  CHECK (status IN ('active', 'inactive', 'archived'));

ALTER TABLE public.hq_journey_templates
  DROP CONSTRAINT IF EXISTS hq_journey_templates_service_key_fkey;
ALTER TABLE public.hq_journey_templates
  ADD CONSTRAINT hq_journey_templates_service_key_fkey
  FOREIGN KEY (service_key) REFERENCES public.hq_services (service_key);

ALTER TABLE public.hq_journey_template_stages
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assignment_rule text NOT NULL DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS specific_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.hq_journey_template_stages
  DROP CONSTRAINT IF EXISTS hq_journey_template_stages_assignment_rule_check;
ALTER TABLE public.hq_journey_template_stages
  ADD CONSTRAINT hq_journey_template_stages_assignment_rule_check
  CHECK (assignment_rule IN ('account_lead', 'strategist', 'management', 'specific', 'unassigned'));

ALTER TABLE public.hq_journey_template_tasks
  ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS assignment_rule text NOT NULL DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS specific_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS due_rule jsonb NOT NULL DEFAULT '{"kind":"none"}'::jsonb,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.hq_journey_template_tasks
  DROP CONSTRAINT IF EXISTS hq_journey_template_tasks_task_type_check;
ALTER TABLE public.hq_journey_template_tasks
  ADD CONSTRAINT hq_journey_template_tasks_task_type_check
  CHECK (task_type IN ('internal', 'client', 'meeting', 'deliverable', 'approval', 'follow_up'));

ALTER TABLE public.hq_journey_template_tasks
  DROP CONSTRAINT IF EXISTS hq_journey_template_tasks_assignment_rule_check;
ALTER TABLE public.hq_journey_template_tasks
  ADD CONSTRAINT hq_journey_template_tasks_assignment_rule_check
  CHECK (assignment_rule IN ('account_lead', 'strategist', 'management', 'specific', 'unassigned'));

ALTER TABLE public.hq_engagement_stages
  ADD COLUMN IF NOT EXISTS completion_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assignment_rule text NOT NULL DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS specific_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_response_at timestamptz;

ALTER TABLE public.hq_engagement_tasks
  ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS assignment_rule text NOT NULL DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS specific_user_id uuid,
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS due_rule jsonb NOT NULL DEFAULT '{"kind":"none"}'::jsonb,
  ADD COLUMN IF NOT EXISTS instructions text;

CREATE TABLE IF NOT EXISTS public.hq_journey_template_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.hq_journey_template_stages (id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  name text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  UNIQUE (stage_id, position)
);

CREATE TABLE IF NOT EXISTS public.hq_engagement_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.hq_engagements (id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.hq_engagement_stages (id) ON DELETE CASCADE,
  source_template_deliverable_id uuid REFERENCES public.hq_journey_template_deliverables (id) ON DELETE SET NULL,
  position integer NOT NULL CHECK (position > 0),
  name text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'internal_review', 'approved', 'client_review', 'final')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_engagement_deliverables_stage_idx
  ON public.hq_engagement_deliverables (stage_id, position);

DROP TRIGGER IF EXISTS hq_engagement_deliverables_updated_at ON public.hq_engagement_deliverables;
CREATE TRIGGER hq_engagement_deliverables_updated_at
  BEFORE UPDATE ON public.hq_engagement_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();

CREATE OR REPLACE FUNCTION public.hq_block_template_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.hq_engagements e WHERE e.template_id = OLD.id) THEN
    RAISE EXCEPTION 'This template has been used by a client engagement and cannot be deleted. Archive it instead.';
  END IF;
  RAISE EXCEPTION 'Archive journey templates instead of deleting them.';
END;
$$;

DROP TRIGGER IF EXISTS hq_journey_templates_no_delete ON public.hq_journey_templates;
CREATE TRIGGER hq_journey_templates_no_delete
  BEFORE DELETE ON public.hq_journey_templates
  FOR EACH ROW EXECUTE FUNCTION public.hq_block_template_delete();

-- ---------------------------------------------------------------------------
-- Snapshot copy + completion rules
-- ---------------------------------------------------------------------------
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
  v_deliverable public.hq_journey_template_deliverables%ROWTYPE;
  v_id uuid;
  v_stage_id uuid;
  v_first_stage uuid;
  v_status text;
  v_title text;
  v_pos integer := 0;
  v_task_pos integer;
  v_due date;
  v_amount integer;
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
  WHERE id = p_template_id AND is_active AND status = 'active';
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
    WHERE template_id = v_tpl.id AND archived_at IS NULL
    ORDER BY position
  LOOP
    v_pos := v_pos + 1;
    INSERT INTO public.hq_engagement_stages (
      engagement_id, source_template_stage_id, position, name, description,
      requires_approval, status, completion_rules, assignment_rule, specific_user_id
    ) VALUES (
      v_id,
      v_stage.id,
      v_pos,
      v_stage.name,
      v_stage.description,
      v_stage.requires_approval OR COALESCE(v_stage.completion_rules, '[]'::jsonb) @> '["management_approval"]'::jsonb,
      CASE WHEN v_first_stage IS NULL AND v_status = 'in_progress' THEN 'in_progress' ELSE 'not_started' END,
      COALESCE(v_stage.completion_rules, '[]'::jsonb),
      v_stage.assignment_rule,
      CASE WHEN v_stage.assignment_rule = 'specific' THEN v_stage.specific_user_id ELSE NULL END
    ) RETURNING id INTO v_stage_id;

    IF v_first_stage IS NULL THEN
      v_first_stage := v_stage_id;
    END IF;

    v_task_pos := 0;
    FOR v_task IN
      SELECT * FROM public.hq_journey_template_tasks
      WHERE stage_id = v_stage.id AND archived_at IS NULL
      ORDER BY position
    LOOP
      v_task_pos := v_task_pos + 1;
      v_amount := NULLIF(v_task.due_rule->>'amount', '')::integer;
      v_due := CASE
        WHEN p_start_date IS NOT NULL AND v_task.due_rule->>'kind' = 'same_day' THEN p_start_date
        WHEN p_start_date IS NOT NULL AND v_task.due_rule->>'kind' = 'days_after_stage' AND v_amount IS NOT NULL
          THEN p_start_date + v_amount
        WHEN p_start_date IS NOT NULL AND v_task.relative_due_days IS NOT NULL
          THEN p_start_date + v_task.relative_due_days
        ELSE NULL
      END;

      INSERT INTO public.hq_engagement_tasks (
        engagement_id, stage_id, source_template_task_id, position, title, description,
        status, assignee_id, due_date, is_milestone, is_deliverable, requires_approval,
        approval_status, created_by, task_type, assignment_rule, specific_user_id,
        is_required, due_rule, instructions
      ) VALUES (
        v_id,
        v_stage_id,
        v_task.id,
        v_task_pos,
        v_task.title,
        v_task.description,
        'not_started',
        CASE
          WHEN v_task.assignment_rule = 'specific' THEN v_task.specific_user_id
          WHEN v_task.assignment_rule = 'account_lead' THEN p_owner_id
          ELSE NULL
        END,
        v_due,
        v_task.is_milestone OR v_task.task_type = 'meeting',
        v_task.is_deliverable OR v_task.task_type = 'deliverable',
        v_task.requires_approval OR v_task.task_type = 'approval',
        'not_required',
        auth.uid(),
        v_task.task_type,
        v_task.assignment_rule,
        CASE WHEN v_task.assignment_rule = 'specific' THEN v_task.specific_user_id ELSE NULL END,
        v_task.is_required,
        COALESCE(v_task.due_rule, '{"kind":"none"}'::jsonb),
        v_task.instructions
      );
    END LOOP;

    FOR v_deliverable IN
      SELECT * FROM public.hq_journey_template_deliverables
      WHERE stage_id = v_stage.id AND archived_at IS NULL
      ORDER BY position
    LOOP
      INSERT INTO public.hq_engagement_deliverables (
        engagement_id, stage_id, source_template_deliverable_id, position, name, description, is_required
      ) VALUES (
        v_id, v_stage_id, v_deliverable.id, v_deliverable.position,
        v_deliverable.name, v_deliverable.description, v_deliverable.is_required
      );
    END LOOP;
  END LOOP;

  IF v_first_stage IS NULL THEN
    RAISE EXCEPTION 'Template has no stages';
  END IF;

  UPDATE public.hq_engagements SET current_stage_id = v_first_stage WHERE id = v_id;

  INSERT INTO public.hq_engagement_assignments (engagement_id, user_id, assignment_role, assigned_by)
  VALUES (v_id, p_owner_id, 'lead', auth.uid())
  ON CONFLICT (engagement_id, user_id) DO UPDATE SET assignment_role = 'lead';

  PERFORM public.hq_log_activity(
    'engagement_opened', 'engagement', v_id, 'Opened engagement: ' || v_title,
    jsonb_build_object(
      'engagement_id', v_id, 'client_id', p_client_id, 'template_id', v_tpl.id,
      'template_version', v_tpl.version, 'service_key', v_tpl.service_key
    )
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_stage_requirement_gaps(p_stage_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage public.hq_engagement_stages%ROWTYPE;
  v_rules jsonb;
  v_gaps text[] := ARRAY[]::text[];
  v_rule text;
BEGIN
  SELECT * INTO v_stage FROM public.hq_engagement_stages WHERE id = p_stage_id;
  IF NOT FOUND THEN
    RETURN ARRAY['Stage not found']::text[];
  END IF;
  IF NOT public.hq_can_access_engagement(v_stage.engagement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_rules := COALESCE(v_stage.completion_rules, '[]'::jsonb);
  IF jsonb_typeof(v_rules) IS DISTINCT FROM 'array' THEN
    v_rules := '[]'::jsonb;
  END IF;

  FOR v_rule IN SELECT jsonb_array_elements_text(v_rules)
  LOOP
    IF v_rule = 'all_required_tasks' AND EXISTS (
      SELECT 1 FROM public.hq_engagement_tasks t
      WHERE t.stage_id = p_stage_id
        AND COALESCE(t.is_required, true)
        AND t.status NOT IN ('completed', 'cancelled')
    ) THEN
      v_gaps := array_append(v_gaps, 'All required tasks completed');
    ELSIF v_rule = 'required_document' AND NOT EXISTS (
      SELECT 1
      FROM public.hq_engagement_documents d
      JOIN public.hq_engagement_tasks t ON t.id = d.task_id
      WHERE t.stage_id = p_stage_id
    ) THEN
      v_gaps := array_append(v_gaps, 'Required document uploaded');
    ELSIF v_rule = 'deliverable_approved' AND (
      NOT EXISTS (
        SELECT 1 FROM public.hq_engagement_deliverables d
        WHERE d.stage_id = p_stage_id AND d.is_required
      )
      OR EXISTS (
        SELECT 1 FROM public.hq_engagement_deliverables d
        WHERE d.stage_id = p_stage_id AND d.is_required
          AND d.status NOT IN ('approved', 'client_review', 'final')
      )
    ) THEN
      v_gaps := array_append(v_gaps, 'Deliverable approved');
    ELSIF v_rule = 'management_approval' AND v_stage.approved_at IS NULL THEN
      v_gaps := array_append(v_gaps, 'Management approval');
    ELSIF v_rule = 'client_response' AND v_stage.client_response_at IS NULL THEN
      v_gaps := array_append(v_gaps, 'Client response received');
    ELSIF v_rule = 'meeting_completed' AND NOT EXISTS (
      SELECT 1 FROM public.hq_engagement_tasks t
      WHERE t.stage_id = p_stage_id AND t.task_type = 'meeting' AND t.status = 'completed'
    ) THEN
      v_gaps := array_append(v_gaps, 'Meeting completed');
    END IF;
  END LOOP;

  IF v_stage.requires_approval AND v_stage.approved_at IS NULL AND NOT ('Management approval' = ANY (v_gaps)) THEN
    v_gaps := array_append(v_gaps, 'Management approval');
  END IF;

  RETURN v_gaps;
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
  v_gaps text[];
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

  v_gaps := public.hq_stage_requirement_gaps(p_stage_id);
  IF COALESCE(cardinality(v_gaps), 0) > 0 THEN
    RAISE EXCEPTION 'This stage cannot advance yet. Still needed: %', array_to_string(v_gaps, '; ');
  END IF;

  UPDATE public.hq_engagement_stages SET status = 'completed' WHERE id = p_stage_id;
  SELECT s.id INTO v_next
  FROM public.hq_engagement_stages s
  WHERE s.engagement_id = v_stage.engagement_id AND s.position > v_stage.position
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
    'stage_advanced', 'engagement_stage', p_stage_id, 'Advanced stage: ' || v_stage.name,
    jsonb_build_object('engagement_id', v_stage.engagement_id, 'stage_id', p_stage_id, 'next_stage_id', v_next)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_mark_client_response(p_stage_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage public.hq_engagement_stages%ROWTYPE;
BEGIN
  SELECT * INTO v_stage FROM public.hq_engagement_stages WHERE id = p_stage_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stage not found';
  END IF;
  IF NOT public.hq_can_access_engagement(v_stage.engagement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.hq_engagement_stages SET client_response_at = now() WHERE id = p_stage_id;
  PERFORM public.hq_log_activity(
    'client_response', 'engagement_stage', p_stage_id, 'Client response recorded: ' || v_stage.name,
    jsonb_build_object('engagement_id', v_stage.engagement_id, 'stage_id', p_stage_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_set_deliverable_status(p_deliverable_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hq_engagement_deliverables%ROWTYPE;
BEGIN
  IF p_status NOT IN ('draft', 'internal_review', 'approved', 'client_review', 'final') THEN
    RAISE EXCEPTION 'Unknown deliverable status';
  END IF;
  SELECT * INTO v_row FROM public.hq_engagement_deliverables WHERE id = p_deliverable_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deliverable not found';
  END IF;
  IF NOT public.hq_can_access_engagement(v_row.engagement_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_status IN ('approved', 'final') AND NOT public.hq_is_journey_approver(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can approve a deliverable';
  END IF;
  UPDATE public.hq_engagement_deliverables SET status = p_status WHERE id = p_deliverable_id;
  PERFORM public.hq_log_activity(
    'deliverable_status', 'engagement_deliverable', p_deliverable_id,
    'Deliverable "' || v_row.name || '" → ' || p_status,
    jsonb_build_object('engagement_id', v_row.engagement_id, 'deliverable_id', p_deliverable_id, 'to', p_status)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Template editing. Forks a new version when an engagement already uses it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hq_prepare_template_edit(
  p_template_id uuid,
  p_stage_id uuid DEFAULT NULL,
  p_task_id uuid DEFAULT NULL,
  p_deliverable_id uuid DEFAULT NULL
)
RETURNS TABLE(template_id uuid, stage_id uuid, task_id uuid, deliverable_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.hq_journey_templates%ROWTYPE;
  v_new uuid;
  v_version integer;
  v_was_active boolean;
  v_stage public.hq_journey_template_stages%ROWTYPE;
  v_task public.hq_journey_template_tasks%ROWTYPE;
  v_deliverable public.hq_journey_template_deliverables%ROWTYPE;
  v_new_stage uuid;
  v_new_task uuid;
  v_new_deliverable uuid;
  v_stage_map jsonb := '{}'::jsonb;
  v_task_map jsonb := '{}'::jsonb;
  v_deliverable_map jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.hq_is_journey_approver(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can edit journey templates';
  END IF;
  SELECT * INTO v_old FROM public.hq_journey_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  IF v_old.status = 'archived' THEN
    RAISE EXCEPTION 'Duplicate this template before editing an archived version';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.hq_engagements e WHERE e.template_id = p_template_id) THEN
    template_id := p_template_id;
    stage_id := p_stage_id;
    task_id := p_task_id;
    deliverable_id := p_deliverable_id;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM public.hq_journey_templates
  WHERE service_key = v_old.service_key;

  v_was_active := v_old.is_active;
  UPDATE public.hq_journey_templates
  SET is_active = false,
      status = CASE WHEN status = 'active' THEN 'inactive' ELSE status END
  WHERE id = p_template_id;

  INSERT INTO public.hq_journey_templates (
    service_key, service_id, version, name, description, is_active, status, created_by
  ) VALUES (
    v_old.service_key, v_old.service_id, v_version, v_old.name, v_old.description,
    v_was_active, CASE WHEN v_was_active THEN 'active' ELSE v_old.status END, auth.uid()
  ) RETURNING id INTO v_new;

  FOR v_stage IN
    SELECT s.*
    FROM public.hq_journey_template_stages s
    WHERE s.template_id = p_template_id
    ORDER BY s.position
  LOOP
    INSERT INTO public.hq_journey_template_stages (
      template_id, position, name, description, requires_approval, archived_at,
      completion_rules, assignment_rule, specific_user_id
    ) VALUES (
      v_new, v_stage.position, v_stage.name, v_stage.description, v_stage.requires_approval, v_stage.archived_at,
      v_stage.completion_rules, v_stage.assignment_rule, v_stage.specific_user_id
    ) RETURNING id INTO v_new_stage;
    v_stage_map := v_stage_map || jsonb_build_object(v_stage.id::text, v_new_stage::text);

    FOR v_task IN
      SELECT t.*
      FROM public.hq_journey_template_tasks t
      WHERE t.stage_id = v_stage.id
      ORDER BY t.position
    LOOP
      INSERT INTO public.hq_journey_template_tasks (
        stage_id, position, title, description, is_milestone, is_deliverable, requires_approval,
        relative_due_days, task_type, assignment_rule, specific_user_id, is_required, due_rule,
        instructions, archived_at
      ) VALUES (
        v_new_stage, v_task.position, v_task.title, v_task.description, v_task.is_milestone,
        v_task.is_deliverable, v_task.requires_approval, v_task.relative_due_days, v_task.task_type,
        v_task.assignment_rule, v_task.specific_user_id, v_task.is_required, v_task.due_rule,
        v_task.instructions, v_task.archived_at
      ) RETURNING id INTO v_new_task;
      v_task_map := v_task_map || jsonb_build_object(v_task.id::text, v_new_task::text);
    END LOOP;

    FOR v_deliverable IN
      SELECT d.*
      FROM public.hq_journey_template_deliverables d
      WHERE d.stage_id = v_stage.id
      ORDER BY d.position
    LOOP
      INSERT INTO public.hq_journey_template_deliverables (
        stage_id, position, name, description, is_required, archived_at
      ) VALUES (
        v_new_stage, v_deliverable.position, v_deliverable.name, v_deliverable.description,
        v_deliverable.is_required, v_deliverable.archived_at
      ) RETURNING id INTO v_new_deliverable;
      v_deliverable_map := v_deliverable_map || jsonb_build_object(v_deliverable.id::text, v_new_deliverable::text);
    END LOOP;
  END LOOP;

  template_id := v_new;
  stage_id := public.hq_uuid_or_null(v_stage_map->>p_stage_id::text);
  task_id := public.hq_uuid_or_null(v_task_map->>p_task_id::text);
  deliverable_id := public.hq_uuid_or_null(v_deliverable_map->>p_deliverable_id::text);
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_upsert_service(
  p_service_key text,
  p_name text,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_key text := lower(regexp_replace(btrim(p_service_key), '[^a-zA-Z0-9]+', '_', 'g'));
BEGIN
  IF NOT public.hq_is_journey_approver(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can edit services';
  END IF;
  IF v_key IS NULL OR v_key = '' OR NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Service name is required';
  END IF;
  INSERT INTO public.hq_services (service_key, name, description)
  VALUES (v_key, btrim(p_name), NULLIF(btrim(p_description), ''))
  ON CONFLICT (service_key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_active = true
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_create_template(
  p_service_key text,
  p_name text,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_service uuid;
  v_key text;
  v_version integer;
BEGIN
  IF NOT public.hq_is_journey_approver(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can create journey templates';
  END IF;
  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Template name is required';
  END IF;
  v_key := lower(regexp_replace(btrim(p_service_key), '[^a-zA-Z0-9]+', '_', 'g'));
  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Choose a service';
  END IF;
  SELECT id INTO v_service FROM public.hq_services WHERE service_key = v_key;
  IF v_service IS NULL THEN
    INSERT INTO public.hq_services (service_key, name, description)
    VALUES (v_key, btrim(p_name), NULLIF(btrim(p_description), ''))
    RETURNING id INTO v_service;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM public.hq_journey_templates WHERE service_key = v_key;

  INSERT INTO public.hq_journey_templates (
    service_key, service_id, version, name, description, is_active, status, created_by
  ) VALUES (
    v_key, v_service, v_version, btrim(p_name), NULLIF(btrim(p_description), ''), false, 'inactive', auth.uid()
  ) RETURNING id INTO v_id;

  PERFORM public.hq_log_activity(
    'template_created', 'journey_template', v_id, 'Created template ' || btrim(p_name),
    jsonb_build_object('service_key', v_key, 'version', v_version)
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_update_template(
  p_template_id uuid,
  p_name text,
  p_description text,
  p_service_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edit record;
  v_key text;
  v_service uuid;
  v_version integer;
  v_current_key text;
  v_destination_taken boolean;
BEGIN
  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Template name is required';
  END IF;
  SELECT * INTO v_edit FROM public.hq_prepare_template_edit(p_template_id, NULL, NULL, NULL);
  v_key := lower(regexp_replace(btrim(p_service_key), '[^a-zA-Z0-9]+', '_', 'g'));
  SELECT id INTO v_service FROM public.hq_services WHERE service_key = v_key;
  IF v_service IS NULL THEN
    RAISE EXCEPTION 'Choose a service';
  END IF;

  SELECT service_key INTO v_current_key
  FROM public.hq_journey_templates WHERE id = v_edit.template_id;
  v_destination_taken := v_key IS DISTINCT FROM v_current_key AND EXISTS (
    SELECT 1 FROM public.hq_journey_templates
    WHERE service_key = v_key AND is_active AND id <> v_edit.template_id
  );
  IF v_key IS DISTINCT FROM v_current_key THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
    FROM public.hq_journey_templates WHERE service_key = v_key;
  END IF;

  UPDATE public.hq_journey_templates
  SET name = btrim(p_name),
      description = NULLIF(btrim(p_description), ''),
      service_key = v_key,
      service_id = v_service,
      version = COALESCE(v_version, version),
      is_active = CASE WHEN v_destination_taken THEN false ELSE is_active END,
      status = CASE WHEN v_destination_taken THEN 'inactive' ELSE status END
  WHERE id = v_edit.template_id;
  RETURN v_edit.template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_set_template_status(p_template_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hq_journey_templates%ROWTYPE;
BEGIN
  IF NOT public.hq_is_journey_approver(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can change template status';
  END IF;
  IF p_status NOT IN ('active', 'inactive', 'archived') THEN
    RAISE EXCEPTION 'Unknown template status';
  END IF;
  SELECT * INTO v_row FROM public.hq_journey_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  IF p_status = 'active' THEN
    UPDATE public.hq_journey_templates
    SET is_active = false, status = 'inactive'
    WHERE service_key = v_row.service_key AND id <> p_template_id AND is_active;
    UPDATE public.hq_journey_templates
    SET is_active = true, status = 'active', archived_at = NULL
    WHERE id = p_template_id;
  ELSIF p_status = 'inactive' THEN
    UPDATE public.hq_journey_templates
    SET is_active = false, status = 'inactive'
    WHERE id = p_template_id;
  ELSE
    UPDATE public.hq_journey_templates
    SET is_active = false, status = 'archived', archived_at = now()
    WHERE id = p_template_id;
  END IF;

  PERFORM public.hq_log_activity(
    'template_status', 'journey_template', p_template_id, 'Template status → ' || p_status,
    jsonb_build_object('template_id', p_template_id, 'status', p_status)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_duplicate_template(p_template_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.hq_journey_templates%ROWTYPE;
  v_new uuid;
  v_version integer;
  v_stage public.hq_journey_template_stages%ROWTYPE;
  v_task public.hq_journey_template_tasks%ROWTYPE;
  v_deliverable public.hq_journey_template_deliverables%ROWTYPE;
  v_new_stage uuid;
BEGIN
  IF NOT public.hq_is_journey_approver(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can duplicate journey templates';
  END IF;
  SELECT * INTO v_old FROM public.hq_journey_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM public.hq_journey_templates WHERE service_key = v_old.service_key;

  INSERT INTO public.hq_journey_templates (
    service_key, service_id, version, name, description, is_active, status, created_by
  ) VALUES (
    v_old.service_key, v_old.service_id, v_version, 'Copy of ' || v_old.name, v_old.description,
    false, 'inactive', auth.uid()
  ) RETURNING id INTO v_new;

  FOR v_stage IN
    SELECT * FROM public.hq_journey_template_stages
    WHERE template_id = p_template_id AND archived_at IS NULL
    ORDER BY position
  LOOP
    INSERT INTO public.hq_journey_template_stages (
      template_id, position, name, description, requires_approval, completion_rules, assignment_rule, specific_user_id
    ) VALUES (
      v_new, v_stage.position, v_stage.name, v_stage.description, v_stage.requires_approval,
      v_stage.completion_rules, v_stage.assignment_rule, v_stage.specific_user_id
    ) RETURNING id INTO v_new_stage;

    FOR v_task IN
      SELECT * FROM public.hq_journey_template_tasks
      WHERE stage_id = v_stage.id AND archived_at IS NULL
      ORDER BY position
    LOOP
      INSERT INTO public.hq_journey_template_tasks (
        stage_id, position, title, description, is_milestone, is_deliverable, requires_approval,
        relative_due_days, task_type, assignment_rule, specific_user_id, is_required, due_rule, instructions
      ) VALUES (
        v_new_stage, v_task.position, v_task.title, v_task.description, v_task.is_milestone,
        v_task.is_deliverable, v_task.requires_approval, v_task.relative_due_days, v_task.task_type,
        v_task.assignment_rule, v_task.specific_user_id, v_task.is_required, v_task.due_rule, v_task.instructions
      );
    END LOOP;

    FOR v_deliverable IN
      SELECT * FROM public.hq_journey_template_deliverables
      WHERE stage_id = v_stage.id AND archived_at IS NULL
      ORDER BY position
    LOOP
      INSERT INTO public.hq_journey_template_deliverables (stage_id, position, name, description, is_required)
      VALUES (v_new_stage, v_deliverable.position, v_deliverable.name, v_deliverable.description, v_deliverable.is_required);
    END LOOP;
  END LOOP;

  PERFORM public.hq_log_activity(
    'template_duplicated', 'journey_template', v_new, 'Duplicated template ' || v_old.name,
    jsonb_build_object('source_template_id', p_template_id)
  );
  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_save_template_stage(
  p_template_id uuid,
  p_stage_id uuid,
  p_name text,
  p_description text,
  p_completion_rules jsonb,
  p_assignment_rule text,
  p_specific_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edit record;
  v_stage uuid;
  v_pos integer;
  v_rules jsonb := COALESCE(p_completion_rules, '[]'::jsonb);
BEGIN
  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Stage name is required';
  END IF;
  IF p_assignment_rule NOT IN ('account_lead', 'strategist', 'management', 'specific', 'unassigned') THEN
    RAISE EXCEPTION 'Unknown assignment rule';
  END IF;
  IF jsonb_typeof(v_rules) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Completion requirements must be a list';
  END IF;

  SELECT * INTO v_edit FROM public.hq_prepare_template_edit(p_template_id, p_stage_id, NULL, NULL);
  v_stage := v_edit.stage_id;

  IF v_stage IS NULL THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_pos
    FROM public.hq_journey_template_stages
    WHERE template_id = v_edit.template_id AND archived_at IS NULL;
    INSERT INTO public.hq_journey_template_stages (
      template_id, position, name, description, requires_approval, completion_rules, assignment_rule, specific_user_id
    ) VALUES (
      v_edit.template_id, v_pos, btrim(p_name), NULLIF(btrim(p_description), ''),
      v_rules @> '["management_approval"]'::jsonb,
      v_rules, p_assignment_rule,
      CASE WHEN p_assignment_rule = 'specific' THEN p_specific_user_id ELSE NULL END
    ) RETURNING id INTO v_stage;
  ELSE
    UPDATE public.hq_journey_template_stages
    SET name = btrim(p_name),
        description = NULLIF(btrim(p_description), ''),
        requires_approval = v_rules @> '["management_approval"]'::jsonb,
        completion_rules = v_rules,
        assignment_rule = p_assignment_rule,
        specific_user_id = CASE WHEN p_assignment_rule = 'specific' THEN p_specific_user_id ELSE NULL END
    WHERE id = v_stage AND template_id = v_edit.template_id;
  END IF;

  RETURN jsonb_build_object('template_id', v_edit.template_id, 'stage_id', v_stage);
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_reorder_template_stages(p_template_id uuid, p_stage_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edit record;
  v_id uuid;
  v_pos integer := 0;
  v_mapped uuid;
BEGIN
  IF p_stage_ids IS NULL OR cardinality(p_stage_ids) = 0 THEN
    RAISE EXCEPTION 'Choose a stage order';
  END IF;
  SELECT * INTO v_edit FROM public.hq_prepare_template_edit(p_template_id, NULL, NULL, NULL);

  UPDATE public.hq_journey_template_stages
  SET position = position + 1000
  WHERE template_id = v_edit.template_id;

  FOREACH v_id IN ARRAY p_stage_ids
  LOOP
    IF p_template_id = v_edit.template_id THEN
      v_mapped := v_id;
    ELSE
      SELECT s2.id INTO v_mapped
      FROM public.hq_journey_template_stages s1
      JOIN public.hq_journey_template_stages s2
        ON s2.template_id = v_edit.template_id AND s2.position = s1.position + 1000 AND s2.name = s1.name
      WHERE s1.id = v_id;
    END IF;
    IF v_mapped IS NULL THEN
      RAISE EXCEPTION 'Stage is not on this template';
    END IF;
    v_pos := v_pos + 1;
    UPDATE public.hq_journey_template_stages SET position = v_pos WHERE id = v_mapped;
  END LOOP;

  RETURN v_edit.template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_archive_template_stage(p_template_id uuid, p_stage_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edit record;
BEGIN
  SELECT * INTO v_edit FROM public.hq_prepare_template_edit(p_template_id, p_stage_id, NULL, NULL);
  UPDATE public.hq_journey_template_stages
  SET archived_at = now()
  WHERE id = v_edit.stage_id AND template_id = v_edit.template_id;
  RETURN v_edit.template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_save_template_task(
  p_template_id uuid,
  p_stage_id uuid,
  p_task_id uuid,
  p_title text,
  p_description text,
  p_instructions text,
  p_task_type text,
  p_assignment_rule text,
  p_specific_user_id uuid,
  p_is_required boolean,
  p_due_rule jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edit record;
  v_task uuid;
  v_pos integer;
  v_rule jsonb := COALESCE(p_due_rule, '{"kind":"none"}'::jsonb);
  v_amount integer;
BEGIN
  IF NULLIF(btrim(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'Task name is required';
  END IF;
  IF p_task_type NOT IN ('internal', 'client', 'meeting', 'deliverable', 'approval', 'follow_up') THEN
    RAISE EXCEPTION 'Unknown task type';
  END IF;
  IF p_assignment_rule NOT IN ('account_lead', 'strategist', 'management', 'specific', 'unassigned') THEN
    RAISE EXCEPTION 'Unknown assignment rule';
  END IF;
  IF COALESCE(v_rule->>'kind', 'none') NOT IN (
    'none', 'same_day', 'days_after_stage', 'days_before_appointment', 'hours_after_meeting', 'custom'
  ) THEN
    RAISE EXCEPTION 'Unknown deadline rule';
  END IF;
  v_amount := NULLIF(v_rule->>'amount', '')::integer;

  SELECT * INTO v_edit FROM public.hq_prepare_template_edit(p_template_id, p_stage_id, p_task_id, NULL);
  IF v_edit.stage_id IS NULL THEN
    RAISE EXCEPTION 'Choose a stage';
  END IF;
  v_task := v_edit.task_id;

  IF v_task IS NULL THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_pos
    FROM public.hq_journey_template_tasks
    WHERE stage_id = v_edit.stage_id AND archived_at IS NULL;
    INSERT INTO public.hq_journey_template_tasks (
      stage_id, position, title, description, instructions, task_type, assignment_rule, specific_user_id,
      is_required, due_rule, relative_due_days, is_deliverable, requires_approval, is_milestone
    ) VALUES (
      v_edit.stage_id, v_pos, btrim(p_title), NULLIF(btrim(p_description), ''), NULLIF(btrim(p_instructions), ''),
      p_task_type, p_assignment_rule,
      CASE WHEN p_assignment_rule = 'specific' THEN p_specific_user_id ELSE NULL END,
      COALESCE(p_is_required, true), v_rule,
      CASE WHEN v_rule->>'kind' = 'days_after_stage' THEN v_amount WHEN v_rule->>'kind' = 'same_day' THEN 0 ELSE NULL END,
      p_task_type = 'deliverable', p_task_type = 'approval', p_task_type = 'meeting'
    ) RETURNING id INTO v_task;
  ELSE
    UPDATE public.hq_journey_template_tasks
    SET title = btrim(p_title),
        description = NULLIF(btrim(p_description), ''),
        instructions = NULLIF(btrim(p_instructions), ''),
        task_type = p_task_type,
        assignment_rule = p_assignment_rule,
        specific_user_id = CASE WHEN p_assignment_rule = 'specific' THEN p_specific_user_id ELSE NULL END,
        is_required = COALESCE(p_is_required, true),
        due_rule = v_rule,
        relative_due_days = CASE
          WHEN v_rule->>'kind' = 'days_after_stage' THEN v_amount
          WHEN v_rule->>'kind' = 'same_day' THEN 0
          ELSE NULL
        END,
        is_deliverable = p_task_type = 'deliverable',
        requires_approval = p_task_type = 'approval',
        is_milestone = p_task_type = 'meeting'
    WHERE id = v_task AND stage_id = v_edit.stage_id;
  END IF;

  RETURN jsonb_build_object('template_id', v_edit.template_id, 'stage_id', v_edit.stage_id, 'task_id', v_task);
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_archive_template_task(p_template_id uuid, p_stage_id uuid, p_task_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edit record;
BEGIN
  SELECT * INTO v_edit FROM public.hq_prepare_template_edit(p_template_id, p_stage_id, p_task_id, NULL);
  UPDATE public.hq_journey_template_tasks SET archived_at = now() WHERE id = v_edit.task_id;
  RETURN v_edit.template_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_save_template_deliverable(
  p_template_id uuid,
  p_stage_id uuid,
  p_deliverable_id uuid,
  p_name text,
  p_description text,
  p_is_required boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edit record;
  v_id uuid;
  v_pos integer;
BEGIN
  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Deliverable name is required';
  END IF;
  SELECT * INTO v_edit FROM public.hq_prepare_template_edit(p_template_id, p_stage_id, NULL, p_deliverable_id);
  IF v_edit.stage_id IS NULL THEN
    RAISE EXCEPTION 'Choose a stage';
  END IF;
  v_id := v_edit.deliverable_id;
  IF v_id IS NULL THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_pos
    FROM public.hq_journey_template_deliverables
    WHERE stage_id = v_edit.stage_id AND archived_at IS NULL;
    INSERT INTO public.hq_journey_template_deliverables (stage_id, position, name, description, is_required)
    VALUES (v_edit.stage_id, v_pos, btrim(p_name), NULLIF(btrim(p_description), ''), COALESCE(p_is_required, true))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.hq_journey_template_deliverables
    SET name = btrim(p_name),
        description = NULLIF(btrim(p_description), ''),
        is_required = COALESCE(p_is_required, true)
    WHERE id = v_id;
  END IF;
  RETURN jsonb_build_object('template_id', v_edit.template_id, 'stage_id', v_edit.stage_id, 'deliverable_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_archive_template_deliverable(
  p_template_id uuid,
  p_stage_id uuid,
  p_deliverable_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edit record;
BEGIN
  SELECT * INTO v_edit FROM public.hq_prepare_template_edit(p_template_id, p_stage_id, NULL, p_deliverable_id);
  UPDATE public.hq_journey_template_deliverables SET archived_at = now() WHERE id = v_edit.deliverable_id;
  RETURN v_edit.template_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Replace the three default journeys when they have not been used yet.
-- If a client engagement already points at a version, that version is left alone
-- and the new body is published as the next version.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hq_install_template_body(p_template_id uuid, p_body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage jsonb;
  v_task jsonb;
  v_deliverable jsonb;
  v_stage_id uuid;
  v_pos integer := 0;
  v_tpos integer;
  v_dpos integer;
  v_due jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM public.hq_engagements e WHERE e.template_id = p_template_id) THEN
    RAISE EXCEPTION 'Refusing to rewrite a template that already has engagements';
  END IF;
  DELETE FROM public.hq_journey_template_stages WHERE template_id = p_template_id;

  FOR v_stage IN SELECT value FROM jsonb_array_elements(p_body->'stages')
  LOOP
    v_pos := v_pos + 1;
    INSERT INTO public.hq_journey_template_stages (
      template_id, position, name, description, requires_approval, completion_rules, assignment_rule
    ) VALUES (
      p_template_id,
      v_pos,
      v_stage->>'name',
      NULLIF(v_stage->>'description', ''),
      COALESCE(v_stage->'completion_rules', '[]'::jsonb) @> '["management_approval"]'::jsonb,
      COALESCE(v_stage->'completion_rules', '[]'::jsonb),
      COALESCE(NULLIF(v_stage->>'assignment_rule', ''), 'unassigned')
    ) RETURNING id INTO v_stage_id;

    v_tpos := 0;
    FOR v_task IN SELECT value FROM jsonb_array_elements(COALESCE(v_stage->'tasks', '[]'::jsonb))
    LOOP
      v_tpos := v_tpos + 1;
      v_due := COALESCE(v_task->'due_rule', '{"kind":"none"}'::jsonb);
      INSERT INTO public.hq_journey_template_tasks (
        stage_id, position, title, description, instructions, task_type, assignment_rule,
        is_required, due_rule, relative_due_days, is_milestone, is_deliverable, requires_approval
      ) VALUES (
        v_stage_id,
        v_tpos,
        v_task->>'title',
        NULLIF(v_task->>'description', ''),
        NULLIF(v_task->>'instructions', ''),
        COALESCE(NULLIF(v_task->>'task_type', ''), 'internal'),
        COALESCE(NULLIF(v_task->>'assignment_rule', ''), 'unassigned'),
        COALESCE((v_task->>'is_required')::boolean, true),
        v_due,
        CASE
          WHEN v_due->>'kind' = 'days_after_stage' THEN NULLIF(v_due->>'amount', '')::integer
          WHEN v_due->>'kind' = 'same_day' THEN 0
          ELSE NULL
        END,
        COALESCE(NULLIF(v_task->>'task_type', ''), 'internal') = 'meeting',
        COALESCE(NULLIF(v_task->>'task_type', ''), 'internal') = 'deliverable',
        COALESCE(NULLIF(v_task->>'task_type', ''), 'internal') = 'approval'
      );
    END LOOP;

    v_dpos := 0;
    FOR v_deliverable IN SELECT value FROM jsonb_array_elements(COALESCE(v_stage->'deliverables', '[]'::jsonb))
    LOOP
      v_dpos := v_dpos + 1;
      INSERT INTO public.hq_journey_template_deliverables (stage_id, position, name, description, is_required)
      VALUES (
        v_stage_id, v_dpos, v_deliverable->>'name', NULLIF(v_deliverable->>'description', ''),
        COALESCE((v_deliverable->>'is_required')::boolean, true)
      );
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.hq_install_template_body(uuid, jsonb) FROM PUBLIC;

DO $$
DECLARE
  v_id uuid;
  v_new uuid;
  v_version integer;
  v_body jsonb;
  v_service record;
BEGIN
  FOR v_service IN
    SELECT * FROM (
      VALUES
        ('session', $json${
          "stages": [
            {"name":"Inquiry","description":"Capture the request and the person behind it.","assignment_rule":"account_lead","completion_rules":["all_required_tasks"],"tasks":[
              {"title":"Log the inquiry","task_type":"internal","is_required":true,"due_rule":{"kind":"same_day"}},
              {"title":"Confirm contact details","task_type":"internal","is_required":true,"due_rule":{"kind":"days_after_stage","amount":1}}
            ]},
            {"name":"Qualified","description":"Decide whether the session is the right engagement.","completion_rules":["all_required_tasks"],"tasks":[
              {"title":"Confirm the organization is a fit","task_type":"internal","is_required":true,"due_rule":{"kind":"days_after_stage","amount":1}}
            ]},
            {"name":"Booked","description":"Put the session on the calendar.","completion_rules":["meeting_completed"],"tasks":[
              {"title":"Schedule the session","task_type":"meeting","is_required":true,"due_rule":{"kind":"days_after_stage","amount":3}}
            ]},
            {"name":"Pre-Session Discovery","description":"Collect what the strategist needs before preparing.","completion_rules":["all_required_tasks","required_document"],"tasks":[
              {"title":"Send client questionnaire","task_type":"client","is_required":true,"due_rule":{"kind":"days_after_stage","amount":1}},
              {"title":"Receive completed questionnaire","task_type":"client","is_required":true,"due_rule":{"kind":"days_after_stage","amount":3}},
              {"title":"Review organization website","task_type":"internal","is_required":true,"due_rule":{"kind":"days_before_appointment","amount":7}},
              {"title":"Review social presence","task_type":"internal","is_required":true,"due_rule":{"kind":"days_before_appointment","amount":7}},
              {"title":"Review previous communications","task_type":"internal","is_required":true,"due_rule":{"kind":"days_before_appointment","amount":3}},
              {"title":"Prepare strategist notes","task_type":"internal","is_required":true,"due_rule":{"kind":"days_before_appointment","amount":1}}
            ],"deliverables":[{"name":"Session preparation brief","is_required":true}]},
            {"name":"Internal Preparation","description":"Turn the discovery into a session plan.","assignment_rule":"strategist","completion_rules":["all_required_tasks"],"tasks":[
              {"title":"Draft the session agenda","task_type":"internal","is_required":true,"due_rule":{"kind":"days_before_appointment","amount":1}}
            ]},
            {"name":"Strategic Communications Session","description":"Hold the session and capture decisions.","completion_rules":["meeting_completed"],"tasks":[
              {"title":"Conduct the session","task_type":"meeting","is_required":true,"due_rule":{"kind":"same_day"}},
              {"title":"Record decisions and next steps","task_type":"internal","is_required":true,"due_rule":{"kind":"hours_after_meeting","amount":24}}
            ]},
            {"name":"Recommendations","description":"Write what the client should do next. Do not send it until management approves.","completion_rules":["all_required_tasks","deliverable_approved","management_approval"],"tasks":[
              {"title":"Draft client recommendations","task_type":"deliverable","is_required":true,"due_rule":{"kind":"days_after_stage","amount":3}},
              {"title":"Management review","task_type":"approval","is_required":true,"assignment_rule":"management"}
            ],"deliverables":[
              {"name":"Client recommendations","is_required":true},
              {"name":"Post-session action plan","is_required":true}
            ]},
            {"name":"Follow-Up","description":"Close the loop and name any future engagement.","completion_rules":["all_required_tasks"],"tasks":[
              {"title":"Schedule follow-up","task_type":"follow_up","is_required":true,"due_rule":{"kind":"days_after_stage","amount":7}}
            ]},
            {"name":"Complete","description":"The session engagement is finished.","completion_rules":["all_required_tasks"],"tasks":[
              {"title":"Confirm the engagement is closed","task_type":"internal","is_required":false,"due_rule":{"kind":"same_day"}}
            ]}
          ]
        }$json$::jsonb),
        ('project', $json${
          "stages": [
            {"name":"Inquiry","completion_rules":["all_required_tasks"],"tasks":[{"title":"Log the project inquiry","task_type":"internal","is_required":true,"due_rule":{"kind":"same_day"}}]},
            {"name":"Consultation","completion_rules":["meeting_completed"],"tasks":[{"title":"Hold the consultation","task_type":"meeting","is_required":true,"due_rule":{"kind":"days_after_stage","amount":5}}]},
            {"name":"Proposal","completion_rules":["deliverable_approved","management_approval"],"tasks":[{"title":"Draft the proposal","task_type":"deliverable","is_required":true,"due_rule":{"kind":"days_after_stage","amount":5}}],"deliverables":[{"name":"Proposal","is_required":true}]},
            {"name":"Agreement","completion_rules":["client_response"],"tasks":[{"title":"Send the agreement","task_type":"client","is_required":true,"due_rule":{"kind":"days_after_stage","amount":2}}]},
            {"name":"Onboarding","completion_rules":["all_required_tasks"],"tasks":[{"title":"Confirm scope, contacts, and access","task_type":"internal","is_required":true,"due_rule":{"kind":"days_after_stage","amount":3}}]},
            {"name":"Discovery","completion_rules":["all_required_tasks","required_document"],"tasks":[{"title":"Review the organization and past communications","task_type":"internal","is_required":true,"due_rule":{"kind":"days_after_stage","amount":7}}]},
            {"name":"Strategy","completion_rules":["deliverable_approved","management_approval"],"tasks":[{"title":"Draft the communications strategy","task_type":"deliverable","is_required":true,"due_rule":{"kind":"days_after_stage","amount":10}}],"deliverables":[{"name":"Strategy","is_required":true}]},
            {"name":"Execution","completion_rules":["all_required_tasks"],"tasks":[{"title":"Build media materials","task_type":"deliverable","is_required":true},{"title":"Prepare pitching assets","task_type":"deliverable","is_required":true}],"deliverables":[{"name":"Media materials","is_required":true},{"name":"Pitching assets","is_required":true}]},
            {"name":"Internal Review","completion_rules":["management_approval"],"tasks":[{"title":"Review the work before it goes to the client","task_type":"approval","assignment_rule":"management","is_required":true}]},
            {"name":"Client Approval","completion_rules":["client_response","deliverable_approved"],"tasks":[{"title":"Send the work for client approval","task_type":"client","is_required":true}]},
            {"name":"Delivery","completion_rules":["deliverable_approved"],"tasks":[{"title":"Deliver the campaign work","task_type":"deliverable","is_required":true}],"deliverables":[{"name":"Campaign deliverables","is_required":true},{"name":"Final report","is_required":true}]},
            {"name":"Evaluation","completion_rules":["all_required_tasks"],"tasks":[{"title":"Review outcomes with the team","task_type":"internal","is_required":true,"due_rule":{"kind":"days_after_stage","amount":7}}]},
            {"name":"Closeout","completion_rules":["all_required_tasks"],"tasks":[{"title":"Hold the closeout and set follow-up","task_type":"follow_up","is_required":true}]}
          ]
        }$json$::jsonb),
        ('counsel', $json${
          "stages": [
            {"name":"Inquiry","completion_rules":["all_required_tasks"],"tasks":[{"title":"Log the counsel inquiry","task_type":"internal","is_required":true,"due_rule":{"kind":"same_day"}}]},
            {"name":"Discovery","completion_rules":["meeting_completed"],"tasks":[{"title":"Hold the discovery conversation","task_type":"meeting","is_required":true,"due_rule":{"kind":"days_after_stage","amount":5}}]},
            {"name":"Agreement","completion_rules":["client_response"],"tasks":[{"title":"Confirm the counsel agreement","task_type":"client","is_required":true}]},
            {"name":"Onboarding","completion_rules":["all_required_tasks"],"tasks":[{"title":"Confirm scope and working rhythm","task_type":"internal","is_required":true,"due_rule":{"kind":"days_after_stage","amount":5}}]},
            {"name":"Baseline Assessment","completion_rules":["required_document","all_required_tasks"],"tasks":[{"title":"Complete the baseline communications review","task_type":"deliverable","is_required":true,"due_rule":{"kind":"days_after_stage","amount":10}}]},
            {"name":"Strategic Roadmap","completion_rules":["deliverable_approved","management_approval"],"tasks":[{"title":"Draft the strategic roadmap","task_type":"deliverable","is_required":true}],"deliverables":[{"name":"Strategic roadmap","is_required":true}]},
            {"name":"Active Counsel","description":"The standing counsel relationship.","completion_rules":["all_required_tasks"],"tasks":[{"title":"Hold the standing counsel check-in","task_type":"meeting","is_required":true,"due_rule":{"kind":"days_after_stage","amount":30}},{"title":"Keep the decision log current","task_type":"internal","is_required":true}]},
            {"name":"Monthly Review","completion_rules":["meeting_completed"],"tasks":[{"title":"Hold the monthly review","task_type":"meeting","is_required":true,"due_rule":{"kind":"days_after_stage","amount":30}}]},
            {"name":"Quarterly Evaluation","completion_rules":["deliverable_approved","management_approval"],"tasks":[{"title":"Prepare the quarterly evaluation","task_type":"deliverable","is_required":true}],"deliverables":[{"name":"Quarterly evaluation","is_required":true}]},
            {"name":"Renewal / Offboarding","completion_rules":["client_response"],"tasks":[{"title":"Hold the renewal or offboarding conversation","task_type":"follow_up","is_required":true}]}
          ]
        }$json$::jsonb)
    ) AS seed(service_key, body)
  LOOP
    SELECT id INTO v_id
    FROM public.hq_journey_templates
    WHERE service_key = v_service.service_key AND is_active
    ORDER BY version DESC
    LIMIT 1;

    IF v_id IS NULL THEN
      CONTINUE;
    END IF;

    IF EXISTS (SELECT 1 FROM public.hq_engagements e WHERE e.template_id = v_id) THEN
      SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
      FROM public.hq_journey_templates WHERE service_key = v_service.service_key;
      UPDATE public.hq_journey_templates SET is_active = false, status = 'inactive' WHERE id = v_id;
      INSERT INTO public.hq_journey_templates (service_key, service_id, version, name, description, is_active, status)
      SELECT service_key, service_id, v_version, name, description, true, 'active'
      FROM public.hq_journey_templates WHERE id = v_id
      RETURNING id INTO v_new;
      PERFORM public.hq_install_template_body(v_new, v_service.body);
    ELSE
      PERFORM public.hq_install_template_body(v_id, v_service.body);
      UPDATE public.hq_journey_templates
      SET description = CASE service_key
        WHEN 'session' THEN 'A single advisory session from inquiry through recommendations and follow-up.'
        WHEN 'project' THEN 'A project from inquiry and agreement through delivery and closeout.'
        WHEN 'counsel' THEN 'Retained counsel from discovery through active counsel, review, and renewal.'
      END
      WHERE id = v_id;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Grants and RLS for the new tables
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.hq_services FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.hq_journey_template_deliverables FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.hq_engagement_deliverables FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_journey_template_deliverables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hq_engagement_deliverables TO authenticated;
GRANT ALL ON public.hq_services TO service_role;
GRANT ALL ON public.hq_journey_template_deliverables TO service_role;
GRANT ALL ON public.hq_engagement_deliverables TO service_role;

ALTER TABLE public.hq_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_journey_template_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_engagement_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hq_services_select ON public.hq_services;
CREATE POLICY hq_services_select ON public.hq_services
  FOR SELECT TO authenticated
  USING (public.is_hq_staff(auth.uid()));

DROP POLICY IF EXISTS hq_template_deliverables_select ON public.hq_journey_template_deliverables;
CREATE POLICY hq_template_deliverables_select ON public.hq_journey_template_deliverables
  FOR SELECT TO authenticated
  USING (public.is_hq_staff(auth.uid()));

DROP POLICY IF EXISTS hq_engagement_deliverables_select ON public.hq_engagement_deliverables;
CREATE POLICY hq_engagement_deliverables_select ON public.hq_engagement_deliverables
  FOR SELECT TO authenticated
  USING (public.hq_can_access_engagement(engagement_id, auth.uid()));

REVOKE ALL ON FUNCTION public.hq_prepare_template_edit(uuid, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_upsert_service(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_create_template(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_update_template(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_set_template_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_duplicate_template(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_save_template_stage(uuid, uuid, text, text, jsonb, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_reorder_template_stages(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_archive_template_stage(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_save_template_task(uuid, uuid, uuid, text, text, text, text, text, uuid, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_archive_template_task(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_save_template_deliverable(uuid, uuid, uuid, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_archive_template_deliverable(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_stage_requirement_gaps(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_mark_client_response(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_set_deliverable_status(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.hq_prepare_template_edit(uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_upsert_service(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_create_template(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_update_template(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_set_template_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_duplicate_template(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_save_template_stage(uuid, uuid, text, text, jsonb, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_reorder_template_stages(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_archive_template_stage(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_save_template_task(uuid, uuid, uuid, text, text, text, text, text, uuid, boolean, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_archive_template_task(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_save_template_deliverable(uuid, uuid, uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_archive_template_deliverable(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_stage_requirement_gaps(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_mark_client_response(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_set_deliverable_status(uuid, text) TO authenticated;
