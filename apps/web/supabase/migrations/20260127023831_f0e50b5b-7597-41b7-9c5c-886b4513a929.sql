-- Drop the existing restrictive policies for admins
DROP POLICY IF EXISTS "Allow admins to update any blog post" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow admins to delete any blog post" ON public.blog_posts;

-- Recreate admin policies as PERMISSIVE (default) so they work independently
CREATE POLICY "Allow admins to update any blog post"
ON public.blog_posts
FOR UPDATE
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Allow admins to delete any blog post"
ON public.blog_posts
FOR DELETE
USING (get_user_role(auth.uid()) = 'admin');