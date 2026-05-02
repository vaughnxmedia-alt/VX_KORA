import { getServiceClient, json } from "./_lib";

export const config = {
  runtime: "edge",
};

type EventRow = {
  id: string;
  created_at: string;
  event_name: string;
  site_id: string;
  brand_id: string;
  page_path: string | null;
  content_id: string | null;
  content_type: string | null;
  content_category: string | null;
  blog_slug: string | null;
  campaign_id: string | null;
  offer_id: string | null;
  funnel_id: string | null;
  funnel_step: string | null;
  anonymous_visitor_id: string;
  session_id: string;
  revenue_value: number | null;
};

const FUNNEL_DEFS: Record<string, { name: string; steps: string[] }> = {
  free_audit: {
    name: "Free Audit Diagnosis funnel",
    steps: ["audit_page_view", "form_start", "audit_request_submit"],
  },
  strategy_session: {
    name: "Strategy Session funnel",
    steps: ["strategy_session_page_view", "booking_click", "checkout_start", "purchase_complete"],
  },
  brand_blueprint: {
    name: "Brand Blueprint funnel",
    steps: ["brand_blueprint_page_view", "booking_click", "form_submit"],
  },
  contact_lead: {
    name: "Contact/Lead funnel",
    steps: ["page_view", "form_start", "form_submit"],
  },
};

