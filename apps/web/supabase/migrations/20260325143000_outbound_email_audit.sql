-- Outbound email audit trail + dashboard access policies

CREATE TABLE IF NOT EXISTS public.outbound_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT NOT NULL DEFAULT 'resend',
  message_type TEXT NOT NULL,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  provider_message_id TEXT,
  error_message TEXT,
  related_table TEXT,
  related_id UUID,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  subscriber_id UUID REFERENCES public.subscribers(id) ON DELETE SET NULL,
  generated_by TEXT NOT NULL DEFAULT 'system' CHECK (generated_by IN ('human', 'gemini', 'system')),
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body_html TEXT,
  body_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbound_email_logs_created_at
  ON public.outbound_email_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outbound_email_logs_message_type
  ON public.outbound_email_logs(message_type);

CREATE INDEX IF NOT EXISTS idx_outbound_email_logs_to_email
  ON public.outbound_email_logs(to_email);

CREATE INDEX IF NOT EXISTS idx_outbound_email_logs_related
  ON public.outbound_email_logs(related_table, related_id);

CREATE INDEX IF NOT EXISTS idx_outbound_email_logs_subscriber
  ON public.outbound_email_logs(subscriber_id);

ALTER TABLE public.outbound_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard roles can read outbound email logs" ON public.outbound_email_logs;
CREATE POLICY "Dashboard roles can read outbound email logs"
ON public.outbound_email_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);

DROP POLICY IF EXISTS "Dashboard roles can delete subscribers" ON public.subscribers;
CREATE POLICY "Dashboard roles can delete subscribers"
ON public.subscribers
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);

DROP POLICY IF EXISTS "Dashboard roles can read subscribers" ON public.subscribers;
CREATE POLICY "Dashboard roles can read subscribers"
ON public.subscribers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);
