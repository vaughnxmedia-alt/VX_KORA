import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { useHqAuth } from "@/features/hq/HqAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ciApi } from "../api";
import type { CiAdminNoteWithAuthor, CiOrganizationListItem } from "../types";

type WorkspaceContext = { org: CiOrganizationListItem };

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function authorLabel(note: CiAdminNoteWithAuthor) {
  return note.author_name || note.author_email || "JahKnowsPR staff";
}

export function CiOrganizationNotesTab() {
  const { org } = useOutletContext<WorkspaceContext>();
  const { user } = useAuth();
  const { hqRole } = useHqAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["ci", "notes", org.id],
    queryFn: () => ciApi.notes.listForOrganization(org.id),
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      if (!draft.trim()) throw new Error("Note cannot be empty");
      return ciApi.notes.create({
        organization_id: org.id,
        body: draft,
        created_by: user.id,
        entity_type: "organization",
      });
    },
    onSuccess: () => {
      setDraft("");
      void qc.invalidateQueries({ queryKey: ["ci", "notes", org.id] });
      toast.success("Note added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("Nothing to update");
      if (!editBody.trim()) throw new Error("Note cannot be empty");
      return ciApi.notes.update(editingId, editBody);
    },
    onSuccess: () => {
      setEditingId(null);
      setEditBody("");
      void qc.invalidateQueries({ queryKey: ["ci", "notes", org.id] });
      toast.success("Note updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => ciApi.notes.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ci", "notes", org.id] });
      toast.success("Note deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canEdit = (note: CiAdminNoteWithAuthor) =>
    Boolean(user?.id && note.created_by === user.id) || hqRole === "owner";

  const canDelete = (note: CiAdminNoteWithAuthor) =>
    Boolean(user?.id && note.created_by === user.id) || hqRole === "owner" || hqRole === "strategist";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-serif text-xl font-bold">Internal notes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visible only to JahKnowsPR staff. Never shown in the client portal.
        </p>
      </div>

      <form
        className="space-y-3 rounded-lg border border-border bg-background p-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Textarea
          rows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an internal note about this organization…"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={create.isPending || !draft.trim()}>
            {create.isPending ? "Saving…" : "Add note"}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading notes…</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-medium">{authorLabel(note)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(note.created_at)}</p>
                </div>
                <div className="flex gap-1">
                  {canEdit(note) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(note.id);
                        setEditBody(note.body);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  {canDelete(note) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (window.confirm("Delete this internal note?")) {
                          remove.mutate(note.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>

              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea rows={4} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setEditBody("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={update.isPending || !editBody.trim()}
                      onClick={() => update.mutate()}
                    >
                      {update.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.body}</p>
              )}
            </li>
          ))}
          {!notes.length ? (
            <li className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No internal notes yet.
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
