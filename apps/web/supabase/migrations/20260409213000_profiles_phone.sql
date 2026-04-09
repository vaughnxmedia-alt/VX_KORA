-- Optional phone on profiles for dashboard completeness + super-ops display
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.profiles.phone IS 'Contact phone; shown in dashboard profile completion and ops dialog.';
