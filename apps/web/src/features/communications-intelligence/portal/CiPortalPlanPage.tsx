import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { ciApi } from "../api";
import {
  CI_ACTIVE_OPPORTUNITY_STATUSES,
  CI_CLIENT_ACTION_STATUSES,
  CI_HEALTH_CATEGORY_LABELS,
  CI_HEALTH_STATUS_LABELS,
  CI_INTELLIGENCE_PRIORITY_RANK,
  CI_OPEN_ACTION_STATUSES,
  type CiActionStatus,
} from "../types";
import { ciFriendlyError, formatCiDate, healthRowsByCategory, healthSummaryPhrases } from "../workspace";

export function CiPortalPlanPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const orgId = params.get("org") || undefined;
  const search = params.toString() ? `?${params.toString()}` : "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "portal", "dashboard", user?.id, orgId],
    queryFn: () => ciApi.portal.loadDashboard(user!.id, orgId),
    enabled: Boolean(user?.id),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Extract<CiActionStatus, "not_started" | "in_progress" | "completed"> }) =>
      ciApi.portal.updateActionStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ci", "portal"] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  const view = useMemo(() => {
    const recommendations = [...(data?.items ?? [])].sort(
      (a, b) => CI_INTELLIGENCE_PRIORITY_RANK[a.priority] - CI_INTELLIGENCE_PRIORITY_RANK[b.priority],
    );
    const opportunities = (data?.opportunities ?? []).filter((item) =>
      CI_ACTIVE_OPPORTUNITY_STATUSES.includes(item.status),
    );
    const actions = (data?.actions ?? []).filter((item) => item.status !== "cancelled");
    const upcoming = [
      ...recommendations
        .filter((item) => item.due_date)
        .map((item) => ({ id: item.id, title: item.title, date: item.due_date as string })),
      ...opportunities
        .filter((item) => item.deadline)
        .map((item) => ({ id: item.id, title: item.title, date: item.deadline as string })),
      ...actions
        .filter((item) => item.due_date && CI_OPEN_ACTION_STATUSES.includes(item.status))
        .map((item) => ({ id: item.id, title: item.title, date: item.due_date as string })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
    return { recommendations, opportunities, actions, upcoming };
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading your communications plan…</p>;
  if (error || !data) {
    return <p className="text-sm text-destructive">{ciFriendlyError(error) || "Unable to load your plan."}</p>;
  }

  const phrases = healthSummaryPhrases(data.checks ?? []);
  const health = healthRowsByCategory(data.checks ?? []);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data.organization.name}
        </p>
        <h1 className="font-serif text-3xl font-bold leading-tight">My Communications Plan</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Recommendations, opportunities, next actions, and upcoming dates — in one place.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold">Recommendations</h2>
        {view.recommendations.length ? (
          <ul className="space-y-4">
            {view.recommendations.map((item) => (
              <li key={item.id} className="space-y-2">
                <h3 className="font-serif text-xl font-bold leading-snug">{item.title}</h3>
                {item.why_it_matters ? <p className="text-sm leading-relaxed">{item.why_it_matters}</p> : null}
                {item.recommended_action ? (
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">Do this: </span>
                    {item.recommended_action}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nothing needs your attention right now. JahKnowsPR will add recommendations here when
            something comes up.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold">Opportunities</h2>
        {view.opportunities.length ? (
          <ul className="space-y-4">
            {view.opportunities.map((item) => (
              <li key={item.id} className="space-y-2">
                <h3 className="font-serif text-xl font-bold leading-snug">{item.title}</h3>
                {item.why_it_matters ? <p className="text-sm leading-relaxed">{item.why_it_matters}</p> : null}
                <p className="text-sm text-muted-foreground">
                  {item.deadline ? `Deadline ${formatCiDate(item.deadline)}` : "No deadline yet"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No opportunities are open yet. When one is worth your time, it will appear here.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold">Next actions</h2>
        {view.actions.length ? (
          <ul className="space-y-4">
            {view.actions.map((item) => (
              <li key={item.id} className="space-y-2">
                <p className="font-medium">{item.title}</p>
                <div className="flex flex-wrap gap-2">
                  {CI_CLIENT_ACTION_STATUSES.map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={item.status === status ? "default" : "outline"}
                      disabled={updateStatus.isPending || item.status === status}
                      onClick={() => updateStatus.mutate({ id: item.id, status })}
                    >
                      {status === "not_started" ? "Not Started" : status === "in_progress" ? "In Progress" : "Done"}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No next actions yet. JahKnowsPR will add them after recommendations and opportunities
            are in place.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold">Upcoming dates</h2>
        {view.upcoming.length ? (
          <ul className="space-y-2 text-sm">
            {view.upcoming.map((item) => (
              <li key={`${item.id}-${item.date}`}>
                <span className="text-muted-foreground">{formatCiDate(item.date)}</span>
                {" · "}
                {item.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No upcoming dates are on the plan yet.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold">Communications health</h2>
        {phrases.length ? (
          <>
            <p className="text-sm leading-relaxed">{phrases.join(". ")}.</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {health.map((row) => (
                <li key={row.category}>
                  {CI_HEALTH_CATEGORY_LABELS[row.category]} — {CI_HEALTH_STATUS_LABELS[row.status]}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            JahKnowsPR has not finished the communications assessment yet. It will show up here
            when it is ready.
          </p>
        )}
      </section>

      <Button asChild>
        <Link to={{ pathname: "/portal/counsel/new", search }}>Ask JahKnowsPR</Link>
      </Button>
    </div>
  );
}
