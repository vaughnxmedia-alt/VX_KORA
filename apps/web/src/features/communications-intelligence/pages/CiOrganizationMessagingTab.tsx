import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus } from "lucide-react";
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
import { copyCiText, formatCiDate, type CiWorkspaceContext } from "../workspace";
import {
  CI_MESSAGING_ENTRY_LABELS,
  CI_MESSAGING_ENTRY_TYPES,
  CI_MESSAGING_STATUS_LABELS,
  CI_MESSAGING_STATUSES,
  type CiMessagingEntry,
  type CiMessagingEntryType,
  type CiMessagingStatus,
  type CiMessagingWriteInput,
} from "../types";

const emptyEntry = (organizationId: string): CiMessagingWriteInput => ({
  organization_id: organizationId,
  entry_type: "organization_description",
  title: "",
  body: "",
  status: "draft",
  admin_notes: "",
});

export function CiOrganizationMessagingTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CiMessagingWriteInput>(emptyEntry(org.id));
  const [typeFilter, setTypeFilter] = useState<CiMessagingEntryType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<CiMessagingStatus | "all">("all");

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ["ci", "messaging", org.id],
    queryFn: () => ciApi.messaging.listForOrganization(org.id),
  });

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        if (typeFilter !== "all" && entry.entry_type !== typeFilter) return false;
        if (statusFilter !== "all" && entry.status !== statusFilter) return false;
        return true;
      }),
    [entries, typeFilter, statusFilter],
  );

  const groupedTypes =
    typeFilter === "all" ? CI_MESSAGING_ENTRY_TYPES : ([typeFilter] as CiMessagingEntryType[]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["ci", "messaging", org.id] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.body.trim()) throw new Error("The language itself is required");
      if (editingId) {
        return ciApi.messaging.update(editingId, {
          ...form,
          updated_by: user?.id ?? null,
        });
      }
      return ciApi.messaging.create({
        ...form,
        organization_id: org.id,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast.success(editingId ? "Messaging updated" : "Messaging added");
      setOpen(false);
      setEditingId(null);
      setForm(emptyEntry(org.id));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CiMessagingStatus }) =>
      ciApi.messaging.update(id, { status, updated_by: user?.id ?? null }),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.status === "approved"
          ? "Approved — clients can use this now"
          : vars.status === "archived"
            ? "Archived — hidden from the portal"
            : "Moved back to draft",
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = (entryType?: CiMessagingEntryType) => {
    setEditingId(null);
    setForm({
      ...emptyEntry(org.id),
      entry_type: entryType ?? "organization_description",
    });
    setOpen(true);
  };

  const openEdit = (entry: CiMessagingEntry) => {
    setEditingId(entry.id);
    setForm({
      organization_id: org.id,
      entry_type: entry.entry_type,
      title: entry.title ?? "",
      body: entry.body,
      status: entry.status ?? (entry.is_published ? "approved" : "draft"),
      admin_notes: entry.admin_notes ?? "",
    });
    setOpen(true);
  };

  const copy = async (text: string) => {
    try {
      await copyCiText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy that text");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold">Approved language</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Words this organization can use in public. Clients only see approved entries.
          </p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4 mr-1" />
          New entry
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as CiMessagingEntryType | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CI_MESSAGING_ENTRY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {CI_MESSAGING_ENTRY_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CiMessagingStatus | "all")}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CI_MESSAGING_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {CI_MESSAGING_STATUS_LABELS[status]}
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
          {groupedTypes.map((type) => {
            const group = filtered.filter((entry) => entry.entry_type === type);
            if (typeFilter !== "all" && !group.length) {
              return (
                <p key={type} className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                  No {CI_MESSAGING_ENTRY_LABELS[type].toLowerCase()} matches these filters.
                </p>
              );
            }
            return (
              <section key={type} className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-serif text-lg font-bold">{CI_MESSAGING_ENTRY_LABELS[type]}</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => openCreate(type)}>
                    Add
                  </Button>
                </div>
                {group.length ? (
                  <div className="space-y-3">
                    {group.map((entry) => (
                      <article key={entry.id} className="rounded-lg border border-border bg-background p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium">{entry.title || "Untitled"}</h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {CI_MESSAGING_STATUS_LABELS[entry.status ?? "draft"]}
                              {" · "}
                              Updated {formatCiDate(entry.updated_at)}
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-end gap-1">
                            {entry.status === "approved" ? (
                              <Button type="button" variant="ghost" size="sm" onClick={() => void copy(entry.body)}>
                                <Copy className="h-3.5 w-3.5 mr-1" />
                                Copy
                              </Button>
                            ) : null}
                            {entry.status !== "approved" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatus.mutate({ id: entry.id, status: "approved" })}
                              >
                                Approve
                              </Button>
                            ) : null}
                            {entry.status !== "archived" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatus.mutate({ id: entry.id, status: "archived" })}
                              >
                                Archive
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatus.mutate({ id: entry.id, status: "draft" })}
                              >
                                Restore draft
                              </Button>
                            )}
                            <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(entry)}>
                              Edit
                            </Button>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{entry.body}</p>
                        {entry.admin_notes ? (
                          <p className="mt-3 text-xs text-muted-foreground">Staff note: {entry.admin_notes}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                    No {CI_MESSAGING_ENTRY_LABELS[type].toLowerCase()} yet.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {editingId ? "Edit messaging" : "New messaging"}
            </DialogTitle>
            <DialogDescription>
              Write the words {org.name} can reuse. Only Approved entries appear in the client portal.
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
                <Label>Type</Label>
                <Select
                  value={form.entry_type}
                  onValueChange={(v) => setForm({ ...form, entry_type: v as CiMessagingEntryType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_MESSAGING_ENTRY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {CI_MESSAGING_ENTRY_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status ?? "draft"}
                  onValueChange={(v) => setForm({ ...form, status: v as CiMessagingStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CI_MESSAGING_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {CI_MESSAGING_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Short label, e.g. Website description"
              />
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                className="min-h-[16rem] font-sans text-sm leading-relaxed"
                rows={14}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Internal staff note</Label>
              <Textarea
                rows={3}
                value={form.admin_notes ?? ""}
                onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
                placeholder="Not shown to the client."
              />
              <p className="text-xs text-muted-foreground">
                Stored separately from the public language so clients cannot read it.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : editingId ? "Save changes" : "Add entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
