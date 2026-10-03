import { useMemo, useState, type ReactNode } from "react";
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
import {
  actionDraftFromOpportunity,
  emptyActionDraft,
  endOfWeek,
  formatCiDate,
  startOfToday,
  toDateInputValue,
} from "../workspace";
import type { CiWorkspaceContext } from "../workspace";
import {
  CI_ACTIVE_OPPORTUNITY_STATUSES,
  CI_OPPORTUNITY_STATUS_LABELS,
  CI_OPPORTUNITY_STATUSES,
  CI_OPPORTUNITY_TYPE_LABELS,
  CI_OPPORTUNITY_TYPES,
  CI_PRIORITY_LABELS,
  CI_PRIORITIES,
  type CiOpportunity,
  type CiOpportunityStatus,
  type CiOpportunityType,
  type CiOpportunityWriteInput,
  type CiPriority,
} from "../types";

const emptyOpportunity = (organizationId: string): CiOpportunityWriteInput => ({
  organization_id: organizationId,
  title: "",
  opportunity_type: "media",
  description: "",
  why_it_matters: "",
  recommended_action: "",
  source: "",
  source_url: "",
  deadline: null,
  priority: "medium",
  status: "new",
});

function toForm(item: CiOpportunity): CiOpportunityWriteInput {
  return {
    organization_id: item.organization_id,
    title: item.title,
    opportunity_type: item.opportunity_type,
    description: item.description ?? "",
    why_it_matters: item.why_it_matters ?? "",
    recommended_action: item.recommended_action ?? "",
    source: item.source ?? "",
    source_url: item.source_url ?? "",
    deadline: item.deadline,
    priority: item.priority,
    status: item.status,
  };
}

