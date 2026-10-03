import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ciApi } from "../api";
import { ciFriendlyError, formatCiDate } from "../workspace";
import { CI_PILOT_STATUS_LABELS } from "../types";

export function CiPilotDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "pilot", "dashboard"],
    queryFn: () => ciApi.learning.dashboard(),
  });
  const { data: recFeedback = [] } = useQuery({
    queryKey: ["ci", "feedback", "rec"],
    queryFn: () => ciApi.feedback.listRecommendations(),
  });
  const { data: pilotFeedback = [] } = useQuery({
    queryKey: ["ci", "feedback", "pilot"],
    queryFn: () => ciApi.feedback.listPilot(),
  });

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          Communications Intelligence
        </p>
        <h1 className="font-serif text-3xl font-bold">Pilot</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Operate the first Communications Intelligence cohort. This is a roster, not a customer-success suite.
        </p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading the pilot picture…</p> : null}
      {error ? <p className="text-sm text-destructive">{ciFriendlyError(error)}</p> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Active pilots" value={data.active_pilots} />
            <Stat label="Onboarding complete" value={data.onboarding_complete} />
            <Stat label="Actions completed" value={data.actions_completed} />
            <Stat label="Opportunities identified" value={data.opportunities_identified} />
            <Stat label="Outcomes recorded" value={data.outcomes_recorded} />
            <Stat label="Counsel requests" value={data.counsel_requests} />
            <Stat label="Client feedback notes" value={data.feedback_count} />
          </div>

          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold">Needs follow-up</h2>
            {data.no_recent_activity.length ? (
              <ul className="space-y-2 text-sm">
                {data.no_recent_activity.map((row) => (
                  <li key={row.id} className="rounded-lg border border-border bg-background p-4">
                    <Link
                      to={`/hq/intelligence/organizations/${row.id}/pilot`}
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      {row.name}
                    </Link>
                    <p className="mt-1 text-muted-foreground">
                      {row.days >= 99
                        ? "No portal activity recorded yet."
                        : `No portal activity in ${row.days} days.`}{" "}
                      {row.overdue_actions ? `${row.overdue_actions} overdue ${row.overdue_actions === 1 ? "action" : "actions"}.` : ""}{" "}
                      {row.high_items
                        ? `${row.high_items} high-priority ${row.high_items === 1 ? "item" : "items"} still open.`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No enrolled organizations currently need follow-up.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold">Pilot roster</h2>
            {data.enrollments.length ? (
              <ul className="space-y-2 text-sm">
                {data.enrollments.map((row) => (
                  <li key={row.id}>
                    <Link
                      to={`/hq/intelligence/organizations/${row.organization_id}/pilot`}
                      className="text-primary underline underline-offset-4"
                    >
                      {row.organization_name || "Organization"}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      — {CI_PILOT_STATUS_LABELS[row.status]}
                      {row.cohort ? ` · ${row.cohort}` : ""}
                      {row.start_date ? ` · started ${formatCiDate(row.start_date)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No organizations are enrolled yet. Open an organization and use the Pilot tab.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold">Client feedback</h2>
            {pilotFeedback.length || recFeedback.length ? (
              <div className="space-y-3 text-sm">
                {pilotFeedback.slice(0, 6).map((item) => (
                  <article key={item.id} className="rounded-lg border border-border bg-background p-4">
                    {item.most_useful ? <p>Most useful: {item.most_useful}</p> : null}
                    {item.confusing ? <p>Confusing: {item.confusing}</p> : null}
                    {item.wish ? <p>Wish: {item.wish}</p> : null}
                    {item.helped_decision ? <p>Helped a decision: {item.helped_decision}</p> : null}
                  </article>
                ))}
                {recFeedback.slice(0, 6).map((item) => (
                  <p key={item.id} className="text-muted-foreground">
                    {item.related_type}: {item.useful}
                    {item.why ? ` — ${item.why}` : ""}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No client feedback yet.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}

export default CiPilotDashboardPage;
