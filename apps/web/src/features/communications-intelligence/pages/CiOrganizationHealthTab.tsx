import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ciApi } from "../api";
import { CI_EMPLOYEE_CHATGPT_PROMPT } from "../assessmentPrompt";
import {
  CI_ASSESSMENT_CATEGORIES,
  CI_ASSESSMENT_CATEGORY_LABELS,
  CI_ASSESSMENT_SECTION_STATUS_LABELS,
  CI_ASSESSMENT_SECTION_STATUSES,
  CI_LOOKED_SOURCE_LABELS,
  CI_LOOKED_SOURCES,
  type CiAssessmentSection,
  type CiAssessmentSectionCategory,
  type CiAssessmentSectionStatus,
  type CiAssessmentSectionWrite,
  type CiLookedSource,
} from "../assessmentTypes";
import { countFilledSections, sectionIsFilled } from "../assessmentHelpers";
import { ciFriendlyError, hasOrgProfile, type CiWorkspaceContext } from "../workspace";

function emptyForm(
  assessmentId: string,
  category: CiAssessmentSectionCategory,
): CiAssessmentSectionWrite {
  return {
    assessment_id: assessmentId,
    category,
    where_looked: [],
    what_observed: "",
    status_label: "not_enough_information",
    short_assessment: "",
    why_could_matter: "",
    potential_next_step: "",
    internal_score: null,
  };
}

