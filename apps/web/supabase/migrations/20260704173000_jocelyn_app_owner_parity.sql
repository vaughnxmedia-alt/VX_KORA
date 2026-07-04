-- Grant Jocelyn Vaughn the same dashboard app-owner privileges as Justice Vaughn.

CREATE OR REPLACE FUNCTION public.is_dashboard_app_owner(check_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = check_uid
      AND lower(trim(COALESCE(u.email::text, ''))) IN (
        'justicevaughn7@gmail.com',
        'jocelyncavinessbrigman@gmail.com'
      )
  );
$$;

INSERT INTO public.super_ops_allowlist (email)
VALUES ('jocelyncavinessbrigman@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Strategy session meetings: all-host oversight for both co-owners.
UPDATE public.strategy_session_hosts h
SET can_view_all_meetings = true
FROM auth.users u
WHERE h.user_id = u.id
  AND h.active = true
  AND lower(trim(u.email)) IN (
    'justicevaughn7@gmail.com',
    'jocelyncavinessbrigman@gmail.com'
  );
