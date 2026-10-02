-- Communications Intelligence Phase 5 — Opportunity + Action Center fields
-- Additive. Client opportunity/action updates stay limited by triggers.

-- ---- opportunities: types, statuses, source, priority ----
ALTER TABLE public.ci_opportunities
  DROP CONSTRAINT IF EXISTS ci_opportunities_opportunity_type_check;

ALTER TABLE public.ci_opportunities
  ADD CONSTRAINT ci_opportunities_opportunity_type_check
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
    'networking',
    'other'
  ));

ALTER TABLE public.ci_opportunities
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE public.ci_opportunities
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE public.ci_opportunities
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';

ALTER TABLE public.ci_opportunities
  DROP CONSTRAINT IF EXISTS ci_opportunities_priority_check;

ALTER TABLE public.ci_opportunities
  ADD CONSTRAINT ci_opportunities_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE public.ci_opportunities
  DROP CONSTRAINT IF EXISTS ci_opportunities_status_check;

UPDATE public.ci_opportunities
SET status = CASE status
  WHEN 'won' THEN 'completed'
  WHEN 'closed' THEN 'expired'
  ELSE status
END
WHERE status IN ('won', 'closed');

ALTER TABLE public.ci_opportunities
  ADD CONSTRAINT ci_opportunities_status_check
  CHECK (status IN (
    'new',
    'reviewing',
    'interested',
    'pursuing',
    'completed',
    'passed',
    'expired'
  ));

CREATE INDEX IF NOT EXISTS ci_opportunities_org_priority_idx
  ON public.ci_opportunities (organization_id, priority);

-- Clients may set Interested / Passed only. Admins unrestricted.
CREATE OR REPLACE FUNCTION public.ci_guard_opportunity_client_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_ci_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_ci_org_member(OLD.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to update this opportunity';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.opportunity_type IS DISTINCT FROM OLD.opportunity_type
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.why_it_matters IS DISTINCT FROM OLD.why_it_matters
     OR NEW.recommended_action IS DISTINCT FROM OLD.recommended_action
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.source_url IS DISTINCT FROM OLD.source_url
     OR NEW.deadline IS DISTINCT FROM OLD.deadline
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION 'Clients may only update opportunity status';
  END IF;

  IF NEW.status NOT IN ('interested', 'passed') THEN
    RAISE EXCEPTION 'Clients may only mark an opportunity Interested or Passed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ci_opportunities_client_guard ON public.ci_opportunities;
CREATE TRIGGER ci_opportunities_client_guard
  BEFORE UPDATE ON public.ci_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.ci_guard_opportunity_client_update();

DROP POLICY IF EXISTS ci_opportunities_update ON public.ci_opportunities;
CREATE POLICY ci_opportunities_update ON public.ci_opportunities
  FOR UPDATE TO authenticated
  USING (public.can_access_ci_org(organization_id, auth.uid()))
  WITH CHECK (public.can_access_ci_org(organization_id, auth.uid()));

-- ---- actions: cancelled, assignment, related records ----
ALTER TABLE public.ci_action_items
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.ci_action_items
  ADD COLUMN IF NOT EXISTS intelligence_item_id uuid REFERENCES public.ci_intelligence_items (id) ON DELETE SET NULL;

ALTER TABLE public.ci_action_items
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.ci_opportunities (id) ON DELETE SET NULL;

ALTER TABLE public.ci_action_items
  DROP CONSTRAINT IF EXISTS ci_action_items_status_check;

ALTER TABLE public.ci_action_items
  ADD CONSTRAINT ci_action_items_status_check
  CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS ci_action_items_assigned_to_idx
  ON public.ci_action_items (assigned_to)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS ci_action_items_intelligence_idx
  ON public.ci_action_items (intelligence_item_id)
  WHERE intelligence_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ci_action_items_opportunity_idx
  ON public.ci_action_items (opportunity_id)
  WHERE opportunity_id IS NOT NULL;

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
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.intelligence_item_id IS DISTINCT FROM OLD.intelligence_item_id
     OR NEW.opportunity_id IS DISTINCT FROM OLD.opportunity_id
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
