import { eventKind, getServiceClient, json, sanitizeEventPayload } from "./_lib";

export const config = {
  runtime: "edge",
};

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

    if (payload.event_name === "purchase_complete" && (payload.revenue_value ?? 0) > 0) {
      const { error: revError } = await supabase.from("revenue_attribution").insert({
        site_id: payload.site_id,
        client_id: payload.client_id ?? null,
        brand_id: payload.brand_id,
        audience_pool_id: payload.audience_pool_id ?? null,
        offer_id: payload.offer_id ?? null,
        offer_name: payload.metadata?.offer_name ?? null,
        amount: payload.revenue_value ?? 0,
        currency: payload.currency ?? "USD",
        page_path: payload.page_path ?? null,
        campaign_id: payload.campaign_id ?? null,
        utm_source: payload.utm_source ?? null,
        utm_medium: payload.utm_medium ?? null,
        utm_campaign: payload.utm_campaign ?? null,
        anonymous_visitor_id: payload.anonymous_visitor_id,
        session_id: payload.session_id,
        user_id: payload.user_id ?? null,
        payment_provider: payload.metadata?.payment_provider ?? null,
        order_id: payload.metadata?.order_id ?? null,
        metadata: payload.metadata ?? {},
      });
      if (revError) throw revError;
    }

    return json(200, { ok: true, id: eventRow?.id, created_at: eventRow?.created_at });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown track error";
    return json(400, { ok: false, error: message });
  }
}
