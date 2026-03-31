import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function Analytics() {
  const { role, user } = useAuth();

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

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4">
          {role === 'admin' ? 'Analytics & Engagement (Global)' : 'Analytics & Engagement Dashboard'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {role === 'admin' 
            ? "Company-wide analytics and performance metrics."
            : "Platform analytics (IG, TikTok, YT), engagement trends, content performance, and growth metrics."}
        </p>
      </div>
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
    </div>
  );
}

