import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { trackCiActivity } from "../activity";
import { ciApi } from "../api";
import {
  CI_PRIORITY_LEVEL_LABELS,
  CI_RECOMMENDED_SERVICE_LABELS,
  CI_SUPPORT_TYPE_LABELS,
} from "../assessmentTypes";
import { ciFriendlyError } from "../workspace";

export function CiPortalPrioritiesPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "portal", "priorities", user?.id, orgId],
    queryFn: () => ciApi.assessments.loadApprovedForPortal(user!.id, orgId),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (!data?.organization.id) return;
    trackCiActivity({
      organization_id: data.organization.id,
      event_type: "health_viewed",
      entity_type: "organization",
    });
  }, [data?.organization.id]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your communications priorities…</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{ciFriendlyError(error)}</p>;
  }

  if (!data) {
    return (
      <div className="space-y-3 max-w-xl">
        <h1 className="font-serif text-3xl font-bold">Communications Priorities</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          JahKnowsPR has not shared an approved communications priorities report yet. When your
          strategist finishes the review, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data.organization.name}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
          Communications Priorities
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Based on what we learned about your organization and what we observed across your current
          communications, these are the areas we believe deserve your attention first.
        </p>
      </header>

      <div className="space-y-6">
        {data.priorities.map((item) => (
          <article key={item.id} className="rounded-lg border border-border bg-background p-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
              {CI_PRIORITY_LEVEL_LABELS[item.priority_level]}
            </p>
            <h2 className="font-serif text-2xl font-bold">{item.title}</h2>
            {item.what_we_noticed ? (
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">What we noticed</p>
                <p className="mt-1 text-sm leading-relaxed">{item.what_we_noticed}</p>
              </div>
            ) : null}
            {item.why_it_matters ? (
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Why it matters</p>
                <p className="mt-1 text-sm leading-relaxed">{item.why_it_matters}</p>
              </div>
            ) : null}
            {item.recommendation ? (
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Our recommendation</p>
                <p className="mt-1 text-sm leading-relaxed">{item.recommendation}</p>
              </div>
            ) : null}
            {item.next_practical_step ? (
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Next practical step</p>
                <p className="mt-1 text-sm leading-relaxed">{item.next_practical_step}</p>
              </div>
            ) : null}
            <p className="text-sm">
              <span className="font-medium">Support: </span>
              {CI_SUPPORT_TYPE_LABELS[item.support_type]}
            </p>
            {item.recommended_service ? (
              <p className="text-sm">
                <span className="font-medium">Recommended JahKnowsPR support: </span>
                {CI_RECOMMENDED_SERVICE_LABELS[item.recommended_service]}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {data.assessment.recommended_order ? (
        <section className="space-y-2">
          <h2 className="font-serif text-2xl font-bold">Recommended order of action</h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {data.assessment.recommended_order}
          </p>
        </section>
      ) : null}

      {data.assessment.overall_direction ? (
        <section className="space-y-2">
          <h2 className="font-serif text-2xl font-bold">Overall communications direction</h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {data.assessment.overall_direction}
          </p>
        </section>
      ) : null}
    </div>
  );
}

export default CiPortalPrioritiesPage;
