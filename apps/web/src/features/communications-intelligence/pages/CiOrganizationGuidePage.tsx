import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { ciApi } from "../api";
import { CI_ASSESSMENT_CATEGORIES, CI_WORKFLOW_STATUS_LABELS } from "../assessmentTypes";
import { countFilledSections } from "../assessmentHelpers";
import { hasOrgProfile, type CiWorkspaceContext } from "../workspace";

function stepBadge(state: "complete" | "in_progress" | "not_started") {
  if (state === "complete") return "Complete";
  if (state === "in_progress") return "In Progress";
  return "Not Started";
}

export function CiOrganizationGuidePage() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["ci", "workflow", org.id, "assessment"],
    queryFn: async () => {
      const assessment = await ciApi.assessments.ensureForOrganization(org.id, user?.id);
      const sections = await ciApi.assessments.listSections(assessment.id);
      const priorities = await ciApi.assessments.listPriorities(assessment.id);
      return { assessment, sections, priorities };
    },
  });

  const profileComplete = hasOrgProfile(org);
  const filled = data ? countFilledSections(data.sections) : 0;
  const assessmentComplete = filled >= CI_ASSESSMENT_CATEGORIES.length;
  const prioritiesComplete =
    data?.assessment.step3_status === "approved" || data?.assessment.step3_status === "delivered";
  const prioritiesStarted =
    (data?.priorities.filter((p) => p.title.trim()).length ?? 0) > 0 ||
    data?.assessment.step3_status !== "draft" ||
    Boolean(data?.assessment.findings_report);

  const steps = [
    {
      id: 1,
      title: "Organization Profile",
      summary: "Capture who they are, who they serve, channels, and what needs care.",
      state: profileComplete ? ("complete" as const) : ("in_progress" as const),
      cta: "Open Profile",
      href: `/hq/intelligence/organizations/${org.id}/overview`,
    },
    {
      id: 2,
      title: "Internal Communications Assessment",
      summary:
        "Staff-only observations across six areas, then generate the Internal Findings Report for ChatGPT.",
      state: assessmentComplete
        ? ("complete" as const)
        : filled > 0 || profileComplete
          ? ("in_progress" as const)
          : ("not_started" as const),
      cta: "Complete Assessment",
      href: `/hq/intelligence/organizations/${org.id}/health`,
    },
    {
      id: 3,
      title: "Communications Priorities",
      summary:
        "Enter the client-facing priorities from ChatGPT. Strategist or Owner approval required before delivery.",
      state: prioritiesComplete
        ? ("complete" as const)
        : prioritiesStarted
          ? ("in_progress" as const)
          : ("not_started" as const),
      cta: "Open Recommendations",
      href: `/hq/intelligence/organizations/${org.id}/priorities`,
    },
  ];

  const next = steps.find((step) => step.state !== "complete") ?? steps[2];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
          JahKnowsPR internal
        </p>
        <h2 className="font-serif text-2xl font-bold">Communications Assessment</h2>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Employee research → Internal findings report → Manual ChatGPT analysis → Human review →
          Client-facing recommendations. No AI runs inside this system.
        </p>
        {data?.assessment ? (
          <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Status · {CI_WORKFLOW_STATUS_LABELS[data.assessment.workflow_status]}
          </p>
        ) : null}
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Checking this assessment…</p> : null}

      <ol className="space-y-3">
        {steps.map((step) => {
          const current = step.id === next.id && step.state !== "complete";
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
                    Step {step.id} of 3 · {stepBadge(step.state)}
                    {current ? " · Do this next" : ""}
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
