import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { ciApi } from "../api";
import { ciFriendlyError, formatCiDate } from "../workspace";
import { CI_OUTCOME_TYPE_LABELS } from "../types";

export function CiPortalProgressPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "portal", "progress", user?.id, orgId],
    queryFn: () => ciApi.portal.loadProgress(user!.id, orgId),
    enabled: Boolean(user?.id),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading this month’s progress…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {ciFriendlyError(error) || "Unable to load this organization."}
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data.organization.name}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">This month</h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          A quiet read of the communications work underway — not a scorecard.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-background p-5 space-y-2">
        <ProgressLine count={data.recommended_actions} singular="recommended action" plural="recommended actions" />
        <ProgressLine count={data.completed_actions} singular="completed" plural="completed" />
        <ProgressLine
          count={data.opportunities_identified}
          singular="opportunity identified"
          plural="opportunities identified"
        />
        <ProgressLine
          count={data.issues_resolved}
          singular="communications issue resolved"
          plural="communications issues resolved"
        />
        <ProgressLine
          count={data.counsel_completed}
          singular="strategic counsel request completed"
          plural="strategic counsel requests completed"
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-bold">Communications wins</h2>
        {data.outcomes.length ? (
          data.outcomes.map((item) => (
            <article key={item.id} className="rounded-lg border border-border bg-background p-5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-gold-dark">
                {CI_OUTCOME_TYPE_LABELS[item.outcome_type]}
                {item.occurred_on ? ` · ${formatCiDate(item.occurred_on)}` : ""}
              </p>
              <h3 className="mt-1 font-serif text-xl font-bold">{item.title}</h3>
              {item.description ? <p className="mt-2 text-sm leading-relaxed">{item.description}</p> : null}
              {item.url ? (
                <a
                  href={item.url}
                  className="mt-3 inline-block text-sm text-primary underline underline-offset-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
              ) : null}
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-muted-foreground">
            No documented communications outcomes yet.
          </p>
        )}
      </section>
    </div>
  );
}

function ProgressLine({
  count,
  singular,
  plural,
}: {
  count: number;
  singular: string;
  plural: string;
}) {
  return (
    <p className="font-serif text-xl leading-snug">
      <span className="text-primary">{count}</span> {count === 1 ? singular : plural}
    </p>
  );
}

export default CiPortalProgressPage;
