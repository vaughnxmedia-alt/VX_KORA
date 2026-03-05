-- Drop any overly permissive legacy policies on subscribers table
DROP POLICY IF EXISTS "Allow all updates" ON public.subscribers;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.subscribers;
DROP POLICY IF EXISTS "Allow update" ON public.subscribers;
DROP POLICY IF EXISTS "Allow select" ON public.subscribers;
DROP POLICY IF EXISTS "Allow anonymous select" ON public.subscribers;
DROP POLICY IF EXISTS "Allow public select" ON public.subscribers;

-- The remaining policies should be:
-- 1. "Allow admins full access to subscribers" (FOR ALL) - admin only ✓
-- 2. "Anyone can subscribe" (FOR INSERT) - public signup ✓
-- These are already correctly configured