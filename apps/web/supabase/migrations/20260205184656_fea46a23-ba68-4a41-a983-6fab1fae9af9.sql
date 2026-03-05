-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Clients can view their own calendar posts" ON public.scheduled_posts;

-- Create PERMISSIVE policies (default behavior)
-- Admins can manage all posts
CREATE POLICY "Admins can manage all posts"
ON public.scheduled_posts
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Clients can view their own calendar posts
CREATE POLICY "Clients can view their own calendar posts"
ON public.scheduled_posts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM content_calendars cc
    JOIN customers c ON c.id = cc.customer_id
    WHERE cc.id = scheduled_posts.calendar_id AND c.user_id = auth.uid()
  )
);

-- Ensure RLS is enabled
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners too (prevents bypassing)
ALTER TABLE public.scheduled_posts FORCE ROW LEVEL SECURITY;