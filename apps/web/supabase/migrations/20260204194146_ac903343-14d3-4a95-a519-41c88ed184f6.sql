-- Drop and recreate the admin policy to ensure it applies to SELECT
DROP POLICY IF EXISTS "Allow admin users to manage user roles" ON public.user_roles;

-- Create separate policies for each operation
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin');