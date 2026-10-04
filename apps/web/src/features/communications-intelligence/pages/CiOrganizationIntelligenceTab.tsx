import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { CiActionDraftDialog } from "./CiActionDraftDialog";
import { actionDraftFromIntelligence, emptyActionDraft, formatCiDate } from "../workspace";
import type { CiWorkspaceContext } from "../workspace";
import {
  CI_INTELLIGENCE_CATEGORIES,
  CI_INTELLIGENCE_CATEGORY_LABELS,
  CI_INTELLIGENCE_PRIORITIES,
  CI_INTELLIGENCE_PRIORITY_LABELS,
  CI_INTELLIGENCE_STATUS_LABELS,
  CI_INTELLIGENCE_STATUSES,
  type CiIntelligenceCategory,
  type CiIntelligenceItem,
  type CiIntelligencePriority,
  type CiIntelligenceStatus,
  type CiIntelligenceWriteInput,
} from "../types";

const emptyItem = (organizationId: string): CiIntelligenceWriteInput => ({
  organization_id: organizationId,
  title: "",
  category: "needs_attention",
  description: "",
  why_it_matters: "",
  recommended_action: "",
  priority: "medium",
  status: "new",
  due_date: null,
});

function toForm(item: CiIntelligenceItem): CiIntelligenceWriteInput {
  return {
    organization_id: item.organization_id,
    title: item.title,
    category: item.category,
    description: item.description ?? "",
    why_it_matters: item.why_it_matters ?? "",
    recommended_action: item.recommended_action ?? "",
    priority: item.priority,
    status: item.status,
    due_date: item.due_date,
  };
}

export function CiOrganizationIntelligenceTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState<CiIntelligenceCategory | "all">("all");
  const [priority, setPriority] = useState<CiIntelligencePriority | "all">("all");
  const [status, setStatus] = useState<CiIntelligenceStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState<CiIntelligenceItem | null>(null);
  const [form, setForm] = useState<CiIntelligenceWriteInput>(emptyItem(org.id));
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSource, setActionSource] = useState<CiIntelligenceItem | null>(null);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["ci", "intelligence", org.id, category, priority, status],
    queryFn: () => ciApi.intelligence.list(org.id, { category, priority, status }),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["ci", "members", org.id],
    queryFn: () => ciApi.members.listForOrganization(org.id),
  });
  const { data: opportunities = [] } = useQuery({
    queryKey: ["ci", "opportunities", org.id, "all", "all", "all"],
    queryFn: () => ciApi.opportunities.list(org.id),
  });
  const { data: allIntelligence = [] } = useQuery({
    queryKey: ["ci", "intelligence", org.id, "all", "all", "all"],
    queryFn: () => ciApi.intelligence.list(org.id),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["ci", "intelligence", org.id] });
    void qc.invalidateQueries({ queryKey: ["ci", "organizations", org.id, "counts"] });
    void qc.invalidateQueries({ queryKey: ["ci", "workflow", org.id] });
    void qc.invalidateQueries({ queryKey: ["ci", "ops"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      if (editingId) {
        return ciApi.intelligence.update(editingId, form);
      }
      return ciApi.intelligence.create({
        ...form,
        organization_id: org.id,
        created_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast.success(editingId ? "Recommendation updated" : "Recommendation added");
      setOpen(false);
      setEditingId(null);
      setEditingMeta(null);
      setForm(emptyItem(org.id));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => ciApi.intelligence.update(id, { status: "dismissed" }),
    onSuccess: () => {
      toast.success("Item dismissed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setEditingMeta(null);
    setForm(emptyItem(org.id));
    setOpen(true);
  };

  const openEdit = (item: CiIntelligenceItem) => {
    setEditingId(item.id);
    setEditingMeta(item);
    setForm(toForm(item));
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
            Communications Assessment · Step 3 of 3
          </p>
          <h2 className="font-serif text-xl font-bold mt-1">
            Communications Priorities & Recommendations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Turn internal findings into a client-facing recommendations draft. AI can help draft,
            but a JahKnowsPR strategist or owner must review and approve before it is shared.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Recommendation
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={category} onValueChange={(v) => setCategory(v as CiIntelligenceCategory | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CI_INTELLIGENCE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CI_INTELLIGENCE_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as CiIntelligencePriority | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {CI_INTELLIGENCE_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {CI_INTELLIGENCE_PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as CiIntelligenceStatus | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CI_INTELLIGENCE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {CI_INTELLIGENCE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-3 py-2 font-medium text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border align-top">
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="text-left font-medium text-primary hover:underline"
                      onClick={() => openEdit(item)}
                    >
                      {item.title}
                    </button>
                    {item.recommended_action ? (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {item.recommended_action}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {CI_INTELLIGENCE_CATEGORY_LABELS[item.category]}
                  </td>
                  <td className="px-3 py-3">{CI_INTELLIGENCE_PRIORITY_LABELS[item.priority]}</td>
                  <td className="px-3 py-3">{CI_INTELLIGENCE_STATUS_LABELS[item.status]}</td>
                  <td className="px-3 py-3 text-muted-foreground">{formatCiDate(item.due_date)}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(item)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActionSource(item);
                        setActionOpen(true);
                      }}
                    >
                      Create Action
                    </Button>
                    {item.status !== "dismissed" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => dismiss.mutate(item.id)}
                      >
                        Dismiss
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    No recommendations match these filters. Add one to tell the client what matters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {editingId ? "Edit recommendation" : "Add recommendation"}
            </DialogTitle>
            <DialogDescription>
              This will appear in the client portal for {org.name}. Clients can view it, not edit it.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as CiIntelligenceCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_INTELLIGENCE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CI_INTELLIGENCE_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority ?? "medium"}
                  onValueChange={(v) => setForm({ ...form, priority: v as CiIntelligencePriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_INTELLIGENCE_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {CI_INTELLIGENCE_PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status ?? "new"}
                  onValueChange={(v) => setForm({ ...form, status: v as CiIntelligenceStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_INTELLIGENCE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {CI_INTELLIGENCE_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.due_date ?? ""}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Why it matters</Label>
              <Textarea
                rows={3}
                value={form.why_it_matters ?? ""}
                onChange={(e) => setForm({ ...form, why_it_matters: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Recommended action</Label>
              <Textarea
                rows={3}
                value={form.recommended_action ?? ""}
                onChange={(e) => setForm({ ...form, recommended_action: e.target.value })}
              />
            </div>
            {editingMeta ? (
              <p className="text-xs text-muted-foreground">
                Created {formatCiDate(editingMeta.created_at)}
                {editingMeta.created_by ? " by staff" : ""}
                {" · "}
                Updated {formatCiDate(editingMeta.updated_at)}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : editingId ? "Save changes" : "Create item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CiActionDraftDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        organizationId={org.id}
        initial={
          actionSource ? actionDraftFromIntelligence(org.id, actionSource) : emptyActionDraft(org.id)
        }
        members={members}
        opportunities={opportunities}
        intelligenceItems={allIntelligence.length ? allIntelligence : items}
        sourceLabel={actionSource ? `“${actionSource.title}”` : null}
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ["ci", "actions", org.id] });
          void qc.invalidateQueries({ queryKey: ["ci", "organizations", org.id, "counts"] });
        }}
      />
    </div>
  );
}
