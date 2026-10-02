import { useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ciApi } from "../api";
import { formatCiDateTime } from "../workspace";
import type { CiWorkspaceContext } from "../workspace";
import {
  CI_COUNSEL_REQUEST_TYPE_LABELS,
  CI_COUNSEL_STATUS_LABELS,
  CI_COUNSEL_URGENCY_LABELS,
  CI_COUNSEL_URGENCY_RANK,
} from "../types";

export function CiOrganizationCounselTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["ci", "counsel", org.id],
    queryFn: () => ciApi.counsel.list({ organizationId: org.id }),
  });

  const open = items
    .filter((item) => item.status === "submitted" || item.status === "reviewing")
    .sort((a, b) => {
      const urgency = CI_COUNSEL_URGENCY_RANK[a.urgency] - CI_COUNSEL_URGENCY_RANK[b.urgency];
      return urgency || a.created_at.localeCompare(b.created_at);
    });
  const rest = items.filter((item) => item.status === "response_ready" || item.status === "closed");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold">Counsel requests</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Strategic questions this organization has asked JahKnowsPR to review.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="font-serif text-lg font-bold">Needs review</h3>
            {open.length ? (
              open.map((item) => (
                <article key={item.id} className="rounded-lg border border-border bg-background p-4">
                  <Link
                    to={`/hq/intelligence/organizations/${org.id}/counsel/${item.id}`}
                    className="font-serif text-lg font-bold text-primary hover:underline"
                  >
                    {item.subject}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {CI_COUNSEL_REQUEST_TYPE_LABELS[item.request_type]} ·{" "}
                    {CI_COUNSEL_URGENCY_LABELS[item.urgency]} · {CI_COUNSEL_STATUS_LABELS[item.status]} ·{" "}
                    {formatCiDateTime(item.created_at)}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No open requests for counsel.</p>
            )}
          </section>
          {rest.length ? (
            <section className="space-y-3">
              <h3 className="font-serif text-lg font-bold">Ready or closed</h3>
              {rest.map((item) => (
                <article key={item.id} className="rounded-lg border border-border bg-background p-4">
                  <Link
                    to={`/hq/intelligence/organizations/${org.id}/counsel/${item.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {item.subject}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {CI_COUNSEL_STATUS_LABELS[item.status]} · {formatCiDateTime(item.updated_at)}
                  </p>
                </article>
              ))}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default CiOrganizationCounselTab;
