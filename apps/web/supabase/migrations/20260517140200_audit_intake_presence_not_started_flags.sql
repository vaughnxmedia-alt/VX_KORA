-- Add canonical presence URL fields + "not started" flags to preserve
-- intentional no-presence answers in original intake data.
ALTER TABLE public.audit_intake_original_answers
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS website_not_started BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_not_started BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_not_started BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_not_started BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_public_pages TEXT,
  ADD COLUMN IF NOT EXISTS other_public_pages_not_started BOOLEAN NOT NULL DEFAULT false;

-- Backfill canonical URL fields from legacy columns where available.
UPDATE public.audit_intake_original_answers
SET
  website_url = COALESCE(NULLIF(TRIM(website_url), ''), NULLIF(TRIM(website_link), '')),
  instagram_url = COALESCE(NULLIF(TRIM(instagram_url), ''), NULLIF(TRIM(instagram), '')),
  facebook_url = COALESCE(NULLIF(TRIM(facebook_url), ''), NULLIF(TRIM(facebook), '')),
  tiktok_url = COALESCE(NULLIF(TRIM(tiktok_url), ''), NULLIF(TRIM(tiktok), '')),
  other_public_pages = COALESCE(NULLIF(TRIM(other_public_pages), ''), NULLIF(TRIM(other_socials), ''));
