import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ciApi } from "../api";
import {
  CI_ACTIVE_INTELLIGENCE_STATUSES,
  CI_ACTIVE_OPPORTUNITY_STATUSES,
  CI_HEALTH_CATEGORY_LABELS,
  CI_HEALTH_STATUS_LABELS,
  CI_INTELLIGENCE_PRIORITY_RANK,
  CI_OPEN_ACTION_STATUSES,
} from "../types";
import {
  formatCiDate,
  healthRowsByCategory,
  healthSummaryPhrases,
  type CiWorkspaceContext,
} from "../workspace";

export function CiOrganizationPreviewPage() {
  const { org } = useOutletContext<CiWorkspaceContext>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "preview", org.id],
    queryFn: async () => {
      const [items, checks, opportunities, actions, messaging, brief] = await Promise.all([
        ciApi.intelligence.list(org.id),
        ciApi.health.listForOrganization(org.id),
        ciApi.opportunities.list(org.id),
        ciApi.actions.list(org.id),
        ciApi.messaging.listForOrganization(org.id, { approvedOnly: true }),
        ciApi.briefs.latestPublished(org.id),
      ]);
      return { items, checks, opportunities, actions, messaging, brief };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Building the client preview…</p>;
  if (error || !data) {
    return <p className="text-sm text-destructive">Could not load the client preview.</p>;
  }

  const recommendations = data.items
    .filter((item) => CI_ACTIVE_INTELLIGENCE_STATUSES.includes(item.status))
    .sort((a, b) => CI_INTELLIGENCE_PRIORITY_RANK[a.priority] - CI_INTELLIGENCE_PRIORITY_RANK[b.priority])
    .slice(0, 3);
  const opportunity = [...data.opportunities]
    .filter((item) => CI_ACTIVE_OPPORTUNITY_STATUSES.includes(item.status))
    .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"))[0];
  const actions = data.actions.filter((item) => CI_OPEN_ACTION_STATUSES.includes(item.status)).slice(0, 5);
  const health = healthRowsByCategory(data.checks);
  const phrases = healthSummaryPhrases(data.checks);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold">What the client will see</h2>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          This is a preview, not a publish step. Unfinished work stays here until you add it. The
          client only sees published updates and the recommendations you have already recorded.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="font-serif text-xl font-bold">Recommendations</h3>
        {recommendations.length ? (
          <ul className="space-y-3">
            {recommendations.map((item) => (
              <li key={item.id} className="rounded-xl border border-border bg-background p-4">
                <p className="font-medium">{item.title}</p>
                {item.why_it_matters ? (
                  <p className="mt-2 text-sm leading-relaxed">{item.why_it_matters}</p>
                ) : null}
                {item.recommended_action ? (
                  <p className="mt-2 text-sm">
                    <span className="font-medium">Recommended: </span>
                    {item.recommended_action}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No recommendations yet. Add one before this client has a plan to follow.</Empty>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-xl font-bold">Opportunities</h3>
        {opportunity ? (
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="font-medium">{opportunity.title}</p>
            {opportunity.why_it_matters ? (
              <p className="mt-2 text-sm leading-relaxed">{opportunity.why_it_matters}</p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">
              {opportunity.deadline ? `Deadline ${formatCiDate(opportunity.deadline)}` : "No deadline yet"}
            </p>
          </div>
        ) : (
          <Empty>No opportunities yet. Add the first one when you have a real opening.</Empty>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-xl font-bold">Next actions</h3>
        {actions.length ? (
          <ul className="space-y-2 text-sm">
            {actions.map((item) => (
              <li key={item.id} className="rounded-xl border border-border bg-background px-4 py-3">
                {item.title}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No actions yet. Build the action plan so the client knows what to do next.</Empty>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-xl font-bold">Approved language</h3>
        {data.messaging.length ? (
          <ul className="space-y-2 text-sm">
            {data.messaging.slice(0, 4).map((entry) => (
              <li key={entry.id} className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="font-medium">{entry.title || "Approved line"}</p>
                <p className="mt-1 leading-relaxed">{entry.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No approved language yet. Add it under More → Approved language when you are ready.</Empty>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-serif text-xl font-bold">Health summary</h3>
        {phrases.length ? (
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm leading-relaxed">{phrases.join(". ")}.</p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {health.map((row) => (
                <li key={row.category}>
                  {CI_HEALTH_CATEGORY_LABELS[row.category]} — {CI_HEALTH_STATUS_LABELS[row.status]}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Empty>The assessment is still empty. Finish it before sharing a health summary.</Empty>
        )}
        {data.brief ? (
          <p className="text-sm text-muted-foreground">
            Latest published note: week of {formatCiDate(data.brief.week_of)}.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No published weekly note yet.</p>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to={`/hq/intelligence/organizations/${org.id}`}>Back to workflow</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/hq/intelligence/organizations/${org.id}/reports`}>Prepare a client update</Link>
        </Button>
      </div>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-muted-foreground">
      {children}
    </p>
  );
}
