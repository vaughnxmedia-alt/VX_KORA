import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { hqApi } from "../api";
import { ciApi } from "@/features/communications-intelligence/api";
import { LEAD_STAGE_LABELS, TASK_STATUS_LABELS } from "../types";
import { resolvePublicationStatus } from "@/lib/blog-publication-status";
import { format, isSameDay, isWithinInterval, addDays, startOfDay, endOfDay, parseISO } from "date-fns";

function StatCard({
  label,
  value,
  to,
}: {
  label: string;
  value: number | string;
  to?: string;
}) {
  const inner = (
    <div className="rounded-lg border border-border bg-background p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold text-primary">{value}</p>
    </div>
  );
  return to ? (
    <Link to={to} className="block hover:border-primary/30 transition-colors">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default function HqDashboardPage() {
  const { data: leads = [], isError: leadsError } = useQuery({
    queryKey: ["hq", "leads"],
    queryFn: () => hqApi.leads.list(),
    retry: 1,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["hq", "clients"],
    queryFn: () => hqApi.clients.list(),
    retry: 1,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["hq", "tasks"],
    queryFn: () => hqApi.tasks.list(),
    retry: 1,
  });
  const { data: content = [] } = useQuery({
    queryKey: ["hq", "content"],
    queryFn: () => hqApi.content.list(),
    retry: 1,
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["hq", "activity"],
    queryFn: () => hqApi.activity.recent(15),
    retry: 1,
  });
  const { data: counsel } = useQuery({
    queryKey: ["ci", "counsel", "inbox-summary"],
    queryFn: () => ciApi.counsel.inboxSummary(),
    retry: 1,
  });

  const today = new Date();
  const weekEnd = endOfDay(addDays(today, 7));

  const newLeads = leads.filter((l) => l.stage === "new_lead").length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const followUpsDue = leads.filter(
    (l) => l.next_follow_up_date && parseISO(l.next_follow_up_date) <= weekEnd,
  ).length;
  const tasksDueWeek = tasks.filter(
    (t) =>
      t.status !== "complete" &&
      t.due_date &&
      isWithinInterval(parseISO(t.due_date), { start: startOfDay(today), end: weekEnd }),
  ).length;
  const drafts = content.filter((c) => resolvePublicationStatus(c) === "draft").length;
  const published = content.filter((c) => resolvePublicationStatus(c) === "live").length;

  const followUpsToday = leads.filter(
    (l) => l.next_follow_up_date && isSameDay(parseISO(l.next_follow_up_date), today),
  );
  const tasksToday = tasks.filter(
    (t) => t.status !== "complete" && t.due_date && isSameDay(parseISO(t.due_date), today),
  );
  const recentLeads = [...leads]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 5);

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground mt-1">JahKnowsPR HQ · Strategic Communications Operations</p>
      </div>

      {leadsError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          HQ database tables may not be applied yet. Run the migration{" "}
          <code className="text-xs">20261002180000_jahknowspr_hq_v1.sql</code> in Supabase, then refresh.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="New Leads" value={newLeads} to="/hq/crm" />
        <StatCard label="Active Clients" value={activeClients} to="/hq/clients" />
        <StatCard label="Follow-Ups Due" value={followUpsDue} to="/hq/crm" />
        <StatCard label="Tasks Due This Week" value={tasksDueWeek} to="/hq/tasks" />
        <StatCard label="Draft Content" value={drafts} to="/hq/content?status=draft" />
        <StatCard label="Published Content" value={published} to="/hq/content?status=live" />
      </div>

      <section className="rounded-lg border border-border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
              Communications Intelligence
            </p>
            <h2 className="font-serif text-xl font-semibold">Strategic Counsel</h2>
          </div>
          <Link to="/hq/intelligence/counsel" className="text-sm text-primary underline underline-offset-4">
            View counsel requests
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="New requests" value={counsel?.submitted ?? 0} to="/hq/intelligence/counsel" />
          <StatCard label="Urgent" value={counsel?.urgent ?? 0} to="/hq/intelligence/counsel" />
          <StatCard
            label="Waiting for response"
            value={counsel?.waiting_response ?? 0}
            to="/hq/intelligence/counsel"
          />
          <StatCard label="Aging unresolved" value={counsel?.aging ?? 0} to="/hq/intelligence/counsel" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-background p-5">
          <h2 className="font-serif text-xl font-semibold mb-4">Today</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Follow-ups due today
              </p>
              {followUpsToday.length === 0 ? (
                <p className="text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-1">
                  {followUpsToday.map((l) => (
                    <li key={l.id}>
                      <Link to={`/hq/crm/${l.id}`} className="text-primary hover:underline">
                        {l.full_name}
                      </Link>
                      <span className="text-muted-foreground"> · {LEAD_STAGE_LABELS[l.stage]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Tasks due today
              </p>
              {tasksToday.length === 0 ? (
                <p className="text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-1">
                  {tasksToday.map((t) => (
                    <li key={t.id}>
                      <Link to="/hq/tasks" className="text-primary hover:underline">
                        {t.title}
                      </Link>
                      <span className="text-muted-foreground"> · {TASK_STATUS_LABELS[t.status]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Recently added leads
              </p>
              {recentLeads.length === 0 ? (
                <p className="text-muted-foreground">No leads yet</p>
              ) : (
                <ul className="space-y-1">
                  {recentLeads.map((l) => (
                    <li key={l.id}>
                      <Link to={`/hq/crm/${l.id}`} className="text-primary hover:underline">
                        {l.full_name}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        · {format(parseISO(l.created_at), "MMM d")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background p-5">
          <h2 className="font-serif text-xl font-semibold mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Activity will appear as you work in HQ.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="border-b border-border/60 pb-2 last:border-0">
                  <p className="text-foreground">{a.summary}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(a.created_at), "MMM d · h:mm a")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
