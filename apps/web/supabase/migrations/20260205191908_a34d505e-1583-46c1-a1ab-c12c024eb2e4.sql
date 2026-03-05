-- Drop overly permissive UPDATE policies on subscribers table
DROP POLICY IF EXISTS "Allow all updates" ON public.subscribers;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.subscribers;
DROP POLICY IF EXISTS "Allow update" ON public.subscribers;