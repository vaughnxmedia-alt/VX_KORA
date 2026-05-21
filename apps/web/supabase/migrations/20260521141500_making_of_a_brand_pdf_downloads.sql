-- Track each "Making of a Brand" starter-guide PDF emailed from the public download form.

CREATE TABLE IF NOT EXISTS public.making_of_a_brand_pdf_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  source_path TEXT,
  audit_id UUID REFERENCES public.free_audits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_making_of_a_brand_pdf_downloads_created_at
  ON public.making_of_a_brand_pdf_downloads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_making_of_a_brand_pdf_downloads_email
  ON public.making_of_a_brand_pdf_downloads(lower(email));

ALTER TABLE public.making_of_a_brand_pdf_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard roles read making of a brand pdf downloads"
  ON public.making_of_a_brand_pdf_downloads;
CREATE POLICY "Dashboard roles read making of a brand pdf downloads"
ON public.making_of_a_brand_pdf_downloads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);

-- Backfill from subscribers who came through the guide form (legacy lead_source only).
INSERT INTO public.making_of_a_brand_pdf_downloads (name, email, phone, subscribed, source_path, created_at)
SELECT
  s.name,
  s.email,
  NULLIF(TRIM(s.lead_source->>'phone'), ''),
  true,
  COALESCE(NULLIF(TRIM(s.lead_source->>'source_path'), ''), '/the-brief/before-you-build-the-brand-starter-guide'),
  s.created_at
FROM public.subscribers s
WHERE s.lead_source->>'source' = 'before_you_build_brand_guide'
  AND NOT EXISTS (
    SELECT 1
    FROM public.making_of_a_brand_pdf_downloads d
    WHERE lower(d.email) = lower(s.email)
      AND d.created_at = s.created_at
  );
