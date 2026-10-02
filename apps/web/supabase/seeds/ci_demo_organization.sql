-- Manual demo seed. Do not run against production automatically.
-- Creates a clearly fictional organization so the team can walk the MVP.

DO $$
DECLARE
  demo_org uuid;
  intel_id uuid;
  opp_id uuid;
  action_id uuid;
  staff uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ci_organizations WHERE name = 'Harbor & Pine Civic Kitchen [DEMO]'
  ) THEN
    RAISE NOTICE 'Demo organization already exists. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO staff
  FROM auth.users
  ORDER BY created_at
  LIMIT 1;

  INSERT INTO public.ci_organizations (
    name,
    organization_type,
    industry,
    website,
    location,
    description,
    primary_audiences,
    communication_goals,
    major_challenges,
    upcoming_events,
    key_spokespersons,
    social_channels,
    pr_media_concerns,
    reputation_concerns,
    has_approved_messaging,
    onboarding_status,
    onboarding_completed_at,
    status,
    created_by
  ) VALUES (
    'Harbor & Pine Civic Kitchen [DEMO]',
    'small_business',
    'Community dining',
    'https://harborandpine.example',
    'Fictional Harbor, TX',
    'A made-up neighborhood kitchen that hosts weekday lunches and civic dinners. This record is for product testing only.',
    'Nearby residents, city staff, and local journalists covering community food.',
    'Be known as a reliable civic partner, not just a catering kitchen.',
    'People still describe the work as catering, not community infrastructure.',
    'Harbor Civic Dinner — November 14 (fictional).',
    '[{"name":"Mira Ellison","role":"Founder"},{"name":"Theo Grant","role":"Kitchen lead"}]'::jsonb,
    '{"instagram":"@harborandpine.demo","facebook":"Harbor and Pine Civic Kitchen"}'::jsonb,
    'A regional writer asked for a quote about “food access theater.” No response has been given.',
    'A few online comments confused the kitchen with a closed restaurant of a similar name.',
    true,
    'completed',
    now(),
    'active',
    staff
  )
  RETURNING id INTO demo_org;

  INSERT INTO public.ci_intelligence_items (
    organization_id, title, category, description, why_it_matters, recommended_action, priority, status, due_date, created_by
  ) VALUES
    (demo_org, 'Clarify the civic-dinner story', 'needs_attention', 'Coverage still sounds operational.', 'The public message is weaker than the work.', 'Write a short positioning paragraph before the next dinner mention.', 'high', 'new', CURRENT_DATE + 5, staff),
    (demo_org, 'Invite one local reporter to a lunch service', 'opportunity', 'A fictional city desk is looking for neighborhood institutions.', 'A calm visit is more useful than a press blast.', 'Prepare a one-page brief and decide who speaks.', 'medium', 'new', CURRENT_DATE + 12, staff);

  INSERT INTO public.ci_health_checks (
    organization_id, category, status_label, explanation, why_it_matters, recommended_improvement, assessed_by, assessed_at
  ) VALUES
    (demo_org, 'messaging', 'needs_attention', 'The kitchen can describe the food, but not the civic role.', 'People cannot repeat a clear sentence.', 'Approve one short about paragraph.', staff, now()),
    (demo_org, 'visibility', 'stable', 'Local regulars know the space.', 'Awareness is fine among neighbors.', 'Keep one recurring public note each month.', staff, now()),
    (demo_org, 'reputation', 'stable', 'Comments are mild and mostly confused names.', 'Confusion is manageable.', 'Add a short “not the former restaurant” line to bios.', staff, now()),
    (demo_org, 'media_readiness', 'needs_attention', 'No approved quote list yet.', 'A media request would force improvisation.', 'Draft three sentences Mira can say as written.', staff, now()),
    (demo_org, 'crisis_readiness', 'not_assessed', NULL, NULL, NULL, NULL, NULL),
    (demo_org, 'brand_consistency', 'strong', 'The in-room experience is consistent.', 'Guests already feel the same place twice.', 'Use the same three words on the door and the bio.', staff, now());

  INSERT INTO public.ci_messaging_entries (
    organization_id, entry_type, title, body, status, created_by
  ) VALUES
    (demo_org, 'organization_description', 'Approved about', 'Harbor & Pine Civic Kitchen is a fictional neighborhood table where lunch is the public work.', 'approved', staff),
    (demo_org, 'founder_executive_bio', 'Short bio', 'Mira Ellison founded this made-up kitchen to feed civic life in Fictional Harbor.', 'approved', staff);

  INSERT INTO public.ci_opportunities (
    organization_id, title, opportunity_type, description, why_it_matters, recommended_action, deadline, status, priority, created_by
  ) VALUES (
    demo_org,
    'Fictional city magazine neighborhood issue',
    'media',
    'A made-up city magazine is collecting neighborhood institutions for a winter issue.',
    'A short visit could correct the catering frame.',
    'Decide if Mira should speak, and from which approved sentence.',
    CURRENT_DATE + 10,
    'new',
    'high',
    staff
  )
  RETURNING id INTO opp_id;

  SELECT id INTO intel_id
  FROM public.ci_intelligence_items
  WHERE organization_id = demo_org
  ORDER BY created_at
  LIMIT 1;

  INSERT INTO public.ci_action_items (
    organization_id, title, description, reason, priority, due_date, status, intelligence_item_id, opportunity_id, created_by
  ) VALUES (
    demo_org,
    'Prepare Mira’s three-sentence brief',
    'Use the approved about line and one proof point.',
    'The magazine deadline is fictional but useful for the walkthrough.',
    'high',
    CURRENT_DATE + 4,
    'not_started',
    intel_id,
    opp_id,
    staff
  )
  RETURNING id INTO action_id;

  INSERT INTO public.ci_counsel_requests (
    organization_id, subject, request_type, description, urgency, status, submitted_by, opportunity_id
  ) VALUES (
    demo_org,
    'Should we sit for the magazine visit?',
    'media_request',
    'Demo only: do you think we should pursue this, and what should we say?',
    'normal',
    'submitted',
    staff,
    opp_id
  );

  RAISE NOTICE 'Created Harbor & Pine Civic Kitchen [DEMO] as %', demo_org;
END;
$$;
