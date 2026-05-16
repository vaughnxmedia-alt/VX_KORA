CREATE TABLE IF NOT EXISTS public.audit_agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.free_audits(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  knowledge_type TEXT NOT NULL CHECK (
    knowledge_type IN (
      'industry_profile',
      'audience_segment',
      'offer_path',
      'conversion_path',
      'proof_requirement',
      'strategic_summary'
    )
  ),
  knowledge_key TEXT NOT NULL,
  label TEXT NOT NULL,
  summary TEXT NOT NULL,
  confidence NUMERIC CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_agent_knowledge_audit_idx
  ON public.audit_agent_knowledge (audit_id, knowledge_type, confidence DESC);

CREATE INDEX IF NOT EXISTS audit_agent_knowledge_type_key_idx
  ON public.audit_agent_knowledge (knowledge_type, knowledge_key);

DROP TRIGGER IF EXISTS trg_audit_agent_knowledge_updated_at ON public.audit_agent_knowledge;
CREATE TRIGGER trg_audit_agent_knowledge_updated_at
BEFORE UPDATE ON public.audit_agent_knowledge
FOR EACH ROW EXECUTE FUNCTION public.lls_set_updated_at();

ALTER TABLE public.audit_agent_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard staff manage audit agent knowledge" ON public.audit_agent_knowledge;
CREATE POLICY "Dashboard staff manage audit agent knowledge"
ON public.audit_agent_knowledge FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

GRANT SELECT, UPDATE ON public.audit_agent_knowledge TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_agent_knowledge TO service_role;
