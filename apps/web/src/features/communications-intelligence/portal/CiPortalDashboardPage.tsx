import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { AskCounselLink } from "../AskCounselLink";
import { ciApi } from "../api";
import {
  ciFriendlyError,
  counselDraftFromIntelligence,
  endOfWeek,
  formatCiDate,
  healthRowsByCategory,
  healthSummaryPhrases,
  startOfToday,
} from "../workspace";
import {
  CI_ACTIVE_OPPORTUNITY_STATUSES,
  CI_HEALTH_CATEGORY_LABELS,
  CI_HEALTH_STATUS_LABELS,
  CI_INTELLIGENCE_CATEGORY_LABELS,
  CI_INTELLIGENCE_PRIORITY_LABELS,
  CI_INTELLIGENCE_PRIORITY_RANK,
  CI_OPPORTUNITY_STATUS_LABELS,
  type CiCounselRequest,
  type CiHealthCheck,
  type CiIntelligenceItem,
  type CiOpportunity,
} from "../types";

function sortByPriority(a: CiIntelligenceItem, b: CiIntelligenceItem) {
  const rank = CI_INTELLIGENCE_PRIORITY_RANK[a.priority] - CI_INTELLIGENCE_PRIORITY_RANK[b.priority];
  if (rank !== 0) return rank;
  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
  if (a.due_date) return -1;
  if (b.due_date) return 1;
  return b.updated_at.localeCompare(a.updated_at);
}

function parseDue(value: string | null) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ItemCard({ item, search }: { item: CiIntelligenceItem; search: string }) {
  return (
    <article className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg font-bold leading-snug">{item.title}</h3>
        <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {CI_INTELLIGENCE_PRIORITY_LABELS[item.priority]}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {CI_INTELLIGENCE_CATEGORY_LABELS[item.category]}
        {item.due_date ? ` · Due ${formatCiDate(item.due_date)}` : ""}
      </p>
      {item.why_it_matters ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{item.why_it_matters}</p>
      ) : item.description ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{item.description}</p>
      ) : null}
      {item.recommended_action ? (
        <p className="mt-3 text-sm leading-relaxed">
          <span className="font-medium">Recommended: </span>
          {item.recommended_action}
        </p>
      ) : null}
      {item.category === "needs_attention" ||
      item.category === "opportunity" ||
      item.category === "crisis_readiness" ||
      item.category === "reputation" ? (
        <div className="mt-3">
          <AskCounselLink prefill={counselDraftFromIntelligence(item)} search={search}>
            Ask JahKnowsPR
          </AskCounselLink>
        </div>
      ) : null}
    </article>
  );
}

