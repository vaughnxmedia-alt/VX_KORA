-- Communications Intelligence Phase 7 — onboarding fields + secure org invites.
-- Additive. Existing organizations are marked onboarding-complete so current
-- members are not gated. New organizations start as not_started.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.ci_organizations
  ADD COLUMN IF NOT EXISTS pr_media_concerns text;

ALTER TABLE public.ci_organizations
  ADD COLUMN IF NOT EXISTS reputation_concerns text;

ALTER TABLE public.ci_organizations
  ADD COLUMN IF NOT EXISTS has_approved_messaging boolean;

ALTER TABLE public.ci_organizations
  ADD COLUMN IF NOT EXISTS onboarding_status text;

ALTER TABLE public.ci_organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

ALTER TABLE public.ci_organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

UPDATE public.ci_organizations
SET onboarding_status = 'completed',
    onboarding_completed_at = COALESCE(onboarding_completed_at, updated_at)
WHERE onboarding_status IS NULL;

ALTER TABLE public.ci_organizations
  ALTER COLUMN onboarding_status SET DEFAULT 'not_started';

ALTER TABLE public.ci_organizations
  ALTER COLUMN onboarding_status SET NOT NULL;

ALTER TABLE public.ci_organizations
  DROP CONSTRAINT IF EXISTS ci_organizations_onboarding_status_check;

ALTER TABLE public.ci_organizations
  ADD CONSTRAINT ci_organizations_onboarding_status_check
  CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed'));

