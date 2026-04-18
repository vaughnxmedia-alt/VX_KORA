-- Post-confirmation meeting uploads (notes, exports, MP3 recordings) before Brand Identity generation.

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS intake_meeting_assets jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.meetings.intake_meeting_assets IS
  'Files from in-person or Zoom session: [{ "storage_path", "filename", "kind": "document"|"recording", "mime", "uploaded_at" }] relative to bucket strategy-session-intake.';

-- Private bucket for PDFs, images, audio (MP3/M4A/WAV)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'strategy-session-intake',
  'strategy-session-intake',
  false,
  524288000,
  NULL
)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

-- Staff can list/read/upload intake files
CREATE POLICY "Staff can read strategy session intake objects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'strategy-session-intake'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);

CREATE POLICY "Staff can upload strategy session intake objects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'strategy-session-intake'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);

CREATE POLICY "Staff can delete own strategy session intake objects"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'strategy-session-intake'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);

-- Authors/interns need to read Strategy Session meetings for Intake + attach metadata
CREATE POLICY "Dashboard staff can view strategy session meetings"
ON public.meetings FOR SELECT TO authenticated
USING (
  service_name = 'Strategy Session'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);

CREATE POLICY "Dashboard staff can update strategy session meetings"
ON public.meetings FOR UPDATE TO authenticated
USING (
  service_name = 'Strategy Session'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
)
WITH CHECK (
  service_name = 'Strategy Session'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);
