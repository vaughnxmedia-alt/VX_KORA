-- Strategy Session: extend client_status and meetings for public booking + dashboard pipeline

-- 1) New pipeline status for Strategy Session leads (stay on Leads until promoted)
ALTER TYPE public.client_status ADD VALUE IF NOT EXISTS 'strategy_session_pending';

-- 2) Meetings: strategy session intake, booking lifecycle, admin confirmation
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website_or_social TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS offer_summary TEXT,
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS current_challenge TEXT,
  ADD COLUMN IF NOT EXISTS session_goal TEXT,
  ADD COLUMN IF NOT EXISTS session_type TEXT,
  ADD COLUMN IF NOT EXISTS in_person_location TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS service_name TEXT DEFAULT 'Strategy Session',
  ADD COLUMN IF NOT EXISTS service_price NUMERIC(10, 2) DEFAULT 150,
  ADD COLUMN IF NOT EXISTS questionnaire_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS additional_notes TEXT,
  ADD COLUMN IF NOT EXISTS admin_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.meetings.questionnaire_status IS 'pending | completed';
COMMENT ON COLUMN public.meetings.booking_status IS 'pending | booked | confirmed | completed | canceled | follow_up_needed';
COMMENT ON COLUMN public.meetings.payment_status IS 'unpaid | paid | pending';
COMMENT ON COLUMN public.meetings.confirmation_status IS 'pending | sent | failed';
COMMENT ON COLUMN public.meetings.admin_confirmed_at IS 'Set when admin confirms the booking in dashboard; required before promoting to active_client.';

-- Prevent double-booking: one Strategy Session per minute bucket (discrete slots align to minutes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_strategy_session_slot_minute
  ON public.meetings (date_trunc('minute', meeting_date))
  WHERE COALESCE(service_name, '') = 'Strategy Session';

-- updated_at trigger (reuse pattern if exists; else create)
CREATE OR REPLACE FUNCTION public.set_meetings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meetings_updated_at ON public.meetings;
CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_meetings_updated_at();
