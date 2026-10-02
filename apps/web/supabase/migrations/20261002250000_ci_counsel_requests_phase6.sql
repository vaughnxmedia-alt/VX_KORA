-- Communications Intelligence Phase 6 — Ask JahKnowsPR / counsel requests
-- Additive. Client-facing responses live in ci_counsel_responses and are
-- only readable after the request is marked response_ready or closed.

ALTER TABLE public.ci_counsel_requests
  ADD COLUMN IF NOT EXISTS request_type text;

UPDATE public.ci_counsel_requests
SET request_type = 'general_strategic_counsel'
WHERE request_type IS NULL;

ALTER TABLE public.ci_counsel_requests
  ALTER COLUMN request_type SET DEFAULT 'general_strategic_counsel';

ALTER TABLE public.ci_counsel_requests
  ALTER COLUMN request_type SET NOT NULL;

ALTER TABLE public.ci_counsel_requests
  DROP CONSTRAINT IF EXISTS ci_counsel_requests_request_type_check;

ALTER TABLE public.ci_counsel_requests
  ADD CONSTRAINT ci_counsel_requests_request_type_check
  CHECK (request_type IN (
    'media_request',
    'reputation_issue',
    'messaging_question',
    'crisis_sensitive',
    'event_opportunity',
    'partnership_sponsorship',
    'announcement',
    'public_statement',
    'general_strategic_counsel',
    'other'
  ));

ALTER TABLE public.ci_counsel_requests
  DROP CONSTRAINT IF EXISTS ci_counsel_requests_urgency_check;

UPDATE public.ci_counsel_requests
SET urgency = CASE urgency
  WHEN 'low' THEN 'normal'
  WHEN 'high' THEN 'time_sensitive'
  ELSE urgency
END
WHERE urgency IN ('low', 'high');

ALTER TABLE public.ci_counsel_requests
  ADD CONSTRAINT ci_counsel_requests_urgency_check
  CHECK (urgency IN ('normal', 'time_sensitive', 'urgent'));

ALTER TABLE public.ci_counsel_requests
  ADD COLUMN IF NOT EXISTS intelligence_item_id uuid REFERENCES public.ci_intelligence_items (id) ON DELETE SET NULL;

ALTER TABLE public.ci_counsel_requests
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.ci_opportunities (id) ON DELETE SET NULL;

ALTER TABLE public.ci_counsel_requests
  ADD COLUMN IF NOT EXISTS action_item_id uuid REFERENCES public.ci_action_items (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ci_counsel_requests_type_idx
  ON public.ci_counsel_requests (request_type);

CREATE INDEX IF NOT EXISTS ci_counsel_requests_urgency_idx
  ON public.ci_counsel_requests (urgency);

CREATE INDEX IF NOT EXISTS ci_counsel_requests_intelligence_idx
  ON public.ci_counsel_requests (intelligence_item_id)
  WHERE intelligence_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ci_counsel_requests_opportunity_idx
  ON public.ci_counsel_requests (opportunity_id)
  WHERE opportunity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ci_counsel_requests_action_idx
  ON public.ci_counsel_requests (action_item_id)
  WHERE action_item_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ci_guard_counsel_request_related()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  related_org uuid;
BEGIN
  IF NEW.intelligence_item_id IS NOT NULL THEN
    SELECT organization_id INTO related_org
    FROM public.ci_intelligence_items
    WHERE id = NEW.intelligence_item_id;
    IF related_org IS NULL OR related_org IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'Related intelligence item must belong to the same organization';
    END IF;
  END IF;

  IF NEW.opportunity_id IS NOT NULL THEN
    SELECT organization_id INTO related_org
    FROM public.ci_opportunities
    WHERE id = NEW.opportunity_id;
    IF related_org IS NULL OR related_org IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'Related opportunity must belong to the same organization';
    END IF;
  END IF;

  IF NEW.action_item_id IS NOT NULL THEN
    SELECT organization_id INTO related_org
    FROM public.ci_action_items
    WHERE id = NEW.action_item_id;
    IF related_org IS NULL OR related_org IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'Related action must belong to the same organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ci_counsel_requests_related_guard ON public.ci_counsel_requests;
CREATE TRIGGER ci_counsel_requests_related_guard
  BEFORE INSERT OR UPDATE ON public.ci_counsel_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.ci_guard_counsel_request_related();

CREATE TABLE IF NOT EXISTS public.ci_counsel_responses (
  request_id uuid PRIMARY KEY REFERENCES public.ci_counsel_requests (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_counsel_responses_org_idx
  ON public.ci_counsel_responses (organization_id);

COMMENT ON TABLE public.ci_counsel_responses IS
  'Client-facing counsel responses. Members may read only after the request is response_ready or closed.';

DROP TRIGGER IF EXISTS ci_counsel_responses_updated_at ON public.ci_counsel_responses;
CREATE TRIGGER ci_counsel_responses_updated_at
  BEFORE UPDATE ON public.ci_counsel_responses
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_counsel_responses TO authenticated;
GRANT ALL ON public.ci_counsel_responses TO service_role;

ALTER TABLE public.ci_counsel_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ci_counsel_responses_select ON public.ci_counsel_responses;
CREATE POLICY ci_counsel_responses_select ON public.ci_counsel_responses
  FOR SELECT TO authenticated
  USING (
    public.is_ci_admin(auth.uid())
    OR (
      public.is_ci_org_member(organization_id, auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.ci_counsel_requests r
        WHERE r.id = request_id
          AND r.organization_id = organization_id
          AND r.status IN ('response_ready', 'closed')
      )
    )
  );

DROP POLICY IF EXISTS ci_counsel_responses_insert ON public.ci_counsel_responses;
CREATE POLICY ci_counsel_responses_insert ON public.ci_counsel_responses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_counsel_responses_update ON public.ci_counsel_responses;
CREATE POLICY ci_counsel_responses_update ON public.ci_counsel_responses
  FOR UPDATE TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_counsel_responses_delete ON public.ci_counsel_responses;
CREATE POLICY ci_counsel_responses_delete ON public.ci_counsel_responses
  FOR DELETE TO authenticated
  USING (public.is_ci_admin(auth.uid()));

-- Hide unpublished response columns on the request row from every authenticated client,
-- including staff using select('*'). Staff read drafts from ci_counsel_responses.
REVOKE SELECT ON public.ci_counsel_requests FROM authenticated;
GRANT SELECT (
  id,
  organization_id,
  subject,
  request_type,
  description,
  urgency,
  link_url,
  attachment_path,
  status,
  submitted_by,
  created_at,
  updated_at,
  intelligence_item_id,
  opportunity_id,
  action_item_id
) ON public.ci_counsel_requests TO authenticated;

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
