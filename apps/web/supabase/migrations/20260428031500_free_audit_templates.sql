CREATE TABLE IF NOT EXISTS public.free_audit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_type TEXT NOT NULL CHECK (file_type IN ('png', 'pdf')),
  storage_bucket TEXT NOT NULL DEFAULT 'free-audit-templates',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS free_audit_templates_active_idx
  ON public.free_audit_templates (is_active, created_at DESC);

DROP TRIGGER IF EXISTS trg_free_audit_templates_updated_at ON public.free_audit_templates;
CREATE TRIGGER trg_free_audit_templates_updated_at
BEFORE UPDATE ON public.free_audit_templates
FOR EACH ROW EXECUTE FUNCTION public.lls_set_updated_at();

ALTER TABLE public.free_audit_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard staff manage free audit templates" ON public.free_audit_templates;
CREATE POLICY "Dashboard staff manage free audit templates"
ON public.free_audit_templates FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'free-audit-templates',
  'free-audit-templates',
  false,
  10485760,
  ARRAY['image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Dashboard staff read free audit template files" ON storage.objects;
CREATE POLICY "Dashboard staff read free audit template files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'free-audit-templates'
  AND public.is_dashboard_operator(auth.uid())
);

DROP POLICY IF EXISTS "Dashboard staff upload free audit template files" ON storage.objects;
CREATE POLICY "Dashboard staff upload free audit template files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'free-audit-templates'
  AND public.is_dashboard_operator(auth.uid())
);

DROP POLICY IF EXISTS "Dashboard staff update free audit template files" ON storage.objects;
CREATE POLICY "Dashboard staff update free audit template files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'free-audit-templates'
  AND public.is_dashboard_operator(auth.uid())
)
WITH CHECK (
  bucket_id = 'free-audit-templates'
  AND public.is_dashboard_operator(auth.uid())
);
