-- Public sponsor hub intake requests (reviewed by admins before entering sponsors_database).

ALTER TABLE public.sponsors_database
  ADD COLUMN IF NOT EXISTS source_request_id UUID,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE TABLE public.sponsor_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  job_title TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  industry TEXT,
  city TEXT,
  state TEXT,
  company_description TEXT,
  community_initiatives TEXT,
  sponsorship_types TEXT[] NOT NULL DEFAULT '{}',
  geographic_areas_served TEXT,
  annual_sponsorship_budget TEXT,
  preferred_opportunities TEXT,
  linkedin TEXT,
  logo_url TEXT,
  additional_comments TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'archived')),
  sponsors_database_id UUID REFERENCES public.sponsors_database(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sponsor_requests_status_idx ON public.sponsor_requests (status);
CREATE INDEX sponsor_requests_created_at_idx ON public.sponsor_requests (created_at DESC);
CREATE INDEX sponsor_requests_email_idx ON public.sponsor_requests (email);
CREATE INDEX sponsors_database_source_request_idx ON public.sponsors_database (source_request_id);

ALTER TABLE public.sponsor_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sponsor_requests"
ON public.sponsor_requests
FOR ALL
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin')
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE TRIGGER update_sponsor_requests_updated_at
BEFORE UPDATE ON public.sponsor_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sponsor-request-logos',
  'sponsor-request-logos',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload sponsor request logos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'sponsor-request-logos');

CREATE POLICY "Anyone can read sponsor request logos"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'sponsor-request-logos');

CREATE POLICY "Admins can delete sponsor request logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sponsor-request-logos'
  AND public.get_user_role(auth.uid()) = 'admin'
);

COMMENT ON TABLE public.sponsor_requests IS
  'Inbound Strategic Sponsor Hub requests from public site. Reviewed by admins before promotion to sponsors_database.';
