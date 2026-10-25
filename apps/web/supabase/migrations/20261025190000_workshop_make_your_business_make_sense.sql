-- Make Your Business Make Sense: one reusable workshop record and its registrations.
-- Paid registration stays closed until date, time zone, cancellation terms, Zoom URL,
-- capacity, and price are set and an owner or strategist opens registration.

CREATE TABLE IF NOT EXISTS public.workshop_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  host_name text NOT NULL DEFAULT 'JahKnowsPR',
  format_label text NOT NULL DEFAULT 'Live, interactive workshop on Zoom',
  audience_label text NOT NULL DEFAULT 'Service business owners',
  duration_minutes integer NOT NULL DEFAULT 120,
  starts_at timestamptz,
  timezone text,
  capacity integer,
  price_cents integer,
  currency text NOT NULL DEFAULT 'USD',
  cancellation_terms text,
  preparation_notes text,
  zoom_url text,
  registration_open boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workshop_events_duration_check CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  CONSTRAINT workshop_events_capacity_check CHECK (capacity IS NULL OR (capacity > 0 AND capacity <= 500)),
  CONSTRAINT workshop_events_price_check CHECK (price_cents IS NULL OR (price_cents > 0 AND price_cents <= 100000000)),
  CONSTRAINT workshop_events_currency_check CHECK (currency = 'USD'),
  CONSTRAINT workshop_events_zoom_url_check CHECK (zoom_url IS NULL OR zoom_url ~ '^https://')
);

COMMENT ON COLUMN public.workshop_events.zoom_url IS
  'Server-only. Never return this column from public RPCs or client bundles.';
COMMENT ON COLUMN public.workshop_events.registration_open IS
  'Must stay false until the event date, time zone, cancellation terms, and Zoom URL are configured.';

CREATE TABLE IF NOT EXISTS public.workshop_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.workshop_events(id) ON DELETE CASCADE,
  confirmation_token text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  business_name text NOT NULL,
  business_type text NOT NULL,
  misunderstanding text NOT NULL,
  marketing_consent boolean NOT NULL DEFAULT false,
  cancellation_acknowledged_at timestamptz NOT NULL,
  status text NOT NULL,
  hold_expires_at timestamptz,
  idempotency_key uuid NOT NULL UNIQUE,
  square_payment_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  payment_note text,
  confirmation_email_status text NOT NULL DEFAULT 'not_sent',
  confirmation_email_attempted_at timestamptz,
  confirmation_email_sent_at timestamptz,
  confirmation_email_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workshop_registrations_status_check CHECK (
    status IN ('pending_payment', 'confirmed', 'failed', 'canceled', 'refunded', 'expired', 'paid_unseated')
  ),
  CONSTRAINT workshop_registrations_email_status_check CHECK (
    confirmation_email_status IN ('not_sent', 'sending', 'sent', 'failed')
  ),
  CONSTRAINT workshop_registrations_email_lower_check CHECK (email = lower(email)),
  CONSTRAINT workshop_registrations_amount_check CHECK (amount_cents > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS workshop_registrations_confirmed_email_idx
  ON public.workshop_registrations (event_id, email)
  WHERE status = 'confirmed';

CREATE UNIQUE INDEX IF NOT EXISTS workshop_registrations_hold_email_idx
  ON public.workshop_registrations (event_id, email)
  WHERE status = 'pending_payment';

CREATE INDEX IF NOT EXISTS workshop_registrations_event_status_idx
  ON public.workshop_registrations (event_id, status);

CREATE TABLE IF NOT EXISTS public.workshop_webhook_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'square',
  notification_id text NOT NULL,
  payment_id text,
  event_type text,
  raw_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workshop_webhook_receipts_unique UNIQUE (provider, notification_id)
);

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS workshop_registration_id uuid REFERENCES public.workshop_registrations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payment_transactions_workshop_registration_idx
  ON public.payment_transactions (workshop_registration_id)
  WHERE workshop_registration_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.workshop_event_is_ready(p_event public.workshop_events)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_event.starts_at IS NULL OR p_event.starts_at <= now() THEN
    RETURN false;
  END IF;
  IF p_event.timezone IS NULL OR length(trim(p_event.timezone)) < 3 THEN
    RETURN false;
  END IF;
  BEGIN
    PERFORM now() AT TIME ZONE p_event.timezone;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  IF p_event.capacity IS NULL OR p_event.capacity < 1 THEN
    RETURN false;
  END IF;
  IF p_event.price_cents IS NULL OR p_event.price_cents < 1 THEN
    RETURN false;
  END IF;
  IF p_event.cancellation_terms IS NULL OR length(trim(p_event.cancellation_terms)) < 20 THEN
    RETURN false;
  END IF;
  IF p_event.zoom_url IS NULL OR p_event.zoom_url !~ '^https://' THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_events_guard_open()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.registration_open AND NOT public.workshop_event_is_ready(NEW) THEN
    RAISE EXCEPTION 'registration_closed_until_configured'
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workshop_events_guard_open ON public.workshop_events;
CREATE TRIGGER workshop_events_guard_open
  BEFORE INSERT OR UPDATE ON public.workshop_events
  FOR EACH ROW
  EXECUTE FUNCTION public.workshop_events_guard_open();

