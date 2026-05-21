-- Account timezone (editable in Settings) and Central-aware campaign scheduling

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Chicago';

COMMENT ON COLUMN public.profiles.timezone IS
  'IANA timezone for dashboard display and subscriber campaign send times. Default Central (America/Chicago).';

UPDATE public.profiles
SET timezone = 'America/Chicago'
WHERE timezone IS NULL OR btrim(timezone) = '';

ALTER TABLE public.subscriber_email_campaigns
  ALTER COLUMN send_time SET DEFAULT '11:00:00';

CREATE OR REPLACE FUNCTION public.compute_subscriber_campaign_next_send(
  p_cadence TEXT,
  p_send_time TIME,
  p_send_day_of_week TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT 'America/Chicago'
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_now TIMESTAMP;
  v_next TIMESTAMP;
  v_target_dow INTEGER;
BEGIN
  IF p_cadence = 'one_time' THEN
    RETURN NULL;
  END IF;

  v_now := (NOW() AT TIME ZONE COALESCE(NULLIF(btrim(p_timezone), ''), 'America/Chicago'));
  v_next := (v_now::DATE + p_send_time);

  IF v_next <= v_now THEN
    v_next := v_next + INTERVAL '1 day';
  END IF;

  IF p_cadence = 'weekly' THEN
    v_target_dow := CASE lower(COALESCE(p_send_day_of_week, 'monday'))
      WHEN 'sunday' THEN 0
      WHEN 'monday' THEN 1
      WHEN 'tuesday' THEN 2
      WHEN 'wednesday' THEN 3
      WHEN 'thursday' THEN 4
      WHEN 'friday' THEN 5
      WHEN 'saturday' THEN 6
      ELSE 1
    END;

    v_next := (
      v_now::DATE
      + ((v_target_dow - EXTRACT(DOW FROM v_now)::INTEGER + 7) % 7) * INTERVAL '1 day'
      + p_send_time
    );

    IF v_next <= v_now THEN
      v_next := v_next + INTERVAL '7 days';
    END IF;
  ELSIF p_cadence = 'monthly' THEN
    v_next := (date_trunc('month', v_now::DATE) + INTERVAL '1 month')::DATE + p_send_time;
    IF v_next <= v_now THEN
      v_next := (date_trunc('month', v_now::DATE) + INTERVAL '2 months')::DATE + p_send_time;
    END IF;
  END IF;

  RETURN v_next AT TIME ZONE COALESCE(NULLIF(btrim(p_timezone), ''), 'America/Chicago');
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_subscriber_campaign_next_send(TEXT, TIME, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_subscriber_campaign_next_send(TEXT, TIME, TEXT, TEXT) TO service_role;
