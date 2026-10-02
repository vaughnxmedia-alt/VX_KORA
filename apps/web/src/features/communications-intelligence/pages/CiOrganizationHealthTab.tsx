import { useState } from "react";
import { useOutletContext } from "react-router-dom";
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
import {
  dateInputToIso,
  formatCiDate,
  healthRowsByCategory,
  healthSummaryPhrases,
  intelligenceDraftFromHealth,
  toDateInputValue,
  type CiWorkspaceContext,
} from "../workspace";
import {
  CI_HEALTH_CATEGORY_LABELS,
  CI_HEALTH_STATUS_LABELS,
  CI_HEALTH_STATUSES,
  CI_INTELLIGENCE_CATEGORY_LABELS,
  type CiHealthCategory,
  type CiHealthCheck,
  type CiHealthStatus,
  type CiHealthWriteInput,
  type CiIntelligenceWriteInput,
} from "../types";

function emptyForm(organizationId: string, category: CiHealthCategory): CiHealthWriteInput {
  return {
    organization_id: organizationId,
    category,
    status_label: "not_assessed",
    score: null,
    explanation: "",
    why_it_matters: "",
    recommended_improvement: "",
    assessed_at: null,
  };
}

function toForm(organizationId: string, category: CiHealthCategory, row: CiHealthCheck | null): CiHealthWriteInput {
  if (!row) return emptyForm(organizationId, category);
  return {
    organization_id: organizationId,
    category,
    status_label: row.status_label ?? "not_assessed",
    score: row.score,
    explanation: row.explanation ?? "",
    why_it_matters: row.why_it_matters ?? "",
    recommended_improvement: row.recommended_improvement ?? "",
    assessed_at: row.assessed_at,
  };
}

export function CiOrganizationHealthTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const [category, setCategory] = useState<CiHealthCategory>("messaging");
  const [form, setForm] = useState<CiHealthWriteInput>(emptyForm(org.id, "messaging"));
  const [intelForm, setIntelForm] = useState<CiIntelligenceWriteInput | null>(null);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["ci", "health", org.id],
    queryFn: () => ciApi.health.listForOrganization(org.id),
  });

  const cards = healthRowsByCategory(rows);
  const summary = healthSummaryPhrases(rows);

  const save = useMutation({
    mutationFn: async () => {
      const score = form.score == null ? null : Number(form.score);
      if (score != null && (score < 0 || score > 100 || Number.isNaN(score))) {
        throw new Error("Score must be between 0 and 100, or left blank.");
      }
      return ciApi.health.upsert({
        ...form,
        organization_id: org.id,
        score,
        assessed_by: user?.id ?? null,
        assessed_at: dateInputToIso(toDateInputValue(form.assessed_at) || toDateInputValue(new Date().toISOString())),
      });
    },
    onSuccess: () => {
      toast.success("Health check updated");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["ci", "health", org.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createIntel = useMutation({
    mutationFn: async () => {
      if (!intelForm?.title.trim()) throw new Error("Title is required");
      return ciApi.intelligence.create({
        ...intelForm,
        organization_id: org.id,
        created_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast.success("Intelligence item created — review it in the Intelligence tab");
      setIntelOpen(false);
      setIntelForm(null);
      void qc.invalidateQueries({ queryKey: ["ci", "intelligence", org.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (nextCategory: CiHealthCategory, row: CiHealthCheck | null) => {
    setCategory(nextCategory);
    setForm(toForm(org.id, nextCategory, row));
    setOpen(true);
  };

  const openIntel = (nextCategory: CiHealthCategory, row: CiHealthCheck | null, status: CiHealthStatus) => {
    setIntelForm(intelligenceDraftFromHealth(org.id, nextCategory, row, status));
    setIntelOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold">Communications Health Check</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          A written read of how this organization is communicating — not a grade.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">Summary</p>
        {summary.length ? (
          <ul className="mt-2 space-y-1">
            {summary.map((phrase) => (
              <li key={phrase} className="font-serif text-lg">
                {phrase}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">All six areas are not assessed yet.</p>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map(({ category: cat, row, status }) => (
            <article key={cat} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg font-bold">{CI_HEALTH_CATEGORY_LABELS[cat]}</h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    {CI_HEALTH_STATUS_LABELS[status]}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(cat, row)}>
                    Edit
                  </Button>
                  {status === "needs_attention" || status === "high_priority" ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => openIntel(cat, row, status)}>
                      Create Intelligence Item
                    </Button>
                  ) : null}
                </div>
              </div>
              {row?.explanation ? (
                <p className="mt-3 text-sm leading-relaxed">{row.explanation}</p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No assessment written yet.</p>
              )}
              {row?.recommended_improvement ? (
                <p className="mt-3 text-sm leading-relaxed">
                  <span className="font-medium">Recommended improvement: </span>
                  {row.recommended_improvement}
                </p>
              ) : null}
              <p className="mt-4 text-xs text-muted-foreground">
                {row?.assessed_at
                  ? `Last reviewed ${formatCiDate(row.assessed_at)}${row.reviewer_name ? ` · ${row.reviewer_name}` : ""}`
                  : "Not reviewed yet"}
              </p>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {CI_HEALTH_CATEGORY_LABELS[category]}
            </DialogTitle>
            <DialogDescription>
              Clients will see the assessment and recommended improvement. The number is optional and stays secondary.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status_label ?? "not_assessed"}
                  onValueChange={(v) => setForm({ ...form, status_label: v as CiHealthStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_HEALTH_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {CI_HEALTH_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Last reviewed</Label>
                <Input
                  type="date"
                  value={toDateInputValue(form.assessed_at)}
                  onChange={(e) => setForm({ ...form, assessed_at: e.target.value || null })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Short assessment</Label>
              <Textarea
                rows={4}
                value={form.explanation ?? ""}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                placeholder="What is true about this area right now?"
              />
            </div>
            <div className="space-y-2">
              <Label>Why this matters</Label>
              <Textarea
                rows={3}
                value={form.why_it_matters ?? ""}
                onChange={(e) => setForm({ ...form, why_it_matters: e.target.value })}
                placeholder="Why should the organization care?"
              />
            </div>
            <div className="space-y-2">
              <Label>Recommended improvement</Label>
              <Textarea
                rows={3}
                value={form.recommended_improvement ?? ""}
                onChange={(e) => setForm({ ...form, recommended_improvement: e.target.value })}
                placeholder="The next practical step."
              />
            </div>
            <div className="space-y-2">
              <Label>Internal score (optional)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.score ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    score: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Staff-only context. Not shown as a grade in the client portal.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save assessment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={intelOpen} onOpenChange={setIntelOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Create Intelligence Item</DialogTitle>
            <DialogDescription>
              Review this draft before it appears in the Intelligence tab and client portal.
            </DialogDescription>
          </DialogHeader>
          {intelForm ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createIntel.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={intelForm.title}
                  onChange={(e) => setIntelForm({ ...intelForm, title: e.target.value })}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Category: {CI_INTELLIGENCE_CATEGORY_LABELS[intelForm.category]}
              </p>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={intelForm.description ?? ""}
                  onChange={(e) => setIntelForm({ ...intelForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Why it matters</Label>
                <Textarea
                  rows={3}
                  value={intelForm.why_it_matters ?? ""}
                  onChange={(e) => setIntelForm({ ...intelForm, why_it_matters: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Recommended action</Label>
                <Textarea
                  rows={3}
                  value={intelForm.recommended_action ?? ""}
                  onChange={(e) => setIntelForm({ ...intelForm, recommended_action: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIntelOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createIntel.isPending}>
                  {createIntel.isPending ? "Creating…" : "Create item"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
