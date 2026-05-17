import { supabase } from "@/integrations/supabase/client";

export type ClosedLoopDateRange = "7d" | "30d" | "90d";

type QueryScope = {
  companyId: string;
  clientAccountId?: string | null;
  dateRange: ClosedLoopDateRange;
  siteId?: string;
  brandId?: string;
};

type AnalyticsEventLite = {
  event_name?: string | null;
  created_at?: string | null;
  anonymous_visitor_id?: string | null;
  session_id?: string | null;
  campaign_id?: string | null;
  audience_cluster_id?: string | null;
  audience_pool_id?: string | null;
  lead_magnet_id?: string | null;
  offer_id?: string | null;
  offer_stage?: string | null;
  funnel_id?: string | null;
  client_id?: string | null;
  page_path?: string | null;
  metadata?: Record<string, unknown> | null;
};

type RevenueLite = {
  offer_id?: string | null;
  offer_name?: string | null;
  amount?: number | null;
  currency?: string | null;
  campaign_id?: string | null;
  funnel_id?: string | null;
  client_id?: string | null;
  lead_magnet_id?: string | null;
  created_at?: string | null;
};

type LeadMagnetInteractionLite = {
  lead_magnet_id?: string | null;
  interaction_kind?: string | null;
  interaction_status?: string | null;
  campaign_id?: string | null;
  offer_id?: string | null;
  occurred_at?: string | null;
  client_id?: string | null;
};

type RollupLite = {
  page_views?: number | null;
  unique_visitors?: number | null;
  sessions?: number | null;
  cta_clicks?: number | null;
  form_submits?: number | null;
  booking_clicks?: number | null;
  checkout_starts?: number | null;
  purchases?: number | null;
  revenue?: number | null;
};

type LooseQueryResult<T> = Promise<{
  data: T[] | null;
  error: unknown;
  count?: number | null;
}>;

type LooseQuery<T> = {
  select: (...args: unknown[]) => LooseQuery<T>;
  eq: (column: string, value: unknown) => LooseQuery<T>;
  gte: (column: string, value: unknown) => LooseQuery<T>;
  order: (column: string, options?: { ascending?: boolean }) => LooseQuery<T>;
  limit: (count: number) => LooseQueryResult<T>;
};

type LooseSupabaseClient = {
  from: <T = Record<string, unknown>>(table: string) => LooseQuery<T>;
};