function toForm(assessmentId: string, row: CiAssessmentSection | null, category: CiAssessmentSectionCategory) {
  if (!row) return emptyForm(assessmentId, category);
  return {
    assessment_id: assessmentId,
    category,
    where_looked: row.where_looked ?? [],
    what_observed: row.what_observed ?? "",
    status_label: row.status_label,
    short_assessment: row.short_assessment ?? "",
    why_could_matter: row.why_could_matter ?? "",
    potential_next_step: row.potential_next_step ?? "",
    internal_score: row.internal_score,
  };
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function CiOrganizationHealthTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CiAssessmentSectionCategory>("messaging");
  const [form, setForm] = useState<CiAssessmentSectionWrite | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const { data: assessment, isLoading: assessmentLoading } = useQuery({
    queryKey: ["ci", "assessment", "current", org.id],
    queryFn: () => ciApi.assessments.ensureForOrganization(org.id, user?.id),
  });

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["ci", "assessment", "sections", assessment?.id],
    queryFn: () => ciApi.assessments.listSections(assessment!.id),
    enabled: Boolean(assessment?.id),
  });

  const filled = countFilledSections(sections);
  const profileReady = hasOrgProfile(org);
  const allSectionsDone = filled >= CI_ASSESSMENT_CATEGORIES.length;
  const canGenerate = profileReady && allSectionsDone;

  const save = useMutation({
    mutationFn: async () => {
      if (!form || !assessment) throw new Error("Nothing to save.");
      if (!form.what_observed?.trim() && !form.short_assessment?.trim()) {
        throw new Error("Write what you observed, or a short assessment, before saving.");
      }
      return ciApi.assessments.upsertSection({
        ...form,
        assessed_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Section saved. Stick to what you actually observed.");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["ci", "assessment"] });
      void qc.invalidateQueries({ queryKey: ["ci", "workflow", org.id] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!assessment) throw new Error("No assessment yet.");
      await ciApi.assessments.syncProfileSnapshot(assessment.id, org.id);
      return ciApi.assessments.generateFindingsReport(assessment.id, user?.id);
    },
    onSuccess: () => {
      toast.success("Internal Findings Report ready to copy.");
      setReportOpen(true);
      void qc.invalidateQueries({ queryKey: ["ci", "assessment"] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  const cards = useMemo(
    () =>
      CI_ASSESSMENT_CATEGORIES.map((cat) => {
        const row = sections.find((s) => s.category === cat) ?? null;
        return { category: cat, row, filled: sectionIsFilled(row) };
      }),
    [sections],
  );

  const openEdit = (cat: CiAssessmentSectionCategory) => {
    if (!assessment) return;
    const row = sections.find((s) => s.category === cat) ?? null;
    setCategory(cat);
    setForm(toForm(assessment.id, row, cat));
    setOpen(true);
  };

  const toggleLooked = (source: CiLookedSource) => {
    if (!form) return;
    const current = form.where_looked ?? [];
    const next = current.includes(source)
      ? current.filter((item) => item !== source)
      : [...current, source];
    setForm({ ...form, where_looked: next });
  };

  if (assessmentLoading || isLoading) {
    return <p className="text-sm text-muted-foreground">Opening the internal assessment…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
          Communications Assessment · Step 2 of 3 · Internal only
        </p>
        <h2 className="font-serif text-xl font-bold mt-1">Internal Communications Assessment</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Document what you actually observe. Do not invent gaps. This section never appears in the
          client portal.
        </p>
        <p className="mt-2 text-sm">
          <Link
            className="underline underline-offset-4"
            to={`/hq/intelligence/organizations/${org.id}/overview`}
          >
            Organization profile
          </Link>
          {org.website ? (
            <>
              {" · "}
              <a
                className="underline underline-offset-4"
                href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                target="_blank"
                rel="noreferrer"
              >
                Website
              </a>
            </>
          ) : null}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background px-4 py-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">Progress</p>
        <p className="text-sm text-muted-foreground">
          {filled} of 6 sections documented.
          {!profileReady
            ? " Finish the organization profile before generating the findings report."
            : allSectionsDone
              ? " Ready to generate the Internal Findings Report for ChatGPT."
              : " Open each remaining section and write what you see."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!canGenerate || generate.isPending}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? "Generating…" : "Generate Internal Findings Report"}
          </Button>
          {assessment?.findings_report ? (
            <Button type="button" variant="outline" onClick={() => setReportOpen(true)}>
              Open Findings Report
            </Button>
          ) : null}
          {assessment?.findings_report ? (
            <Button asChild variant="ghost">
              <Link to={`/hq/intelligence/organizations/${org.id}/priorities`}>Go to Step 3</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {cards.map(({ category: cat, row, filled: done }) => (
          <article key={cat} className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg font-bold">
                  {CI_ASSESSMENT_CATEGORY_LABELS[cat]}
                </h3>
                <p className="mt-1 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  {row
                    ? CI_ASSESSMENT_SECTION_STATUS_LABELS[row.status_label]
                    : "Not Enough Information"}
                  {done ? " · Documented" : " · Not started"}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => openEdit(cat)}>
                Edit
              </Button>
            </div>
            {row?.what_observed ? (
              <p className="mt-3 text-sm leading-relaxed">{row.what_observed}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No observations written yet.</p>
            )}
          </article>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {CI_ASSESSMENT_CATEGORY_LABELS[category]}
            </DialogTitle>
            <DialogDescription>
              Write evidence-based notes. If you did not look somewhere, do not claim you did.
            </DialogDescription>
          </DialogHeader>
          {form ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Where we looked</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CI_LOOKED_SOURCES.map((source) => {
                    const checked = form.where_looked?.includes(source);
                    return (
                      <label
                        key={source}
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(checked)}
                          onChange={() => toggleLooked(source)}
                        />
                        {CI_LOOKED_SOURCE_LABELS[source]}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>What we observed</Label>
                <Textarea
                  rows={4}
                  value={form.what_observed ?? ""}
                  onChange={(e) => setForm({ ...form, what_observed: e.target.value })}
                  placeholder="Evidence only — what a stranger would see or hear."
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status_label}
                  onValueChange={(v) =>
                    setForm({ ...form, status_label: v as CiAssessmentSectionStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_ASSESSMENT_SECTION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {CI_ASSESSMENT_SECTION_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Short internal assessment</Label>
                <Textarea
                  rows={3}
                  value={form.short_assessment ?? ""}
                  onChange={(e) => setForm({ ...form, short_assessment: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Why this could matter</Label>
                <Textarea
                  rows={3}
                  value={form.why_could_matter ?? ""}
                  onChange={(e) => setForm({ ...form, why_could_matter: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Potential practical next step</Label>
                <Textarea
                  rows={3}
                  value={form.potential_next_step ?? ""}
                  onChange={(e) => setForm({ ...form, potential_next_step: e.target.value })}
                  placeholder="Internal suggestion only — not client-facing."
                />
              </div>
              <div className="space-y-2">
                <Label>Internal score (1–5, optional)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.internal_score ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      internal_score: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save section"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Internal Findings Report</DialogTitle>
            <DialogDescription>
              Internal only. Copy this into ChatGPT with the approved employee prompt. Do not send
              this report to the client.
            </DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-4 text-sm leading-relaxed">
            {assessment?.findings_report || "Generate the report first."}
          </pre>
          <div className="rounded-md border border-border px-4 py-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
              Next step
            </p>
            <p className="text-sm leading-relaxed">
              Copy this Internal Findings Report and paste it into the approved JahKnowsPR
              Communications Priorities prompt in ChatGPT.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!assessment?.findings_report}
                onClick={async () => {
                  if (!assessment?.findings_report) return;
                  await copyText(assessment.findings_report);
                  toast.success("Report copied.");
                }}
              >
                Copy Report
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await copyText(CI_EMPLOYEE_CHATGPT_PROMPT);
                  toast.success("Employee prompt copied.");
                }}
              >
                Copy Employee Prompt
              </Button>
              <Button asChild variant="ghost">
                <Link to={`/hq/intelligence/organizations/${org.id}/priorities`}>
                  Enter ChatGPT results in Step 3
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
