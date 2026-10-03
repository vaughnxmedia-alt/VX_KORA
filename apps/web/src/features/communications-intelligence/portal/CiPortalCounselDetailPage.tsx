import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { trackCiActivity } from "../activity";
import { ciApi } from "../api";
import { ciFriendlyError, formatCiDateTime } from "../workspace";
import {
  CI_COUNSEL_REQUEST_TYPE_LABELS,
  CI_COUNSEL_STATUS_LABELS,
  CI_COUNSEL_URGENCY_LABELS,
} from "../types";

export function CiPortalCounselDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const search = params.toString() ? `?${params.toString()}` : "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "portal", "counsel", requestId, user?.id],
    queryFn: () => ciApi.counsel.get(requestId!),
    enabled: Boolean(requestId && user?.id),
  });

  const { data: attachmentUrl } = useQuery({
    queryKey: ["ci", "counsel", "attachment", data?.attachment_path],
    queryFn: () => ciApi.counsel.signedAttachmentUrl(data!.attachment_path!),
    enabled: Boolean(data?.attachment_path),
  });

  useEffect(() => {
    const responseVisible = data?.status === "response_ready" || data?.status === "closed";
    if (!data || !responseVisible || !data.response) return;
    trackCiActivity({
      organization_id: data.organization_id,
      event_type: "counsel_response_viewed",
      entity_type: "counsel_request",
      entity_id: data.id,
    });
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading this request…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {ciFriendlyError(error) || "This request is not available."}
      </p>
    );
  }

  const responseVisible = data.status === "response_ready" || data.status === "closed";

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={{ pathname: "/portal/counsel", search }}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Back to counsel requests
        </Link>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data.organization_name || "Ask JahKnowsPR"}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold leading-tight">{data.subject}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {CI_COUNSEL_REQUEST_TYPE_LABELS[data.request_type]} · {CI_COUNSEL_URGENCY_LABELS[data.urgency]} ·{" "}
          {CI_COUNSEL_STATUS_LABELS[data.status]} · Submitted {formatCiDateTime(data.created_at)}
        </p>
      </div>

      <section className="rounded-lg border border-border bg-background p-5 space-y-4">
        <h2 className="font-serif text-xl font-bold">What you shared</h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.description}</p>
        {data.link_url ? (
          <p className="text-sm">
            <a href={data.link_url} className="text-primary underline" target="_blank" rel="noreferrer">
              {data.link_url}
            </a>
          </p>
        ) : null}
        {attachmentUrl ? (
          <a href={attachmentUrl} className="text-sm text-primary underline" target="_blank" rel="noreferrer">
            View attachment
          </a>
        ) : null}
        {data.opportunity_title || data.intelligence_title || data.action_title ? (
          <p className="text-xs text-muted-foreground">
            Related to{" "}
            {[data.opportunity_title, data.intelligence_title, data.action_title].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-background p-5 space-y-3">
        <h2 className="font-serif text-xl font-bold">JahKnowsPR response</h2>
        {responseVisible && data.response ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.response}</p>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            JahKnowsPR is reviewing your request.
          </p>
        )}
      </section>

      <Button variant="outline" asChild>
        <Link to={{ pathname: "/portal/counsel", search }}>All requests</Link>
      </Button>
    </div>
  );
}

export default CiPortalCounselDetailPage;