type FindingLite = {
  id: string;
  created_at?: string | null;
  title?: string | null;
  summary?: string | null;
  recommendation?: string | null;
  priority?: string | null;
  status?: string | null;
  finding_type?: string | null;
  related_campaign_id?: string | null;
  related_offer_id?: string | null;
  audience_pool_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type KoraIntelligenceSummary = {
  audienceSignals: number;
  audiencePools: number;
  leadMagnetActivity: number;
  buyerJourneys: number;
  activeWorkflows: number;
  revenueInfluence: number;
  learningFindings: number;
  actionNeeded: number;
};

export type ClosedLoopSnapshot = {
  pageViews: number;
  uniqueVisitors: number;
  sessions: number;
  ctaClicks: number;
  leadMagnetActions: number;
  formSubmissions: number;
  bookingClicks: number;
  checkoutStarts: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
};

export type FunnelStageSummary = {
  key: string;
  label: string;
  count: number;
};

export type FunnelOverviewSummary = {
  mode: "firm" | "client";
  stages: FunnelStageSummary[];
  explanation: string;
};

export type AudienceIntelligenceSummary = {
  signalCount: number;
  topAudienceClusters: Array<{ clusterId: string; signals: number }>;
  audiencePools: Array<{ poolId: string; signals: number }>;
  exportReadyAudiences: Array<{ audience: string; platform: string; readiness: string }>;
  explanation: string;
};

export type LeadMagnetPerformanceRow = {
  leadMagnet: string;
  interactions: number;
  leads: number;
  conversions: number;
  revenueInfluence: number;
  followUpNeeded: number;
};

export type LeadMagnetPerformanceSummary = {
  rows: LeadMagnetPerformanceRow[];
};

export type CampaignPerformanceSummary = {
  topCampaigns: Array<{
    campaignId: string;
    interactions: number;
    ctaClicks: number;
    conversions: number;
  }>;
};

export type RevenueAttributionSummary = {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topOffers: Array<{ offerId: string; amount: number }>;
  revenueByFunnel: Array<{ funnel: string; amount: number; transactions: number; clients: string[] }>;
  revenueByClient: Array<{ clientId: string; amount: number; transactions: number; funnels: string[] }>;
};

export type KoraRecommendation = {
  id: string;
  createdAt: string | null;
  whatKoraNoticed: string;
  whatItMeans: string;
  recommendedNextMove: string;
  confidenceLevel: string;
  priority: string;
  status: string;
  related: {
    audiencePool: string | null;
    campaign: string | null;
    offer: string | null;
    leadMagnet: string | null;
    revenueSignal: string | null;
  };
};

export type ClientAnalyticsSummary = {
  helperCopy: string;
  clients: Array<{
    clientId: string;
    events: number;
    revenue: number;
    findings: number;
    deliverables: number;
  }>;
};

const DEFAULT_SITE_ID = "jahknowspr_web";
const DEFAULT_BRAND_ID = "jahknowspr";
const supabaseLoose = supabase as unknown as LooseSupabaseClient;

function getDateRangeStartIso(range: ClosedLoopDateRange): string {
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function getScope(scope: QueryScope) {
  return {
    siteId: scope.siteId ?? DEFAULT_SITE_ID,
    brandId: scope.brandId ?? DEFAULT_BRAND_ID,
    clientAccountId: scope.clientAccountId && scope.clientAccountId !== "all" ? scope.clientAccountId : null,
    startIso: getDateRangeStartIso(scope.dateRange),
  };
}

function uniqueCount(values: Array<string | null | undefined>): number {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

function sumAmount(rows: Array<{ amount?: number | null }>): number {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function toPlatformLabel(index: number): string {
  const platforms = ["Meta", "Google", "TikTok", "LinkedIn", "Email", "SMS"];
  return platforms[index % platforms.length];
}

async function getAnalyticsEvents(scope: QueryScope): Promise<AnalyticsEventLite[]> {
  const { siteId, brandId, clientAccountId, startIso } = getScope(scope);
  let query = supabaseLoose
    .from("analytics_events")
    .select(
      "event_name,created_at,anonymous_visitor_id,session_id,campaign_id,audience_cluster_id,audience_pool_id,lead_magnet_id,offer_id,offer_stage,funnel_id,client_id,page_path,metadata",
    )
    .eq("site_id", siteId)
    .eq("brand_id", brandId)
    .gte("created_at", startIso)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (clientAccountId) query = query.eq("client_id", clientAccountId);

  const { data, error } = await query;
  if (error) return [];
  return (data || []) as AnalyticsEventLite[];
}

async function getRevenueRows(scope: QueryScope): Promise<RevenueLite[]> {
  const { siteId, brandId, clientAccountId, startIso } = getScope(scope);
  let query = supabaseLoose
    .from("revenue_attribution")
    .select("offer_id,offer_name,amount,currency,campaign_id,funnel_id,client_id,lead_magnet_id,created_at")
    .eq("site_id", siteId)
    .eq("brand_id", brandId)
    .gte("created_at", startIso)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (clientAccountId) query = query.eq("client_id", clientAccountId);

  const { data, error } = await query;
  if (error) return [];
  return (data || []) as RevenueLite[];
}

async function getLeadMagnetInteractions(scope: QueryScope): Promise<LeadMagnetInteractionLite[]> {
  const { siteId, brandId, clientAccountId, startIso } = getScope(scope);
  let query = supabaseLoose
    .from("lead_magnet_interactions")
    .select("lead_magnet_id,interaction_kind,interaction_status,campaign_id,offer_id,occurred_at,client_id")
    .eq("site_id", siteId)
    .eq("brand_id", brandId)
    .gte("occurred_at", startIso)
    .order("occurred_at", { ascending: false })
    .limit(1000);

  if (clientAccountId) query = query.eq("client_id", clientAccountId);

  const { data, error } = await query;
  if (error) return [];
  return (data || []) as LeadMagnetInteractionLite[];
}

async function getFindings(scope: QueryScope): Promise<FindingLite[]> {
  const { siteId, brandId, clientAccountId, startIso } = getScope(scope);
  let query = supabaseLoose
    .from("kora_analytics_findings")
    .select(
      "id,created_at,title,summary,recommendation,priority,status,finding_type,related_campaign_id,related_offer_id,audience_pool_id,metadata",
    )
    .eq("site_id", siteId)
    .eq("brand_id", brandId)
    .gte("created_at", startIso)
    .order("created_at", { ascending: false })
    .limit(100);

  if (clientAccountId) query = query.eq("client_id", clientAccountId);

  const { data, error } = await query;
  if (error) return [];
  return (data || []) as FindingLite[];
}

export async function getKoraIntelligenceSummary(
  companyId: string,
  clientAccountId: string | null,
  dateRange: ClosedLoopDateRange,
): Promise<KoraIntelligenceSummary> {
  const scope: QueryScope = { companyId, clientAccountId, dateRange };
  const { siteId, brandId, clientAccountId: scopedClient, startIso } = getScope(scope);

  const [events, interactions, findings, revenueRows, buyerJourneyRowsResult, workflowRowsResult] = await Promise.all([
    getAnalyticsEvents(scope),
    getLeadMagnetInteractions(scope),
    getFindings(scope),
    getRevenueRows(scope),
    (() => {
      let q = supabaseLoose
        .from("buyer_journeys")
        .select("id")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .gte("updated_at", startIso)
        .limit(1000);
      if (scopedClient) q = q.eq("client_id", scopedClient);
      return q;
    })(),
    (() => {
      let q = supabaseLoose
        .from("offer_presentations")
        .select("id")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .gte("presented_at", startIso)
        .limit(1000);
      if (scopedClient) q = q.eq("client_id", scopedClient);
      return q;
    })(),
  ]);

  const audiencePools = uniqueCount(events.map((event) => event.audience_pool_id));
  const actionNeeded =
    interactions.filter((row) => ["pending", "failed", "unknown", "abandoned"].includes(String(row.interaction_status || "").toLowerCase()))
      .length +
    findings.filter((finding) => ["new", "in_progress", "urgent", "high"].includes(String(finding.status || "").toLowerCase()) || String(finding.priority || "").toLowerCase() === "urgent")
      .length;

  return {
    audienceSignals: events.length,
    audiencePools,
    leadMagnetActivity: interactions.length,
    buyerJourneys: buyerJourneyRowsResult.data?.length || 0,
    activeWorkflows: workflowRowsResult.data?.length || 0,
    revenueInfluence: Math.round(sumAmount(revenueRows)),
    learningFindings: findings.length,
    actionNeeded,
  };
}

export async function getClosedLoopSnapshot(
  companyId: string,
  clientAccountId: string | null,
  dateRange: ClosedLoopDateRange,
): Promise<ClosedLoopSnapshot> {
  const scope: QueryScope = { companyId, clientAccountId, dateRange };
  const { siteId, brandId, clientAccountId: scopedClient, startIso } = getScope(scope);

  const [events, interactions, revenueRows, rollupsResult] = await Promise.all([
    getAnalyticsEvents(scope),
    getLeadMagnetInteractions(scope),
    getRevenueRows(scope),
    scopedClient
      ? Promise.resolve({ data: [] as RollupLite[] })
      : supabaseLoose
          .from("analytics_daily_rollups")
          .select("date,page_views,unique_visitors,sessions,cta_clicks,form_submits,booking_clicks,checkout_starts,purchases,revenue")
          .eq("site_id", siteId)
          .eq("brand_id", brandId)
          .gte("date", startIso.slice(0, 10))
          .order("date", { ascending: false })
          .limit(120),
  ]);

  if (!scopedClient && (rollupsResult.data || []).length) {
    const rollups = (rollupsResult.data || []) as RollupLite[];
    const pageViews = rollups.reduce((sum, row) => sum + Number(row.page_views || 0), 0);
    const uniqueVisitors = rollups.reduce((sum, row) => sum + Number(row.unique_visitors || 0), 0);
    const sessions = rollups.reduce((sum, row) => sum + Number(row.sessions || 0), 0);
    const ctaClicks = rollups.reduce((sum, row) => sum + Number(row.cta_clicks || 0), 0);
    const formSubmissions = rollups.reduce((sum, row) => sum + Number(row.form_submits || 0), 0);
    const bookingClicks = rollups.reduce((sum, row) => sum + Number(row.booking_clicks || 0), 0);
    const checkoutStarts = rollups.reduce((sum, row) => sum + Number(row.checkout_starts || 0), 0);
    const purchases = rollups.reduce((sum, row) => sum + Number(row.purchases || 0), 0);
    const revenue = rollups.reduce((sum, row) => sum + Number(row.revenue || 0), 0);

    return {
      pageViews,
      uniqueVisitors,
      sessions,
      ctaClicks,
      leadMagnetActions: interactions.length,
      formSubmissions,
      bookingClicks,
      checkoutStarts,
      purchases,
      revenue,
      conversionRate: sessions > 0 ? purchases / sessions : 0,
    };
  }

  const eventCount = (eventName: string) =>
    events.filter((event) => String(event.event_name || "").toLowerCase() === eventName.toLowerCase()).length;

  const sessions = uniqueCount(events.map((event) => event.session_id));
  const purchases = eventCount("purchase_complete");
  const revenue = sumAmount(revenueRows);

  return {
    pageViews: eventCount("page_view"),
    uniqueVisitors: uniqueCount(events.map((event) => event.anonymous_visitor_id)),
    sessions,
    ctaClicks: eventCount("cta_click"),
    leadMagnetActions: interactions.length,
    formSubmissions: eventCount("form_submit") + eventCount("audit_request_submit"),
    bookingClicks: eventCount("booking_click"),
    checkoutStarts: eventCount("checkout_start"),
    purchases,
    revenue,
    conversionRate: sessions > 0 ? purchases / sessions : 0,
  };
}

export async function getFunnelOverview(
  companyId: string,
  clientAccountId: string | null,
  dateRange: ClosedLoopDateRange,
): Promise<FunnelOverviewSummary> {
  const scope: QueryScope = { companyId, clientAccountId, dateRange };
  const [events, interactions, revenueRows, auditRowsResult, pdfRowsResult, audioRowsResult, contractRowsResult] =
    await Promise.all([
      getAnalyticsEvents(scope),
      getLeadMagnetInteractions(scope),
      getRevenueRows(scope),
      (() => {
        const { siteId, brandId, clientAccountId: scopedClient, startIso } = getScope(scope);
        let q = supabaseLoose
          .from("audit_intakes")
          .select("id,created_at,client_id")
          .eq("site_id", siteId)
          .eq("brand_id", brandId)
          .gte("created_at", startIso)
          .limit(1000);
        if (scopedClient) q = q.eq("client_id", scopedClient);
        return q;
      })(),
      supabaseLoose.from("audit_pdf_deliverables").select("audit_intake_id").limit(1000),
      supabaseLoose.from("audit_audio_deliverables").select("audit_intake_id").limit(1000),
      (() => {
        const { clientAccountId: scopedClient, startIso } = getScope(scope);
        let q = supabaseLoose
          .from("contract_attribution")
          .select("id,created_at,client_id")
          .gte("created_at", startIso)
          .limit(1000);
        if (scopedClient) q = q.eq("client_id", scopedClient);
        return q;
      })(),
    ]);

  const eventCount = (eventName: string) =>
    events.filter((event) => String(event.event_name || "").toLowerCase() === eventName.toLowerCase()).length;

  const purchaseCount = eventCount("purchase_complete");
  const revenueSignalCount = revenueRows.filter((row) => Number(row.amount || 0) > 0).length;

  if (clientAccountId && clientAccountId !== "all") {
    return {
      mode: "client",
      explanation: "Client workflow funnel reflects campaign, deliverables, conversions, and revenue signals.",
      stages: [
        { key: "campaign_interaction", label: "Campaign interaction", count: events.filter((event) => Boolean(event.campaign_id)).length },
        { key: "lead_generated", label: "Lead generated", count: interactions.length },
        { key: "deliverable_created", label: "Deliverable created", count: (pdfRowsResult.data || []).length + (audioRowsResult.data || []).length },
        { key: "cta_clicked", label: "CTA clicked", count: eventCount("cta_click") },
        { key: "client_conversion", label: "Client conversion", count: purchaseCount },
        { key: "revenue_signal", label: "Revenue signal", count: revenueSignalCount },
      ],
    };
  }

  const deliveredSet = new Set<string>();
  ((pdfRowsResult.data || []) as Array<{ audit_intake_id?: string | null }>).forEach((row) => {
    if (row.audit_intake_id) deliveredSet.add(row.audit_intake_id);
  });
  ((audioRowsResult.data || []) as Array<{ audit_intake_id?: string | null }>).forEach((row) => {
    if (row.audit_intake_id) deliveredSet.add(row.audit_intake_id);
  });

  return {
    mode: "firm",
    explanation: "Firm funnel tracks JahKnowsPR journey from visitor to revenue.",
    stages: [
      { key: "visitor", label: "Visitor", count: eventCount("page_view") },
      { key: "lead_magnet_action", label: "Lead magnet action", count: interactions.length },
      { key: "audit_request", label: "Audit request", count: (auditRowsResult.data || []).length || eventCount("audit_request_submit") },
      { key: "deliverable", label: "PDF/audio delivered", count: deliveredSet.size },
      { key: "strategy_session_lead", label: "Strategy session lead", count: eventCount("booking_click") + eventCount("strategy_session_page_view") },
      { key: "paid_session", label: "Paid session", count: revenueRows.filter((row) => String(row.offer_id || "").includes("strategy_session")).length },
      { key: "contract_opportunity", label: "Contract opportunity", count: (contractRowsResult.data || []).length },
      { key: "revenue", label: "Revenue", count: revenueSignalCount },
    ],
  };
}

export async function getAudienceIntelligenceSummary(
  companyId: string,
  clientAccountId: string | null,
  dateRange: ClosedLoopDateRange,
): Promise<AudienceIntelligenceSummary> {
  const events = await getAnalyticsEvents({ companyId, clientAccountId, dateRange });

  const clusterMap = events.reduce<Record<string, number>>((acc, event) => {
    const cluster = event.audience_cluster_id || null;
    if (!cluster) return acc;
    acc[cluster] = (acc[cluster] || 0) + 1;
    return acc;
  }, {});

  const poolMap = events.reduce<Record<string, number>>((acc, event) => {
    const pool = event.audience_pool_id || null;
    if (!pool) return acc;
    acc[pool] = (acc[pool] || 0) + 1;
    return acc;
  }, {});

  const topAudienceClusters = Object.entries(clusterMap)
    .map(([clusterId, signals]) => ({ clusterId, signals }))
    .sort((a, b) => b.signals - a.signals)
    .slice(0, 5);

  const audiencePools = Object.entries(poolMap)
    .map(([poolId, signals]) => ({ poolId, signals }))
    .sort((a, b) => b.signals - a.signals)
    .slice(0, 5);

  const exportReadyAudiences = audiencePools.map((pool, index) => ({
    audience: pool.poolId,
    platform: toPlatformLabel(index),
    readiness: pool.signals > 10 ? "Export-ready after identifier check" : "Needs more qualifying signals",
  }));

  return {
    signalCount: events.length,
    topAudienceClusters,
    audiencePools,
    exportReadyAudiences,
    explanation:
      "Signals are raw audience clues. KORA groups them into pools for follow-up, campaigns, and retargeting.",
  };
}

function getJahLeadMagnetMap() {
  return [
    { id: "free_audit", label: "Free Audit" },
    { id: "strategy_session", label: "Strategy Session" },
    { id: "the_brief", label: "The Brief" },
    { id: "telegram_add_on", label: "Telegram Add-On" },
  ];
}

export async function getLeadMagnetPerformance(
  companyId: string,
  clientAccountId: string | null,
  dateRange: ClosedLoopDateRange,
): Promise<LeadMagnetPerformanceSummary> {
  const scope: QueryScope = { companyId, clientAccountId, dateRange };
  const [interactions, revenueRows] = await Promise.all([getLeadMagnetInteractions(scope), getRevenueRows(scope)]);

  const configuredLeadMagnets =
    companyId === "jahknowspr"
      ? getJahLeadMagnetMap()
      : Array.from(new Set(interactions.map((row) => row.lead_magnet_id).filter(Boolean) as string[])).map((id) => ({
          id,
          label: id.replaceAll("_", " "),
        }));

  const rows: LeadMagnetPerformanceRow[] = configuredLeadMagnets.map((item) => {
    const relatedInteractions = interactions.filter((row) => row.lead_magnet_id === item.id);
    const relatedRevenue = revenueRows.filter((row) => row.lead_magnet_id === item.id);

    const leads = relatedInteractions.filter((row) =>
      ["start", "submit", "qualified", "booking"].includes(String(row.interaction_kind || "").toLowerCase()),
    ).length;
    const conversions = relatedInteractions.filter((row) =>
      ["purchase", "contract"].includes(String(row.interaction_kind || "").toLowerCase()),
    ).length;
    const followUpNeeded = relatedInteractions.filter((row) =>
      ["pending", "unknown", "failed", "abandoned"].includes(String(row.interaction_status || "").toLowerCase()),
    ).length;

    return {
      leadMagnet: item.label,
      interactions: relatedInteractions.length,
      leads,
      conversions,
      revenueInfluence: Math.round(sumAmount(relatedRevenue)),
      followUpNeeded,
    };
  });

  return { rows };
}

export async function getCampaignPerformanceSummary(
  companyId: string,
  clientAccountId: string | null,
  dateRange: ClosedLoopDateRange,
): Promise<CampaignPerformanceSummary> {
  const events = await getAnalyticsEvents({ companyId, clientAccountId, dateRange });
  const map = events.reduce<Record<string, { interactions: number; ctaClicks: number; conversions: number }>>(
    (acc, event) => {
      const campaignId = event.campaign_id || "unassigned_campaign";
      if (!acc[campaignId]) acc[campaignId] = { interactions: 0, ctaClicks: 0, conversions: 0 };
      acc[campaignId].interactions += 1;
      if (String(event.event_name || "").toLowerCase() === "cta_click") acc[campaignId].ctaClicks += 1;
      if (String(event.event_name || "").toLowerCase() === "purchase_complete") acc[campaignId].conversions += 1;
      return acc;
    },
    {},
  );

  const topCampaigns = Object.entries(map)
    .map(([campaignId, row]) => ({ campaignId, ...row }))
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, 8);

  return { topCampaigns };
}

export async function getRevenueAttributionSummary(
  companyId: string,
  clientAccountId: string | null,
  dateRange: ClosedLoopDateRange,
): Promise<RevenueAttributionSummary> {
  const revenueRows = await getRevenueRows({ companyId, clientAccountId, dateRange });
  const totalRevenue = sumAmount(revenueRows);
  const totalTransactions = revenueRows.length;
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const topOffers = Object.entries(
    revenueRows.reduce<Record<string, number>>((acc, row) => {
      const key = row.offer_id || row.offer_name || "unknown_offer";
      acc[key] = (acc[key] || 0) + Number(row.amount || 0);
      return acc;
    }, {}),
  )
    .map(([offerId, amount]) => ({ offerId, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const revenueByFunnel = Object.entries(
    revenueRows.reduce<Record<string, { amount: number; transactions: number; clients: Set<string> }>>((acc, row) => {
      const key = row.funnel_id || row.offer_name || "unknown_funnel";
      if (!acc[key]) acc[key] = { amount: 0, transactions: 0, clients: new Set<string>() };
      acc[key].amount += Number(row.amount || 0);
      acc[key].transactions += 1;
      acc[key].clients.add(row.client_id || "unknown");
      return acc;
    }, {}),
  )
    .map(([funnel, row]) => ({
      funnel,
      amount: row.amount,
      transactions: row.transactions,
      clients: Array.from(row.clients),
    }))
    .sort((a, b) => b.amount - a.amount);

  const revenueByClient = Object.entries(
    revenueRows.reduce<Record<string, { amount: number; transactions: number; funnels: Set<string> }>>((acc, row) => {
      const key = row.client_id || "unknown";
      if (!acc[key]) acc[key] = { amount: 0, transactions: 0, funnels: new Set<string>() };
      acc[key].amount += Number(row.amount || 0);
      acc[key].transactions += 1;
      acc[key].funnels.add(row.funnel_id || row.offer_name || "unknown_funnel");
      return acc;
    }, {}),
  )
    .map(([clientId, row]) => ({
      clientId,
      amount: row.amount,
      transactions: row.transactions,
      funnels: Array.from(row.funnels),
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalRevenue,
    totalTransactions,
    averageOrderValue,
    topOffers,
    revenueByFunnel,
    revenueByClient,
  };
}

export async function getKoraRecommendations(
  companyId: string,
  clientAccountId: string | null,
  dateRange: ClosedLoopDateRange,
): Promise<KoraRecommendation[]> {
  const findings = await getFindings({ companyId, clientAccountId, dateRange });

  return findings.map((finding) => ({
    id: finding.id,
    createdAt: finding.created_at || null,
    whatKoraNoticed: finding.title || "KORA detected a new signal",
    whatItMeans: finding.summary || "This signal may affect campaign, offer, or conversion performance.",
    recommendedNextMove: finding.recommendation || "Review this signal and assign the next best action.",
    confidenceLevel: String((finding.metadata || {}).confidence || "Medium"),
    priority: finding.priority || "medium",
    status: finding.status || "new",
    related: {
      audiencePool: finding.audience_pool_id || null,
      campaign: finding.related_campaign_id || null,
      offer: finding.related_offer_id || null,
      leadMagnet: String((finding.metadata || {}).lead_magnet_id || "") || null,
      revenueSignal: String((finding.metadata || {}).revenue_signal || "") || null,
    },
  }));
}

export async function getClientAnalyticsSummary(
  companyId: string,
  dateRange: ClosedLoopDateRange,
): Promise<ClientAnalyticsSummary> {
  const [events, revenueRows, findings, contentRows] = await Promise.all([
    getAnalyticsEvents({ companyId, dateRange, clientAccountId: null }),
    getRevenueRows({ companyId, dateRange, clientAccountId: null }),
    getFindings({ companyId, dateRange, clientAccountId: null }),
    (() => {
      const { siteId, brandId, startIso } = getScope({ companyId, dateRange, clientAccountId: null });
      return supabaseLoose
        .from("content_performance")
        .select("client_id,updated_at")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .gte("updated_at", startIso)
        .limit(1000);
    })(),
  ]);

  const clientIds = new Set<string>();
  events.forEach((row) => {
    if (row.client_id) clientIds.add(row.client_id);
  });
  revenueRows.forEach((row) => {
    if (row.client_id) clientIds.add(row.client_id);
  });
  findings.forEach((row) => {
    const metadataClientId = String((row.metadata || {}).client_id || "");
    if (metadataClientId) clientIds.add(metadataClientId);
  });
  ((contentRows.data || []) as Array<{ client_id?: string | null }>).forEach((row) => {
    if (row.client_id) clientIds.add(row.client_id);
  });

  const clients = Array.from(clientIds).map((clientId) => ({
    clientId,
    events: events.filter((row) => row.client_id === clientId).length,
    revenue: Math.round(sumAmount(revenueRows.filter((row) => row.client_id === clientId))),
    findings: findings.filter((row) => {
      const metadataClientId = String((row.metadata || {}).client_id || "");
      return metadataClientId === clientId;
    }).length,
    deliverables: ((contentRows.data || []) as Array<{ client_id?: string | null }>).filter((row) => row.client_id === clientId)
      .length,
  }));

  return {
    helperCopy:
      "Mission Control manages the full KORA intelligence system. This dashboard shows the business-facing analytics for JahKnowsPR and its client work.",
    clients,
  };
}
