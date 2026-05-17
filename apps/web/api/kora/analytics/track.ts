import { eventKind, getServiceClient, json, sanitizeEventPayload } from "./_lib";

export const config = {
  runtime: "edge",
};

function textOrNull(value: unknown, max = 180): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function canonicalBuyerKey(payload: {
  buyer_key?: string | null;
  user_id?: string | null;
  anonymous_visitor_id: string;
  session_id: string;
}) {
  return textOrNull(payload.buyer_key, 180) ??
    textOrNull(payload.user_id, 120) ??
    textOrNull(payload.anonymous_visitor_id, 180) ??
    textOrNull(payload.session_id, 180) ??
    "unknown_buyer";
}

function buyerJourneyKey(payload: {
  site_id: string;
  brand_id: string;
  client_id?: string | null;
  buyer_key?: string | null;
  user_id?: string | null;
  anonymous_visitor_id: string;
  session_id: string;
}) {
  const canonical = canonicalBuyerKey(payload);
  return `${payload.site_id}:${payload.brand_id}:${payload.client_id ?? "jahknowspr"}:${canonical}`.slice(0, 300);
}

function journeyStatusForEvent(input: {
  event_name: string;
  revenue_value?: number | null;
  lead_magnet_id?: string | null;
}) {
  if (input.event_name === "purchase_complete" && (input.revenue_value ?? 0) > 0) return "purchased";
  if (input.event_name === "booking_click" || input.lead_magnet_id === "strategy_session") return "strategy_session_booked";
  if (input.event_name === "audit_request_submit" || input.lead_magnet_id === "free_audit") return "audit_submitted";
  if (["form_submit", "newsletter_signup", "checkout_start"].includes(input.event_name)) return "lead_captured";
  return "anonymous_engaged";
}

function leadMagnetInteractionKind(input: { event_name: string; revenue_value?: number | null }) {
  if (input.event_name === "audit_request_submit") return "submit";
  if (input.event_name === "booking_click") return "booking";
  if (input.event_name === "purchase_complete" && (input.revenue_value ?? 0) > 0) return "purchase";
  if (input.event_name === "form_start") return "start";
  if (["form_submit", "newsletter_signup"].includes(input.event_name)) return "qualified";
  if (input.event_name === "offer_page_view") return "view";
  return null;
}

