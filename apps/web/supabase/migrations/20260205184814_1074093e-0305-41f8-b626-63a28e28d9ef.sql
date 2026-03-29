-- Enable RLS on JKPRusers table
ALTER TABLE public."JKPRusers" ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners too
ALTER TABLE public."JKPRusers" FORCE ROW LEVEL SECURITY;

-- Only admins can view all JKPRusers records
CREATE POLICY "Admins can view all JKPRusers"
ON public."JKPRusers"
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- Only admins can insert JKPRusers records
CREATE POLICY "Admins can insert JKPRusers"
ON public."JKPRusers"
FOR INSERT
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Only admins can update JKPRusers records
CREATE POLICY "Admins can update JKPRusers"
ON public."JKPRusers"
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- Only admins can delete JKPRusers records
CREATE POLICY "Admins can delete JKPRusers"
ON public."JKPRusers"
FOR DELETE
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');