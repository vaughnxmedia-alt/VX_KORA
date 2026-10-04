import { useState } from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { ciApi } from "../api";
import { CI_MORE_TOOLS, CI_ORG_STATUS_LABELS } from "../types";
import { countFilledSections } from "../assessmentHelpers";
import { workflowFromCounts } from "../workspace";
import { CiDeleteClientDialog } from "./CiDeleteClientDialog";

export function CiOrganizationWorkspacePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: org, isLoading, error } = useQuery({
    queryKey: ["ci", "organizations", orgId],
    queryFn: () => ciApi.organizations.get(orgId!),
    enabled: Boolean(orgId),
  });

  const { data: counts } = useQuery({
    queryKey: ["ci", "workflow", orgId],
    queryFn: async () => {
      const assessment = await ciApi.assessments.ensureForOrganization(orgId!, user?.id);
      const [sections, priorities] = await Promise.all([
        ciApi.assessments.listSections(assessment.id),
        ciApi.assessments.listPriorities(assessment.id),
      ]);
      return { assessment, sections, priorities };
    },
    enabled: Boolean(orgId),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Opening this client…</p>;
  }

  if (error || !org) {
    return (
      <div className="space-y-3 max-w-lg">
        <Link
          to="/hq/intelligence"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to today
        </Link>
        <p className="text-sm text-destructive">
          {(error as Error | undefined)?.message || "Client not found."}
        </p>
      </div>
    );
  }

  const flow = workflowFromCounts(org, {
    assessedCategories: counts ? countFilledSections(counts.sections) : 0,
    recommendationCount:
      counts?.assessment.step3_status === "approved" ||
      counts?.assessment.step3_status === "delivered"
        ? 1
        : 0,
    opportunityCount: 0,
    actionCount: 0,
    approvedMessagingCount: 0,
  });

  const onWorkflow = location.pathname.replace(/\/$/, "") === `/hq/intelligence/organizations/${org.id}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          to="/hq/intelligence"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Today
        </Link>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-serif text-3xl font-bold">{org.name}</h1>
          <span className="text-xs rounded-full border border-border px-2.5 py-0.5 text-muted-foreground">
            {CI_ORG_STATUS_LABELS[org.status]}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {flow.stage} · {flow.doneCount} of {flow.total} steps ready
        </p>
        {!onWorkflow ? (
          <Link
            to={`/hq/intelligence/organizations/${org.id}`}
            className="mt-2 inline-block text-sm text-primary underline underline-offset-4"
          >
            Back to workflow
          </Link>
        ) : null}
      </div>

      <Outlet context={{ org }} />

      <details className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">More tools</summary>
        <p className="mt-2 text-muted-foreground">
          Use these when you need them. They are not the main path.
        </p>
        <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {CI_MORE_TOOLS.map((tool) => (
            <NavLink
              key={tool.id}
              to={`/hq/intelligence/organizations/${org.id}/${tool.id}`}
              className={({ isActive }) =>
                cn(
                  "underline underline-offset-4",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {tool.label}
            </NavLink>
          ))}
        </nav>
        <Button
          type="button"
          variant="ghost"
          className="mt-4 px-0 text-destructive hover:bg-transparent hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          Delete this client
        </Button>
      </details>
      <CiDeleteClientDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        organizationId={org.id}
        organizationName={org.name}
      />
    </div>
  );
}
