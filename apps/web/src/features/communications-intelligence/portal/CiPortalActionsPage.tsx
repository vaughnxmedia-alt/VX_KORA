import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { UsefulFeedback } from "../UsefulFeedback";
import { trackCiActivity } from "../activity";
import { ciApi } from "../api";
import { ciFriendlyError, formatCiDate, groupActionsByDue } from "../workspace";
import {
  CI_ACTION_STATUS_LABELS,
  CI_CLIENT_ACTION_STATUSES,
  CI_PRIORITY_LABELS,
  type CiActionItem,
  type CiActionStatus,
} from "../types";

function ActionDetail({
  item,
  onStatus,
  updating,
  organizationId,
}: {
  item: CiActionItem;
  onStatus: (status: Extract<CiActionStatus, "not_started" | "in_progress" | "completed">) => void;
  updating: boolean;
  organizationId: string;
}) {
  const canUpdate = item.status !== "cancelled";

  return (
    <article className="rounded-lg border border-border bg-background p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-xl font-bold leading-snug">{item.title}</h3>
        <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {CI_PRIORITY_LABELS[item.priority]}
        </span>
      </div>
      {item.description ? (
        <p className="mt-3 text-sm leading-relaxed">{item.description}</p>
      ) : null}
      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Why this matters
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          {item.reason || "JahKnowsPR has not added a note yet."}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Due
          </p>
          <p className="mt-1">{item.due_date ? formatCiDate(item.due_date) : "No due date"}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Status
          </p>
          <p className="mt-1">{CI_ACTION_STATUS_LABELS[item.status]}</p>
        </div>
      </div>
      {item.opportunity_title || item.intelligence_title ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {item.opportunity_title ? `Connected to ${item.opportunity_title}` : null}
          {item.opportunity_title && item.intelligence_title ? " · " : null}
          {item.intelligence_title ? `Connected to ${item.intelligence_title}` : null}
        </p>
      ) : null}
      {canUpdate ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {CI_CLIENT_ACTION_STATUSES.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={item.status === status ? "default" : "outline"}
              disabled={updating || item.status === status}
              onClick={() => onStatus(status)}
            >
              {CI_ACTION_STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      ) : null}
      <UsefulFeedback organizationId={organizationId} relatedType="action" relatedId={item.id} />
    </article>
  );
}

function Section({
  title,
  empty,
  items,
  onStatus,
  updating,
  organizationId,
}: {
  title: string;
  empty: string;
  items: CiActionItem[];
  updating: boolean;
  organizationId: string;
  onStatus: (
    item: CiActionItem,
    status: Extract<CiActionStatus, "not_started" | "in_progress" | "completed">,
  ) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl font-bold">{title}</h2>
      {items.length ? (
        <div className="space-y-4">
          {items.map((item) => (
            <ActionDetail
              key={item.id}
              item={item}
              updating={updating}
              organizationId={organizationId}
              onStatus={(status) => onStatus(item, status)}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  );
}

export function CiPortalActionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "portal", "actions", user?.id, orgId],
    queryFn: () => ciApi.portal.loadActions(user!.id, orgId),
    enabled: Boolean(user?.id),
  });

  const updateStatus = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Extract<CiActionStatus, "not_started" | "in_progress" | "completed">;
    }) => ciApi.portal.updateActionStatus(id, status),
    onSuccess: (_row, vars) => {
      trackCiActivity({
        organization_id: data?.organization.id,
        event_type: "action_status_changed",
        entity_type: "action_item",
        entity_id: vars.id,
      });
      toast.success("Action status updated");
      void qc.invalidateQueries({ queryKey: ["ci", "portal", "actions", user?.id, orgId] });
      void qc.invalidateQueries({ queryKey: ["ci", "portal", "dashboard", user?.id, orgId] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  const grouped = useMemo(() => groupActionsByDue(data?.actions ?? []), [data?.actions]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your actions…</p>;
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
          What to do next.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Specific communications work for this organization. You can mark progress. Strategy and
          ownership stay with JahKnowsPR.
        </p>
      </header>

      <Section
        title="Overdue"
        empty="No overdue communications work."
        items={grouped.overdue}
        updating={updateStatus.isPending}
        organizationId={data.organization.id}
        onStatus={(item, status) => updateStatus.mutate({ id: item.id, status })}
      />
      <Section
        title="Due this week"
        empty="No deadlines are approaching this week."
        items={grouped.thisWeek}
        updating={updateStatus.isPending}
        organizationId={data.organization.id}
        onStatus={(item, status) => updateStatus.mutate({ id: item.id, status })}
      />
      <Section
        title="Upcoming"
        empty="You're caught up. No open actions are due."
        items={grouped.upcoming}
        updating={updateStatus.isPending}
        organizationId={data.organization.id}
        onStatus={(item, status) => updateStatus.mutate({ id: item.id, status })}
      />
      <Section
        title="Completed"
        empty="No completed actions yet."
        items={grouped.completed}
        updating={updateStatus.isPending}
        organizationId={data.organization.id}
        onStatus={(item, status) => updateStatus.mutate({ id: item.id, status })}
      />
    </div>
  );
}

export default CiPortalActionsPage;
