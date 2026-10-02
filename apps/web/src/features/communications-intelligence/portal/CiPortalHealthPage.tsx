import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { AskCounselLink } from "../AskCounselLink";
import { ciApi } from "../api";
import { ciFriendlyError, counselDraftFromHealth, formatCiDate, healthRowsByCategory, healthSummaryPhrases } from "../workspace";
import { CI_HEALTH_CATEGORY_LABELS, CI_HEALTH_STATUS_LABELS } from "../types";

export function CiPortalHealthPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "portal", "health", user?.id, orgId],
    queryFn: () => ciApi.portal.loadHealth(user!.id, orgId),
    enabled: Boolean(user?.id),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your communications health check…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {ciFriendlyError(error) || "Unable to load this organization."}
      </p>
    );
  }

  const cards = healthRowsByCategory(data.checks);
  const summary = healthSummaryPhrases(data.checks);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data.organization.name}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
          How your communications are doing.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          A plain-language read from JahKnowsPR — what is working, what needs care, and what to do next.
        </p>
      </header>

      <div className="space-y-1">
        {summary.map((phrase) => (
          <p key={phrase} className="font-serif text-xl leading-snug">
            {phrase}
          </p>
        ))}
      </div>

      <div className="space-y-5">
        {cards.map(({ category, row, status }) => (
          <article key={category} className="rounded-lg border border-border bg-background p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
              {CI_HEALTH_CATEGORY_LABELS[category]}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-bold">
              {CI_HEALTH_CATEGORY_LABELS[category]} — {CI_HEALTH_STATUS_LABELS[status]}
            </h2>
            {row?.explanation ? (
              <p className="mt-4 text-sm leading-relaxed">{row.explanation}</p>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                This area has not been assessed yet.
              </p>
            )}
            {row?.why_it_matters ? (
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">{row.why_it_matters}</p>
            ) : null}
            {row?.recommended_improvement ? (
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Recommended improvement
                </p>
                <p className="mt-2 text-sm leading-relaxed">{row.recommended_improvement}</p>
              </div>
            ) : null}
            {row?.assessed_at ? (
              <p className="mt-5 text-xs text-muted-foreground">
                Last reviewed {formatCiDate(row.assessed_at)}
              </p>
            ) : null}
            {status === "needs_attention" || status === "high_priority" ? (
              <div className="mt-4">
                <AskCounselLink
                  prefill={counselDraftFromHealth(category, row)}
                  search={params.toString() ? `?${params.toString()}` : ""}
                >
                  Ask JahKnowsPR
                </AskCounselLink>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

export default CiPortalHealthPage;
