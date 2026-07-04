import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  isWithinInterval,
} from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { LayoutDashboard, Megaphone, AlertCircle, TrendingUp, FileText, Handshake } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { Tables } from "@/integrations/supabase/types";

type PostSlotRow = Tables<"post_slots">;
type CampaignRow = Tables<"campaigns">;

type PerformancePeriod = "weekly" | "monthly" | "quarterly" | "yearly";
type PerformanceChannel = "website" | "social";

type RollupRow = {
  date: string;
  page_views: number;
  unique_visitors: number;
  sessions: number;
  cta_clicks: number;
  form_submits: number;
  booking_clicks: number;
  conversion_rate: number;
  top_page_path: string | null;
};

type ContentPerformanceRow = {
  title: string | null;
  views: number | null;
  clicks: number | null;
  click_rate: number | null;
  category: string | null;
  updated_at: string;
};

const SITE_ID = "jahknowspr_web";
const BRAND_ID = "jahknowspr";

function getPeriodInterval(period: PerformancePeriod): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case "weekly":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "monthly":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "quarterly":
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "yearly":
      return { start: startOfYear(now), end: endOfYear(now) };
  }
}

function sumRollups(rows: RollupRow[]) {
  return rows.reduce(
    (acc, row) => ({
      page_views: acc.page_views + (row.page_views ?? 0),
      unique_visitors: acc.unique_visitors + (row.unique_visitors ?? 0),
      sessions: acc.sessions + (row.sessions ?? 0),
      cta_clicks: acc.cta_clicks + (row.cta_clicks ?? 0),
      form_submits: acc.form_submits + (row.form_submits ?? 0),
      booking_clicks: acc.booking_clicks + (row.booking_clicks ?? 0),
    }),
    {
      page_views: 0,
      unique_visitors: 0,
      sessions: 0,
      cta_clicks: 0,
      form_submits: 0,
      booking_clicks: 0,
    },
  );
}

