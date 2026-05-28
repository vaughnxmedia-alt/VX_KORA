-- Per-audit client assets for Asset Library (videos on S3, images/docs on Supabase).

CREATE TABLE IF NOT EXISTS public.audit_client_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.free_audits(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  asset_kind TEXT NOT NULL CHECK (asset_kind IN ('video', 'image', 'doc')),
  storage_provider TEXT NOT NULL CHECK (storage_provider IN ('s3', 'supabase')),
  storage_bucket TEXT,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  filename TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_client_assets_audit_kind_idx
  ON public.audit_client_assets (audit_id, asset_kind, created_at DESC);

ALTER TABLE public.audit_client_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard staff manage audit client assets" ON public.audit_client_assets;
CREATE POLICY "Dashboard staff manage audit client assets"
ON public.audit_client_assets FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_client_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_client_assets TO service_role;

COMMENT ON TABLE public.audit_client_assets IS
  'Uploaded client media for Asset Library: video (S3), image/doc (Supabase storage).';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-asset-images',
  'audit-asset-images',
  false,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-asset-docs',
  'audit-asset-docs',
  false,
  104857600,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Dashboard staff read audit asset images" ON storage.objects;
CREATE POLICY "Dashboard staff read audit asset images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'audit-asset-images'
  AND public.is_dashboard_operator(auth.uid())
);

DROP POLICY IF EXISTS "Dashboard staff upload audit asset images" ON storage.objects;
CREATE POLICY "Dashboard staff upload audit asset images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audit-asset-images'
  AND public.is_dashboard_operator(auth.uid())
);

DROP POLICY IF EXISTS "Dashboard staff delete audit asset images" ON storage.objects;
CREATE POLICY "Dashboard staff delete audit asset images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'audit-asset-images'
  AND public.is_dashboard_operator(auth.uid())
);

DROP POLICY IF EXISTS "Dashboard staff read audit asset docs" ON storage.objects;
CREATE POLICY "Dashboard staff read audit asset docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'audit-asset-docs'
  AND public.is_dashboard_operator(auth.uid())
);

DROP POLICY IF EXISTS "Dashboard staff upload audit asset docs" ON storage.objects;
CREATE POLICY "Dashboard staff upload audit asset docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audit-asset-docs'
  AND public.is_dashboard_operator(auth.uid())
);

DROP POLICY IF EXISTS "Dashboard staff delete audit asset docs" ON storage.objects;
CREATE POLICY "Dashboard staff delete audit asset docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'audit-asset-docs'
  AND public.is_dashboard_operator(auth.uid())
);
