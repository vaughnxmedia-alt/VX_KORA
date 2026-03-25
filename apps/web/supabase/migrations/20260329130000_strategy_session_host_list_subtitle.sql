-- Optional label after display name in parens (brand or nickname), e.g. Jocelyn (Jahknowspr)
ALTER TABLE public.strategy_session_hosts
  ADD COLUMN IF NOT EXISTS list_subtitle TEXT;

COMMENT ON COLUMN public.strategy_session_hosts.list_subtitle IS
  'Optional short label shown in parentheses next to display_name in UI (e.g. brand Jahknowspr, nickname Juss). Reference code stays separate for booking.';
