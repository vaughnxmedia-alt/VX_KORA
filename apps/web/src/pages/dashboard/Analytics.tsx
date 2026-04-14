import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Globe, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Ga4ReportPayload = {
  ok?: boolean;
  error?: string;
  hint?: string;
  dateRange?: { start: string; end: string };
  totals?: {
    sessions: number | null;
    activeUsers: number | null;
    newUsers: number | null;
    screenPageViews: number | null;
    eventCount: number | null;
  };
  topPages?: { path: string; views: number }[];
};

function formatGa4Number(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString();
}

export default function Analytics() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";

  const { data: orgMembership } = useQuery({
    queryKey: ["analytics-org-membership", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("organization_users")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: snapshots = [], refetch: refetchSnapshots } = useQuery({
    queryKey: ["social-metrics-snapshots", orgMembership?.organization_id],
    queryFn: async () => {
      if (!orgMembership?.organization_id) return [];
      const { data, error } = await supabase
        .from("social_metrics_snapshots")
        .select("id,provider,metric_date,captured_at,metrics,social_account_id")
        .eq("organization_id", orgMembership.organization_id)
        .order("metric_date", { ascending: false })
        .limit(50);
      if (error) return [];
      return data || [];
    },
    enabled: !!orgMembership?.organization_id,
  });

  const runMetaAnalyticsFetch = async () => {
    if (!orgMembership?.organization_id) return;
    const { data, error } = await supabase.functions.invoke("social-meta-analytics-fetch", {
      body: { organizationId: orgMembership.organization_id },
    });
    if (error || data?.error) {
      toast({
        title: "Fetch failed",
        description: data?.error || error?.message || "Could not fetch Meta analytics.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Analytics fetched",
      description: `Saved ${data?.written ?? 0} metric snapshot(s).`,
    });
    refetchSnapshots();
  };

  const { data: connectedMetaCount = 0 } = useQuery({
    queryKey: ["connected-meta-count", orgMembership?.organization_id],
    queryFn: async () => {
      if (!orgMembership?.organization_id) return 0;
      const { count } = await supabase
        .from("social_accounts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgMembership.organization_id)
        .eq("provider", "meta")
        .eq("status", "connected");
      return count || 0;
    },
    enabled: !!orgMembership?.organization_id,
  });

  const {
    data: ga4Data,
    refetch: refetchGa4,
    isFetching: ga4Loading,
    error: ga4InvokeError,
  } = useQuery({
    queryKey: ["ga4-analytics-report", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ga4-analytics-report", {
        body: { startDate: "7daysAgo", endDate: "today" },
      });
      if (error) throw error;
      return data as Ga4ReportPayload;
    },
    enabled: isAdmin && !!user,
    staleTime: 60_000,
  });

  const runGa4Fetch = async () => {
    const result = await refetchGa4();
    if (result.error) {
      toast({
        title: "Refresh failed",
        description: (result.error as Error).message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Website analytics refreshed" });
  };

  const socialSection = (
    <>
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Connected Meta Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedMetaCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Metrics Snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snapshots.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Latest Snapshot Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {snapshots[0]?.metric_date || "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Meta Analytics Snapshots
          </CardTitle>
          <div>
            <Button variant="outline" size="sm" onClick={runMetaAnalyticsFetch}>
              Fetch Latest Meta Analytics
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-muted-foreground">No snapshots yet. Connect Meta and run analytics fetch.</p>
          ) : (
            <div className="space-y-2">
              {snapshots.map((s) => (
                <div key={s.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{s.provider.toUpperCase()} snapshot</div>
                    <div className="text-xs text-muted-foreground">{s.metric_date}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Captured: {new Date(s.captured_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const ga4Section = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={runGa4Fetch} disabled={ga4Loading}>
          {ga4Loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh GA4
        </Button>
        <span className="text-sm text-muted-foreground">
          Last range: 7 days through today (GA4 relative dates)
        </span>
      </div>

      {ga4InvokeError && (
        <p className="text-sm text-destructive">
          {(ga4InvokeError as Error).message || "Could not load GA4."}
        </p>
      )}

      {ga4Data && ga4Data.ok === false && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-base">GA4 not ready</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{ga4Data.error || "Unknown error."}</p>
            {ga4Data.hint && <p>{ga4Data.hint}</p>}
          </CardContent>
        </Card>
      )}

      {ga4Data?.ok === true && ga4Data.totals && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {(
              [
                ["Sessions", ga4Data.totals.sessions],
                ["Active users", ga4Data.totals.activeUsers],
                ["New users", ga4Data.totals.newUsers],
                ["Page views", ga4Data.totals.screenPageViews],
                ["Events", ga4Data.totals.eventCount],
              ] as const
            ).map(([label, val]) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums">{formatGa4Number(val)}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top pages (screen views)</CardTitle>
            </CardHeader>
            <CardContent>
              {!ga4Data.topPages?.length ? (
                <p className="text-sm text-muted-foreground">No page data for this range.</p>
              ) : (
                <div className="space-y-2">
                  {ga4Data.topPages.map((row) => (
                    <div
                      key={row.path}
                      className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-xs truncate" title={row.path}>
                        {row.path || "(not set)"}
                      </span>
                      <span className="tabular-nums shrink-0">{row.views.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {ga4Loading && !ga4Data && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading GA4…</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4">
          {isAdmin ? "Analytics & Engagement (Global)" : "Analytics & Engagement Dashboard"}
        </h1>
        <p className="text-lg text-muted-foreground">
          {isAdmin
            ? "Company-wide analytics and performance metrics."
            : "Platform analytics (IG, TikTok, YT), engagement trends, content performance, and growth metrics."}
        </p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="social" className="w-full">
          <TabsList>
            <TabsTrigger value="social">Social (Meta)</TabsTrigger>
            <TabsTrigger value="web" className="gap-1.5">
              <Globe className="h-4 w-4" />
              Website (GA4)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="social" className="space-y-6 mt-4">
            {socialSection}
          </TabsContent>
          <TabsContent value="web" className="space-y-6 mt-4">
            {ga4Section}
          </TabsContent>
        </Tabs>
      ) : (
        socialSection
      )}
    </div>
  );
}
