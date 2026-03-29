-- Classify inbound calls for Leads list (independent of zoom vs in-person session_type)

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS booking_kind TEXT NOT NULL DEFAULT 'full_program_sales';

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_booking_kind_check;
ALTER TABLE public.meetings ADD CONSTRAINT meetings_booking_kind_check
  CHECK (
    booking_kind IN (
      'full_program_sales',
      'creative_consultation',
      'telegram',
      'strategy_session'
    )
  );

COMMENT ON COLUMN public.meetings.booking_kind IS
  'Lead source / call type for dashboard filtering (full_program_sales, creative_consultation, telegram, strategy_session).';
