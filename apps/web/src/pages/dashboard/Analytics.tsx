import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, BarChart3, Building2, CheckCircle2, Megaphone, Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type RollupRow = {
  date: string;
  page_views: number;
  unique_visitors: number;
  sessions: number;
  cta_clicks: number;
  form_submits: number;
  booking_clicks: number;
  checkout_starts: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
  top_page_path: string | null;
};

type ContentPerformanceRow = {
  id: string;
  client_id?: string | null;
  content_id?: string | null;
  content_type?: string | null;
  title?: string | null;
  slug?: string | null;
  page_path?: string | null;
  category?: string | null;
  views?: number | null;
  unique_visitors?: number | null;
  clicks?: number | null;
  click_rate?: number | null;
  form_submits?: number | null;
  booking_clicks?: number | null;
  revenue_attributed?: number | null;
  conversion_rate?: number | null;
  recommended_action?: string | null;
  metadata?: Record<string, unknown> | null;
};

type FunnelRow = {
  id: string;
  client_id?: string | null;
  funnel_id?: string | null;
  funnel_name: string;
  total_entries: number;
  total_conversions: number;
  conversion_rate: number;
  largest_dropoff_step?: string | null;
  largest_dropoff_rate?: number | null;
  revenue?: number | null;
};

type RevenueRow = {
  id?: string;
  client_id?: string | null;
  offer_id?: string | null;
  offer_name?: string | null;
  funnel_id?: string | null;
  campaign_id?: string | null;
  amount?: number | null;
  payment_provider?: string | null;
  page_path?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AnalyticsEventRow = {
  created_at: string;
  event_name?: string | null;
};

const ZERO_METRICS = {
  page_views: 0,
  unique_visitors: 0,
  sessions: 0,
  cta_clicks: 0,
  form_submits: 0,
  booking_clicks: 0,
  checkout_starts: 0,
  purchases: 0,
  revenue: 0,
};

const CLIENT_LABELS: Record<string, string> = {
  jahknowspr: "JahKnowsPR",
  "mont-city-network": "Mont City Network",
  "arobias-unique-boutique": "Arobia's Unique Boutique",
  "eb-digital-magazine": "EB Digital Magazine",
  unknown: "Unattributed client",
};

const FIRM_CLIENT_OPTIONS = [
  { id: "all", label: "All Firm Clients" },
  { id: "mont-city-network", label: "Mont City Network" },
  { id: "arobias-unique-boutique", label: "Arobia's Unique Boutique" },
  { id: "eb-digital-magazine", label: "EB Digital Magazine" },
];

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString();
}

function pct(v: number | null | undefined): string {
  if (!v) return "0%";
  return `${(v * 100).toFixed(1)}%`;
}

