-- Allow campaign & retainer consultation bookings on Leads

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_booking_kind_check;
ALTER TABLE public.meetings ADD CONSTRAINT meetings_booking_kind_check
  CHECK (
    booking_kind IN (
      'full_program_sales',
      'creative_consultation',
      'telegram',
      'strategy_session',
      'campaign_retainer'
    )
  );