CREATE OR REPLACE FUNCTION public.ci_guard_organization_client_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role text;
BEGIN
  IF public.is_ci_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  role := public.ci_org_member_role(NEW.id, auth.uid());
  IF role IS NULL OR role = 'viewer' THEN
    RAISE EXCEPTION 'Not authorized to update this organization';
  END IF;

  NEW.hq_client_id := OLD.hq_client_id;
  NEW.status := OLD.status;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;

  IF OLD.onboarding_status = 'completed'
     AND NEW.onboarding_status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Onboarding cannot be reopened from the portal';
  END IF;

  IF NEW.onboarding_status = 'completed' AND OLD.onboarding_status IS DISTINCT FROM 'completed' THEN
    NEW.onboarding_completed_at := COALESCE(NEW.onboarding_completed_at, now());
    NEW.onboarding_completed_by := COALESCE(NEW.onboarding_completed_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ci_organizations_client_guard ON public.ci_organizations;
CREATE TRIGGER ci_organizations_client_guard
  BEFORE UPDATE ON public.ci_organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.ci_guard_organization_client_update();

DROP POLICY IF EXISTS ci_organizations_update ON public.ci_organizations;
CREATE POLICY ci_organizations_update ON public.ci_organizations
  FOR UPDATE TO authenticated
  USING (
    public.is_ci_admin(auth.uid())
    OR (
      public.is_ci_org_member(id, auth.uid())
      AND COALESCE(public.ci_org_member_role(id, auth.uid()), 'viewer') <> 'viewer'
    )
  )
  WITH CHECK (
    public.is_ci_admin(auth.uid())
    OR (
      public.is_ci_org_member(id, auth.uid())
      AND COALESCE(public.ci_org_member_role(id, auth.uid()), 'viewer') <> 'viewer'
    )
  );

CREATE TABLE IF NOT EXISTS public.ci_organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ci_organizations (id) ON DELETE CASCADE,
  email text NOT NULL,
  member_role text NOT NULL DEFAULT 'owner'
    CHECK (member_role IN ('owner', 'admin', 'member', 'viewer')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  invited_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  revoked_at timestamptz,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ci_organization_invitations_pending_email_idx
  ON public.ci_organization_invitations (organization_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS ci_organization_invitations_org_idx
  ON public.ci_organization_invitations (organization_id, created_at DESC);

COMMENT ON TABLE public.ci_organization_invitations IS
  'Secure, expiring organization invitations. Raw tokens are never stored.';

DROP TRIGGER IF EXISTS ci_organization_invitations_updated_at ON public.ci_organization_invitations;
CREATE TRIGGER ci_organization_invitations_updated_at
  BEFORE UPDATE ON public.ci_organization_invitations
  FOR EACH ROW EXECUTE FUNCTION public.ci_set_updated_at();

ALTER TABLE public.ci_organization_invitations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_organization_invitations TO authenticated;
GRANT ALL ON public.ci_organization_invitations TO service_role;

DROP POLICY IF EXISTS ci_organization_invitations_select ON public.ci_organization_invitations;
CREATE POLICY ci_organization_invitations_select ON public.ci_organization_invitations
  FOR SELECT TO authenticated
  USING (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_organization_invitations_insert ON public.ci_organization_invitations;
CREATE POLICY ci_organization_invitations_insert ON public.ci_organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_organization_invitations_update ON public.ci_organization_invitations;
CREATE POLICY ci_organization_invitations_update ON public.ci_organization_invitations
  FOR UPDATE TO authenticated
  USING (public.is_ci_admin(auth.uid()))
  WITH CHECK (public.is_ci_admin(auth.uid()));

DROP POLICY IF EXISTS ci_organization_invitations_delete ON public.ci_organization_invitations;
CREATE POLICY ci_organization_invitations_delete ON public.ci_organization_invitations
  FOR DELETE TO authenticated
  USING (public.is_ci_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.ci_hash_invite_token(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.ci_create_organization_invite(
  p_organization_id uuid,
  p_email text,
  p_member_role text DEFAULT 'owner'
)
RETURNS TABLE (invite_id uuid, token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_role text;
  v_token text;
  v_hash text;
  v_expires timestamptz;
  v_id uuid;
  v_existing uuid;
BEGIN
  IF NOT public.is_ci_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_email := lower(btrim(p_email));
  IF v_email IS NULL OR v_email = '' OR v_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'A valid email is required';
  END IF;

  v_role := COALESCE(NULLIF(btrim(p_member_role), ''), 'owner');
  IF v_role NOT IN ('owner', 'admin', 'member', 'viewer') THEN
    RAISE EXCEPTION 'Invalid membership role';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ci_organizations o WHERE o.id = p_organization_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.ci_organization_members m
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = p_organization_id
      AND m.status = 'active'
      AND lower(u.email) = v_email
  ) THEN
    RAISE EXCEPTION 'That person already has access to this organization';
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := public.ci_hash_invite_token(v_token);
  v_expires := now() + interval '7 days';

  SELECT i.id INTO v_existing
  FROM public.ci_organization_invitations i
  WHERE i.organization_id = p_organization_id
    AND i.email = v_email
    AND i.accepted_at IS NULL
    AND i.revoked_at IS NULL
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.ci_organization_invitations
    SET token_hash = v_hash,
        expires_at = v_expires,
        member_role = v_role,
        invited_by = auth.uid(),
        last_sent_at = now()
    WHERE id = v_existing
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.ci_organization_invitations (
      organization_id,
      email,
      member_role,
      token_hash,
      expires_at,
      invited_by,
      last_sent_at
    ) VALUES (
      p_organization_id,
      v_email,
      v_role,
      v_hash,
      v_expires,
      auth.uid(),
      now()
    )
    RETURNING id INTO v_id;
  END IF;

  invite_id := v_id;
  token := v_token;
  expires_at := v_expires;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.ci_revoke_organization_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_ci_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.ci_organization_invitations
  SET revoked_at = now()
  WHERE id = p_invite_id
    AND accepted_at IS NULL
    AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation is no longer pending';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.ci_preview_organization_invite(p_token text)
RETURNS TABLE (
  organization_name text,
  email text,
  member_role text,
  expires_at timestamptz,
  already_used boolean,
  expired boolean,
  revoked boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  v_hash := public.ci_hash_invite_token(p_token);

  RETURN QUERY
  SELECT
    o.name,
    i.email,
    i.member_role,
    i.expires_at,
    i.accepted_at IS NOT NULL,
    i.expires_at < now(),
    i.revoked_at IS NOT NULL
  FROM public.ci_organization_invitations i
  JOIN public.ci_organizations o ON o.id = i.organization_id
  WHERE i.token_hash = v_hash
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.ci_accept_organization_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_invite public.ci_organization_invitations%ROWTYPE;
  v_email text;
  v_member_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to accept this invitation';
  END IF;

  IF p_token IS NULL OR length(p_token) < 16 THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  v_hash := public.ci_hash_invite_token(p_token);

  SELECT * INTO v_invite
  FROM public.ci_organization_invitations
  WHERE token_hash = v_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF v_invite.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'This invitation is no longer valid';
  END IF;
  IF v_invite.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This invitation has already been used';
  END IF;
  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'This invitation has expired';
  END IF;

  SELECT lower(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS NULL OR v_email <> v_invite.email THEN
    RAISE EXCEPTION 'Sign in with the invited email address to accept';
  END IF;

  INSERT INTO public.ci_organization_members (
    organization_id,
    user_id,
    member_role,
    status,
    invited_by,
    invited_at,
    accepted_at
  ) VALUES (
    v_invite.organization_id,
    auth.uid(),
    v_invite.member_role,
    'active',
    v_invite.invited_by,
    v_invite.created_at,
    now()
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET member_role = EXCLUDED.member_role,
        status = 'active',
        invited_by = EXCLUDED.invited_by,
        accepted_at = now()
  RETURNING id INTO v_member_id;

  UPDATE public.ci_organization_invitations
  SET accepted_at = now(),
      accepted_by = auth.uid()
  WHERE id = v_invite.id;

  RETURN v_invite.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ci_hash_invite_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ci_create_organization_invite(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ci_revoke_organization_invite(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ci_preview_organization_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ci_accept_organization_invite(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ci_create_organization_invite(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ci_revoke_organization_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ci_preview_organization_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ci_accept_organization_invite(text) TO authenticated;
