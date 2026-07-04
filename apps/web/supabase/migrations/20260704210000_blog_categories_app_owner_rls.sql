-- Allow dashboard app owners (Justice / Jocelyn) to manage blog categories alongside admins.

DROP POLICY IF EXISTS blog_categories_admin_read_all ON public.blog_categories;
DROP POLICY IF EXISTS blog_categories_admin_insert ON public.blog_categories;
DROP POLICY IF EXISTS blog_categories_admin_update ON public.blog_categories;
DROP POLICY IF EXISTS blog_categories_admin_delete ON public.blog_categories;

CREATE POLICY blog_categories_admin_read_all
ON public.blog_categories
FOR SELECT
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'admin'
  OR public.is_dashboard_app_owner(auth.uid())
);

CREATE POLICY blog_categories_admin_insert
ON public.blog_categories
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_role(auth.uid()) = 'admin'
  OR public.is_dashboard_app_owner(auth.uid())
);

CREATE POLICY blog_categories_admin_update
ON public.blog_categories
FOR UPDATE
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'admin'
  OR public.is_dashboard_app_owner(auth.uid())
)
WITH CHECK (
  public.get_user_role(auth.uid()) = 'admin'
  OR public.is_dashboard_app_owner(auth.uid())
);

CREATE POLICY blog_categories_admin_delete
ON public.blog_categories
FOR DELETE
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'admin'
  OR public.is_dashboard_app_owner(auth.uid())
);