CREATE OR REPLACE FUNCTION public.is_workshop_manager(check_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_hq_role(check_uid) IN ('owner', 'strategist'), false);
$$;

CREATE OR REPLACE FUNCTION public.workshop_public_json(p_event public.workshop_events)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'ok', true,
    'slug', p_event.slug,
    'title', p_event.title,
    'host_name', p_event.host_name,
    'format_label', p_event.format_label,
    'audience_label', p_event.audience_label,
    'duration_minutes', p_event.duration_minutes,
    'starts_at', p_event.starts_at,
    'timezone', p_event.timezone,
    'capacity', p_event.capacity,
    'price_cents', CASE WHEN public.workshop_event_is_ready(p_event) THEN p_event.price_cents ELSE NULL END,
    'currency', p_event.currency,
    'cancellation_terms', NULLIF(trim(COALESCE(p_event.cancellation_terms, '')), ''),
    'preparation_notes', p_event.preparation_notes,
    'registration_open', p_event.registration_open,
    'configured', public.workshop_event_is_ready(p_event),
    'confirmed_count', (
      SELECT count(*)::int
      FROM public.workshop_registrations r
      WHERE r.event_id = p_event.id AND r.status = 'confirmed'
    ),
    'seats_remaining', CASE
      WHEN p_event.capacity IS NULL THEN NULL
      ELSE GREATEST(
        0,
        p_event.capacity - (
          SELECT count(*)::int
          FROM public.workshop_registrations r
          WHERE r.event_id = p_event.id
            AND (
              r.status = 'confirmed'
              OR (r.status = 'pending_payment' AND r.hold_expires_at > now())
            )
        )
      )
    END
  );
$$;

