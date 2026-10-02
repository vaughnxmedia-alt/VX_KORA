import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ciApi } from "../api";
import { formatCiDateTime } from "../workspace";
import {
  CI_COUNSEL_REQUEST_TYPE_LABELS,
  CI_COUNSEL_REQUEST_TYPES,
  CI_COUNSEL_STATUS_LABELS,
  CI_COUNSEL_STATUSES,
  CI_COUNSEL_URGENCIES,
  CI_COUNSEL_URGENCY_LABELS,
  CI_COUNSEL_URGENCY_RANK,
  type CiCounselRequest,
  type CiCounselRequestType,
  type CiCounselStatus,
  type CiCounselUrgency,
} from "../types";

function sortUnresolved(a: CiCounselRequest, b: CiCounselRequest) {
  const urgency = CI_COUNSEL_URGENCY_RANK[a.urgency] - CI_COUNSEL_URGENCY_RANK[b.urgency];
  if (urgency !== 0) return urgency;
  return a.created_at.localeCompare(b.created_at);
}

function RequestRow({ item, to }: { item: CiCounselRequest; to: string }) {
  return (
    <article className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={to} className="font-serif text-lg font-bold text-primary hover:underline">
            {item.subject}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.organization_name || "Organization"} · {CI_COUNSEL_REQUEST_TYPE_LABELS[item.request_type]} ·{" "}
            {CI_COUNSEL_URGENCY_LABELS[item.urgency]} · {formatCiDateTime(item.created_at)}
          </p>
        </div>
        <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {CI_COUNSEL_STATUS_LABELS[item.status]}
        </span>
      </div>
    </article>
  );
}

export function CiCounselInboxPage() {
  const [orgId, setOrgId] = useState<string | "all">("all");
  const [status, setStatus] = useState<CiCounselStatus | "all">("all");
  const [urgency, setUrgency] = useState<CiCounselUrgency | "all">("all");
  const [type, setType] = useState<CiCounselRequestType | "all">("all");

  const { data: orgs = [] } = useQuery({
    queryKey: ["ci", "organizations"],
    queryFn: () => ciApi.organizations.list(),
  });
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["ci", "counsel", orgId, status, urgency, type],
    queryFn: () =>
      ciApi.counsel.list({
        organizationId: orgId === "all" ? undefined : orgId,
        status,
        urgency,
        type,
      }),
  });

  const grouped = useMemo(() => {
    const open = items.filter((item) => item.status === "submitted" || item.status === "reviewing");
    const ready = items.filter((item) => item.status === "response_ready");
    const closed = items.filter((item) => item.status === "closed");
    return {
      urgentOldest: [...open].sort(sortUnresolved),
      ready,
      closed,
    };
  }, [items]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          Communications Intelligence
        </p>
        <h1 className="font-serif text-3xl font-bold">Counsel Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Incoming requests for strategic review. Start with the most urgent and oldest unresolved.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={orgId} onValueChange={setOrgId}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as CiCounselStatus | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CI_COUNSEL_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {CI_COUNSEL_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={urgency} onValueChange={(v) => setUrgency(v as CiCounselUrgency | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All urgency</SelectItem>
            {CI_COUNSEL_URGENCIES.map((value) => (
              <SelectItem key={value} value={value}>
                {CI_COUNSEL_URGENCY_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => setType(v as CiCounselRequestType | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CI_COUNSEL_REQUEST_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {CI_COUNSEL_REQUEST_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold">Needs review</h2>
            {grouped.urgentOldest.length ? (
              <div className="space-y-3">
                {grouped.urgentOldest.map((item) => (
                  <RequestRow key={item.id} item={item} to={`/hq/intelligence/counsel/${item.id}`} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No unresolved counsel requests.</p>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold">Response ready</h2>
            {grouped.ready.length ? (
              <div className="space-y-3">
                {grouped.ready.map((item) => (
                  <RequestRow key={item.id} item={item} to={`/hq/intelligence/counsel/${item.id}`} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None waiting with the client.</p>
            )}
          </section>
          {grouped.closed.length ? (
            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold">Closed</h2>
              <div className="space-y-3">
                {grouped.closed.map((item) => (
                  <RequestRow key={item.id} item={item} to={`/hq/intelligence/counsel/${item.id}`} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default CiCounselInboxPage;
