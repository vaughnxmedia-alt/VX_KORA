CREATE TABLE IF NOT EXISTS public.audit_social_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.free_audits(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (
    source_type IN (
      'meta_graph_api',
      'business_discovery',
      'connected_account',
      'website',
      'public_profile',
      'screenshot',
      'public_data_provider',
      'manual_admin_note'
    )
  ),
  source_url TEXT NOT NULL,
  source_label TEXT,
  raw_observation TEXT,
  normalized_observation TEXT NOT NULL,
  evidence_category TEXT NOT NULL CHECK (
    evidence_category IN (
      'positioning',
      'audience',
      'authority',
      'messaging',
      'conversion',
      'content_consistency',
      'offer_clarity',
      'trust_signals',
      'visual_identity',
      'engagement_quality'
    )
  ),
  confidence_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_in_report BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.free_audits(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  finding_category TEXT NOT NULL CHECK (
    finding_category IN (
      'positioning_gap',
      'audience_clarity_gap',
      'authority_gap',
      'messaging_gap',
      'conversion_gap',
      'missed_opportunity',
      'priority_next_move'
    )
  ),
  finding_title TEXT NOT NULL,
  finding_summary TEXT NOT NULL,
  evidence_ids UUID[] NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high')),
  confidence_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  recommended_action TEXT NOT NULL,
  report_ready BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_social_evidence_audit_idx
  ON public.audit_social_evidence (audit_id, evidence_category, confidence_score DESC, captured_at DESC);

CREATE INDEX IF NOT EXISTS audit_social_evidence_source_idx
  ON public.audit_social_evidence (source_type, platform, captured_at DESC);

CREATE INDEX IF NOT EXISTS audit_findings_audit_idx
  ON public.audit_findings (audit_id, report_ready, confidence_score DESC, created_at DESC);

ALTER TABLE public.audit_social_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard staff manage audit social evidence" ON public.audit_social_evidence;
CREATE POLICY "Dashboard staff manage audit social evidence"
ON public.audit_social_evidence FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "Dashboard staff manage audit findings" ON public.audit_findings;
CREATE POLICY "Dashboard staff manage audit findings"
ON public.audit_findings FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

GRANT SELECT, UPDATE ON public.audit_social_evidence TO authenticated;
GRANT SELECT, UPDATE ON public.audit_findings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_social_evidence TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_findings TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'free-audit-evidence',
  'free-audit-evidence',
  false,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/json']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Dashboard staff read free audit evidence files" ON storage.objects;
CREATE POLICY "Dashboard staff read free audit evidence files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'free-audit-evidence'
  AND public.is_dashboard_operator(auth.uid())
);

DROP POLICY IF EXISTS "Service role manage free audit evidence files" ON storage.objects;
CREATE POLICY "Service role manage free audit evidence files"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'free-audit-evidence')
WITH CHECK (bucket_id = 'free-audit-evidence');
