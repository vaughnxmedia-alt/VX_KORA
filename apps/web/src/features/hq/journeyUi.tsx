import { cn } from "@/lib/utils";
import { JOURNEY_STATUS_LABELS, type JourneyStatus } from "./types";

const STATUS_CLASS: Record<JourneyStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  awaiting_client: "bg-amber-100 text-amber-950",
  internal_review: "bg-gold/20 text-gold-dark",
  blocked: "bg-red-100 text-red-800",
  completed: "bg-emerald-100 text-emerald-900",
  on_hold: "bg-slate-200 text-slate-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export function JourneyStatusBadge({ status }: { status: JourneyStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_CLASS[status])}>
      {JOURNEY_STATUS_LABELS[status]}
    </span>
  );
}

export function migrationHint(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/does not exist|schema cache|hq_engagements|hq_journey_templates/i.test(message)) {
    return "Apply apps/web/supabase/migrations/20261015220000_hq_client_journeys.sql in the Supabase SQL editor, then refresh.";
  }
  return message || "Something went wrong loading journeys.";
}
