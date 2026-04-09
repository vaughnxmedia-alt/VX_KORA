-- Super-ops: optional extra allowlist by email (in addition to profile full_name check in RPC).
-- Add rows here for operators who should not rely on full_name matching.
CREATE TABLE IF NOT EXISTS public.super_ops_allowlist (
  email text PRIMARY KEY NOT NULL
);

ALTER TABLE public.super_ops_allowlist ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.super_ops_allowlist IS
  'Emails allowed for super_ops_auth_user_summary; optional. Justice/Jocelyn also allowed via profiles.full_name in the RPC.';

-- Optional seed (comment out if you rely only on full_name fallback)
INSERT INTO public.super_ops_allowlist (email) VALUES
  ('justicevaughn7@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- No SELECT policies: clients cannot read this table; SECURITY DEFINER function reads it.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title text;

COMMENT ON COLUMN public.profiles.job_title IS 'Optional job title; shown in super-ops client hover on dashboard.';

CREATE OR REPLACE FUNCTION public.super_ops_auth_user_summary(target_user_id uuid)
RETURNS TABLE (
  login_email text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text;
  allowed boolean := false;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid target';
  END IF;

  SELECT u.email INTO caller_email FROM auth.users u WHERE u.id = auth.uid();
  IF caller_email IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.super_ops_allowlist a
    WHERE lower(trim(a.email)) = lower(trim(caller_email))
  ) INTO allowed;

  IF NOT allowed THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND trim(COALESCE(p.full_name, '')) IN ('Justice Vaughn', 'Jocelyn Vaughn')
    ) INTO allowed;
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.email::text,
    u.email_confirmed_at,
    u.last_sign_in_at
  FROM auth.users u
  WHERE u.id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.super_ops_auth_user_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_ops_auth_user_summary(uuid) TO authenticated;
