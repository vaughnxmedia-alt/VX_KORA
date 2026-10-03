import { useQuery } from "@tanstack/react-query";
import { ciApi } from "../api";
import { ciFriendlyError } from "../workspace";
import {
  CI_HEALTH_CATEGORY_LABELS,
  CI_INTELLIGENCE_CATEGORY_LABELS,
  CI_MESSAGING_ENTRY_LABELS,
  CI_OPPORTUNITY_TYPE_LABELS,
  CI_USEFUL_LABELS,
  type CiHealthCategory,
  type CiIntelligenceCategory,
  type CiMessagingEntryType,
  type CiOpportunityType,
  type CiUsefulRating,
} from "../types";

export function CiPilotLearningPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "pilot", "learning"],
    queryFn: () => ciApi.learning.summary(),
  });

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          Communications Intelligence
        </p>
        <h1 className="font-serif text-3xl font-bold">Product learning</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Aggregate, non-sensitive counts from the pilot. Use this to decide what might later be automated.
          Do not treat these numbers as strategy.
        </p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading learning counts…</p> : null}
      {error ? <p className="text-sm text-destructive">{ciFriendlyError(error)}</p> : null}

      {data ? (
        <div className="grid gap-6 md:grid-cols-2">
          <CountList
            title="Most common intelligence categories"
            rows={data.intelligence_categories}
            label={(key) => CI_INTELLIGENCE_CATEGORY_LABELS[key as CiIntelligenceCategory] || key}
          />
          <CountList
            title="Health areas needing attention"
            rows={data.health_needs_attention}
            label={(key) => CI_HEALTH_CATEGORY_LABELS[key as CiHealthCategory] || key}
          />
          <CountList
            title="Opportunity types"
            rows={data.opportunity_types}
            label={(key) => CI_OPPORTUNITY_TYPE_LABELS[key as CiOpportunityType] || key}
          />
          <CountList
            title="Approved messaging used most"
            rows={data.messaging_categories}
            label={(key) => CI_MESSAGING_ENTRY_LABELS[key as CiMessagingEntryType] || key}
          />
          <CountList
            title="Recommendation usefulness"
            rows={data.usefulness}
            label={(key) => CI_USEFUL_LABELS[key as CiUsefulRating] || key}
          />
          <section className="rounded-lg border border-border bg-background p-5 space-y-2">
            <h2 className="font-serif text-xl font-bold">Workload</h2>
            <p className="text-sm">
              Average completed actions per organization with completions:{" "}
              <span className="font-medium">{data.avg_actions_completed}</span>
            </p>
            <p className="text-sm">
              Counsel requests submitted: <span className="font-medium">{data.counsel_requests}</span>
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function CountList({
  title,
  rows,
  label,
}: {
  title: string;
  rows: { key: string; count: number }[];
  label: (key: string) => string;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-5 space-y-3">
      <h2 className="font-serif text-xl font-bold">{title}</h2>
      {rows.length ? (
        <ul className="space-y-1 text-sm">
          {rows.slice(0, 8).map((row) => (
            <li key={row.key} className="flex justify-between gap-3">
              <span>{label(row.key)}</span>
              <span className="text-muted-foreground">{row.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No records yet.</p>
      )}
    </section>
  );
}

export default CiPilotLearningPage;