export default function Analytics() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const queryClient = useQueryClient();
  const siteId = "jahknowspr_web";
  const brandId = "jahknowspr";
  const [selectedFirmClientId, setSelectedFirmClientId] = useState("all");
  const selectedFirmClient = FIRM_CLIENT_OPTIONS.find((client) => client.id === selectedFirmClientId);
  const isClientAnalyticsView = selectedFirmClientId !== "all";
  const activeAnalyticsLabel = isClientAnalyticsView ? selectedFirmClient?.label || "Selected Client" : "JahKnowsPR";
  const activeAnalyticsScope = isClientAnalyticsView
    ? "Client campaign, funnel, and revenue analytics"
    : "Firm-owned website, content, funnel, and revenue analytics";

  const rollupsQuery = useQuery({
    queryKey: ["kora-analytics-rollups", siteId, brandId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("analytics_daily_rollups")
        .select("*")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .order("date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as RollupRow[];
    },
    enabled: isAdmin,
  });

  const contentQuery = useQuery({
    queryKey: ["kora-analytics-content", siteId, brandId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_performance")
        .select("*")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .order("views", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data || []) as ContentPerformanceRow[];
    },
    enabled: isAdmin,
  });

  const funnelQuery = useQuery({
    queryKey: ["kora-analytics-funnels", siteId, brandId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("funnel_reports")
        .select("*")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as FunnelRow[];
    },
    enabled: isAdmin,
  });

  const revenueQuery = useQuery({
    queryKey: ["kora-analytics-revenue", siteId, brandId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("revenue_attribution")
        .select("*")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data || []) as RevenueRow[];
    },
    enabled: isAdmin,
  });

  const findingsQuery = useQuery({
    queryKey: ["kora-analytics-findings", siteId, brandId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("kora_analytics_findings")
        .select("*")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const latestEventQuery = useQuery({
    queryKey: ["kora-analytics-latest-event", siteId, brandId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("analytics_events")
        .select("created_at")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.created_at || null;
    },
    enabled: isAdmin,
  });

  const selectedClientEventsQuery = useQuery({
    queryKey: ["kora-analytics-client-events", siteId, brandId, selectedFirmClientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("analytics_events")
        .select("created_at,event_name")
        .eq("site_id", siteId)
        .eq("brand_id", brandId)
        .eq("client_id", selectedFirmClientId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as AnalyticsEventRow[];
    },
    enabled: isAdmin && isClientAnalyticsView,
  });

  const updateFindingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("kora_analytics_findings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["kora-analytics-findings"] }),
  });

  const latestRollup = rollupsQuery.data?.[0];
  const hasRealData = Boolean(rollupsQuery.data?.length || findingsQuery.data?.length || latestEventQuery.data);

  const executive = useMemo(() => {
    if (!hasRealData) return ZERO_METRICS;
    return (rollupsQuery.data || []).reduce(
      (acc, row) => ({
        page_views: acc.page_views + Number(row.page_views || 0),
        unique_visitors: acc.unique_visitors + Number(row.unique_visitors || 0),
        sessions: acc.sessions + Number(row.sessions || 0),
        cta_clicks: acc.cta_clicks + Number(row.cta_clicks || 0),
        form_submits: acc.form_submits + Number(row.form_submits || 0),
        booking_clicks: acc.booking_clicks + Number(row.booking_clicks || 0),
        checkout_starts: acc.checkout_starts + Number(row.checkout_starts || 0),
        purchases: acc.purchases + Number(row.purchases || 0),
        revenue: acc.revenue + Number(row.revenue || 0),
      }),
      { ...ZERO_METRICS },
    );
  }, [hasRealData, rollupsQuery.data]);

  const conversionRate = executive.sessions > 0 ? executive.purchases / executive.sessions : 0;
  const clickRate = executive.page_views > 0 ? executive.cta_clicks / executive.page_views : 0;
  const topRevenueOffers = useMemo(
    () =>
      Object.entries(
        (revenueQuery.data || []).reduce<Record<string, number>>((acc, r) => {
          const k = r.offer_id || "unknown";
          acc[k] = (acc[k] || 0) + Number(r.amount || 0);
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    [revenueQuery.data],
  );

  const websiteTrafficRows = useMemo(() => {
    return (rollupsQuery.data || []).slice(0, 7).map((row) => ({
      label: row.date,
      pageViews: Number(row.page_views || 0),
      visitors: Number(row.unique_visitors || 0),
      sessions: Number(row.sessions || 0),
      topPage: row.top_page_path || "n/a",
    }));
  }, [rollupsQuery.data]);

  const briefPosts = useMemo(() => {
    const realPosts = (contentQuery.data || [])
      .filter((row) => {
        const type = String(row.content_type || "").toLowerCase();
        const path = `${row.page_path || ""} ${row.slug || ""}`.toLowerCase();
        return type === "blog" || path.includes("the-brief");
      })
      .sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
    return realPosts;
  }, [contentQuery.data]);

  const revenueByClient = useMemo(() => {
    const source = revenueQuery.data || [];

    return Object.entries(
      source.reduce<Record<string, { amount: number; transactions: number; funnels: Set<string> }>>((acc, row) => {
        const key = row.client_id || "unknown";
        if (!acc[key]) acc[key] = { amount: 0, transactions: 0, funnels: new Set<string>() };
        acc[key].amount += Number(row.amount || 0);
        acc[key].transactions += 1;
        if (row.funnel_id || row.offer_name) acc[key].funnels.add(row.funnel_id || row.offer_name || "unknown");
        return acc;
      }, {}),
    )
      .map(([clientId, row]) => ({
        clientId,
        clientName: CLIENT_LABELS[clientId] || clientId,
        amount: row.amount,
        transactions: row.transactions,
        funnels: Array.from(row.funnels),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [revenueQuery.data]);

  const revenueByFunnel = useMemo(() => {
    const source = revenueQuery.data || [];
    return Object.entries(
      source.reduce<Record<string, { amount: number; clients: Set<string>; transactions: number }>>((acc, row) => {
        const key = row.funnel_id || row.offer_name || "unknown";
        if (!acc[key]) acc[key] = { amount: 0, clients: new Set<string>(), transactions: 0 };
        acc[key].amount += Number(row.amount || 0);
        acc[key].transactions += 1;
        acc[key].clients.add(row.client_id || "unknown");
        return acc;
      }, {}),
    )
      .map(([funnel, row]) => ({
        funnel,
        amount: row.amount,
        clients: Array.from(row.clients).map((id) => CLIENT_LABELS[id] || id),
        transactions: row.transactions,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [revenueQuery.data]);

  const selectedRevenueByClient = useMemo(
    () =>
      selectedFirmClientId === "all"
        ? revenueByClient
        : revenueByClient.filter((row) => row.clientId === selectedFirmClientId),
    [revenueByClient, selectedFirmClientId],
  );

  const selectedClientRevenue = selectedRevenueByClient.reduce(
    (acc, row) => ({
      amount: acc.amount + row.amount,
      transactions: acc.transactions + row.transactions,
      funnels: acc.funnels + row.funnels.length,
    }),
    { amount: 0, transactions: 0, funnels: 0 },
  );
  const selectedClientContentRows = useMemo(
    () =>
      isClientAnalyticsView
        ? (contentQuery.data || []).filter((row) => row.client_id === selectedFirmClientId)
        : [],
    [contentQuery.data, isClientAnalyticsView, selectedFirmClientId],
  );
  const selectedClientFindings = useMemo(
    () =>
      isClientAnalyticsView
        ? (findingsQuery.data || []).filter((finding: any) => {
            const metadataClientId = finding.metadata?.client_id;
            return finding.client_id === selectedFirmClientId || metadataClientId === selectedFirmClientId;
          })
        : [],
    [findingsQuery.data, isClientAnalyticsView, selectedFirmClientId],
  );
  const activeEventsCollected = isClientAnalyticsView
    ? selectedClientEventsQuery.data?.length || 0
    : executive.page_views + executive.cta_clicks + executive.form_submits;
  const activeLatestEvent = isClientAnalyticsView
    ? selectedClientEventsQuery.data?.[0]?.created_at
    : latestEventQuery.data;
  const activeLatestFinding = isClientAnalyticsView
    ? selectedClientFindings[0]?.created_at
    : findingsQuery.data?.[0]?.created_at;

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-primary">Analytics & Engagement</h1>
        <p className="text-muted-foreground">This section is available to admins.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary">{activeAnalyticsLabel} Analytics</h1>
          <p className="text-muted-foreground">
            {activeAnalyticsScope}. Select JahKnowsPR for firm analytics or a client for client-specific performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={isClientAnalyticsView ? "outline" : "default"}
            className={isClientAnalyticsView ? "bg-white" : ""}
            onClick={() => setSelectedFirmClientId("all")}
          >
            <Building2 className="h-4 w-4 mr-2" />
            JahKnowsPR Analytics
          </Button>
          <select
            value={selectedFirmClientId}
            onChange={(event) => setSelectedFirmClientId(event.target.value)}
            className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Select firm client analytics"
          >
            {FIRM_CLIENT_OPTIONS.map((client) => (
              <option key={client.id} value={client.id}>
                {client.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!hasRealData && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-4 text-sm">
            First-party analytics is ready. Metrics will show 0 until real events and rollups are collected.
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active Analytics View</div>
        <div className="mt-1 text-lg font-semibold">{activeAnalyticsLabel}</div>
        <p className="mt-1 text-sm text-muted-foreground">{activeAnalyticsScope}</p>
      </div>

      {isClientAnalyticsView && (
        <Card className="border-primary/30 bg-primary/5 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {activeAnalyticsLabel} Client Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-5">
            <div className="rounded-md border bg-white p-3">
              <div className="text-muted-foreground">Client revenue</div>
              <div className="text-2xl font-semibold">${selectedClientRevenue.amount.toFixed(2)}</div>
            </div>
            <div className="rounded-md border bg-white p-3">
              <div className="text-muted-foreground">Revenue records</div>
              <div className="text-2xl font-semibold">{fmt(selectedClientRevenue.transactions)}</div>
            </div>
            <div className="rounded-md border bg-white p-3">
              <div className="text-muted-foreground">Client events</div>
              <div className="text-2xl font-semibold">{fmt(selectedClientEventsQuery.data?.length || 0)}</div>
            </div>
            <div className="rounded-md border bg-white p-3">
              <div className="text-muted-foreground">Findings</div>
              <div className="text-2xl font-semibold">{fmt(selectedClientFindings.length)}</div>
            </div>
            <div className="rounded-md border bg-white p-3">
              <div className="text-muted-foreground">Client content</div>
              <div className="text-2xl font-semibold">{fmt(selectedClientContentRows.length)}</div>
            </div>
            <div className="rounded-md border bg-white p-3 md:col-span-5">
              <div className="font-medium">Client view is active</div>
              <p className="mt-1 text-muted-foreground">
                Campaigns, boosted content, funnels, CTAs, conversion events, revenue, and recommendations for {activeAnalyticsLabel} will appear here as analytics receives client_id-tagged data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Analytics Status: {activeAnalyticsLabel}</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">First-party tracking</div>
            <div className="font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />Active</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Data view</div>
            <div className="font-semibold">{activeAnalyticsScope}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Events collected</div>
            <div className="font-semibold">{fmt(activeEventsCollected)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Latest event time</div>
            <div className="font-semibold">{activeLatestEvent ? new Date(activeLatestEvent).toLocaleString() : "No events yet"}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Latest rollup</div>
            <div className="font-semibold">{isClientAnalyticsView ? "Client rollups pending" : latestRollup?.date || "No rollups yet"}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Latest finding</div>
            <div className="font-semibold">
              {activeLatestFinding ? new Date(activeLatestFinding).toLocaleString() : "No findings yet"}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">External analytics</div>
            <div className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Optional connectors only</div>
          </div>
        </CardContent>
      </Card>

      {!isClientAnalyticsView && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Website Traffic
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Tracked page views</div>
                  <div className="text-2xl font-semibold">{fmt(executive.page_views)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Unique visitors</div>
                  <div className="text-2xl font-semibold">{fmt(executive.unique_visitors)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Top recent page</div>
                  <div className="text-sm font-semibold">{latestRollup?.top_page_path || websiteTrafficRows[0]?.topPage || "No traffic yet"}</div>
                </div>
              </div>
              <div className="space-y-2">
                {websiteTrafficRows.map((row) => (
                  <div key={row.label} className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-[1fr_auto_auto_auto_1.5fr]">
                    <div className="font-medium">{row.label}</div>
                    <div>Views {fmt(row.pageViews)}</div>
                    <div>Visitors {fmt(row.visitors)}</div>
                    <div>Sessions {fmt(row.sessions)}</div>
                    <div className="truncate text-muted-foreground">Top page: {row.topPage}</div>
                  </div>
                ))}
                {!websiteTrafficRows.length && <p className="text-sm text-muted-foreground">No website traffic rollups yet.</p>}
              </div>
            </CardContent>
          </Card>

      <Card>
        <CardHeader>
          <CardTitle>Executive Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ["Total page views", executive.page_views],
            ["Unique visitors", executive.unique_visitors],
            ["Sessions", executive.sessions],
            ["CTA clicks", executive.cta_clicks],
            ["Click rate", pct(clickRate)],
            ["Form submissions", executive.form_submits],
            ["Booking clicks", executive.booking_clicks],
            ["Checkout starts", executive.checkout_starts],
            ["Purchases", executive.purchases],
            ["Revenue", `$${fmt(executive.revenue)}`],
            ["Conversion rate", pct(conversionRate)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Funnel Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(funnelQuery.data || []).slice(0, 8).map((funnel) => (
              <div key={funnel.id} className="rounded-md border p-3">
                <div className="font-medium">{funnel.funnel_name}</div>
                <div className="text-sm text-muted-foreground">
                  Entries {fmt(funnel.total_entries)} · Conversions {fmt(funnel.total_conversions)} · Final conversion {pct(funnel.conversion_rate)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Biggest drop-off: {funnel.largest_dropoff_step || "n/a"} ({pct(funnel.largest_dropoff_rate)})
                </div>
                <div className="text-xs mt-1">Recommended fix: tighten CTA and message around the drop-off step.</div>
              </div>
            ))}
            {!funnelQuery.data?.length && <p className="text-sm text-muted-foreground">No funnel reports yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              Revenue by offer (top):{" "}
              {topRevenueOffers.length
                ? topRevenueOffers.map(([id, amount]) => `${id}: $${amount.toFixed(2)}`).join(" · ")
                : "No attributed offer revenue yet"}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Revenue by funnel</div>
              {revenueByFunnel.slice(0, 5).map((row) => (
                <div key={row.funnel} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{row.funnel.replaceAll("_", " ")}</div>
                  <div className="text-muted-foreground">
                    ${row.amount.toFixed(2)} · {fmt(row.transactions)} transactions · {row.clients.join(", ")}
                  </div>
                </div>
              ))}
              {!revenueByFunnel.length && <p className="text-sm text-muted-foreground">No funnel revenue yet.</p>}
            </div>
            <div className="text-sm">
              Checkout starts vs purchases: {fmt(executive.checkout_starts)} / {fmt(executive.purchases)}
            </div>
            <div className="text-sm">
              Average order value: $
              {executive.purchases > 0 ? (executive.revenue / executive.purchases).toFixed(2) : "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Page Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(contentQuery.data || []).slice(0, 10).map((row) => (
              <div key={row.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{row.page_path || row.slug || "(unknown)"}</div>
                <div className="text-muted-foreground">
                  Views {fmt(row.views)} · Clicks {fmt(row.clicks)} · Conversion {pct(row.conversion_rate)}
                </div>
                {row.views > 40 && row.clicks < 3 && (
                  <div className="text-xs mt-1">Weak page signal: high traffic, low action. Strengthen CTA and proof.</div>
                )}
              </div>
            ))}
            {!contentQuery.data?.length && <p className="text-sm text-muted-foreground">No page performance data yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>The Brief Blog Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {briefPosts.slice(0, 8).map((row) => (
              <div key={row.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{row.title || row.slug || row.page_path || "Brief post"}</div>
                <div className="text-muted-foreground">
                  Views {fmt(row.views)} · Visitors {fmt(row.unique_visitors)} · CTA clicks {fmt(row.clicks)} · Revenue $
                  {fmt(row.revenue_attributed)}
                </div>
                <div className="text-xs mt-1">
                  {Number(row.click_rate || 0) < 0.02
                    ? "Needs stronger internal backlinks and CTA hooks."
                    : row.recommended_action || "Good engagement; repurpose this into additional funnel assets."}
                </div>
              </div>
            ))}
            {!briefPosts.length && <p className="text-sm text-muted-foreground">No Brief post stats yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(findingsQuery.data || []).slice(0, 12).map((finding) => (
            <div key={finding.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{finding.title}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {finding.priority} · {finding.finding_type} · {finding.status}
                  </div>
                </div>
                {finding.status !== "reviewed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFindingStatus.mutate({ id: finding.id, status: "reviewed" })}
                  >
                    Mark reviewed
                  </Button>
                )}
              </div>
              <p className="text-sm mt-2">{finding.summary}</p>
              <p className="text-sm mt-2 font-medium">Recommendation: {finding.recommendation}</p>
              {(finding.related_page_path || finding.related_offer_id || finding.related_campaign_id) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Related: {finding.related_page_path || "—"} · Offer {finding.related_offer_id || "—"} · Campaign{" "}
                  {finding.related_campaign_id || "—"}
                </p>
              )}
            </div>
          ))}
          {!findingsQuery.data?.length && <p className="text-sm text-muted-foreground">No findings yet.</p>}
        </CardContent>
      </Card>
        </>
      )}

      {!isClientAnalyticsView && (
        <>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client Analytics</div>
            <div className="mt-1 text-lg font-semibold">Boosted content, client funnels, and revenue signals for JahKnowsPR client work</div>
            <p className="mt-1 text-sm text-muted-foreground">
              This is separate from JahKnowsPR firm analytics. It tracks campaigns and funnel results for clients JahKnowsPR helps.
            </p>
          </div>

          <div className="grid xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  Content Campaigns / Boosted Posts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border p-3 text-sm">
                  <div className="font-medium">No boosted content campaigns yet</div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    <div className="rounded bg-muted/50 p-2">Spend <span className="font-semibold">$0</span></div>
                    <div className="rounded bg-muted/50 p-2">Traffic <span className="font-semibold">0</span></div>
                    <div className="rounded bg-muted/50 p-2">CTA <span className="font-semibold">0</span></div>
                    <div className="rounded bg-muted/50 p-2">Conv. <span className="font-semibold">0</span></div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Boosted post stats will appear after campaigns send client_id, campaign_id, content_id, and funnel_id into analytics.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Revenue By Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedRevenueByClient.map((row) => (
                  <div key={row.clientId} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{row.clientName}</div>
                      <div className="font-semibold">${row.amount.toFixed(2)}</div>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {fmt(row.transactions)} revenue records · Funnels: {row.funnels.map((funnel) => funnel.replaceAll("_", " ")).join(", ")}
                    </div>
                  </div>
                ))}
                {!selectedRevenueByClient.length && <p className="text-sm text-muted-foreground">No client revenue yet.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="border-green-600/30 bg-green-600/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-700" />
            Analytics Ingestion Readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border bg-white p-3">
            <div className="text-muted-foreground">Launch window</div>
            <div className="font-semibold">7:00 AM Central</div>
          </div>
          <div className="rounded-md border bg-white p-3">
            <div className="text-muted-foreground">Daily schedule</div>
            <div className="font-semibold">7AM, 12PM, 7PM Central</div>
          </div>
          <div className="rounded-md border bg-white p-3">
            <div className="text-muted-foreground">Rollup endpoint</div>
            <div className="font-semibold">Ready for scheduled ingestion</div>
          </div>
          <div className="rounded-md border bg-white p-3">
            <div className="text-muted-foreground">Findings endpoint</div>
            <div className="font-semibold">Runs after rollup</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optional External Analytics Connectors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            These are status cards, not buttons. The first-party analytics ingestion can run without these optional connectors.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {["Web Analytics", "Meta", "TikTok", "LinkedIn", "X"].map((name) => (
            <div key={name} className="rounded-md border bg-muted/30 p-3">
              <div className="font-medium">{name}</div>
              <div className="text-muted-foreground">Optional connector</div>
            </div>
          ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
