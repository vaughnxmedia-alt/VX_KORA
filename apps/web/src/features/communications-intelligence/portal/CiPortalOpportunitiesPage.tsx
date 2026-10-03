import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { AskCounselLink } from "../AskCounselLink";
import { UsefulFeedback } from "../UsefulFeedback";
import { trackCiActivity } from "../activity";
import { ciApi } from "../api";
import { ciFriendlyError, counselDraftFromOpportunity, formatCiDate } from "../workspace";
import {
  CI_ACTIVE_OPPORTUNITY_STATUSES,
  CI_CLIENT_OPPORTUNITY_STATUSES,
  CI_OPPORTUNITY_STATUS_LABELS,
  CI_OPPORTUNITY_TYPE_LABELS,
  type CiOpportunity,
  type CiOpportunityStatus,
} from "../types";

function OpportunityDetail({
  item,
  onStatus,
  updating,
  search,
  organizationId,
}: {
  item: CiOpportunity;
  onStatus: (status: Extract<CiOpportunityStatus, "interested" | "passed">) => void;
  updating: boolean;
  search: string;
  organizationId: string;
}) {
  const canRespond = CI_ACTIVE_OPPORTUNITY_STATUSES.includes(item.status);

  return (
    <article className="rounded-lg border border-border bg-background p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
        {CI_OPPORTUNITY_TYPE_LABELS[item.opportunity_type]}
      </p>
      <h2 className="mt-1 font-serif text-2xl font-bold leading-snug">{item.title}</h2>
      {item.description ? (
        <p className="mt-4 text-sm leading-relaxed">{item.description}</p>
      ) : null}

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Why this matters
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            {item.why_it_matters || "JahKnowsPR has not added a note yet."}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Recommended action
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            {item.recommended_action || "No next step has been written yet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Deadline
            </p>
            <p className="mt-1">{item.deadline ? formatCiDate(item.deadline) : "No deadline"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Status
            </p>
            <p className="mt-1">{CI_OPPORTUNITY_STATUS_LABELS[item.status]}</p>
          </div>
        </div>
        {item.source || item.source_url ? (
          <p className="text-xs text-muted-foreground">
            Source:{" "}
            {item.source_url ? (
              <a
                href={item.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-4"
              >
                {item.source || item.source_url}
              </a>
            ) : (
              item.source
            )}
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <AskCounselLink prefill={counselDraftFromOpportunity(item)} search={search}>
          Ask JahKnowsPR about this
        </AskCounselLink>
      </div>
      {canRespond ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {CI_CLIENT_OPPORTUNITY_STATUSES.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={item.status === status ? "default" : "outline"}
              disabled={updating || item.status === status}
              onClick={() => onStatus(status)}
            >
              {CI_OPPORTUNITY_STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      ) : null}
      <UsefulFeedback organizationId={organizationId} relatedType="opportunity" relatedId={item.id} />
    </article>
  );
}

export function CiPortalOpportunitiesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "portal", "opportunities", user?.id, orgId],
    queryFn: () => ciApi.portal.loadOpportunities(user!.id, orgId),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (!data?.organization.id || !data.opportunities[0]) return;
    trackCiActivity({
      organization_id: data.organization.id,
      event_type: "opportunity_viewed",
      entity_type: "opportunity",
      entity_id: data.opportunities[0].id,
    });
  }, [data?.organization.id, data?.opportunities]);

  const updateStatus = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Extract<CiOpportunityStatus, "interested" | "passed">;
    }) => ciApi.portal.updateOpportunityStatus(id, status),
    onSuccess: () => {
      toast.success("Thanks — JahKnowsPR can see your response.");
      void qc.invalidateQueries({ queryKey: ["ci", "portal", "opportunities", user?.id, orgId] });
      void qc.invalidateQueries({ queryKey: ["ci", "portal", "dashboard", user?.id, orgId] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  const groups = useMemo(() => {
    const items = data?.opportunities ?? [];
    return {
      active: items.filter((item) => CI_ACTIVE_OPPORTUNITY_STATUSES.includes(item.status)),
      closed: items.filter((item) => !CI_ACTIVE_OPPORTUNITY_STATUSES.includes(item.status)),
    };
  }, [data?.opportunities]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your opportunities…</p>;
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
        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
          Opportunities worth considering.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Moments JahKnowsPR thinks could help this organization. Tell us if you are interested or
          if you would rather pass.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-bold">Open now</h2>
        {groups.active.length ? (
          <div className="space-y-4">
            {groups.active.map((item) => (
              <OpportunityDetail
                key={item.id}
                item={item}
                search={params.toString() ? `?${params.toString()}` : ""}
                updating={updateStatus.isPending}
                organizationId={data.organization.id}
                onStatus={(status) => updateStatus.mutate({ id: item.id, status })}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-muted-foreground">
            No active communications opportunities right now.
          </p>
        )}
      </section>

      {groups.closed.length ? (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-bold">Completed or passed</h2>
          <div className="space-y-4">
            {groups.closed.map((item) => (
              <OpportunityDetail
                key={item.id}
                item={item}
                search={params.toString() ? `?${params.toString()}` : ""}
                updating={updateStatus.isPending}
                organizationId={data.organization.id}
                onStatus={(status) => updateStatus.mutate({ id: item.id, status })}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default CiPortalOpportunitiesPage;
