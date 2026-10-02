import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { ciApi } from "../api";
import {
  CI_ORG_STATUS_LABELS,
  CI_ORG_TYPE_LABELS,
  type CiOrganizationListItem,
} from "../types";

type WorkspaceContext = { org: CiOrganizationListItem };

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-2.5 border-b border-border/70 last:border-0">
      <dt className="text-xs uppercase tracking-[0.08em] text-muted-foreground pt-0.5">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

function PlaceholderStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}

export function CiOrganizationOverviewTab() {
  const { org } = useOutletContext<WorkspaceContext>();

  const { data: counts } = useQuery({
    queryKey: ["ci", "organizations", org.id, "counts"],
    queryFn: () => ciApi.workspace.counts(org.id),
  });

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-background p-5 md:p-6">
        <h2 className="font-serif text-xl font-bold mb-3">Organization profile</h2>
        <dl>
          <MetaRow label="Name">{org.name}</MetaRow>
          <MetaRow label="Type">
            {org.organization_type ? CI_ORG_TYPE_LABELS[org.organization_type] : "—"}
          </MetaRow>
          <MetaRow label="Industry">{org.industry || "—"}</MetaRow>
          <MetaRow label="Website">
            {org.website ? (
              <a
                href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline break-all"
              >
                {org.website}
              </a>
            ) : (
              "—"
            )}
          </MetaRow>
          <MetaRow label="Location">{org.location || "—"}</MetaRow>
          <MetaRow label="Description">
            <span className="whitespace-pre-wrap leading-relaxed">{org.description || "—"}</span>
          </MetaRow>
          <MetaRow label="HQ client">
            {org.hq_client ? (
              <Link to={`/hq/clients/${org.hq_client.id}`} className="text-primary hover:underline">
                {org.hq_client.client_name}
                {org.hq_client.primary_contact ? ` · ${org.hq_client.primary_contact}` : ""}
              </Link>
            ) : (
              "—"
            )}
          </MetaRow>
          <MetaRow label="Status">{CI_ORG_STATUS_LABELS[org.status]}</MetaRow>
          <MetaRow label="Members">{counts?.members ?? "…"}</MetaRow>
          <MetaRow label="Created">{formatDate(org.created_at)}</MetaRow>
        </dl>
      </section>

      <section>
        <h2 className="font-serif text-xl font-bold mb-1">At a glance</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Summary counts for later modules. Values stay at zero until those workflows are built.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <PlaceholderStat label="Open Intelligence Items" value={counts?.intelligence_open ?? 0} />
          <PlaceholderStat label="Active Opportunities" value={counts?.opportunities_active ?? 0} />
          <PlaceholderStat label="Open Actions" value={counts?.actions_open ?? 0} />
          <PlaceholderStat label="Counsel Requests" value={counts?.counsel_open ?? 0} />
        </div>
      </section>
    </div>
  );
}
