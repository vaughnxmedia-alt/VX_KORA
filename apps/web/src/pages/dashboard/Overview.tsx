import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, isWithinInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Megaphone,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { KoraStatusCard } from "@/components/dashboard/KoraStatusCard";

type PostSlotRow = Tables<"post_slots">;
type CampaignRow = Tables<"campaigns">;

const canApprove = (role: string) => role === "admin" || role === "author";

export default function Overview() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const next7End = format(addDays(new Date(), 7), "yyyy-MM-dd");
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
        .order("window_end", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CampaignRow[];
    },
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["dashboard-meetings-next7"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, title, meeting_date, customer_id, status")
        .gte("meeting_date", new Date().toISOString())
        .lte("meeting_date", addDays(new Date(), 7).toISOString())
        .order("meeting_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
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

  const approveSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase
        .from("post_slots")
        .update({ status: "Approved", updated_at: new Date().toISOString() })
        .eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-post-slots"] });
      toast.success("Post approved");
    },
    onError: (e) => toast.error(e.message || "Failed to approve"),
  });

  const activeCampaignCount = campaigns.length;
  const postsThisWeek = allPostSlots.filter(
    (s) => s.date >= weekStartStr && s.date <= weekEndStr && ["Scheduled", "Live"].includes(s.status)
  ).length;
  const postsAwaitingApproval = allPostSlots.filter((s) => s.status === "In Review").length;
  const leadsThisMonth = customersPipeline.filter((c) => {
    if (!c.created_at) return false;
    const created = new Date(c.created_at);
    return isWithinInterval(created, { start: new Date(monthStartStr), end: new Date() }) && c.client_status === "lead_captured";
  }).length;
  const activeClientsCount = customersPipeline.filter((c) => c.client_status === "active_client").length;
  const conversionRate =
    customersPipeline.filter((c) => c.client_status === "lead_captured").length > 0
      ? Math.round((activeClientsCount / customersPipeline.length) * 100)
      : null;

  const postsDueNext7 = allPostSlots.filter(
    (s) => s.date >= today && s.date <= next7End && !["Live"].includes(s.status)
  ).slice(0, 10);
  const campaignsEndingSoon = campaigns.filter(
    (c) => c.window_end >= today && c.window_end <= next7End
  ).slice(0, 5);
  const inReviewSlots = allPostSlots.filter((s) => s.status === "In Review").slice(0, 10);

  const recentActivity = [
    ...allPostSlots.map((s) => ({ type: "post" as const, at: s.updated_at || s.created_at, slot: s })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 15);

  const koraByCampaign = campaigns.map((c) => {
    const slots = allPostSlots.filter((s) => s.campaign_id === c.id);
    const withKora = slots.filter((s) => s.kora_report_version);
    const lastUpdated = slots.reduce<string | null>((acc, s) => {
      const u = s.updated_at || s.created_at;
      if (!u) return acc;
      if (!acc) return u;
      return new Date(u) > new Date(acc) ? u : acc;
    }, null);
    const version = withKora[0]?.kora_report_version ?? "—";
    const isStale = lastUpdated && (new Date().getTime() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24) > 30;
    return { campaign: c, version, lastUpdated, isStale };
  });

  const isLoading = slotsLoading || campaignsLoading;

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

      {/* 1) Top Metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5" />
          Top Metrics
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
              <p className="text-sm text-muted-foreground">Posts This Week</p>
              <p className="text-2xl font-bold">{postsThisWeek}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Awaiting Approval</p>
              <p className="text-2xl font-bold">{postsAwaitingApproval}</p>
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

      {/* 2) KORA AI Status + Upcoming Deadlines */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Upcoming Deadlines
        </h2>
        <div className="grid md:grid-cols-4 gap-4">
          <KoraStatusCard />
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Posts (next 7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {postsDueNext7.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-2">
                  {postsDueNext7.slice(0, 5).map((s) => (
                    <li key={s.id} className="text-sm flex justify-between">
                      <span>{s.platform} · {s.deliverable_tag}</span>
                      <span className="text-muted-foreground">{s.date}</span>
                    </li>
                  ))}
                  {postsDueNext7.length > 5 && (
                    <li>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/dashboard/calendar")}>
                        +{postsDueNext7.length - 5} more
                      </Button>
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Campaigns ending soon</CardTitle>
            </CardHeader>
            <CardContent>
              {campaignsEndingSoon.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-2">
                  {campaignsEndingSoon.map((c) => (
                    <li key={c.id} className="text-sm flex justify-between">
                      <span className="truncate">{c.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{c.window_end}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Meetings (next 7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-2">
                  {meetings.slice(0, 5).map((m) => (
                    <li key={m.id} className="text-sm flex justify-between">
                      <span className="truncate">{m.title}</span>
                      <span className="text-muted-foreground">{format(new Date(m.meeting_date), "MMM d")}</span>
                    </li>
                  ))}
                  {meetings.length > 5 && (
                    <li>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/dashboard/meetings")}>
                        +{meetings.length - 5} more
                      </Button>
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3) Approval Queue */}
      {role !== "client" && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Approval Queue
          </h2>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              {inReviewSlots.length === 0 ? (
                <p className="text-muted-foreground text-sm">No posts in review.</p>
              ) : (
                <ul className="space-y-3">
                  {inReviewSlots.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <span className="font-medium">{s.deliverable_tag}</span>
                        <span className="text-muted-foreground text-sm ml-2">{s.platform} · {s.date}</span>
                      </div>
                      {canApprove(role) && (
                        <Button
                          size="sm"
                          onClick={() => approveSlotMutation.mutate(s.id)}
                          disabled={approveSlotMutation.isPending}
                        >
                          {approveSlotMutation.isPending ? <Spinner className="w-4 h-4" /> : "Approve"}
                        </Button>
                      )}
                      {role === "intern" && (
                        <Badge variant="secondary">View only</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* 4) Recent Activity */}
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
                        <>Post {item.slot.deliverable_tag} · {item.slot.status} · {format(new Date(item.at), "MMM d, HH:mm")}</>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 5) Performance Snapshot */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Performance Snapshot
        </h2>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Last 30 days reach</p>
                <p className="font-medium">—</p>
                <p className="text-xs text-muted-foreground">Connect analytics for data</p>
              </div>
              <div>
                <p className="text-muted-foreground">Top performing post</p>
                <p className="font-medium">—</p>
                <p className="text-xs text-muted-foreground">Connect analytics for data</p>
              </div>
              <div>
                <p className="text-muted-foreground">Underperforming campaigns</p>
                <p className="font-medium">—</p>
                <p className="text-xs text-muted-foreground">Threshold-based flags when available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 6) KORA Version Status */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          KORA Version Status
        </h2>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            {koraByCampaign.length === 0 ? (
              <p className="text-muted-foreground text-sm">No campaigns.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Campaign</th>
                      <th className="text-left py-2 font-medium">Active KORA version</th>
                      <th className="text-left py-2 font-medium">Last updated</th>
                      <th className="text-left py-2 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {koraByCampaign.map(({ campaign, version, lastUpdated, isStale }) => (
                      <tr key={campaign.id} className="border-b last:border-0">
                        <td className="py-2">{campaign.name}</td>
                        <td className="py-2">{version}</td>
                        <td className="py-2 text-muted-foreground">
                          {lastUpdated ? format(new Date(lastUpdated), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="py-2">
                          {isStale && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              &gt;30 days
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
