import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ciApi } from "../api";
import {
  CI_ACTIVE_INTELLIGENCE_STATUSES,
  CI_ACTIVE_OPPORTUNITY_STATUSES,
} from "../types";
import {
  healthRowsByCategory,
  type CiWorkspaceContext,
  workflowFromCounts,
} from "../workspace";

export function CiOrganizationGuidePage() {
  const { org } = useOutletContext<CiWorkspaceContext>();

  const { data, isLoading } = useQuery({
    queryKey: ["ci", "workflow", org.id],
    queryFn: async () => {
      const [health, intel, opps, actions] = await Promise.all([
        ciApi.health.listForOrganization(org.id),
        ciApi.intelligence.list(org.id),
        ciApi.opportunities.list(org.id),
        ciApi.actions.list(org.id),
      ]);
      return { health, intel, opps, actions };
    },
  });

  const flow = workflowFromCounts(org, {
      assessedCategories: data
      ? healthRowsByCategory(data.health).filter((row) => row.assessed).length
      : 0,
    recommendationCount: (data?.intel ?? []).filter((item) =>
      CI_ACTIVE_INTELLIGENCE_STATUSES.includes(item.status),
    ).length,
    opportunityCount: (data?.opps ?? []).filter((item) =>
      CI_ACTIVE_OPPORTUNITY_STATUSES.includes(item.status),
    ).length,
    actionCount: (data?.actions ?? []).filter((item) => item.status !== "cancelled").length,
    approvedMessagingCount: 0,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold">Follow this order</h2>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          You do not need to know the modules. Finish the next open step. Advanced tools stay under
          More.
        </p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Checking this client’s progress…</p> : null}

      <ol className="space-y-3">
        {flow.steps.map((step) => {
          const current = !step.done && step.id === flow.next.id;
          return (
            <li
              key={step.id}
              className={`rounded-xl border p-4 sm:p-5 ${
                current ? "border-primary/50 bg-background" : "border-border bg-background/70"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    Step {step.id}
                    {step.done ? " · Done" : current ? " · Do this next" : ""}
                  </p>
                  <h3 className="mt-1 font-serif text-xl font-bold leading-snug">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">{step.summary}</p>
                </div>
                <Button asChild variant={current ? "default" : "outline"} className="shrink-0">
                  <Link to={step.href}>{step.cta}</Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
