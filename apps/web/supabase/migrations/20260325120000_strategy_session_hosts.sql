-- Per-host Strategy Session calendars + employee reference codes
-- After deploy: INSERT rows into strategy_session_hosts with real auth.users ids (Jocelyn = is_default_public true, Justice = code JUSTICE, etc.)

-- 1) Host directory (reference code -> auth user)
CREATE TABLE IF NOT EXISTS public.strategy_session_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  is_default_public BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT strategy_session_hosts_reference_code_upper CHECK (reference_code = upper(trim(reference_code)))
);

CREATE UNIQUE INDEX IF NOT EXISTS strategy_session_hosts_reference_code_key
  ON public.strategy_session_hosts (reference_code);

-- Only one default host for bookings with no employee code
CREATE UNIQUE INDEX IF NOT EXISTS strategy_session_hosts_one_default_public
  ON public.strategy_session_hosts ((1))
  WHERE is_default_public = true;

CREATE INDEX IF NOT EXISTS strategy_session_hosts_user_id_idx ON public.strategy_session_hosts (user_id);

COMMENT ON TABLE public.strategy_session_hosts IS 'Maps employee reference codes to auth users for Strategy Session routing.';
COMMENT ON COLUMN public.strategy_session_hosts.is_default_public IS 'Exactly one active row should be true (e.g. Jocelyn) for public bookings with no code.';

ALTER TABLE public.strategy_session_hosts ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; no public policies (hosts exposed only via Edge Functions)

-- 2) Meetings: host assignment + audit field (FK to profiles for PostgREST embeds; same id as auth.users)
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS employee_reference_code TEXT;

COMMENT ON COLUMN public.meetings.host_user_id IS 'Auth user whose calendar owns this Strategy Session.';
COMMENT ON COLUMN public.meetings.employee_reference_code IS 'Normalized code the client entered, or null if default host.';

-- 3) Replace global slot uniqueness with per-host uniqueness
DROP INDEX IF EXISTS public.idx_meetings_strategy_session_slot_minute;

CREATE UNIQUE INDEX IF NOT EXISTS idx_meetings_strategy_session_slot_per_host
  ON public.meetings (host_user_id, public.strategy_session_meeting_minute_utc(meeting_date))
  WHERE COALESCE(service_name, '') = 'Strategy Session'
    AND host_user_id IS NOT NULL;

-- 4) RLS: active strategy hosts can read meetings assigned to them (specialists / co-owners who are not only admin)
CREATE POLICY "Strategy session hosts can view their assigned meetings"
ON public.meetings
FOR SELECT
USING (
  host_user_id IS NOT NULL
  AND host_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.strategy_session_hosts h
    WHERE h.user_id = auth.uid()
      AND h.active = true
  )
);