function key(siteId: string, brandId: string, date: string) {
  return `${date}::${siteId}::${brandId}`;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  try {
    const body = (await request.json().catch(() => ({}))) as { days?: number; site_id?: string; brand_id?: string };
    const days = Math.max(1, Math.min(31, Number(body.days || 7)));
    const start = new Date(Date.now() - days * 86400000);
    const startIso = start.toISOString();

    const supabase = getServiceClient();
    let query = supabase
      .from("analytics_events")
      .select(
        "id,created_at,event_name,site_id,brand_id,page_path,content_id,content_type,content_category,blog_slug,campaign_id,offer_id,funnel_id,funnel_step,anonymous_visitor_id,session_id,revenue_value",
      )
      .gte("created_at", startIso)
      .order("created_at", { ascending: true });
    if (body.site_id) query = query.eq("site_id", body.site_id);
    if (body.brand_id) query = query.eq("brand_id", body.brand_id);
    const { data, error } = await query;
    if (error) throw error;
    const events = (data || []) as EventRow[];

    const rollupMap = new Map<string, Record<string, unknown>>();
    const pageViewsByDay = new Map<string, Map<string, number>>();
    const offerByDay = new Map<string, Map<string, number>>();
    const campaignByDay = new Map<string, Map<string, number>>();
    const visitorsByDay = new Map<string, Set<string>>();
    const sessionsByDay = new Map<string, Set<string>>();

    for (const e of events) {
      const day = e.created_at.slice(0, 10);
      const mapKey = key(e.site_id, e.brand_id, day);
      const existing = rollupMap.get(mapKey) || {
        date: day,
        site_id: e.site_id,
        brand_id: e.brand_id,
        page_views: 0,
        unique_visitors: 0,
        sessions: 0,
        cta_clicks: 0,
        form_starts: 0,
        form_submits: 0,
        booking_clicks: 0,
        checkout_starts: 0,
        purchases: 0,
        revenue: 0,
        conversion_rate: 0,
        top_page_path: null,
        top_offer_id: null,
        top_campaign_id: null,
        metadata: {},
      };

      if (["page_view", "blog_view", "audit_page_view", "strategy_session_page_view", "brand_blueprint_page_view"].includes(e.event_name)) {
        existing.page_views = Number(existing.page_views) + 1;
        const pageMap = pageViewsByDay.get(mapKey) || new Map<string, number>();
        pageMap.set(e.page_path || "(unknown)", (pageMap.get(e.page_path || "(unknown)") || 0) + 1);
        pageViewsByDay.set(mapKey, pageMap);
      }
      if (["cta_click", "nav_click", "outbound_link_click", "download_click", "booking_click"].includes(e.event_name)) {
        existing.cta_clicks = Number(existing.cta_clicks) + 1;
      }
      if (e.event_name === "form_start") existing.form_starts = Number(existing.form_starts) + 1;
      if (["form_submit", "audit_request_submit", "newsletter_signup"].includes(e.event_name)) {
        existing.form_submits = Number(existing.form_submits) + 1;
      }
      if (e.event_name === "booking_click") existing.booking_clicks = Number(existing.booking_clicks) + 1;
      if (e.event_name === "checkout_start") existing.checkout_starts = Number(existing.checkout_starts) + 1;
      if (e.event_name === "purchase_complete") existing.purchases = Number(existing.purchases) + 1;
      existing.revenue = Number((Number(existing.revenue) + (e.revenue_value || 0)).toFixed(2));

      const visitorSet = visitorsByDay.get(mapKey) || new Set<string>();
      visitorSet.add(e.anonymous_visitor_id);
      visitorsByDay.set(mapKey, visitorSet);

      const sessionSet = sessionsByDay.get(mapKey) || new Set<string>();
      sessionSet.add(e.session_id);
      sessionsByDay.set(mapKey, sessionSet);

      if (e.offer_id) {
        const offerMap = offerByDay.get(mapKey) || new Map<string, number>();
        offerMap.set(e.offer_id, (offerMap.get(e.offer_id) || 0) + 1);
        offerByDay.set(mapKey, offerMap);
      }
      if (e.campaign_id) {
        const campaignMap = campaignByDay.get(mapKey) || new Map<string, number>();
        campaignMap.set(e.campaign_id, (campaignMap.get(e.campaign_id) || 0) + 1);
        campaignByDay.set(mapKey, campaignMap);
      }

      rollupMap.set(mapKey, existing);
    }

    const rollupRows = [...rollupMap.entries()].map(([mapKey, row]) => {
      const topPage = [...(pageViewsByDay.get(mapKey) || new Map()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const topOffer = [...(offerByDay.get(mapKey) || new Map()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const topCampaign = [...(campaignByDay.get(mapKey) || new Map()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const uniqueVisitors = (visitorsByDay.get(mapKey) || new Set()).size;
      const sessions = (sessionsByDay.get(mapKey) || new Set()).size;
      const conversions = Number(row.form_submits) + Number(row.purchases);
      const conversionRate = sessions > 0 ? Number((conversions / sessions).toFixed(4)) : 0;
      return {
        ...row,
        unique_visitors: uniqueVisitors,
        sessions,
        conversion_rate: conversionRate,
        top_page_path: topPage,
        top_offer_id: topOffer,
        top_campaign_id: topCampaign,
      };
    });

    if (rollupRows.length > 0) {
      const { error: upsertRollupError } = await supabase
        .from("analytics_daily_rollups")
        .upsert(rollupRows, { onConflict: "date,site_id,brand_id" });
      if (upsertRollupError) throw upsertRollupError;
    }

    const pagePerfMap = new Map<string, Record<string, unknown>>();
    for (const e of events) {
      const contentKey = [e.site_id, e.brand_id, e.page_path || "", e.content_id || "", e.blog_slug || ""].join("::");
      const current = pagePerfMap.get(contentKey) || {
        site_id: e.site_id,
        brand_id: e.brand_id,
        content_id: e.content_id,
        content_type: e.content_type || (e.blog_slug ? "blog" : "page"),
        title: null,
        slug: e.blog_slug,
        page_path: e.page_path,
        category: e.content_category,
        views: 0,
        unique_visitors: 0,
        clicks: 0,
        click_rate: 0,
        avg_engagement_time: 0,
        form_submits: 0,
        booking_clicks: 0,
        revenue_attributed: 0,
        conversion_rate: 0,
        seo_status: null,
        backlink_status: null,
        recommended_action: null,
        metadata: {},
      };
      if (["page_view", "blog_view", "audit_page_view", "strategy_session_page_view", "brand_blueprint_page_view"].includes(e.event_name)) {
        current.views = Number(current.views) + 1;
      }
      if (["cta_click", "nav_click", "booking_click", "outbound_link_click", "download_click"].includes(e.event_name)) {
        current.clicks = Number(current.clicks) + 1;
      }
      if (["form_submit", "audit_request_submit", "newsletter_signup"].includes(e.event_name)) {
        current.form_submits = Number(current.form_submits) + 1;
      }
      if (e.event_name === "booking_click") current.booking_clicks = Number(current.booking_clicks) + 1;
      current.revenue_attributed = Number((Number(current.revenue_attributed) + (e.revenue_value || 0)).toFixed(2));
      pagePerfMap.set(contentKey, current);
    }

    const contentRows = [...pagePerfMap.values()].map((row) => {
      const views = Number(row.views);
      const clicks = Number(row.clicks);
      const formSubmits = Number(row.form_submits);
      const clickRate = views > 0 ? Number((clicks / views).toFixed(4)) : 0;
      const conversionRate = views > 0 ? Number((formSubmits / views).toFixed(4)) : 0;
      return {
        ...row,
        click_rate: clickRate,
        conversion_rate: conversionRate,
        recommended_action:
          views > 40 && clicks < 3 ? "Strengthen CTA clarity and placement." : conversionRate > 0.05 ? "Repurpose winner content." : null,
        updated_at: new Date().toISOString(),
      };
    });

    if (contentRows.length > 0) {
      const { error: contentUpsertError } = await supabase.from("content_performance").upsert(contentRows, {
        onConflict: "site_id,brand_id,content_id,page_path,slug",
      });
      if (contentUpsertError) throw contentUpsertError;
    }

    const reportRows: Record<string, unknown>[] = [];
    const stepRows: Record<string, unknown>[] = [];
    for (const [funnelId, def] of Object.entries(FUNNEL_DEFS)) {
      const scoped = events.filter((e) => (e.funnel_id || "unknown") === funnelId || (funnelId === "contact_lead" && e.event_name === "form_submit"));
      if (!scoped.length) continue;
      const entries = scoped.filter((e) => e.event_name === def.steps[0]).length;
      const conversions = scoped.filter((e) => e.event_name === def.steps[def.steps.length - 1]).length;
      const conversionRate = entries > 0 ? Number((conversions / entries).toFixed(4)) : 0;
      const reportId = crypto.randomUUID();
      const dateRangeStart = scoped[0].created_at.slice(0, 10);
      const dateRangeEnd = scoped[scoped.length - 1].created_at.slice(0, 10);
      const stepCounts = def.steps.map((step) => scoped.filter((e) => e.event_name === step).length);
      let largestDropoffStep: string | null = null;
      let largestDropoffRate = 0;
      for (let i = 1; i < stepCounts.length; i += 1) {
        const prev = stepCounts[i - 1];
        const curr = stepCounts[i];
        const dropRate = prev > 0 ? Number(((prev - curr) / prev).toFixed(4)) : 0;
        if (dropRate > largestDropoffRate) {
          largestDropoffRate = dropRate;
          largestDropoffStep = def.steps[i];
        }
      }

      reportRows.push({
        id: reportId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        site_id: scoped[0].site_id,
        brand_id: scoped[0].brand_id,
        funnel_id: funnelId,
        funnel_name: def.name,
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
        total_entries: entries,
        total_conversions: conversions,
        conversion_rate: conversionRate,
        largest_dropoff_step: largestDropoffStep,
        largest_dropoff_rate: largestDropoffRate,
        revenue: scoped.reduce((sum, e) => sum + (e.revenue_value || 0), 0),
        metadata: { steps: def.steps },
      });

      def.steps.forEach((step, idx) => {
        const visitors = stepCounts[idx];
        const completed = idx < def.steps.length - 1 ? stepCounts[idx + 1] : visitors;
        const dropoffCount = Math.max(0, visitors - completed);
        const dropoffRate = visitors > 0 ? Number((dropoffCount / visitors).toFixed(4)) : 0;
        const stepConversionRate = visitors > 0 ? Number((completed / visitors).toFixed(4)) : 0;
        stepRows.push({
          funnel_report_id: reportId,
          step_order: idx + 1,
          step_name: step.replace(/_/g, " "),
          event_name: step,
          page_path: scoped.find((e) => e.event_name === step)?.page_path ?? null,
          visitors,
          completed,
          dropoff_count: dropoffCount,
          dropoff_rate: dropoffRate,
          conversion_rate: stepConversionRate,
        });
      });
    }

    if (reportRows.length > 0) {
      let deleteQuery = supabase.from("funnel_reports").delete().gte("date_range_start", startIso.slice(0, 10));
      if (body.site_id) deleteQuery = deleteQuery.eq("site_id", body.site_id);
      if (body.brand_id) deleteQuery = deleteQuery.eq("brand_id", body.brand_id);
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      const { error: reportInsertError } = await supabase.from("funnel_reports").insert(reportRows);
      if (reportInsertError) throw reportInsertError;

      if (stepRows.length > 0) {
        const { error: stepError } = await supabase.from("funnel_steps").insert(stepRows);
        if (stepError) throw stepError;
      }
    }

    return json(200, {
      ok: true,
      processed_events: events.length,
      rollups_written: rollupRows.length,
      content_rows_written: contentRows.length,
      funnel_reports_written: reportRows.length,
    });
  } catch (error) {
    return json(500, { ok: false, error: error instanceof Error ? error.message : "Rollup failed." });
  }
}
