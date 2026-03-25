-- Owner oversight: one strategist (e.g. super owner) can read all meetings + host directory for dashboard filtering

ALTER TABLE public.strategy_session_hosts
  ADD COLUMN IF NOT EXISTS can_view_all_meetings boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.strategy_session_hosts.can_view_all_meetings IS
  'When true, this user can SELECT all meetings and all strategy_session_hosts rows (Meetings dashboard host filter).';

-- Each strategist can read their own host row (flags, codes, etc.)
DROP POLICY IF EXISTS "Strategy hosts can read own row" ON public.strategy_session_hosts;
CREATE POLICY "Strategy hosts can read own row"
ON public.strategy_session_hosts FOR SELECT
USING (user_id = auth.uid());

-- Oversight: see every meeting (same rows as admin; complements host-only policy)
DROP POLICY IF EXISTS "Strategy session oversight can view all meetings" ON public.meetings;
CREATE POLICY "Strategy session oversight can view all meetings"
ON public.meetings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.strategy_session_hosts h
    WHERE h.user_id = auth.uid()
      AND h.active = true
      AND h.can_view_all_meetings = true
  )
);

-- Oversight: load full host list for dropdown (does not depend on row being selected)
DROP POLICY IF EXISTS "Strategy session oversight can list all hosts" ON public.strategy_session_hosts;
CREATE POLICY "Strategy session oversight can list all hosts"
ON public.strategy_session_hosts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.strategy_session_hosts self
    WHERE self.user_id = auth.uid()
      AND self.active = true
      AND self.can_view_all_meetings = true
  )
);
