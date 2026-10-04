import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { useHqAuth } from "@/features/hq/HqAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ciApi } from "../api";
import {
  CI_PRIORITY_LEVEL_LABELS,
  CI_PRIORITY_LEVELS,
  CI_RECOMMENDED_SERVICE_LABELS,
  CI_RECOMMENDED_SERVICES,
  CI_STEP3_STATUS_LABELS,
  CI_SUPPORT_TYPE_LABELS,
  CI_SUPPORT_TYPES,
  type CiCommunicationPriorityWrite,
  type CiPriorityLevel,
  type CiRecommendedService,
  type CiSupportType,
} from "../assessmentTypes";
import { ciFriendlyError, type CiWorkspaceContext } from "../workspace";

function emptyPriority(sortOrder: number): CiCommunicationPriorityWrite {
  return {
    assessment_id: "",
    sort_order: sortOrder,
    title: "",
    priority_level: "strengthen_next",
    what_we_noticed: "",
    why_it_matters: "",
    recommendation: "",
    next_practical_step: "",
    support_type: "internal",
    recommended_service: null,
  };
}

export function CiOrganizationPrioritiesTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const { user } = useAuth();
  const { hqRole } = useHqAuth();
  const qc = useQueryClient();
  const canApprove = hqRole === "owner" || hqRole === "strategist";

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["ci", "assessment", "current", org.id],
    queryFn: () => ciApi.assessments.ensureForOrganization(org.id, user?.id),
  });

  const { data: savedPriorities = [] } = useQuery({
    queryKey: ["ci", "assessment", "priorities", assessment?.id],
    queryFn: () => ciApi.assessments.listPriorities(assessment!.id),
    enabled: Boolean(assessment?.id),
  });

  const [priorities, setPriorities] = useState<CiCommunicationPriorityWrite[]>([emptyPriority(1)]);
  const [recommendedOrder, setRecommendedOrder] = useState("");
  const [overallDirection, setOverallDirection] = useState("");

  useEffect(() => {
    if (!assessment) return;
    setRecommendedOrder(assessment.recommended_order ?? "");
    setOverallDirection(assessment.overall_direction ?? "");
  }, [assessment?.id, assessment?.recommended_order, assessment?.overall_direction]);

  useEffect(() => {
    if (!assessment) return;
    if (!savedPriorities.length) {
      setPriorities([{ ...emptyPriority(1), assessment_id: assessment.id }]);
      return;
    }
    setPriorities(
      savedPriorities.map((row) => ({
        assessment_id: assessment.id,
        sort_order: row.sort_order,
        title: row.title,
        priority_level: row.priority_level,
        what_we_noticed: row.what_we_noticed ?? "",
        why_it_matters: row.why_it_matters ?? "",
        recommendation: row.recommendation ?? "",
        next_practical_step: row.next_practical_step ?? "",
        support_type: row.support_type,
        recommended_service: row.recommended_service,
      })),
    );
  }, [assessment?.id, savedPriorities]);

  const save = useMutation({
    mutationFn: (submitForReview: boolean) => {
      if (!assessment) throw new Error("No assessment yet.");
      return ciApi.assessments.savePriorities({
        assessment_id: assessment.id,
        priorities: priorities.map((item, index) => ({
          ...item,
          assessment_id: assessment.id,
          sort_order: index + 1,
        })),
        recommended_order: recommendedOrder,
        overall_direction: overallDirection,
        submit_for_review: submitForReview,
      });
    },
    onSuccess: (_data, submitForReview) => {
      toast.success(
        submitForReview
          ? "Submitted for strategist/owner review."
          : "Draft saved. Not visible to the client yet.",
      );
      void qc.invalidateQueries({ queryKey: ["ci", "assessment"] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  const setStatus = useMutation({
    mutationFn: (status: "under_review" | "approved" | "delivered" | "draft") => {
      if (!assessment) throw new Error("No assessment yet.");
      if ((status === "approved" || status === "delivered") && !canApprove) {
        throw new Error("Only a Strategist or Owner can approve or deliver this report.");
      }
      return ciApi.assessments.setStep3Status({
        assessment_id: assessment.id,
        status,
        actor_id: user?.id ?? null,
      });
    },
    onSuccess: (row) => {
      toast.success(`Status updated to ${CI_STEP3_STATUS_LABELS[row.step3_status]}.`);
      void qc.invalidateQueries({ queryKey: ["ci", "assessment"] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  const updatePriority = (index: number, patch: Partial<CiCommunicationPriorityWrite>) => {
    setPriorities((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  if (isLoading || !assessment) {
    return <p className="text-sm text-muted-foreground">Opening recommendations…</p>;
  }

  const locked = assessment.step3_status === "approved" || assessment.step3_status === "delivered";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
          Communications Assessment · Step 3 of 3 · Client-facing after approval
        </p>
        <h2 className="font-serif text-xl font-bold mt-1">
          Communications Priorities & Recommendations
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Paste the reviewed ChatGPT output into these structured fields. Nothing here is
          client-visible until a Strategist or Owner approves it.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">
          Status · {CI_STEP3_STATUS_LABELS[assessment.step3_status]}
        </p>
        <p className="mt-2 text-sm">
          <Link
            className="underline underline-offset-4"
            to={`/hq/intelligence/organizations/${org.id}/health`}
          >
            Back to Internal Findings / ChatGPT handoff
          </Link>
        </p>
      </div>

      <div className="space-y-6">
        {priorities.map((item, index) => (
          <article key={index} className="rounded-xl border border-border bg-background p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif text-lg font-bold">Priority {index + 1}</h3>
              {!locked && priorities.length > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPriorities((rows) => rows.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Priority title</Label>
              <Input
                value={item.title}
                disabled={locked}
                onChange={(e) => updatePriority(index, { title: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority level</Label>
                <Select
                  value={item.priority_level}
                  disabled={locked}
                  onValueChange={(v) =>
                    updatePriority(index, { priority_level: v as CiPriorityLevel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_PRIORITY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {CI_PRIORITY_LEVEL_LABELS[level]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Support type</Label>
                <Select
                  value={item.support_type}
                  disabled={locked}
                  onValueChange={(v) => updatePriority(index, { support_type: v as CiSupportType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_SUPPORT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {CI_SUPPORT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>What we noticed</Label>
              <Textarea
                rows={3}
                disabled={locked}
                value={item.what_we_noticed ?? ""}
                onChange={(e) => updatePriority(index, { what_we_noticed: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Why it matters</Label>
              <Textarea
                rows={3}
                disabled={locked}
                value={item.why_it_matters ?? ""}
                onChange={(e) => updatePriority(index, { why_it_matters: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Our recommendation</Label>
              <Textarea
                rows={3}
                disabled={locked}
                value={item.recommendation ?? ""}
                onChange={(e) => updatePriority(index, { recommendation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Next practical step</Label>
              <Textarea
                rows={3}
                disabled={locked}
                value={item.next_practical_step ?? ""}
                onChange={(e) => updatePriority(index, { next_practical_step: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Recommended JahKnowsPR service (optional)</Label>
              <Select
                value={item.recommended_service ?? "none"}
                disabled={locked}
                onValueChange={(v) =>
                  updatePriority(index, {
                    recommended_service: v === "none" ? null : (v as CiRecommendedService),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CI_RECOMMENDED_SERVICES.map((service) => (
                    <SelectItem key={service} value={service}>
                      {CI_RECOMMENDED_SERVICE_LABELS[service]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </article>
        ))}
      </div>

      {!locked && priorities.length < 5 ? (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setPriorities((rows) => [
              ...rows,
              { ...emptyPriority(rows.length + 1), assessment_id: assessment.id },
            ])
          }
        >
          <Plus className="h-4 w-4 mr-1" />
          Add priority
        </Button>
      ) : null}

      <div className="space-y-2">
        <Label>Recommended order of action</Label>
        <Textarea
          rows={3}
          disabled={locked}
          value={recommendedOrder}
          onChange={(e) => setRecommendedOrder(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Overall communications direction</Label>
        <Textarea
          rows={4}
          disabled={locked}
          value={overallDirection}
          onChange={(e) => setOverallDirection(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {!locked ? (
          <>
            <Button type="button" variant="outline" disabled={save.isPending} onClick={() => save.mutate(false)}>
              {save.isPending ? "Saving…" : "Save draft"}
            </Button>
            <Button type="button" disabled={save.isPending} onClick={() => save.mutate(true)}>
              Submit for review
            </Button>
          </>
        ) : null}
        {canApprove && assessment.step3_status === "under_review" ? (
          <Button type="button" onClick={() => setStatus.mutate("approved")}>
            Approve for client
          </Button>
        ) : null}
        {canApprove && assessment.step3_status === "approved" ? (
          <Button type="button" onClick={() => setStatus.mutate("delivered")}>
            Mark delivered
          </Button>
        ) : null}
        {canApprove && locked ? (
          <Button type="button" variant="outline" onClick={() => setStatus.mutate("draft")}>
            Reopen as draft
          </Button>
        ) : null}
      </div>
    </div>
  );
}
