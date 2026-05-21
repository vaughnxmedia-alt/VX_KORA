-- Subscriber email marketing: scheduled campaigns + clear legacy pending state

UPDATE public.subscribers
SET email_sent = true
WHERE email_sent = false;

CREATE TABLE IF NOT EXISTS public.subscriber_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly', 'one_time')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  subject TEXT,
  preview_line TEXT,
  custom_cta_label TEXT NOT NULL DEFAULT 'Read The Brief',
  custom_cta_url TEXT NOT NULL DEFAULT 'https://www.jahknowspr.com/the-brief',
  use_latest_blog BOOLEAN NOT NULL DEFAULT false,
  send_time TIME NOT NULL DEFAULT '09:00:00',
  send_day_of_week TEXT CHECK (
    send_day_of_week IS NULL OR
    send_day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  ),
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriber_email_campaigns_active
  ON public.subscriber_email_campaigns(is_active, next_send_at)
  WHERE is_active = true;

CREATE TRIGGER update_subscriber_email_campaigns_updated_at
  BEFORE UPDATE ON public.subscriber_email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.subscriber_email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard roles manage subscriber email campaigns" ON public.subscriber_email_campaigns;
CREATE POLICY "Dashboard roles manage subscriber email campaigns"
ON public.subscriber_email_campaigns
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('admin', 'author', 'intern', '3pv')
  )
);
