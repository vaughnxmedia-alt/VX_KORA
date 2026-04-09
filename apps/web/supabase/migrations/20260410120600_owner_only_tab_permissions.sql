-- Only the dashboard app owner (Justice) may insert/update/delete tab permissions.
-- Admins (e.g. Jocelyn) can still read their own rows; clients read their own.

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
      AND lower(trim(COALESCE(u.email::text, ''))) = 'justicevaughn7@gmail.com'
  );
$$;

REVOKE ALL ON FUNCTION public.is_dashboard_app_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dashboard_app_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS "Admins can manage all tab permissions" ON public.user_tab_permissions;
DROP POLICY IF EXISTS "Users can view their own tab permissions" ON public.user_tab_permissions;

CREATE POLICY "user_tab_permissions_select"
ON public.user_tab_permissions
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_dashboard_app_owner(auth.uid())
);

CREATE POLICY "user_tab_permissions_insert_owner"
ON public.user_tab_permissions
FOR INSERT
WITH CHECK (public.is_dashboard_app_owner(auth.uid()));

CREATE POLICY "user_tab_permissions_update_owner"
ON public.user_tab_permissions
FOR UPDATE
USING (public.is_dashboard_app_owner(auth.uid()))
WITH CHECK (public.is_dashboard_app_owner(auth.uid()));

CREATE POLICY "user_tab_permissions_delete_owner"
ON public.user_tab_permissions
FOR DELETE
USING (public.is_dashboard_app_owner(auth.uid()));
