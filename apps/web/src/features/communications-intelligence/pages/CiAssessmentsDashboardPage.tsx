import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ciApi } from "../api";
import {
  CI_WORKFLOW_STATUS_LABELS,
  CI_WORKFLOW_STATUSES,
  type CiAssessmentWorkflowStatus,
} from "../assessmentTypes";
import { ciFriendlyError, formatRelativeActivity } from "../workspace";

function currentStepLabel(status: CiAssessmentWorkflowStatus) {
  if (status === "draft_profile") return "Step 1 · Profile";
  if (status === "profile_complete" || status === "assessment_in_progress") {
    return "Step 2 · Assessment";
  }
  if (
    status === "assessment_complete" ||
    status === "ready_for_chatgpt" ||
    status === "recommendations_drafted" ||
    status === "under_review"
  ) {
    return "Step 3 · Recommendations";
  }
  return "Complete";
}

export function CiAssessmentsDashboardPage() {
  const [status, setStatus] = useState<CiAssessmentWorkflowStatus | "all">("all");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["ci", "assessments", "list", status],
    queryFn: () => ciApi.assessments.list({ workflow_status: status }),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
            JahKnowsPR HQ
          </p>
          <h1 className="font-serif text-3xl font-bold">Communications Assessments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track each assessment from profile through ChatGPT handoff to approved client report.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/hq/intelligence">Back to today</Link>
        </Button>
      </div>

      <div className="max-w-xs">
        <Select value={status} onValueChange={(v) => setStatus(v as CiAssessmentWorkflowStatus | "all")}>
          <SelectTrigger>
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CI_WORKFLOW_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {CI_WORKFLOW_STATUS_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading assessments…</p> : null}
      {error ? <p className="text-sm text-destructive">{ciFriendlyError(error)}</p> : null}

      {data.length ? (
        <ul className="space-y-3">
          {data.map((row) => (
            <li key={row.id}>
              <Link
                to={`/hq/intelligence/organizations/${row.organization_id}`}
                className="block rounded-xl border border-border bg-background p-4 hover:border-primary/40"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-bold">
                      {row.organization_name || "Client"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {currentStepLabel(row.workflow_status)} ·{" "}
                      {CI_WORKFLOW_STATUS_LABELS[row.workflow_status]}
                    </p>
                    <p className="mt-2 text-sm">
                      Assigned · {row.assigned_name || "Unassigned"}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground sm:text-right">
                    <p>Started · {formatRelativeActivity(row.started_at)}</p>
                    <p>Updated · {formatRelativeActivity(row.updated_at)}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : !isLoading ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          No assessments match this filter. Open a client workspace to start one.
        </p>
      ) : null}
    </div>
  );
}
