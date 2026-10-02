import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { ciApi } from "../api";
import { ciFriendlyError, formatCiDateTime } from "../workspace";
import {
  CI_COUNSEL_REQUEST_TYPE_LABELS,
  CI_COUNSEL_STATUS_LABELS,
  CI_COUNSEL_URGENCY_LABELS,
} from "../types";

export function CiPortalCounselPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;
  const search = params.toString() ? `?${params.toString()}` : "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "portal", "counsel", user?.id, orgId],
    queryFn: () => ciApi.portal.loadCounsel(user!.id, orgId),
    enabled: Boolean(user?.id),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your counsel requests…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {ciFriendlyError(error) || "Unable to load this organization."}
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data.organization.name}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">Ask JahKnowsPR</h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Have a communications question, opportunity, issue, or situation that needs strategic
          review? Submit it here.
        </p>
        <Button asChild>
          <Link to={{ pathname: "/portal/counsel/new", search }}>Start a request for counsel</Link>
        </Button>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-bold">Your requests</h2>
        {data.requests.length ? (
          <div className="space-y-3">
            {data.requests
              .slice()
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .map((item) => (
                <article key={item.id} className="rounded-lg border border-border bg-background p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-xl font-bold leading-snug">{item.subject}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {CI_COUNSEL_REQUEST_TYPE_LABELS[item.request_type]} ·{" "}
                        {CI_COUNSEL_URGENCY_LABELS[item.urgency]} · Submitted{" "}
                        {formatCiDateTime(item.created_at)}
                      </p>
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                      {CI_COUNSEL_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  {item.response && (item.status === "response_ready" || item.status === "closed") ? (
                    <p className="mt-3 text-sm leading-relaxed text-foreground/90 line-clamp-3">
                      <span className="font-medium">JahKnowsPR response: </span>
                      {item.response}
                    </p>
                  ) : item.status === "closed" ? null : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      JahKnowsPR is reviewing your request.
                    </p>
                  )}
                  <Link
                    to={{ pathname: `/portal/counsel/${item.id}`, search }}
                    className="mt-4 inline-block text-sm text-primary underline underline-offset-4"
                  >
                    View request
                  </Link>
                </article>
              ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-muted-foreground">
            You have not submitted a request for counsel yet.
          </p>
        )}
      </section>
    </div>
  );
}

export default CiPortalCounselPage;
