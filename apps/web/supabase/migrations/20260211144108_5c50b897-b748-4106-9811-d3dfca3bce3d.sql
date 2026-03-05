
-- Drop the overly permissive INSERT policy on subscribers
-- The new-subscriber edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so this policy is unnecessary and its removal tightens security.
DROP POLICY "Anyone can subscribe" ON public.subscribers;

-- Drop the overly permissive INSERT policy on support_messages
DROP POLICY "Anyone can submit support messages" ON public.support_messages;

-- Re-create with tighter check: ensure status is always 'unread' on public inserts
CREATE POLICY "Anyone can submit support messages"
ON public.support_messages
FOR INSERT
WITH CHECK (status = 'unread');
