-- Add policy for admins to view all customers
CREATE POLICY "Admins can view all customers"
ON public.customers
FOR SELECT
USING (get_user_role(auth.uid()) = 'admin');

-- Add policy for admins to manage all customers
CREATE POLICY "Admins can manage all customers"
ON public.customers
FOR ALL
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');