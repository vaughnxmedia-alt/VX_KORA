import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ciApi } from "../api";
import { ciFriendlyError, formatRelativeActivity } from "../workspace";
import { CiAddClientDialog } from "./CiAddClientDialog";

export function CiOpsDashboardPage() {
  const [addOpen, setAddOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "ops", "summary"],
    queryFn: () => ciApi.ops.summary(),
  });

  return (
    <div className="space-y-10 max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
            JahKnowsPR
          </p>
          <h1 className="font-serif text-3xl font-bold">What do I need to work on today?</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Start with the next client who needs you. You do not need to pick a module first.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Add Client
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Looking across your clients…</p> : null}
      {error ? <p className="text-sm text-destructive">{ciFriendlyError(error)}</p> : null}

      {data ? (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-bold">Needs your attention</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Client questions, overdue work, upcoming deadlines, and updates waiting on you.
              </p>
            </div>
            {data.today_items.length ? (
              <ul className="space-y-3">
                {data.today_items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                        {item.organization_name}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed">{item.reason}</p>
                    </div>
                    <Button asChild className="shrink-0">
                      <Link to={item.href}>{item.cta}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-background/70 px-4 py-8 text-sm text-muted-foreground">
                Nothing is waiting on you right now. Use the client list below to continue setup or
                open a workspace.
              </p>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-bold">Clients</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Open a client to follow the setup from profile to preview.
              </p>
            </div>
            {data.clients.length ? (
              <ul className="space-y-3">
                {data.clients.map((client) => (
                  <li key={client.id}>
                    <Link
                      to={client.href}
                      className="block rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/40"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="font-serif text-xl font-bold leading-snug">{client.name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{client.stage}</p>
                          <p className="mt-2 text-sm leading-relaxed">{client.attention}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Last activity · {formatRelativeActivity(client.last_activity)}
                          </p>
                        </div>
                        <span className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                          {client.cta}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-background/70 px-4 py-8 text-sm text-muted-foreground">
                No clients yet. Use Add Client to create the first one. The workspace will tell you
                what to gather next.
              </p>
            )}
          </section>

          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer text-foreground">More tools</summary>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              <Link to="/hq/intelligence/assessments" className="text-primary underline underline-offset-4">
                Assessments
              </Link>
              <Link to="/hq/intelligence/organizations" className="text-primary underline underline-offset-4">
                All clients
              </Link>
              <Link to="/hq/intelligence/counsel" className="text-primary underline underline-offset-4">
                Client questions
              </Link>
              <Link to="/hq/intelligence/pilot" className="text-primary underline underline-offset-4">
                Pilot
              </Link>
              <Link to="/hq/intelligence/learning" className="text-primary underline underline-offset-4">
                Learning
              </Link>
            </div>
          </details>
        </>
      ) : null}

      <CiAddClientDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
