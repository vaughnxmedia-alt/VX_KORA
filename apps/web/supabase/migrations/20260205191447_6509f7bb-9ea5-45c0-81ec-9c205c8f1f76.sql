-- Drop any legacy permissive SELECT policies on support_messages
DROP POLICY IF EXISTS "Allow select" ON public.support_messages;
DROP POLICY IF EXISTS "Allow anonymous select" ON public.support_messages;
DROP POLICY IF EXISTS "Allow public select" ON public.support_messages;
DROP POLICY IF EXISTS "Public can read support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Anyone can read support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.support_messages;