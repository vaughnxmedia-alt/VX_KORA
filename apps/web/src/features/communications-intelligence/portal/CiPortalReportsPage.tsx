import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { ciApi } from "../api";
import { ciFriendlyError, monthLabel } from "../workspace";

export function CiPortalReportsPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;
  const search = params.toString() ? `?${params.toString()}` : "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "portal", "dashboard", user?.id, orgId],
    queryFn: () => ciApi.portal.loadDashboard(user!.id, orgId),
    enabled: Boolean(user?.id),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["ci", "portal", "reports", data?.organization.id],
    queryFn: () => ciApi.reports.list(data!.organization.id, { publishedOnly: true }),
    enabled: Boolean(data?.organization.id),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading published reports…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        {ciFriendlyError(error) || "Unable to load this organization."}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {data.organization.name}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
          Communications summaries
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Published monthly notes from JahKnowsPR. Drafts stay internal until they are ready.
        </p>
      </header>

      {reports.length ? (
        <ul className="space-y-3">
          {reports.map((item) => (
            <li key={item.id}>
              <Link
                to={{ pathname: `/portal/reports/${item.id}`, search }}
                className="block rounded-lg border border-border bg-background p-5 hover:border-primary"
              >
                <h2 className="font-serif text-xl font-bold">
                  {monthLabel(item.period_year, item.period_month)}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {item.executive_summary || "Open this month’s communications summary."}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-muted-foreground">
          No published communications summaries yet.
        </p>
      )}
    </div>
  );
}

export default CiPortalReportsPage;
