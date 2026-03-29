-- RLS: admins can manage strategy_session_hosts (dashboard + seed-friendly)
-- Seed: Jocelyn (default public) + Justice from auth.users by email when present

GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_session_hosts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_session_hosts TO service_role;

DROP POLICY IF EXISTS "Admins manage strategy_session_hosts" ON public.strategy_session_hosts;
CREATE POLICY "Admins manage strategy_session_hosts"
  ON public.strategy_session_hosts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

COMMENT ON POLICY "Admins manage strategy_session_hosts" ON public.strategy_session_hosts IS
  'Dashboard: list/add/edit strategists and referral codes. Edge Functions use service role.';

-- At most one is_default_public (partial unique index); clear before re-seeding defaults
UPDATE public.strategy_session_hosts SET is_default_public = false WHERE is_default_public = true;

-- Jocelyn: default host for bookings with no referral code
INSERT INTO public.strategy_session_hosts (reference_code, user_id, display_name, is_default_public, active)
SELECT
  'JOCELYN',
  u.id,
  'Jocelyn',
  true,
  true
FROM auth.users u
WHERE u.email = lower('jocelyncavinessbrigman@gmail.com')
ON CONFLICT (reference_code) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  display_name = EXCLUDED.display_name,
  is_default_public = EXCLUDED.is_default_public,
  active = EXCLUDED.active,
  updated_at = NOW();

-- Justice: referral code for in-person / card handoffs
INSERT INTO public.strategy_session_hosts (reference_code, user_id, display_name, is_default_public, active)
SELECT
  'JUSTICE',
  u.id,
  'Justice',
  false,
  true
FROM auth.users u
WHERE u.email = lower('justicevaughn7@gmail.com')
ON CONFLICT (reference_code) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  display_name = EXCLUDED.display_name,
  is_default_public = false,
  active = EXCLUDED.active,
  updated_at = NOW();

-- Per-host schedules: Mon–Thu 3pm–7pm ET (day_end exclusive → last slot starts 6pm for 60m slots)
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
  u.id,
  true,
  'America/New_York',
  ARRAY[1, 2, 3, 4]::smallint[],
  TIME '15:00',
  TIME '19:00',
  60
FROM auth.users u
WHERE u.email IN (
  lower('jocelyncavinessbrigman@gmail.com'),
  lower('justicevaughn7@gmail.com')
)
ON CONFLICT (host_user_id) DO UPDATE SET
  active = EXCLUDED.active,
  timezone = EXCLUDED.timezone,
  weekdays = EXCLUDED.weekdays,
  day_start = EXCLUDED.day_start,
  day_end = EXCLUDED.day_end,
  slot_duration_minutes = EXCLUDED.slot_duration_minutes,
  updated_at = NOW();
