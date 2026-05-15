INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'free-audit-audio',
  'free-audit-audio',
  true,
  26214400,
  ARRAY['audio/mpeg', 'audio/mp3']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read free audit audio briefs" ON storage.objects;
CREATE POLICY "Public read free audit audio briefs"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'free-audit-audio');

DROP POLICY IF EXISTS "Service role manage free audit audio briefs" ON storage.objects;
CREATE POLICY "Service role manage free audit audio briefs"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'free-audit-audio')
WITH CHECK (bucket_id = 'free-audit-audio');
