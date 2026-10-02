import { NavLink, Outlet, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ciApi } from "../api";
import { CI_ORG_STATUS_LABELS, CI_WORKSPACE_TABS } from "../types";

export function CiOrganizationWorkspacePage() {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: org, isLoading, error } = useQuery({
    queryKey: ["ci", "organizations", orgId],
    queryFn: () => ciApi.organizations.get(orgId!),
    enabled: Boolean(orgId),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading organization…</p>;
  }

  if (error || !org) {
    return (
      <div className="space-y-3 max-w-lg">
        <Link
          to="/hq/intelligence/organizations"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to organizations
        </Link>
        <p className="text-sm text-destructive">
          {(error as Error | undefined)?.message || "Organization not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          to="/hq/intelligence/organizations"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Organizations
        </Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark mb-1">
          Communications Intelligence
        </p>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-serif text-3xl font-bold">{org.name}</h1>
          <span className="text-xs rounded-full border border-border px-2.5 py-0.5 text-muted-foreground">
            {CI_ORG_STATUS_LABELS[org.status]}
          </span>
        </div>
        {org.hq_client ? (
          <p className="text-sm text-muted-foreground mt-1">
            Linked HQ client:{" "}
            <Link to={`/hq/clients/${org.hq_client.id}`} className="text-primary hover:underline">
              {org.hq_client.client_name}
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">No HQ client linked</p>
        )}
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border pb-px">
        {CI_WORKSPACE_TABS.map((tab) => {
          if (!tab.enabled) {
            return (
              <span
                key={tab.id}
                className="px-3 py-2 text-sm text-muted-foreground/45 cursor-not-allowed"
                title="Coming in a later phase"
              >
                {tab.label}
              </span>
            );
          }
          const to =
            tab.id === "overview"
              ? `/hq/intelligence/organizations/${org.id}`
              : `/hq/intelligence/organizations/${org.id}/${tab.id}`;
          return (
            <NavLink
              key={tab.id}
              to={to}
              end={tab.id === "overview"}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
                  isActive
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )
              }
            >
              {tab.label}
            </NavLink>
          );
        })}
      </nav>

      <Outlet context={{ org }} />
    </div>
  );
}
