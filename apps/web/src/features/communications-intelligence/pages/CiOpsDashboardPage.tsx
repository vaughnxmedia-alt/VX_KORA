import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ciApi } from "../api";
import { ciFriendlyError, formatCiDate } from "../workspace";

export function CiOpsDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "ops", "summary"],
    queryFn: () => ciApi.ops.summary(),
  });

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          Communications Intelligence
        </p>
        <h1 className="font-serif text-3xl font-bold">Operations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What needs JahKnowsPR attention across organizations.
        </p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading the operational picture…</p> : null}
      {error ? <p className="text-sm text-destructive">{ciFriendlyError(error)}</p> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat to="/hq/intelligence/organizations" label="Organizations" value={data.organizations} />
            <Stat to="/hq/intelligence/organizations" label="Need attention" value={data.needing_attention} />
            <Stat to="/hq/intelligence/counsel" label="New counsel" value={data.new_counsel} />
            <Stat to="/hq/intelligence/counsel" label="Waiting for response" value={data.waiting_response} />
            <Stat label="High / urgent items" value={data.high_intelligence} />
            <Stat label="Overdue actions" value={data.overdue_actions} />
            <Stat label="Upcoming deadlines" value={data.upcoming_deadlines} />
          </div>

          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold">Organizations needing attention</h2>
            {data.attention_orgs.length ? (
              <ul className="space-y-2 text-sm">
                {data.attention_orgs.map((org) => (
                  <li key={org.id}>
                    <Link
                      to={`/hq/intelligence/organizations/${org.id}`}
                      className="text-primary underline underline-offset-4"
                    >
                      {org.name}
                    </Link>
                    <span className="text-muted-foreground"> — {org.reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No organizations currently need operational follow-up.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold">High or urgent intelligence</h2>
            {data.high_items.length ? (
              <ul className="space-y-2 text-sm">
                {data.high_items.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/hq/intelligence/organizations/${item.organization_id}/intelligence`}
                      className="text-primary underline underline-offset-4"
                    >
                      {item.title}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      — {item.organization_name} · {item.priority}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No high or urgent items are open.</p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold">Overdue client actions</h2>
            {data.overdue_action_rows.length ? (
              <ul className="space-y-2 text-sm">
                {data.overdue_action_rows.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/hq/intelligence/organizations/${item.organization_id}/actions`}
                      className="text-primary underline underline-offset-4"
                    >
                      {item.title}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      — {item.organization_name}
                      {item.due_date ? ` · ${formatCiDate(item.due_date)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No client actions are overdue.</p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold">Upcoming opportunity deadlines</h2>
            {data.upcoming_opportunity_rows.length ? (
              <ul className="space-y-2 text-sm">
                {data.upcoming_opportunity_rows.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/hq/intelligence/organizations/${item.organization_id}/opportunities`}
                      className="text-primary underline underline-offset-4"
                    >
                      {item.title}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      — {item.organization_name}
                      {item.deadline ? ` · ${formatCiDate(item.deadline)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No opportunity deadlines in the next two weeks.</p>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap justify-between gap-3">
              <h2 className="font-serif text-xl font-bold">Counsel requests</h2>
              <Link to="/hq/intelligence/counsel" className="text-sm text-primary underline underline-offset-4">
                View all counsel requests
              </Link>
            </div>
            {data.counsel_rows.length ? (
              <ul className="space-y-2 text-sm">
                {data.counsel_rows.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/hq/intelligence/counsel/${item.id}`}
                      className="text-primary underline underline-offset-4"
                    >
                      {item.subject}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      — {item.organization_name} · {item.status} · {item.urgency}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No counsel requests are waiting.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  to,
}: {
  label: string;
  value: number;
  to?: string;
}) {
  const inner = (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold text-primary">{value}</p>
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default CiOpsDashboardPage;
