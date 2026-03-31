-- Strategy Session public hours: Tuesday–Thursday 9:00am–5:00pm Eastern (day_end exclusive → last 60m slot starts 4:00pm)
-- Re-open schedules that were turned off in the dashboard (active = true)
-- Justice (justicevaughn7@gmail.com): Meetings dashboard oversight — see all strategists’ sessions + host filter

INSERT INTO public.strategy_session_host_schedule (
  host_user_id,
  active,
  timezone,
  weekdays,
  day_start,
  day_end,
  slot_duration_minutes
)
SELECT
  h.user_id,
  true,
  'America/New_York',
  ARRAY[2, 3, 4]::smallint[],
  TIME '09:00',
  TIME '17:00',
  60
FROM public.strategy_session_hosts h
WHERE h.active = true
ON CONFLICT (host_user_id) DO UPDATE SET
  active = true,
  timezone = EXCLUDED.timezone,
  weekdays = EXCLUDED.weekdays,
  day_start = EXCLUDED.day_start,
  day_end = EXCLUDED.day_end,
  slot_duration_minutes = EXCLUDED.slot_duration_minutes,
  updated_at = NOW();

ALTER TABLE public.strategy_session_host_schedule
  ALTER COLUMN weekdays SET DEFAULT ARRAY[2, 3, 4]::smallint[],
  ALTER COLUMN day_start SET DEFAULT TIME '09:00',
  ALTER COLUMN day_end SET DEFAULT TIME '17:00';

COMMENT ON COLUMN public.strategy_session_host_schedule.weekdays IS
  'Luxon ISO weekdays 1=Mon..7=Sun. Default Tue–Thu (2,3,4) for strategy sessions.';

-- Only Justice gets “all hosts” meeting visibility (RLS oversight policies).
UPDATE public.strategy_session_hosts SET can_view_all_meetings = false;

UPDATE public.strategy_session_hosts h
SET can_view_all_meetings = true
FROM auth.users u
WHERE h.user_id = u.id
  AND h.active = true
  AND lower(trim(u.email)) = lower(trim('justicevaughn7@gmail.com'));
