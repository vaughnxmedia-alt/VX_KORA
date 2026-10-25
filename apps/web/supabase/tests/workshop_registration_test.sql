-- Rolls back on failure because a raised exception aborts this DO block.
DO $$
DECLARE
  v_event_id uuid;
  v_public jsonb;
  v_first jsonb;
  v_second jsonb;
  v_third jsonb;
  v_again jsonb;
  v_status jsonb;
  v_reg_id uuid;
  v_confirmed integer;
BEGIN
  IF has_table_privilege('anon', 'public.workshop_registrations', 'SELECT') THEN
    RAISE EXCEPTION 'anon can read registrations';
  END IF;
  IF has_table_privilege('anon', 'public.workshop_events', 'SELECT') THEN
    RAISE EXCEPTION 'anon can read workshop events';
  END IF;
  IF NOT has_function_privilege('anon', 'public.workshop_event_public(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon cannot read the public event';
  END IF;
  IF has_function_privilege('anon', 'public.reserve_workshop_seat(text,text,text,text,text,text,boolean,boolean,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can reserve a seat';
  END IF;
  IF has_function_privilege('authenticated', 'public.claim_workshop_confirmation_email(uuid,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can read confirmation email secrets';
  END IF;

  INSERT INTO public.workshop_events (
    slug, title, starts_at, timezone, capacity, price_cents, currency,
    cancellation_terms, zoom_url, registration_open, duration_minutes
  ) VALUES (
    'workshop-test-capacity',
    'Capacity test',
    now() + interval '10 days',
    'America/Chicago',
    2,
    4900,
    'USD',
    'Cancel at least 48 hours before the workshop for a full refund.',
    'https://example.com/meetings/test-secret-do-not-leak',
    true,
    120
  ) RETURNING id INTO v_event_id;

  v_public := public.workshop_event_public('workshop-test-capacity');
  IF v_public ? 'zoom_url' OR v_public::text ILIKE '%test-secret-do-not-leak%' THEN
    RAISE EXCEPTION 'public event leaked zoom';
  END IF;
  IF COALESCE((v_public->>'purchasable')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'configured event should be purchasable';
  END IF;

  UPDATE public.workshop_events SET registration_open = false WHERE id = v_event_id;
  v_public := public.workshop_event_public('workshop-test-capacity');
  IF COALESCE((v_public->>'purchasable')::boolean, false) THEN
    RAISE EXCEPTION 'closed event was purchasable';
  END IF;
  IF public.reserve_workshop_seat(
    'workshop-test-capacity', 'Ada Owner', 'ada@example.com', 'Ada Co', 'Consulting',
    'People think it is a store.', false, true, NULL
  )->>'code' IS DISTINCT FROM 'registration_closed' THEN
    RAISE EXCEPTION 'closed event accepted a reservation';
  END IF;
  UPDATE public.workshop_events SET registration_open = true WHERE id = v_event_id;

  v_first := public.reserve_workshop_seat(
    'workshop-test-capacity', 'Ada Owner', 'ada@example.com', 'Ada Co', 'Consulting',
    'People think it is a store.', false, true, NULL
  );
  IF COALESCE((v_first->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'first reserve failed: %', v_first;
  END IF;
  IF (v_first->>'amount_cents')::int <> 4900 THEN
    RAISE EXCEPTION 'server price was not used';
  END IF;

  v_reg_id := (v_first->>'registration_id')::uuid;
  IF public.apply_workshop_payment(v_reg_id, 'pay_test_1', 'FAILED', 4900)->>'status' IS DISTINCT FROM 'failed' THEN
    RAISE EXCEPTION 'failed payment did not release';
  END IF;
  v_again := public.reserve_workshop_seat(
    'workshop-test-capacity', 'Ada Owner', 'ada@example.com', 'Ada Co', 'Consulting',
    'People think it is a store.', false, true, NULL
  );
  IF COALESCE((v_again->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'retry after failure failed: %', v_again;
  END IF;
  v_reg_id := (v_again->>'registration_id')::uuid;
  IF public.apply_workshop_payment(v_reg_id, 'pay_test_2', 'COMPLETED', 100)->>'code' IS DISTINCT FROM 'amount_mismatch' THEN
    RAISE EXCEPTION 'wrong amount was accepted';
  END IF;
  DELETE FROM public.workshop_registrations WHERE id = v_reg_id;

  v_first := public.reserve_workshop_seat(
    'workshop-test-capacity', 'Ada Owner', 'ada@example.com', 'Ada Co', 'Consulting',
    'People think it is a store.', false, true, NULL
  );
  v_reg_id := (v_first->>'registration_id')::uuid;
  IF public.apply_workshop_payment(v_reg_id, 'pay_test_3', 'COMPLETED', 4900)->>'status' IS DISTINCT FROM 'confirmed' THEN
    RAISE EXCEPTION 'completed payment did not confirm';
  END IF;
  IF public.apply_workshop_payment(v_reg_id, 'pay_test_3', 'COMPLETED', 4900)->>'duplicate' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'duplicate notification was not safe';
  END IF;
  SELECT count(*) INTO v_confirmed FROM public.workshop_registrations WHERE event_id = v_event_id AND status = 'confirmed';
  IF v_confirmed <> 1 THEN
    RAISE EXCEPTION 'duplicate notification created extra seats';
  END IF;
  IF public.reserve_workshop_seat(
    'workshop-test-capacity', 'Ada Owner', 'ada@example.com', 'Ada Co', 'Consulting',
    'People think it is a store.', false, true, NULL
  )->>'code' IS DISTINCT FROM 'already_registered' THEN
    RAISE EXCEPTION 'repeat registration was allowed';
  END IF;

  v_second := public.reserve_workshop_seat(
    'workshop-test-capacity', 'Bea Owner', 'bea@example.com', 'Bea Co', 'Salon',
    'People think it is a school.', false, true, NULL
  );
  IF public.apply_workshop_payment((v_second->>'registration_id')::uuid, 'pay_test_4', 'COMPLETED', 4900)->>'status' IS DISTINCT FROM 'confirmed' THEN
    RAISE EXCEPTION 'second seat was not confirmed';
  END IF;
  v_third := public.reserve_workshop_seat(
    'workshop-test-capacity', 'Cy Owner', 'cy@example.com', 'Cy Co', 'Clinic',
    'People think it is a gym.', false, true, NULL
  );
  IF v_third->>'code' IS DISTINCT FROM 'sold_out' THEN
    RAISE EXCEPTION 'capacity was not enforced: %', v_third;
  END IF;

  IF public.apply_workshop_payment(v_reg_id, 'pay_test_3', 'REFUNDED', 1000)->>'code' IS DISTINCT FROM 'partial_refund' THEN
    RAISE EXCEPTION 'partial refund released the seat';
  END IF;
  IF public.apply_workshop_payment(v_reg_id, 'pay_test_3', 'REFUNDED', 4900)->>'status' IS DISTINCT FROM 'refunded' THEN
    RAISE EXCEPTION 'full refund did not release the seat';
  END IF;
  v_third := public.reserve_workshop_seat(
    'workshop-test-capacity', 'Cy Owner', 'cy@example.com', 'Cy Co', 'Clinic',
    'People think it is a gym.', false, true, NULL
  );
  IF COALESCE((v_third->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'refund did not free a seat: %', v_third;
  END IF;

  v_status := public.workshop_registration_status(v_first->>'confirmation_token');
  IF v_status::text ILIKE '%test-secret-do-not-leak%' OR v_status ? 'zoom_url' THEN
    RAISE EXCEPTION 'status endpoint leaked zoom';
  END IF;

  UPDATE public.workshop_events SET cancellation_terms = 'too short', registration_open = false WHERE id = v_event_id;
  BEGIN
    UPDATE public.workshop_events SET registration_open = true WHERE id = v_event_id;
    RAISE EXCEPTION 'opened registration without cancellation terms';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  DELETE FROM public.workshop_registrations WHERE event_id = v_event_id;
  DELETE FROM public.workshop_events WHERE id = v_event_id;
END $$;