function HealthSummary({ checks, search }: { checks: CiHealthCheck[]; search: string }) {
  const cards = healthRowsByCategory(checks);
  const phrases = healthSummaryPhrases(checks);
  const flagged = cards.filter(
    (card) => card.status === "needs_attention" || card.status === "high_priority" || card.status === "not_assessed",
  ).slice(0, 3);

  return (
    <section className="rounded-lg border border-border bg-background p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
            Communications Health
          </p>
          {phrases.length ? (
            <p className="mt-2 font-serif text-xl leading-snug">{phrases.join(". ")}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Health has not been reviewed yet.</p>
          )}
        </div>
        <Link to={{ pathname: "/portal/health", search }} className="text-sm text-primary underline underline-offset-4">
          View communications health
        </Link>
      </div>
      {flagged.length ? (
        <ul className="space-y-1 text-sm">
          {flagged.map((card) => (
            <li key={card.category}>
              {CI_HEALTH_CATEGORY_LABELS[card.category]} — {CI_HEALTH_STATUS_LABELS[card.status]}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function OpenOpportunitiesSummary({
  opportunities,
  search,
}: {
  opportunities: CiOpportunity[];
  search: string;
}) {
  const active = opportunities.filter((item) => CI_ACTIVE_OPPORTUNITY_STATUSES.includes(item.status));
  const top = [...active]
    .sort((a, b) => {
      const rank = (a.priority === "urgent" ? 0 : a.priority === "high" ? 1 : a.priority === "medium" ? 2 : 3)
        - (b.priority === "urgent" ? 0 : b.priority === "high" ? 1 : b.priority === "medium" ? 2 : 3);
      if (rank !== 0) return rank;
      return (a.deadline || "9999").localeCompare(b.deadline || "9999");
    })
    .slice(0, 3);

  return (
    <section className="rounded-lg border border-border bg-background p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
            Open Opportunities
          </p>
          <p className="mt-2 font-serif text-xl leading-snug">
            {active.length
              ? `${active.length} ${active.length === 1 ? "opportunity is" : "opportunities are"} open.`
              : "No active communications opportunities right now."}
          </p>
        </div>
        <Link
          to={{ pathname: "/portal/opportunities", search }}
          className="text-sm text-primary underline underline-offset-4"
        >
          View all opportunities
        </Link>
      </div>
      {top.length ? (
        <ul className="space-y-2 text-sm">
          {top.map((item) => (
            <li key={item.id}>
              <span className="font-medium">{item.title}</span>
              <span className="text-muted-foreground">
                {" "}
                · {CI_OPPORTUNITY_STATUS_LABELS[item.status]}
                {item.deadline ? ` · ${formatCiDate(item.deadline)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function CounselSummary({
  requests,
  search,
}: {
  requests: CiCounselRequest[];
  search: string;
}) {
  const open = requests.filter((item) => item.status === "submitted" || item.status === "reviewing");
  return (
    <section className="rounded-lg border border-border bg-background p-5 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
        Strategic Counsel
      </p>
      <p className="font-serif text-xl leading-snug">
        {open.length
          ? `${open.length} ${open.length === 1 ? "request is" : "requests are"} currently under review.`
          : "No requests are currently under review."}
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link to={{ pathname: "/portal/counsel", search }} className="text-primary underline underline-offset-4">
          View requests
        </Link>
        <Link to={{ pathname: "/portal/counsel/new", search }} className="text-primary underline underline-offset-4">
          Ask JahKnowsPR
        </Link>
      </div>
    </section>
  );
}

function Section({
  title,
  empty,
  items,
  search,
  moreTo,
  moreLabel,
}: {
  title: string;
  empty: string;
  items: CiIntelligenceItem[];
  search: string;
  moreTo?: string;
  moreLabel?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl font-bold">{title}</h2>
        {moreTo && moreLabel ? (
          <Link to={{ pathname: moreTo, search }} className="text-sm text-primary underline underline-offset-4">
            {moreLabel}
          </Link>
        ) : null}
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} search={search} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  );
}

export function CiPortalDashboardPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "portal", "dashboard", user?.id, orgId],
    queryFn: () => ciApi.portal.loadDashboard(user!.id, orgId),
    enabled: Boolean(user?.id),
  });

  const derived = useMemo(() => {
    const items = data?.items ?? [];
    const today = startOfToday();
    const weekEnd = endOfWeek();

    const needsAttention = items.filter((i) => i.category === "needs_attention");
    const recommended = items.filter((i) => Boolean(i.recommended_action?.trim()));

    const thisWeek = items
      .filter((i) => {
        const due = parseDue(i.due_date);
        if (due && due >= today && due <= weekEnd) return true;
        if (!due && (i.priority === "urgent" || i.priority === "high")) return true;
        return false;
      })
      .sort(sortByPriority)
      .slice(0, 6);

    const upcomingDates = items
      .filter((i) => {
        const due = parseDue(i.due_date);
        return due && due >= today;
      })
      .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
      .slice(0, 4);

    const recommendedActions = [...recommended].sort(sortByPriority).slice(0, 5);

    return {
      needsAttention,
      thisWeek,
      upcomingDates,
      recommendedActions,
    };
  }, [data?.items]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your communications brief…</p>;
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
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data.organization.name}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
          Here is what needs your attention.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          A calm read of the communications issues, opportunities, and next moves JahKnowsPR is watching
          for you.
        </p>
      </header>

      <Section
        title="Priority This Week"
        empty="Nothing needs your attention this week."
        search={params.toString() ? `?${params.toString()}` : ""}
        items={derived.thisWeek}
      />
      <Section
        title="Needs Attention"
        empty="No urgent communication issues right now."
        search={params.toString() ? `?${params.toString()}` : ""}
        items={derived.needsAttention.slice(0, 4)}
      />
      <Section
        title="Recommended Actions"
        empty="You're caught up. There are no recommended actions right now."
        items={derived.recommendedActions}
        search={params.toString() ? `?${params.toString()}` : ""}
        moreTo="/portal/actions"
        moreLabel="View all actions"
      />
      <OpenOpportunitiesSummary
        opportunities={data.opportunities ?? []}
        search={params.toString() ? `?${params.toString()}` : ""}
      />
      <Section
        title="Upcoming"
        empty="No upcoming communications moments have been flagged."
        items={derived.upcomingDates}
        search={params.toString() ? `?${params.toString()}` : ""}
      />
      <HealthSummary
        checks={data.checks ?? []}
        search={params.toString() ? `?${params.toString()}` : ""}
      />
      <CounselSummary
        requests={data.counsel ?? []}
        search={params.toString() ? `?${params.toString()}` : ""}
      />
    </div>
  );
}

export default CiPortalDashboardPage;
