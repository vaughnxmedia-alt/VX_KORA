-- Dashboard staff (admin, author, intern, 3pv) need SELECT on telegram_intake_sessions for Users / Intake pages.
-- Existing policy only allowed admins; authors could not load Telegram intake–scoped lists.

CREATE POLICY "Dashboard staff can view telegram intake sessions"
ON public.telegram_intake_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);