CREATE OR REPLACE FUNCTION public.workshop_event_public(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.workshop_events;
  v_json jsonb;
BEGIN
  SELECT * INTO v_event FROM public.workshop_events WHERE slug = trim(p_slug);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  v_json := public.workshop_public_json(v_event);
  v_json := v_json || jsonb_build_object(
    'purchasable',
    COALESCE((v_json->>'configured')::boolean, false)
      AND v_event.registration_open
      AND COALESCE((v_json->>'seats_remaining')::int, 0) > 0
  );
  RETURN v_json;
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_registration_status(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg public.workshop_registrations;
  v_event public.workshop_events;
BEGIN
  SELECT * INTO v_reg
  FROM public.workshop_registrations
  WHERE confirmation_token = trim(COALESCE(p_token, ''));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  SELECT * INTO v_event FROM public.workshop_events WHERE id = v_reg.event_id;
  RETURN jsonb_build_object(
    'ok', true,
    'status', v_reg.status,
    'full_name', v_reg.full_name,
    'email', v_reg.email,
    'confirmation_email_status', v_reg.confirmation_email_status,
    'amount_cents', v_reg.amount_cents,
    'currency', v_reg.currency,
    'event', public.workshop_public_json(v_event) - 'confirmed_count' - 'seats_remaining'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_workshop_seat(
  p_slug text,
  p_full_name text,
  p_email text,
  p_business_name text,
  p_business_type text,
  p_misunderstanding text,
  p_marketing_consent boolean,
  p_cancellation_acknowledged boolean,
  p_confirmation_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_event public.workshop_events;
  v_email text := lower(trim(COALESCE(p_email, '')));
  v_name text := trim(COALESCE(p_full_name, ''));
  v_business text := trim(COALESCE(p_business_name, ''));
  v_type text := trim(COALESCE(p_business_type, ''));
  v_misunderstanding text := trim(COALESCE(p_misunderstanding, ''));
  v_existing public.workshop_registrations;
  v_taken integer;
  v_row public.workshop_registrations;
BEGIN
  IF NOT COALESCE(p_cancellation_acknowledged, false) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_acknowledged');
  END IF;
  IF length(v_name) < 2 OR length(v_name) > 120
    OR length(v_email) < 5 OR length(v_email) > 180 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    OR length(v_business) < 1 OR length(v_business) > 160
    OR length(v_type) < 1 OR length(v_type) > 120
    OR length(v_misunderstanding) < 2 OR length(v_misunderstanding) > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  SELECT * INTO v_event FROM public.workshop_events WHERE slug = trim(p_slug) FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;
  IF NOT public.workshop_event_is_ready(v_event) OR NOT v_event.registration_open THEN
    RETURN jsonb_build_object('ok', false, 'code', 'registration_closed');
  END IF;

  UPDATE public.workshop_registrations
  SET status = 'expired', updated_at = now()
  WHERE event_id = v_event.id
    AND status = 'pending_payment'
    AND hold_expires_at <= now();

  SELECT * INTO v_existing
  FROM public.workshop_registrations
  WHERE event_id = v_event.id AND email = v_email AND status = 'confirmed'
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_registered');
  END IF;

  SELECT * INTO v_existing
  FROM public.workshop_registrations
  WHERE event_id = v_event.id AND email = v_email AND status = 'pending_payment'
  LIMIT 1;
  IF FOUND THEN
    IF v_existing.confirmation_token IS DISTINCT FROM NULLIF(trim(COALESCE(p_confirmation_token, '')), '') THEN
      RETURN jsonb_build_object('ok', false, 'code', 'checkout_in_progress');
    END IF;
    RETURN jsonb_build_object(
      'ok', true,
      'reused', true,
      'registration_id', v_existing.id,
      'confirmation_token', v_existing.confirmation_token,
      'idempotency_key', v_existing.idempotency_key,
      'amount_cents', v_existing.amount_cents,
      'currency', v_existing.currency,
      'email', v_existing.email
    );
  END IF;

  SELECT count(*)::int INTO v_taken
  FROM public.workshop_registrations r
  WHERE r.event_id = v_event.id
    AND (
      r.status = 'confirmed'
      OR (r.status = 'pending_payment' AND r.hold_expires_at > now())
    );
  IF v_taken >= v_event.capacity THEN
    RETURN jsonb_build_object('ok', false, 'code', 'sold_out');
  END IF;

  BEGIN
    INSERT INTO public.workshop_registrations (
      event_id, confirmation_token, full_name, email, business_name, business_type,
      misunderstanding, marketing_consent, cancellation_acknowledged_at, status,
      hold_expires_at, idempotency_key, amount_cents, currency
    ) VALUES (
      v_event.id,
      encode(extensions.gen_random_bytes(24), 'hex'),
      v_name,
      v_email,
      v_business,
      v_type,
      v_misunderstanding,
      COALESCE(p_marketing_consent, false),
      now(),
      'pending_payment',
      now() + interval '15 minutes',
      gen_random_uuid(),
      v_event.price_cents,
      v_event.currency
    )
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'checkout_in_progress');
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'reused', false,
    'registration_id', v_row.id,
    'confirmation_token', v_row.confirmation_token,
    'idempotency_key', v_row.idempotency_key,
    'amount_cents', v_row.amount_cents,
    'currency', v_row.currency,
    'email', v_row.email
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_workshop_payment(
  p_registration_id uuid,
  p_square_payment_id text,
  p_raw_status text,
  p_amount_cents integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg public.workshop_registrations;
  v_event public.workshop_events;
  v_status text := upper(trim(COALESCE(p_raw_status, '')));
  v_others integer;
  v_duplicate uuid;
  v_should_email boolean := false;
BEGIN
  IF p_registration_id IS NOT NULL THEN
    SELECT * INTO v_reg FROM public.workshop_registrations WHERE id = p_registration_id FOR UPDATE;
  ELSIF p_square_payment_id IS NOT NULL THEN
    SELECT * INTO v_reg FROM public.workshop_registrations WHERE square_payment_id = p_square_payment_id FOR UPDATE;
  END IF;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  SELECT * INTO v_event FROM public.workshop_events WHERE id = v_reg.event_id FOR UPDATE;

  IF p_amount_cents IS NOT NULL AND p_amount_cents <> v_reg.amount_cents AND v_status = 'COMPLETED' THEN
    UPDATE public.workshop_registrations
    SET square_payment_id = COALESCE(square_payment_id, p_square_payment_id),
        payment_note = 'amount_mismatch',
        status = CASE WHEN status = 'confirmed' THEN status ELSE 'paid_unseated' END,
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = v_reg.id;
    RETURN jsonb_build_object('ok', false, 'code', 'amount_mismatch', 'status', 'paid_unseated');
  END IF;

  IF v_status = 'COMPLETED' THEN
    IF v_reg.status = 'confirmed' AND (v_reg.square_payment_id IS NULL OR v_reg.square_payment_id = p_square_payment_id) THEN
      UPDATE public.workshop_registrations
      SET square_payment_id = COALESCE(square_payment_id, p_square_payment_id), updated_at = now()
      WHERE id = v_reg.id
      RETURNING * INTO v_reg;
      RETURN jsonb_build_object(
        'ok', true, 'duplicate', true, 'status', 'confirmed',
        'registration_id', v_reg.id, 'confirmation_token', v_reg.confirmation_token,
        'should_email', v_reg.confirmation_email_status IN ('not_sent', 'failed')
      );
    END IF;

    IF v_reg.status = 'confirmed' AND v_reg.square_payment_id IS DISTINCT FROM p_square_payment_id THEN
      UPDATE public.workshop_registrations
      SET payment_note = 'duplicate_payment', updated_at = now()
      WHERE id = v_reg.id;
      RETURN jsonb_build_object('ok', true, 'duplicate', true, 'code', 'duplicate_payment', 'status', 'confirmed', 'should_email', false);
    END IF;

    SELECT id INTO v_duplicate
    FROM public.workshop_registrations
    WHERE event_id = v_reg.event_id AND email = v_reg.email AND status = 'confirmed' AND id <> v_reg.id
    LIMIT 1;
    IF v_duplicate IS NOT NULL THEN
      UPDATE public.workshop_registrations
      SET status = 'paid_unseated', square_payment_id = p_square_payment_id, hold_expires_at = NULL,
          payment_note = 'duplicate_registration', updated_at = now()
      WHERE id = v_reg.id;
      RETURN jsonb_build_object('ok', true, 'status', 'paid_unseated', 'code', 'duplicate_registration', 'should_email', false);
    END IF;

    IF v_reg.status IS DISTINCT FROM 'pending_payment' OR v_reg.hold_expires_at IS NULL OR v_reg.hold_expires_at <= now() THEN
      SELECT count(*)::int INTO v_others
      FROM public.workshop_registrations r
      WHERE r.event_id = v_reg.event_id
        AND r.id <> v_reg.id
        AND (
          r.status = 'confirmed'
          OR (r.status = 'pending_payment' AND r.hold_expires_at > now())
        );
      IF v_others >= v_event.capacity THEN
        UPDATE public.workshop_registrations
        SET status = 'paid_unseated', square_payment_id = p_square_payment_id, hold_expires_at = NULL,
            payment_note = 'sold_out_after_payment', updated_at = now()
        WHERE id = v_reg.id;
        RETURN jsonb_build_object('ok', true, 'status', 'paid_unseated', 'code', 'sold_out', 'should_email', false);
      END IF;
    END IF;

    UPDATE public.workshop_registrations
    SET status = 'confirmed', square_payment_id = p_square_payment_id, hold_expires_at = NULL, updated_at = now()
    WHERE id = v_reg.id
    RETURNING * INTO v_reg;
    v_should_email := v_reg.confirmation_email_status IN ('not_sent', 'failed');
    RETURN jsonb_build_object(
      'ok', true, 'status', 'confirmed', 'should_email', v_should_email,
      'registration_id', v_reg.id, 'confirmation_token', v_reg.confirmation_token, 'duplicate', false
    );
  END IF;

  IF v_status IN ('PENDING', 'APPROVED') THEN
    IF v_reg.status = 'confirmed' THEN
      RETURN jsonb_build_object('ok', true, 'status', 'confirmed', 'ignored', true, 'should_email', false);
    END IF;
    UPDATE public.workshop_registrations
    SET square_payment_id = COALESCE(p_square_payment_id, square_payment_id), updated_at = now()
    WHERE id = v_reg.id;
    RETURN jsonb_build_object('ok', true, 'status', 'pending_payment', 'should_email', false, 'confirmation_token', v_reg.confirmation_token);
  END IF;

  IF v_status = 'REFUNDED' THEN
    IF p_amount_cents IS NOT NULL AND p_amount_cents < v_reg.amount_cents THEN
      UPDATE public.workshop_registrations
      SET payment_note = 'partial_refund', updated_at = now()
      WHERE id = v_reg.id;
      RETURN jsonb_build_object('ok', true, 'status', v_reg.status, 'code', 'partial_refund', 'should_email', false);
    END IF;
    UPDATE public.workshop_registrations
    SET status = 'refunded', square_payment_id = COALESCE(square_payment_id, p_square_payment_id),
        hold_expires_at = NULL, updated_at = now()
    WHERE id = v_reg.id;
    RETURN jsonb_build_object('ok', true, 'status', 'refunded', 'should_email', false);
  END IF;

  IF v_status IN ('FAILED', 'CANCELED', 'CANCELLED') THEN
    IF v_reg.status = 'confirmed' THEN
      RETURN jsonb_build_object('ok', true, 'status', 'confirmed', 'ignored', true, 'should_email', false);
    END IF;
    UPDATE public.workshop_registrations
    SET status = CASE WHEN v_status = 'FAILED' THEN 'failed' ELSE 'canceled' END,
        square_payment_id = COALESCE(square_payment_id, p_square_payment_id),
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = v_reg.id;
    RETURN jsonb_build_object(
      'ok', true,
      'status', CASE WHEN v_status = 'FAILED' THEN 'failed' ELSE 'canceled' END,
      'should_email', false
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', v_reg.status, 'ignored', true, 'should_email', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_workshop_confirmation_email(
  p_registration_id uuid,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg public.workshop_registrations;
  v_event public.workshop_events;
BEGIN
  SELECT * INTO v_reg
  FROM public.workshop_registrations
  WHERE id = p_registration_id AND status = 'confirmed'
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_confirmed');
  END IF;

  IF NOT (
    v_reg.confirmation_email_status IN ('not_sent', 'failed')
    OR (
      v_reg.confirmation_email_status = 'sending'
      AND v_reg.confirmation_email_attempted_at < now() - interval '10 minutes'
    )
    OR (
      COALESCE(p_force, false)
      AND (
        v_reg.confirmation_email_status <> 'sending'
        OR v_reg.confirmation_email_attempted_at < now() - interval '2 minutes'
      )
    )
  ) THEN
    RETURN jsonb_build_object('ok', true, 'claimed', false, 'email_status', v_reg.confirmation_email_status);
  END IF;

  UPDATE public.workshop_registrations
  SET confirmation_email_status = 'sending', confirmation_email_attempted_at = now(), updated_at = now()
  WHERE id = v_reg.id
  RETURNING * INTO v_reg;

  SELECT * INTO v_event FROM public.workshop_events WHERE id = v_reg.event_id;

  RETURN jsonb_build_object(
    'ok', true,
    'claimed', true,
    'registration_id', v_reg.id,
    'confirmation_token', v_reg.confirmation_token,
    'full_name', v_reg.full_name,
    'email', v_reg.email,
    'business_name', v_reg.business_name,
    'title', v_event.title,
    'starts_at', v_event.starts_at,
    'timezone', v_event.timezone,
    'duration_minutes', v_event.duration_minutes,
    'preparation_notes', v_event.preparation_notes,
    'cancellation_terms', v_event.cancellation_terms,
    'amount_cents', v_reg.amount_cents,
    'currency', v_reg.currency,
    'zoom_url', v_event.zoom_url
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_workshop_confirmation_email(
  p_registration_id uuid,
  p_result text,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_result = 'sent' THEN
    UPDATE public.workshop_registrations
    SET confirmation_email_status = 'sent',
        confirmation_email_sent_at = now(),
        confirmation_email_error = NULL,
        updated_at = now()
    WHERE id = p_registration_id AND confirmation_email_status = 'sending';
  ELSE
    UPDATE public.workshop_registrations
    SET confirmation_email_status = 'failed',
        confirmation_email_error = left(COALESCE(p_error, 'Email could not be sent.'), 500),
        updated_at = now()
    WHERE id = p_registration_id AND confirmation_email_status = 'sending';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.workshop_event_is_ready(public.workshop_events) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workshop_events_guard_open() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_workshop_manager(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workshop_public_json(public.workshop_events) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workshop_event_public(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workshop_registration_status(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_workshop_seat(text, text, text, text, text, text, boolean, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_workshop_payment(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_workshop_confirmation_email(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_workshop_confirmation_email(uuid, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_hq_role(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_workshop_manager(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workshop_event_public(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workshop_registration_status(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_workshop_seat(text, text, text, text, text, text, boolean, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_workshop_payment(uuid, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_workshop_confirmation_email(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_workshop_confirmation_email(uuid, text, text) TO service_role;

ALTER TABLE public.workshop_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_webhook_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workshop_events_manager_all ON public.workshop_events;
CREATE POLICY workshop_events_manager_all
  ON public.workshop_events
  FOR ALL
  TO authenticated
  USING (public.is_workshop_manager(auth.uid()))
  WITH CHECK (public.is_workshop_manager(auth.uid()));

DROP POLICY IF EXISTS workshop_registrations_manager_select ON public.workshop_registrations;
CREATE POLICY workshop_registrations_manager_select
  ON public.workshop_registrations
  FOR SELECT
  TO authenticated
  USING (public.is_workshop_manager(auth.uid()));

REVOKE ALL ON public.workshop_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.workshop_registrations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.workshop_webhook_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.workshop_events TO authenticated;
GRANT SELECT ON public.workshop_registrations TO authenticated;
GRANT ALL ON public.workshop_events TO service_role;
GRANT ALL ON public.workshop_registrations TO service_role;
GRANT ALL ON public.workshop_webhook_receipts TO service_role;

INSERT INTO public.workshop_events (
  slug, title, host_name, format_label, audience_label, duration_minutes,
  capacity, price_cents, currency, registration_open, preparation_notes
) VALUES (
  'make-your-business-make-sense',
  'Make Your Business Make Sense',
  'JahKnowsPR',
  'Live, interactive workshop on Zoom',
  'Service business owners',
  120,
  12,
  4900,
  'USD',
  false,
  'Plan to join live for the full two hours. Bring a notebook. You will write about your customer, your introduction, and your messages during the workshop. Three volunteers will be invited to have a message reviewed.'
)
ON CONFLICT (slug) DO NOTHING;
