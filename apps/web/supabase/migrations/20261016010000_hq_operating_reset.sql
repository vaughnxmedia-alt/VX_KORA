-- Operating reset: engagement team writes, internal case-study drafts,
-- and the signed-in employee's journey work list.
-- Public /work and live Brief articles are not changed.

CREATE TABLE IF NOT EXISTS public.hq_engagement_case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL UNIQUE REFERENCES public.hq_engagements (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.hq_clients (id) ON DELETE RESTRICT,
  title text NOT NULL,
  objectives text NOT NULL DEFAULT '',
  work_performed text NOT NULL DEFAULT '',
  outcomes text NOT NULL DEFAULT '',
  evidence text NOT NULL DEFAULT '',
  approval_status text NOT NULL DEFAULT 'not_requested'
    CHECK (approval_status IN ('not_requested', 'requested', 'approved', 'declined')),
  publication_status text NOT NULL DEFAULT 'internal'
    CHECK (publication_status IN ('internal', 'copied')),
  blog_post_id uuid REFERENCES public.blog_posts (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_engagement_case_studies_client_idx
  ON public.hq_engagement_case_studies (client_id);

DROP TRIGGER IF EXISTS hq_engagement_case_studies_updated_at ON public.hq_engagement_case_studies;
CREATE TRIGGER hq_engagement_case_studies_updated_at
  BEFORE UPDATE ON public.hq_engagement_case_studies
  FOR EACH ROW EXECUTE FUNCTION public.hq_set_updated_at();

CREATE OR REPLACE FUNCTION public.hq_engagement_case_study_on_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.hq_engagement_case_studies (engagement_id, client_id, title)
  VALUES (NEW.id, NEW.client_id, NEW.title)
  ON CONFLICT (engagement_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hq_engagements_case_study ON public.hq_engagements;
CREATE TRIGGER hq_engagements_case_study
  AFTER INSERT ON public.hq_engagements
  FOR EACH ROW EXECUTE FUNCTION public.hq_engagement_case_study_on_open();

CREATE OR REPLACE FUNCTION public.hq_engagement_requires_case_study()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.hq_engagement_case_studies c WHERE c.engagement_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Create the internal case study draft before closing this engagement';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hq_engagements_require_case_study ON public.hq_engagements;
CREATE TRIGGER hq_engagements_require_case_study
  BEFORE UPDATE ON public.hq_engagements
  FOR EACH ROW EXECUTE FUNCTION public.hq_engagement_requires_case_study();

INSERT INTO public.hq_engagement_case_studies (engagement_id, client_id, title)
SELECT e.id, e.client_id, e.title
FROM public.hq_engagements e
ON CONFLICT (engagement_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.hq_ensure_case_study(p_engagement_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.hq_engagements%ROWTYPE;
  v_id uuid;
BEGIN
  IF NOT public.hq_can_access_engagement(p_engagement_id, auth.uid()) THEN
    RAISE EXCEPTION 'You do not have access to this engagement';
  END IF;
  SELECT * INTO v_row FROM public.hq_engagements WHERE id = p_engagement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Engagement not found';
  END IF;
  INSERT INTO public.hq_engagement_case_studies (engagement_id, client_id, title)
  VALUES (p_engagement_id, v_row.client_id, v_row.title)
  ON CONFLICT (engagement_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.hq_engagement_case_studies
    WHERE engagement_id = p_engagement_id;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_save_case_study(
  p_engagement_id uuid,
  p_objectives text,
  p_work_performed text,
  p_outcomes text,
  p_evidence text,
  p_approval_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.hq_can_access_engagement(p_engagement_id, auth.uid()) THEN
    RAISE EXCEPTION 'You do not have access to this engagement';
  END IF;
  IF p_approval_status NOT IN ('not_requested', 'requested', 'approved', 'declined') THEN
    RAISE EXCEPTION 'Unknown approval status';
  END IF;
  PERFORM public.hq_ensure_case_study(p_engagement_id);
  UPDATE public.hq_engagement_case_studies
  SET
    objectives = COALESCE(p_objectives, ''),
    work_performed = COALESCE(p_work_performed, ''),
    outcomes = COALESCE(p_outcomes, ''),
    evidence = COALESCE(p_evidence, ''),
    approval_status = p_approval_status
  WHERE engagement_id = p_engagement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_copy_case_study_to_brief(p_engagement_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.hq_engagement_case_studies%ROWTYPE;
  v_post uuid;
  v_slug text;
  v_body text;
BEGIN
  IF NOT public.hq_is_journey_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can prepare a publication draft';
  END IF;
  SELECT * INTO v_case
  FROM public.hq_engagement_case_studies
  WHERE engagement_id = p_engagement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Create the internal case study draft first';
  END IF;
  IF v_case.blog_post_id IS NOT NULL THEN
    RETURN v_case.blog_post_id;
  END IF;

  v_slug := 'case-draft-' || replace(p_engagement_id::text, '-', '');
  IF EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);
  END IF;

  v_body := concat_ws(
    E'\n\n',
    CASE WHEN btrim(v_case.objectives) <> '' THEN '## Objectives' || E'\n\n' || v_case.objectives END,
    CASE WHEN btrim(v_case.work_performed) <> '' THEN '## Work performed' || E'\n\n' || v_case.work_performed END,
    CASE WHEN btrim(v_case.outcomes) <> '' THEN '## Outcomes' || E'\n\n' || v_case.outcomes END,
    CASE WHEN btrim(v_case.evidence) <> '' THEN '## Evidence' || E'\n\n' || v_case.evidence END
  );

  INSERT INTO public.blog_posts (
    title,
    slug,
    content,
    excerpt,
    description,
    content_type,
    publication_status,
    status,
    is_hidden,
    hq_client_id,
    author_id,
    category,
    tags
  )
  VALUES (
    v_case.title,
    v_slug,
    COALESCE(v_body, ''),
    NULLIF(btrim(v_case.outcomes), ''),
    NULLIF(btrim(v_case.outcomes), ''),
    'case-study',
    'draft',
    'draft',
    true,
    v_case.client_id,
    auth.uid(),
    'Case Study',
    ARRAY[]::text[]
  )
  RETURNING id INTO v_post;

  UPDATE public.hq_engagement_case_studies
  SET blog_post_id = v_post, publication_status = 'copied'
  WHERE id = v_case.id;

  PERFORM public.hq_log_activity(
    'case_study_draft_copied',
    'engagement',
    p_engagement_id,
    'Prepared an unpublished case-study draft',
    jsonb_build_object('engagement_id', p_engagement_id, 'blog_post_id', v_post)
  );

  RETURN v_post;
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_set_engagement_assignment(
  p_engagement_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.hq_is_journey_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Only management can change the engagement team';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.hq_engagements WHERE id = p_engagement_id) THEN
    RAISE EXCEPTION 'Engagement not found';
  END IF;

  IF p_role = 'remove' THEN
    IF EXISTS (
      SELECT 1 FROM public.hq_engagements
      WHERE id = p_engagement_id AND owner_id = p_user_id
    ) THEN
      RAISE EXCEPTION 'Reassign the engagement before removing the lead';
    END IF;
    DELETE FROM public.hq_engagement_assignments
    WHERE engagement_id = p_engagement_id AND user_id = p_user_id;
    RETURN;
  END IF;

  IF p_role = 'lead' THEN
    PERFORM public.hq_reassign_engagement(p_engagement_id, p_user_id);
    RETURN;
  END IF;

  IF p_role <> 'contributor' THEN
    RAISE EXCEPTION 'Unknown assignment role';
  END IF;
  IF p_user_id IS NULL OR NOT public.is_hq_staff(p_user_id) THEN
    RAISE EXCEPTION 'Choose an HQ employee';
  END IF;

  INSERT INTO public.hq_engagement_assignments (engagement_id, user_id, assignment_role, assigned_by)
  VALUES (p_engagement_id, p_user_id, 'contributor', auth.uid())
  ON CONFLICT (engagement_id, user_id) DO UPDATE
  SET assignment_role = CASE
        WHEN public.hq_engagement_assignments.assignment_role = 'lead' THEN 'lead'
        ELSE 'contributor'
      END,
      assigned_by = auth.uid(),
      assigned_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.hq_my_journey_work()
RETURNS TABLE (
  id uuid,
  title text,
  status text,
  due_date date,
  engagement_id uuid,
  stage_name text,
  client_name text,
  engagement_title text,
  service_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.title,
    t.status,
    t.due_date,
    t.engagement_id,
    s.name,
    c.client_name,
    e.title,
    e.service_key
  FROM public.hq_engagement_tasks t
  JOIN public.hq_engagements e ON e.id = t.engagement_id
  JOIN public.hq_clients c ON c.id = e.client_id
  LEFT JOIN public.hq_engagement_stages s ON s.id = t.stage_id
  WHERE t.assignee_id = auth.uid()
    AND t.status NOT IN ('completed', 'cancelled')
    AND public.hq_can_access_engagement(t.engagement_id, auth.uid())
  ORDER BY t.due_date NULLS LAST, t.title;
$$;

CREATE OR REPLACE FUNCTION public.hq_linked_portal(p_client_id uuid)
RETURNS TABLE (organization_id uuid, organization_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name
  FROM public.ci_organizations o
  WHERE o.hq_client_id = p_client_id
    AND public.is_hq_staff(auth.uid());
$$;

REVOKE ALL ON TABLE public.hq_engagement_case_studies FROM PUBLIC, anon;
GRANT SELECT ON public.hq_engagement_case_studies TO authenticated;
GRANT ALL ON public.hq_engagement_case_studies TO service_role;

ALTER TABLE public.hq_engagement_case_studies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hq_engagement_case_studies_select ON public.hq_engagement_case_studies;
CREATE POLICY hq_engagement_case_studies_select ON public.hq_engagement_case_studies
  FOR SELECT TO authenticated
  USING (public.hq_can_access_engagement(engagement_id, auth.uid()));

REVOKE ALL ON FUNCTION public.hq_ensure_case_study(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_save_case_study(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_copy_case_study_to_brief(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_set_engagement_assignment(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_my_journey_work() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_linked_portal(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.hq_ensure_case_study(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_save_case_study(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_copy_case_study_to_brief(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_set_engagement_assignment(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_my_journey_work() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hq_linked_portal(uuid) TO authenticated;
