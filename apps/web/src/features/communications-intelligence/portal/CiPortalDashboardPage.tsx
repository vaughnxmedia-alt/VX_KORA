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
  CI_INTELLIGENCE_PRIORITY_RANK,
  CI_OPEN_ACTION_STATUSES,
  type CiActionStatus,
  type CiIntelligenceItem,
} from "../types";
import {
  ciFriendlyError,
  firstNameFromProfile,
  formatCiDate,
  greetingForHour,
} from "../workspace";

function sortByPriority(a: CiIntelligenceItem, b: CiIntelligenceItem) {
  const rank = CI_INTELLIGENCE_PRIORITY_RANK[a.priority] - CI_INTELLIGENCE_PRIORITY_RANK[b.priority];
  if (rank !== 0) return rank;
  return (a.due_date || "9999").localeCompare(b.due_date || "9999");
}

export function CiPortalDashboardPage() {
  const { user, profile } = useAuth();
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const orgId = params.get("org") || undefined;
  const search = params.toString() ? `?${params.toString()}` : "";
  const firstName = firstNameFromProfile(profile, user);

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

  const derived = useMemo(() => {
    const items = [...(data?.items ?? [])].sort(sortByPriority);
    const attention = items
      .filter((item) => item.category === "needs_attention" || item.priority === "urgent" || item.priority === "high")
      .slice(0, 3);
    const shown = attention.length ? attention : items.slice(0, 3);
    const opportunity = [...(data?.opportunities ?? [])]
      .filter((item) => CI_ACTIVE_OPPORTUNITY_STATUSES.includes(item.status))
      .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"))[0];
    const actions = (data?.actions ?? [])
      .filter((item) => CI_OPEN_ACTION_STATUSES.includes(item.status) || item.status === "completed")
      .slice(0, 5);
    return { shown, opportunity, actions };
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Opening your plan…</p>;
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">{ciFriendlyError(error) || "Unable to load your plan."}</p>;
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data.organization.name}
        </p>
        <h1 className="font-serif text-3xl font-bold leading-tight">
          {greetingForHour()}, {firstName}
        </h1>
        <p className="text-base leading-relaxed text-foreground/90">Here’s what needs your attention.</p>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold">Needs attention</h2>
        {derived.shown.length ? (
          <ul className="space-y-4">
            {derived.shown.map((item) => (
              <li key={item.id} className="space-y-3">
                <h3 className="font-serif text-xl font-bold leading-snug">{item.title}</h3>
                <p className="text-sm leading-relaxed">
                  <span className="font-medium">What’s happening. </span>
                  {item.description || item.title}
                </p>
                {item.why_it_matters ? (
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">Why it matters. </span>
                    {item.why_it_matters}
                  </p>
                ) : null}
                {item.recommended_action ? (
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">JahKnowsPR recommends. </span>
                    {item.recommended_action}
                  </p>
                ) : null}
                <Button asChild>
                  <Link to={{ pathname: "/portal/plan", search }}>See it in my plan</Link>
                </Button>
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
        <h2 className="font-serif text-2xl font-bold">Best opportunity</h2>
        {derived.opportunity ? (
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold leading-snug">{derived.opportunity.title}</h3>
            {derived.opportunity.why_it_matters ? (
              <p className="text-sm leading-relaxed">{derived.opportunity.why_it_matters}</p>
            ) : derived.opportunity.description ? (
              <p className="text-sm leading-relaxed">{derived.opportunity.description}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {derived.opportunity.deadline
                ? `Deadline ${formatCiDate(derived.opportunity.deadline)}`
                : "No deadline yet"}
            </p>
            {derived.opportunity.recommended_action ? (
              <p className="text-sm leading-relaxed">
                <span className="font-medium">Recommended action. </span>
                {derived.opportunity.recommended_action}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No opportunity is waiting on you right now. When JahKnowsPR finds one, it will show up
            here with a recommended next step.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold">Your next actions</h2>
        {derived.actions.length ? (
          <ul className="space-y-4">
            {derived.actions.map((item) => (
              <li key={item.id} className="space-y-2">
                <p className="font-medium leading-snug">{item.title}</p>
                {item.reason ? <p className="text-sm leading-relaxed text-muted-foreground">{item.reason}</p> : null}
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
            You don’t have next actions yet. JahKnowsPR will add a short list when there is something
            useful to do.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold">From JahKnowsPR</h2>
        {data.weeklyBrief ? (
          <div className="space-y-2">
            {data.weeklyBrief.note ? <p className="text-sm leading-relaxed">{data.weeklyBrief.note}</p> : null}
            {data.weeklyBrief.needs_attention ? (
              <p className="text-sm leading-relaxed">{data.weeklyBrief.needs_attention}</p>
            ) : null}
            <Link to={{ pathname: "/portal/reports", search }} className="text-sm text-primary underline underline-offset-4">
              Read the latest update
            </Link>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No weekly note yet. When JahKnowsPR writes one, it will appear here.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-bold">Need advice?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ask a question. JahKnowsPR will review it and get back to you in this portal.
        </p>
        <Button asChild>
          <Link to={{ pathname: "/portal/counsel/new", search }}>Ask JahKnowsPR</Link>
        </Button>
      </section>
    </div>
  );
}

export default CiPortalDashboardPage;
