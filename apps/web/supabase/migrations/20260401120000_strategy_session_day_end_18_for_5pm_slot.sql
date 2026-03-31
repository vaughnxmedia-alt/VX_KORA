-- Hourly slots 9am–5pm ET: day_end is exclusive, so 18:00 allows a 60-minute slot starting at 17:00 (5pm).

UPDATE public.strategy_session_host_schedule s
SET
  day_end = TIME '18:00',
  updated_at = NOW()
FROM public.strategy_session_hosts h
WHERE s.host_user_id = h.user_id
  AND h.active = true;

ALTER TABLE public.strategy_session_host_schedule
  ALTER COLUMN day_end SET DEFAULT TIME '18:00';

COMMENT ON COLUMN public.strategy_session_host_schedule.day_end IS
  'Exclusive end of bookable window in host timezone. 18:00 with 60m slots → last start 17:00 (5pm).';