function Section({
  title,
  empty,
  children,
  count,
}: {
  title: string;
  empty: string;
  children: ReactNode;
  count: number;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-serif text-lg font-bold">
        {title}
        <span className="ml-2 text-sm font-normal text-muted-foreground">{count}</span>
      </h3>
      {count ? children : (
        <p className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  );
}

function OpportunityCard({
  item,
  onEdit,
  onCreateAction,
  onExpire,
}: {
  item: CiOpportunity;
  onEdit: () => void;
  onCreateAction: () => void;
  onExpire: () => void;
}) {
  return (
    <article className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            className="text-left font-serif text-lg font-bold leading-snug text-primary hover:underline"
            onClick={onEdit}
          >
            {item.title}
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            {CI_OPPORTUNITY_TYPE_LABELS[item.opportunity_type]} · {CI_PRIORITY_LABELS[item.priority]} ·{" "}
            {CI_OPPORTUNITY_STATUS_LABELS[item.status]}
            {item.deadline ? ` · Deadline ${formatCiDate(item.deadline)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCreateAction}>
            Create Action
          </Button>
          {item.status !== "expired" && item.status !== "completed" && item.status !== "passed" ? (
            <Button type="button" variant="ghost" size="sm" onClick={onExpire}>
              Mark expired
            </Button>
          ) : null}
        </div>
      </div>
      {item.why_it_matters ? (
        <p className="mt-3 text-sm leading-relaxed">{item.why_it_matters}</p>
      ) : item.description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      ) : null}
      {item.recommended_action ? (
        <p className="mt-3 text-sm leading-relaxed">
          <span className="font-medium">Recommended: </span>
          {item.recommended_action}
        </p>
      ) : null}
    </article>
  );
}

export function CiOrganizationOpportunitiesTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<CiOpportunityType | "all">("all");
  const [status, setStatus] = useState<CiOpportunityStatus | "all">("all");
  const [priority, setPriority] = useState<CiPriority | "all">("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState<CiOpportunity | null>(null);
  const [form, setForm] = useState<CiOpportunityWriteInput>(emptyOpportunity(org.id));
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSource, setActionSource] = useState<CiOpportunity | null>(null);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["ci", "opportunities", org.id, type, status, priority],
    queryFn: () => ciApi.opportunities.list(org.id, { type, status, priority }),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["ci", "members", org.id],
    queryFn: () => ciApi.members.listForOrganization(org.id),
  });
  const { data: intelligenceItems = [] } = useQuery({
    queryKey: ["ci", "intelligence", org.id, "all", "all", "all"],
    queryFn: () => ciApi.intelligence.list(org.id),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["ci", "opportunities", org.id] });
    void qc.invalidateQueries({ queryKey: ["ci", "organizations", org.id, "counts"] });
    void qc.invalidateQueries({ queryKey: ["ci", "workflow", org.id] });
    void qc.invalidateQueries({ queryKey: ["ci", "ops"] });
  };

  const grouped = useMemo(() => {
    const today = startOfToday();
    const weekEnd = endOfWeek();
    const active = items.filter((item) => CI_ACTIVE_OPPORTUNITY_STATUSES.includes(item.status));
    const upcoming = [...active]
      .filter((item) => {
        if (!item.deadline) return false;
        const due = new Date(`${item.deadline.slice(0, 10)}T00:00:00`);
        return due >= today && due <= weekEnd;
      })
      .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
    const recent = [...items]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);
    const closed = items.filter((item) =>
      item.status === "completed" || item.status === "passed" || item.status === "expired",
    );
    return { active, upcoming, recent, closed };
  }, [items]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      if (editingId) return ciApi.opportunities.update(editingId, form);
      return ciApi.opportunities.create({
        ...form,
        organization_id: org.id,
        created_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast.success(editingId ? "Opportunity updated" : "Opportunity created");
      setOpen(false);
      setEditingId(null);
      setEditingMeta(null);
      setForm(emptyOpportunity(org.id));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const expire = useMutation({
    mutationFn: (id: string) => ciApi.opportunities.update(id, { status: "expired" }),
    onSuccess: () => {
      toast.success("Opportunity marked expired");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setEditingMeta(null);
    setForm(emptyOpportunity(org.id));
    setOpen(true);
  };

  const openEdit = (item: CiOpportunity) => {
    setEditingId(item.id);
    setEditingMeta(item);
    setForm(toForm(item));
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold">Opportunities</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add media, visibility, partnership, speaking, community, or storytelling openings worth
            acting on.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Opportunity
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={type} onValueChange={(v) => setType(v as CiOpportunityType | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CI_OPPORTUNITY_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {CI_OPPORTUNITY_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as CiOpportunityStatus | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CI_OPPORTUNITY_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {CI_OPPORTUNITY_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as CiPriority | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {CI_PRIORITIES.map((value) => (
              <SelectItem key={value} value={value}>
                {CI_PRIORITY_LABELS[value]}
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
          <Section
            title="Active Opportunities"
            empty="No active communications opportunities right now."
            count={grouped.active.length}
          >
            <div className="space-y-3">
              {grouped.active.map((item) => (
                <OpportunityCard
                  key={item.id}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onCreateAction={() => {
                    setActionSource(item);
                    setActionOpen(true);
                  }}
                  onExpire={() => expire.mutate(item.id)}
                />
              ))}
            </div>
          </Section>
          <Section
            title="Upcoming Deadlines"
            empty="No deadlines are approaching this week."
            count={grouped.upcoming.length}
          >
            <div className="space-y-3">
              {grouped.upcoming.map((item) => (
                <OpportunityCard
                  key={`deadline-${item.id}`}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onCreateAction={() => {
                    setActionSource(item);
                    setActionOpen(true);
                  }}
                  onExpire={() => expire.mutate(item.id)}
                />
              ))}
            </div>
          </Section>
          <Section
            title="Recently Added"
            empty="No opportunities yet. Add the first one when you have a real opening."
            count={grouped.recent.length}
          >
            <div className="space-y-3">
              {grouped.recent.map((item) => (
                <OpportunityCard
                  key={`recent-${item.id}`}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onCreateAction={() => {
                    setActionSource(item);
                    setActionOpen(true);
                  }}
                  onExpire={() => expire.mutate(item.id)}
                />
              ))}
            </div>
          </Section>
          <Section
            title="Completed / Passed"
            empty="No completed or passed opportunities yet."
            count={grouped.closed.length}
          >
            <div className="space-y-3">
              {grouped.closed.map((item) => (
                <OpportunityCard
                  key={`closed-${item.id}`}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onCreateAction={() => {
                    setActionSource(item);
                    setActionOpen(true);
                  }}
                  onExpire={() => expire.mutate(item.id)}
                />
              ))}
            </div>
          </Section>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {editingId ? "Edit opportunity" : "New opportunity"}
            </DialogTitle>
            <DialogDescription>
              Clients can see this in the portal. They cannot create opportunities.
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
                <Label>Type</Label>
                <Select
                  value={form.opportunity_type}
                  onValueChange={(v) => setForm({ ...form, opportunity_type: v as CiOpportunityType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_OPPORTUNITY_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {CI_OPPORTUNITY_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority ?? "medium"}
                  onValueChange={(v) => setForm({ ...form, priority: v as CiPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_PRIORITIES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {CI_PRIORITY_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status ?? "new"}
                  onValueChange={(v) => setForm({ ...form, status: v as CiOpportunityStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_OPPORTUNITY_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {CI_OPPORTUNITY_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={toDateInputValue(form.deadline)}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value || null })}
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
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Input
                  value={form.source ?? ""}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Source URL</Label>
                <Input
                  type="url"
                  value={form.source_url ?? ""}
                  onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                />
              </div>
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
                {save.isPending ? "Saving…" : editingId ? "Save changes" : "Create opportunity"}
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
          actionSource ? actionDraftFromOpportunity(org.id, actionSource) : emptyActionDraft(org.id)
        }
        members={members}
        opportunities={items}
        intelligenceItems={intelligenceItems}
        sourceLabel={actionSource ? `“${actionSource.title}”` : null}
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ["ci", "actions", org.id] });
          void qc.invalidateQueries({ queryKey: ["ci", "organizations", org.id, "counts"] });
        }}
      />
    </div>
  );
}
