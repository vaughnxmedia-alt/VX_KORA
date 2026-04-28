import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, CalendarDays } from "lucide-react";

type Readiness = "HOT" | "WARM" | "COLD";

function ctaCopy(readiness: Readiness | null): string {
  if (readiness === "HOT") return "Your answers show urgency. Book the Strategy Session now if you want the fastest path from diagnosis to action.";
  if (readiness === "WARM") return "Your audit will clarify whether a Strategy Session is the right next step.";
  if (readiness === "COLD") return "Use the audit as feedback first. When you are ready, the Strategy Session turns it into a plan.";
  return "Your audit will help identify the positioning, presence, and conversion gaps to fix first.";
}

export default function FreeAuditThankYou() {
  const location = useLocation();
  const readiness = ((location.state as { readiness?: Readiness } | null)?.readiness ?? null) as Readiness | null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-7 px-6 py-20 text-center md:py-28">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">Audit Submitted</p>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">Your diagnosis is in review.</h1>
          <p className="text-lg text-muted-foreground md:text-xl">
            You will receive your Free Audit by email within <strong className="text-foreground">2 business days</strong>.
          </p>
        </div>

        <div className="grid w-full gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5 text-left">
            <Mail className="mb-3 h-6 w-6 text-gold" />
            <h2 className="font-semibold">Watch your inbox</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We review your answers, presence, audience clarity, and conversion gaps before sending the audit.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-5 text-left">
            <CalendarDays className="mb-3 h-6 w-6 text-gold" />
            <h2 className="font-semibold">Want to move faster?</h2>
            <p className="mt-2 text-sm text-muted-foreground">{ctaCopy(readiness)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/brand-strategy-session">Book Strategy Session</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/the-brief">Read The Brief</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
