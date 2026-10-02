-- Staff-only helper to invite existing accounts into CI organizations.
-- profiles has no email column; lookup must use auth.users via SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.ci_lookup_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_ci_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN (
    SELECT u.id
    FROM auth.users u
    WHERE lower(u.email) = lower(btrim(p_email))
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ci_lookup_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ci_lookup_user_id_by_email(text) TO authenticated;

COMMENT ON FUNCTION public.ci_lookup_user_id_by_email(text) IS
  'Returns auth.users.id for an email. Callable only by Communications Intelligence admins.';