async function upsertBuyerIdentityLinks(
  supabase: ReturnType<typeof getServiceClient>,
  payload: {
    site_id: string;
    brand_id: string;
    client_id?: string | null;
    buyer_key?: string | null;
    anonymous_visitor_id: string;
    session_id: string;
    user_id?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const canonicalKey = canonicalBuyerKey(payload);
  const metadata = payload.metadata ?? {};
  const aliases: Array<{ identity_type: string; identity_value: string | null }> = [
    { identity_type: "buyer_key", identity_value: textOrNull(payload.buyer_key, 180) },
    { identity_type: "anonymous_visitor_id", identity_value: textOrNull(payload.anonymous_visitor_id, 180) },
    { identity_type: "session_id", identity_value: textOrNull(payload.session_id, 180) },
    { identity_type: "user_id", identity_value: textOrNull(payload.user_id, 120) },
    { identity_type: "lead_key", identity_value: textOrNull(metadata.lead_key, 180) },
    { identity_type: "email", identity_value: textOrNull(metadata.email, 180) ?? textOrNull(metadata.buyer_email, 180) },
  ];
  const rows = aliases
    .filter((alias): alias is { identity_type: string; identity_value: string } => Boolean(alias.identity_value))
    .map((alias) => ({
      canonical_buyer_key: canonicalKey,
      identity_type: alias.identity_type,
      identity_value: alias.identity_value,
      site_id: payload.site_id,
      brand_id: payload.brand_id,
      client_id: payload.client_id ?? null,
      last_seen_at: new Date().toISOString(),
      metadata: { source: "analytics_track" },
    }));
  if (!rows.length) return canonicalKey;
  const { error } = await supabase
    .from("buyer_identity_links")
    .upsert(rows, { onConflict: "canonical_buyer_key,identity_type,identity_value" });
  if (error) throw error;
  return canonicalKey;
}

async function upsertBuyerJourney(
  supabase: ReturnType<typeof getServiceClient>,
  input: {
    event_name: string;
    site_id: string;
    brand_id: string;
    client_id?: string | null;
    buyer_key?: string | null;
    anonymous_visitor_id: string;
    session_id: string;
    user_id?: string | null;
    campaign_id?: string | null;
    offer_id?: string | null;
    lead_magnet_id?: string | null;
    audit_intake_id?: string | null;
    strategy_session_id?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
    revenue_value?: number | null;
  },
) {
  const canonicalKey = canonicalBuyerKey(input);
  const journeyKey = buyerJourneyKey(input);
  const isPurchase = input.event_name === "purchase_complete" && (input.revenue_value ?? 0) > 0;
  const nowIso = new Date().toISOString();
  const { data: existingJourney, error: existingJourneyError } = await supabase
    .from("buyer_journeys")
    .select(
      "id,first_event_at,purchase_count,total_revenue,is_buyer,first_touch_utm_source,first_touch_utm_medium,first_touch_utm_campaign,first_touch_utm_content,first_touch_utm_term",
    )
    .eq("journey_key", journeyKey)
    .maybeSingle();
  if (existingJourneyError) throw existingJourneyError;

  const nextPurchaseCount = Number(existingJourney?.purchase_count ?? 0) + (isPurchase ? 1 : 0);
  const nextRevenue = Number(existingJourney?.total_revenue ?? 0) + (isPurchase ? Number((input.revenue_value ?? 0).toFixed(2)) : 0);

  const { data: upserted, error: upsertError } = await supabase
    .from("buyer_journeys")
    .upsert({
      journey_key: journeyKey,
      site_id: input.site_id,
      brand_id: input.brand_id,
      client_id: input.client_id ?? null,
      canonical_buyer_key: canonicalKey,
      buyer_key: input.buyer_key ?? null,
      anonymous_visitor_id: input.anonymous_visitor_id,
      session_id: input.session_id,
      user_id: input.user_id ?? null,
      audit_intake_id: input.audit_intake_id ?? null,
      strategy_session_id: input.strategy_session_id ?? null,
      first_event_at: existingJourney?.first_event_at ?? nowIso,
      last_event_at: nowIso,
      first_touch_utm_source: existingJourney?.first_touch_utm_source ?? input.utm_source ?? null,
      first_touch_utm_medium: existingJourney?.first_touch_utm_medium ?? input.utm_medium ?? null,
      first_touch_utm_campaign: existingJourney?.first_touch_utm_campaign ?? input.utm_campaign ?? null,
      first_touch_utm_content: existingJourney?.first_touch_utm_content ?? input.utm_content ?? null,
      first_touch_utm_term: existingJourney?.first_touch_utm_term ?? input.utm_term ?? null,
      last_touch_utm_source: input.utm_source ?? null,
      last_touch_utm_medium: input.utm_medium ?? null,
      last_touch_utm_campaign: input.utm_campaign ?? null,
      last_touch_utm_content: input.utm_content ?? null,
      last_touch_utm_term: input.utm_term ?? null,
      journey_status: journeyStatusForEvent(input),
      is_buyer: Boolean(existingJourney?.is_buyer) || isPurchase,
      purchase_count: nextPurchaseCount,
      total_revenue: Number(nextRevenue.toFixed(2)),
      latest_offer_id: input.offer_id ?? null,
      latest_campaign_id: input.campaign_id ?? null,
      latest_lead_magnet_id: input.lead_magnet_id ?? null,
      metadata: {
        last_event_name: input.event_name,
        source: "analytics_track",
      },
    }, { onConflict: "journey_key" })
    .select("id,purchase_count,total_revenue")
    .single();
  if (upsertError) throw upsertError;

  return { id: upserted?.id ?? null, journeyKey, canonicalKey };
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const payload = sanitizeEventPayload(body);
    const supabase = getServiceClient();

    const { data: eventRow, error: eventError } = await supabase
      .from("analytics_events")
      .insert(payload)
      .select("id, created_at")
      .single();
    if (eventError) throw eventError;

    const canonicalBuyer = await upsertBuyerIdentityLinks(supabase, payload);
    const journey = await upsertBuyerJourney(supabase, {
      event_name: payload.event_name,
      site_id: payload.site_id,
      brand_id: payload.brand_id,
      client_id: payload.client_id ?? null,
      buyer_key: payload.buyer_key ?? null,
      anonymous_visitor_id: payload.anonymous_visitor_id,
      session_id: payload.session_id,
      user_id: payload.user_id ?? null,
      campaign_id: payload.campaign_id ?? null,
      offer_id: payload.offer_id ?? null,
      lead_magnet_id: payload.lead_magnet_id ?? null,
      audit_intake_id: payload.audit_intake_id ?? null,
      strategy_session_id: payload.strategy_session_id ?? null,
      utm_source: payload.utm_source ?? null,
      utm_medium: payload.utm_medium ?? null,
      utm_campaign: payload.utm_campaign ?? null,
      utm_content: payload.utm_content ?? null,
      utm_term: payload.utm_term ?? null,
      revenue_value: payload.revenue_value ?? null,
    });

    const now = Date.now();
    const { isPageView, isCtaClick, isConversion } = eventKind(payload.event_name);

    const { data: existingSession } = await supabase
      .from("analytics_sessions")
      .select("id, created_at, event_count, page_view_count, cta_click_count, conversion_count, revenue_value")
      .eq("session_id", payload.session_id)
      .maybeSingle();

    const createdAt = existingSession?.created_at ? Date.parse(existingSession.created_at) : now;
    const durationSeconds = Math.max(0, Math.round((now - createdAt) / 1000));
    const sessionUpdate = {
      site_id: payload.site_id,
      client_id: payload.client_id ?? null,
      brand_id: payload.brand_id,
      anonymous_visitor_id: payload.anonymous_visitor_id,
      session_id: payload.session_id,
      first_page_path: existingSession ? undefined : payload.page_path ?? null,
      last_page_path: payload.page_path ?? null,
      referrer: payload.referrer ?? null,
      utm_source: payload.utm_source ?? null,
      utm_medium: payload.utm_medium ?? null,
      utm_campaign: payload.utm_campaign ?? null,
      device_type: payload.device_type ?? null,
      browser: payload.browser ?? null,
      event_count: (existingSession?.event_count ?? 0) + 1,
      page_view_count: (existingSession?.page_view_count ?? 0) + (isPageView ? 1 : 0),
      cta_click_count: (existingSession?.cta_click_count ?? 0) + (isCtaClick ? 1 : 0),
      conversion_count: (existingSession?.conversion_count ?? 0) + (isConversion ? 1 : 0),
      revenue_value: Number(((existingSession?.revenue_value ?? 0) + (payload.revenue_value ?? 0)).toFixed(2)),
      duration_seconds: durationSeconds,
      updated_at: new Date().toISOString(),
    };

    const { error: sessionError } = await supabase.from("analytics_sessions").upsert(sessionUpdate, { onConflict: "session_id" });
    if (sessionError) throw sessionError;

    if (payload.lead_magnet_id) {
      const interactionKind = leadMagnetInteractionKind(payload);
      if (interactionKind) {
        const { error: leadMagnetError } = await supabase.from("lead_magnet_interactions").insert({
          lead_magnet_id: payload.lead_magnet_id,
          interaction_kind: interactionKind,
          interaction_status: ["purchase_complete", "audit_request_submit", "form_submit", "newsletter_signup", "booking_click"].includes(payload.event_name)
            ? "success"
            : "pending",
          occurred_at: eventRow?.created_at ?? new Date().toISOString(),
          site_id: payload.site_id,
          brand_id: payload.brand_id,
          client_id: payload.client_id ?? null,
          buyer_journey_id: payload.buyer_journey_id ?? journey.id,
          canonical_buyer_key: canonicalBuyer,
          buyer_key: payload.buyer_key ?? null,
          lead_key: typeof payload.metadata?.lead_key === "string" ? payload.metadata.lead_key : null,
          anonymous_visitor_id: payload.anonymous_visitor_id,
          session_id: payload.session_id,
          audit_intake_id: payload.audit_intake_id ?? null,
          strategy_session_id: payload.strategy_session_id ?? null,
          campaign_id: payload.campaign_id ?? null,
          adset_id: payload.adset_id ?? null,
          creative_id: payload.creative_id ?? null,
          audience_cluster_id: payload.audience_cluster_id ?? null,
          audience_pool_id: payload.audience_pool_id ?? null,
          offer_id: payload.offer_id ?? null,
          offer_stage: payload.offer_stage ?? null,
          revenue_value: payload.revenue_value ?? null,
          currency: payload.currency ?? null,
          source_event_id: eventRow?.id ?? null,
          metadata: payload.metadata ?? {},
        });
        if (leadMagnetError) throw leadMagnetError;
      }
    }

    if (payload.offer_id && ["offer_page_view", "checkout_start", "booking_click"].includes(payload.event_name)) {
      const { error: offerPresentationError } = await supabase.from("offer_presentations").insert({
        site_id: payload.site_id,
        brand_id: payload.brand_id,
        client_id: payload.client_id ?? null,
        buyer_journey_id: payload.buyer_journey_id ?? journey.id,
        canonical_buyer_key: canonicalBuyer,
        buyer_key: payload.buyer_key ?? null,
        lead_key: typeof payload.metadata?.lead_key === "string" ? payload.metadata.lead_key : null,
        customer_id: typeof payload.metadata?.customer_id === "string" ? payload.metadata.customer_id : null,
        offer_id: payload.offer_id,
        offer_name: typeof payload.metadata?.offer_name === "string" ? payload.metadata.offer_name : null,
        offer_type: typeof payload.metadata?.offer_type === "string" ? payload.metadata.offer_type : null,
        offer_stage: payload.offer_stage ?? null,
        lead_magnet_id: payload.lead_magnet_id ?? null,
        audit_intake_id: payload.audit_intake_id ?? null,
        strategy_session_id: payload.strategy_session_id ?? null,
        campaign_id: payload.campaign_id ?? null,
        adset_id: payload.adset_id ?? null,
        creative_id: payload.creative_id ?? null,
        audience_cluster_id: payload.audience_cluster_id ?? null,
        audience_pool_id: payload.audience_pool_id ?? null,
        presented_by: "system_event",
        source_event_id: eventRow?.id ?? null,
        metadata: payload.metadata ?? {},
      });
      if (offerPresentationError) throw offerPresentationError;
    }

    if (payload.event_name === "purchase_complete" && (payload.revenue_value ?? 0) > 0) {
      const offerName =
        typeof payload.metadata?.offer_name === "string" ? payload.metadata.offer_name.slice(0, 180) : null;
      const paymentProvider =
        typeof payload.metadata?.payment_provider === "string" ? payload.metadata.payment_provider.slice(0, 120) : null;
      const orderId = typeof payload.metadata?.order_id === "string" ? payload.metadata.order_id.slice(0, 180) : null;

      const { data: revenueRow, error: revError } = await supabase
        .from("revenue_attribution")
        .insert({
          site_id: payload.site_id,
          client_id: payload.client_id ?? null,
          brand_id: payload.brand_id,
          industry_key: payload.industry_key ?? null,
          audience_cluster_id: payload.audience_cluster_id ?? null,
          audience_pool_id: payload.audience_pool_id ?? null,
          lead_magnet_id: payload.lead_magnet_id ?? null,
          offer_stage: payload.offer_stage ?? null,
          offer_id: payload.offer_id ?? null,
          offer_name: offerName,
          amount: payload.revenue_value ?? 0,
          currency: payload.currency ?? "USD",
          landing_page_url: payload.landing_page_url ?? payload.page_path ?? null,
          platform: payload.platform ?? null,
          content_angle: payload.content_angle ?? null,
          message_angle: payload.message_angle ?? null,
          page_path: payload.page_path ?? null,
          campaign_id: payload.campaign_id ?? null,
          adset_id: payload.adset_id ?? null,
          creative_id: payload.creative_id ?? null,
          utm_source: payload.utm_source ?? null,
          utm_medium: payload.utm_medium ?? null,
          utm_campaign: payload.utm_campaign ?? null,
          utm_content: payload.utm_content ?? null,
          utm_term: payload.utm_term ?? null,
          anonymous_visitor_id: payload.anonymous_visitor_id,
          session_id: payload.session_id,
          user_id: payload.user_id ?? null,
          audit_intake_id: payload.audit_intake_id ?? null,
          strategy_session_id: payload.strategy_session_id ?? null,
          buyer_journey_id: payload.buyer_journey_id ?? journey.id,
          buyer_key: payload.buyer_key ?? null,
          payment_provider: paymentProvider,
          order_id: orderId,
          metadata: payload.metadata ?? {},
        })
        .select("id")
        .single();
      if (revError) throw revError;

      // Write a normalized purchase fact for "who buys what" analytics by client + industry + audience + offer.
      const { error: buyerAttributionError } = await supabase.from("buyer_purchase_attribution").insert({
        site_id: payload.site_id,
        brand_id: payload.brand_id,
        client_id: payload.client_id ?? null,
        industry_key: payload.industry_key ?? null,
        audience_cluster_id: payload.audience_cluster_id ?? null,
        audience_pool_id: payload.audience_pool_id ?? null,
        lead_magnet_id: payload.lead_magnet_id ?? null,
        offer_stage: payload.offer_stage ?? null,
        offer_id: payload.offer_id ?? null,
        offer_name: offerName,
        platform: payload.platform ?? null,
        content_angle: payload.content_angle ?? null,
        message_angle: payload.message_angle ?? null,
        landing_page_url: payload.landing_page_url ?? payload.page_path ?? null,
        utm_source: payload.utm_source ?? null,
        utm_medium: payload.utm_medium ?? null,
        utm_campaign: payload.utm_campaign ?? null,
        utm_content: payload.utm_content ?? null,
        utm_term: payload.utm_term ?? null,
        campaign_id: payload.campaign_id ?? null,
        adset_id: payload.adset_id ?? null,
        creative_id: payload.creative_id ?? null,
        funnel_id: payload.funnel_id ?? null,
        anonymous_visitor_id: payload.anonymous_visitor_id,
        session_id: payload.session_id,
        user_id: payload.user_id ?? null,
        audit_intake_id: payload.audit_intake_id ?? null,
        strategy_session_id: payload.strategy_session_id ?? null,
        buyer_journey_id: payload.buyer_journey_id ?? journey.id,
        buyer_key: payload.buyer_key ?? null,
        order_id: orderId,
        payment_provider: paymentProvider,
        amount: payload.revenue_value ?? 0,
        currency: payload.currency ?? "USD",
        source_event_id: eventRow?.id ?? null,
        source_revenue_attribution_id: revenueRow?.id ?? null,
        metadata: payload.metadata ?? {},
      });
      if (buyerAttributionError) throw buyerAttributionError;
    }

    return json(200, { ok: true, id: eventRow?.id, created_at: eventRow?.created_at });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown track error";
    return json(400, { ok: false, error: message });
  }
}
