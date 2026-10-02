import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
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
import { formatCiDateTime } from "../workspace";
import {
  CI_COUNSEL_REQUEST_TYPE_LABELS,
  CI_COUNSEL_STATUS_LABELS,
  CI_COUNSEL_STATUSES,
  CI_COUNSEL_URGENCY_LABELS,
  type CiCounselStatus,
} from "../types";

export function CiCounselRequestDetailPage({
  backTo,
}: {
  backTo?: string;
}) {
  const { requestId, orgId } = useParams<{ requestId: string; orgId?: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [response, setResponse] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "counsel", requestId],
    queryFn: async () => {
      const row = await ciApi.counsel.get(requestId!, { includeNotes: true });
      return row;
    },
    enabled: Boolean(requestId),
  });

  const { data: attachmentUrl } = useQuery({
    queryKey: ["ci", "counsel", "attachment", data?.attachment_path],
    queryFn: () => ciApi.counsel.signedAttachmentUrl(data!.attachment_path!),
    enabled: Boolean(data?.attachment_path),
  });

  const responseValue = response ?? data?.response ?? "";

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["ci", "counsel"] });
    if (data?.organization_id) {
      void qc.invalidateQueries({ queryKey: ["ci", "organizations", data.organization_id, "counts"] });
    }
  };

  const saveNote = useMutation({
    mutationFn: async () => {
      if (!data || !user?.id) throw new Error("Not signed in");
      if (!note.trim()) throw new Error("Note cannot be empty");
      return ciApi.notes.create({
        organization_id: data.organization_id,
        body: note,
        created_by: user.id,
        entity_type: "counsel_request",
        entity_id: data.id,
      });
    },
    onSuccess: () => {
      setNote("");
      toast.success("Internal note saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveResponse = useMutation({
    mutationFn: async () => {
      if (!data || !user?.id) throw new Error("Not signed in");
      if (!responseValue.trim()) throw new Error("Write the client-facing response first");
      await ciApi.counsel.saveResponse({
        requestId: data.id,
        organizationId: data.organization_id,
        body: responseValue,
        userId: user.id,
      });
    },
    onSuccess: () => {
      toast.success("Client-facing response saved. It stays private until you mark Response Ready.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: (status: CiCounselStatus) => ciApi.counsel.updateStatus(data!.id, status),
    onSuccess: () => {
      toast.success("Status updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fallbackBack = orgId
    ? `/hq/intelligence/organizations/${orgId}/counsel`
    : "/hq/intelligence/counsel";

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading request…</p>;
  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {(error as Error | undefined)?.message || "Request not found."}
      </p>
    );
  }

  const detailTo = orgId
    ? `/hq/intelligence/organizations/${orgId}/counsel/${data.id}`
    : `/hq/intelligence/counsel/${data.id}`;
  void detailTo;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link to={backTo || fallbackBack} className="text-sm text-muted-foreground hover:text-primary">
          Back to counsel requests
        </Link>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data.organization_name}
        </p>
        <h1 className="font-serif text-3xl font-bold leading-tight">{data.subject}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {CI_COUNSEL_REQUEST_TYPE_LABELS[data.request_type]} · {CI_COUNSEL_URGENCY_LABELS[data.urgency]} ·
          Submitted {formatCiDateTime(data.created_at)}
          {data.submitter_name ? ` by ${data.submitter_name}` : ""}
        </p>
      </div>

      <section className="rounded-lg border border-border bg-background p-5 space-y-3">
        <h2 className="font-serif text-xl font-bold">Client submission</h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.description}</p>
        {data.link_url ? (
          <a href={data.link_url} className="text-sm text-primary underline" target="_blank" rel="noreferrer">
            {data.link_url}
          </a>
        ) : null}
        {attachmentUrl ? (
          <a href={attachmentUrl} className="block text-sm text-primary underline" target="_blank" rel="noreferrer">
            View attachment
          </a>
        ) : null}
        {data.opportunity_title || data.intelligence_title || data.action_title ? (
          <p className="text-xs text-muted-foreground">
            Related:{" "}
            {[
              data.opportunity_title && `Opportunity — ${data.opportunity_title}`,
              data.intelligence_title && `Intelligence — ${data.intelligence_title}`,
              data.action_title && `Action — ${data.action_title}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-amber-200/70 bg-amber-50/40 p-5 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-900/70">
            Staff only
          </p>
          <h2 className="font-serif text-xl font-bold">Internal JahKnowsPR notes</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Clients cannot read this section.
          </p>
        </div>
        <div className="space-y-3">
          {(data.internal_notes ?? []).map((item) => (
            <article key={item.id} className="rounded-md border border-border bg-background p-3">
              <p className="text-sm whitespace-pre-wrap">{item.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.author_name || "Staff"} · {formatCiDateTime(item.created_at)}
              </p>
            </article>
          ))}
        </div>
        <Textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Private working notes…"
        />
        <Button type="button" variant="outline" onClick={() => saveNote.mutate()} disabled={saveNote.isPending}>
          {saveNote.isPending ? "Saving…" : "Add internal note"}
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-background p-5 space-y-3">
        <h2 className="font-serif text-xl font-bold">Client-facing response</h2>
        <p className="text-xs text-muted-foreground">
          The client sees this only after the status is Response Ready.
        </p>
        <Textarea
          rows={7}
          value={responseValue}
          onChange={(e) => setResponse(e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => saveResponse.mutate()} disabled={saveResponse.isPending}>
            {saveResponse.isPending ? "Saving…" : "Save response"}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-5 space-y-3">
        <Label>Status</Label>
        <Select
          value={data.status}
          onValueChange={(v) => updateStatus.mutate(v as CiCounselStatus)}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CI_COUNSEL_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {CI_COUNSEL_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2">
          {data.status !== "reviewing" && data.status !== "closed" ? (
            <Button type="button" variant="outline" onClick={() => updateStatus.mutate("reviewing")}>
              Mark reviewing
            </Button>
          ) : null}
          {data.status !== "response_ready" ? (
            <Button type="button" onClick={() => updateStatus.mutate("response_ready")}>
              Mark response ready
            </Button>
          ) : null}
          {data.status !== "closed" ? (
            <Button type="button" variant="outline" onClick={() => updateStatus.mutate("closed")}>
              Close request
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default CiCounselRequestDetailPage;
