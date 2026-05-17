-- Compatibility patch for environments where profiles.role was removed manually.
-- Required so pending analytics/closed-loop migrations that reference profiles.role can apply.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text;

-- Backfill from canonical role source when available.
UPDATE public.profiles p
SET role = ur.role::text
FROM public.user_roles ur
WHERE ur.user_id = p.id
  AND (p.role IS NULL OR p.role <> ur.role::text);

-- Ensure deterministic default for rows without a user_roles mapping.
UPDATE public.profiles
SET role = 'client'
WHERE role IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'client';

COMMENT ON COLUMN public.profiles.role IS
  'Compatibility role column for legacy policies; canonical role remains public.user_roles.role.';
