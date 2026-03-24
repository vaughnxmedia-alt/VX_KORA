-- Per-host Strategy Session availability (source of truth for Edge slot generation)
-- Service role (Edge) bypasses RLS; dashboard admins edit via RLS policies below.

CREATE TABLE IF NOT EXISTS public.strategy_session_host_schedule (
  host_user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  weekdays SMALLINT[] NOT NULL DEFAULT ARRAY [1, 2, 3, 4]::smallint[],
  day_start TIME NOT NULL DEFAULT TIME '09:00',
  day_end TIME NOT NULL DEFAULT TIME '18:00',
  slot_duration_minutes INT NOT NULL DEFAULT 60,
  CONSTRAINT strategy_session_host_schedule_weekdays_nonempty CHECK (
    array_length(weekdays, 1) IS NOT NULL AND array_length(weekdays, 1) > 0
  ),
  CONSTRAINT strategy_session_host_schedule_slot_duration CHECK (
    slot_duration_minutes >= 15 AND slot_duration_minutes <= 240
  ),
  CONSTRAINT strategy_session_host_schedule_hours CHECK (day_start < day_end),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.strategy_session_host_schedule IS 'Business hours + weekdays for Strategy Session slot generation (Luxon ISO weekdays 1=Mon..7=Sun).';
COMMENT ON COLUMN public.strategy_session_host_schedule.day_end IS 'Exclusive end of bookable window in host timezone (last slot starts at day_end - slot duration).';

CREATE TABLE IF NOT EXISTS public.strategy_session_schedule_block (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (host_user_id, block_date)
);

CREATE INDEX IF NOT EXISTS strategy_session_schedule_block_host_idx
  ON public.strategy_session_schedule_block (host_user_id);

CREATE TABLE IF NOT EXISTS public.strategy_session_schedule_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  on_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  time_windows JSONB,
  UNIQUE (host_user_id, on_date)
);

CREATE INDEX IF NOT EXISTS strategy_session_schedule_override_host_idx
  ON public.strategy_session_schedule_override (host_user_id);

COMMENT ON COLUMN public.strategy_session_schedule_override.time_windows IS 'Optional [[start,end],...] as ["HH:MM","HH:MM"] in host schedule timezone; omit for default hours when is_closed = false.';

ALTER TABLE public.strategy_session_host_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_session_schedule_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_session_schedule_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage strategy_session_host_schedule"
  ON public.strategy_session_host_schedule
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins manage strategy_session_schedule_block"
  ON public.strategy_session_schedule_block
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins manage strategy_session_schedule_override"
  ON public.strategy_session_schedule_override
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_session_host_schedule TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_session_schedule_block TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_session_schedule_override TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_session_host_schedule TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_session_schedule_block TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategy_session_schedule_override TO service_role;