export default function Overview() {
  const { role } = useAuth();
  const [performancePeriod, setPerformancePeriod] = useState<PerformancePeriod>("weekly");
  const [performanceChannel, setPerformanceChannel] = useState<PerformanceChannel>("website");

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekLabel = `Week of ${format(weekStart, "MM/dd")}–${format(weekEnd, "MM/dd")}`;
  const monthStartStr = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const { data: allPostSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ["dashboard-post-slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_slots")
        .select("*")
        .order("date", { ascending: true })
        .order("scheduled_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PostSlotRow[];
    },
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["dashboard-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CampaignRow[];
    },
  });

  const { data: customersPipeline = [] } = useQuery({
    queryKey: ["dashboard-customers-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, client_status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pendingSponsorRequests = 0 } = useQuery({
    queryKey: ["dashboard-pending-sponsor-requests"],
    enabled: role === "admin",
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sponsor_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: downloadsThisWeek = 0, isLoading: downloadsLoading } = useQuery({
    queryKey: ["dashboard-downloads-week", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("making_of_a_brand_pdf_downloads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: clicksThisWeek = 0, isLoading: clicksLoading } = useQuery({
    queryKey: ["dashboard-link-clicks-week", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("link_clicks")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const periodBounds = useMemo(() => getPeriodInterval(performancePeriod), [performancePeriod]);
  const periodStartStr = format(periodBounds.start, "yyyy-MM-dd");
  const periodEndStr = format(periodBounds.end, "yyyy-MM-dd");

  const { data: rollups = [], isLoading: rollupsLoading } = useQuery({
    queryKey: ["dashboard-performance-rollups", SITE_ID, BRAND_ID, periodStartStr, periodEndStr],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("analytics_daily_rollups")
        .select("date, page_views, unique_visitors, sessions, cta_clicks, form_submits, booking_clicks, conversion_rate, top_page_path")
        .eq("site_id", SITE_ID)
        .eq("brand_id", BRAND_ID)
        .gte("date", periodStartStr)
        .lte("date", periodEndStr)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RollupRow[];
    },
    enabled: performanceChannel === "website",
  });

  const { data: socialContent = [], isLoading: socialLoading } = useQuery({
    queryKey: ["dashboard-performance-social", SITE_ID, BRAND_ID, periodStartStr, periodEndStr],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_performance")
        .select("title, views, clicks, click_rate, category, updated_at")
        .eq("site_id", SITE_ID)
        .eq("brand_id", BRAND_ID)
        .gte("updated_at", periodBounds.start.toISOString())
        .lte("updated_at", periodBounds.end.toISOString())
        .order("views", { ascending: false })
        .limit(25);
      if (error) throw error;
      const rows = (data ?? []) as ContentPerformanceRow[];
      return rows.filter((row) => {
        const category = (row.category ?? "").toLowerCase();
        return category.includes("social") || category.includes("instagram") || category.includes("tiktok");
      });
    },
    enabled: performanceChannel === "social",
  });

  const activeCampaignCount = campaigns.length;
  const leadsThisMonth = customersPipeline.filter((c) => {
    if (!c.created_at) return false;
    const created = new Date(c.created_at);
    return (
      isWithinInterval(created, { start: new Date(monthStartStr), end: new Date() }) &&
      c.client_status === "lead_captured"
    );
  }).length;
  const activeClientsCount = customersPipeline.filter((c) => c.client_status === "active_client").length;
  const conversionRate =
    customersPipeline.filter((c) => c.client_status === "lead_captured").length > 0
      ? Math.round((activeClientsCount / customersPipeline.length) * 100)
      : null;

  const recentActivity = [...allPostSlots.map((s) => ({ type: "post" as const, at: s.updated_at || s.created_at, slot: s }))]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 15);

  const websiteTotals = sumRollups(rollups);
  const topPage = rollups.find((r) => r.top_page_path)?.top_page_path ?? "—";
  const socialTotals = socialContent.reduce(
    (acc, row) => ({
      views: acc.views + (row.views ?? 0),
      clicks: acc.clicks + (row.clicks ?? 0),
    }),
    { views: 0, clicks: 0 },
  );
  const topSocialPost = socialContent[0]?.title ?? "—";
  const publishedPosts = campaigns.reduce((sum, c) => sum + (c.published_post_count ?? 0), 0);

  const isLoading =
    slotsLoading || campaignsLoading || downloadsLoading || clicksLoading;
  const performanceLoading =
    performanceChannel === "website" ? rollupsLoading : socialLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Executive Overview</h1>
        <p className="text-muted-foreground">
          {role === "client" ? "Read-only dashboard." : "Operational intelligence at a glance."}
        </p>
      </div>

      {role === "admin" && pendingSponsorRequests > 0 ? (
        <Card className="border-gold/30 bg-gold/5 shadow-sm">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <Handshake className="h-5 w-5 text-gold" />
                New Strategic Sponsor Hub requests
              </div>
              <p className="text-sm text-muted-foreground">
                {pendingSponsorRequests} organization{pendingSponsorRequests === 1 ? "" : "s"} submitted a request to be
                added to the Sponsor Hub and {pendingSponsorRequests === 1 ? "is" : "are"} pending review.
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/dashboard/sponsor-requests">Review Sponsor Requests</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Top Metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5" />
          {weekLabel}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Active Campaigns</p>
              <p className="text-2xl font-bold">{activeCampaignCount}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Downloads this week</p>
              <p className="text-2xl font-bold">{downloadsThisWeek}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Clicks this week</p>
              <p className="text-2xl font-bold">{clicksThisWeek}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Leads This Month</p>
              <p className="text-2xl font-bold">{leadsThisMonth}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">{conversionRate != null ? `${conversionRate}%` : "—"}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Ads Campaigns */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          Ads Campaigns
        </h2>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            {campaigns.length === 0 ? (
              <p className="text-muted-foreground text-sm">No campaigns yet.</p>
            ) : (
              <ul className="space-y-3">
                {campaigns.slice(0, 12).map((campaign) => (
                  <li
                    key={campaign.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 border-b last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.primary_platform ?? "Multi-platform"}
                        {campaign.objective ? ` · ${campaign.objective}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{campaign.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {campaign.published_post_count ?? 0} published · {campaign.scheduled_post_count ?? 0} scheduled
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Recent Activity
        </h2>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity.</p>
            ) : (
              <ul className="space-y-2">
                {recentActivity.slice(0, 10).map((item, i) => (
                  <li key={item.type + item.at + i} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>
                      {item.type === "post" && (
                        <>
                          Post {item.slot.deliverable_tag} · {item.slot.status} ·{" "}
                          {format(new Date(item.at), "MMM d, HH:mm")}
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Performance Snapshot */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Snapshot
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={performancePeriod}
              onValueChange={(value) => setPerformancePeriod(value as PerformancePeriod)}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={performanceChannel}
              onValueChange={(value) => setPerformanceChannel(value as PerformanceChannel)}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website Performance</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            {performanceLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : performanceChannel === "website" ? (
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Page views</p>
                  <p className="text-2xl font-bold">{websiteTotals.page_views.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {periodStartStr} – {periodEndStr}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unique visitors</p>
                  <p className="text-2xl font-bold">{websiteTotals.unique_visitors.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Top page: {topPage}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CTA & form actions</p>
                  <p className="text-2xl font-bold">
                    {(websiteTotals.cta_clicks + websiteTotals.form_submits).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {websiteTotals.cta_clicks} clicks · {websiteTotals.form_submits} submits ·{" "}
                    {websiteTotals.booking_clicks} bookings
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Content views</p>
                  <p className="text-2xl font-bold">{socialTotals.views.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Social-tagged content in period</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Content clicks</p>
                  <p className="text-2xl font-bold">{socialTotals.clicks.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Top post: {topSocialPost}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Published posts (campaigns)</p>
                  <p className="text-2xl font-bold">{publishedPosts.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across {campaigns.length} active campaign{campaigns.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            )}
            {!performanceLoading &&
              performanceChannel === "website" &&
              rollups.length === 0 && (
                <p className="text-xs text-muted-foreground mt-4">No website rollup data for this period yet.</p>
              )}
            {!performanceLoading &&
              performanceChannel === "social" &&
              socialContent.length === 0 && (
                <p className="text-xs text-muted-foreground mt-4">
                  No social performance rows for this period yet. Connect analytics or tag content as social.
                </p>
              )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
