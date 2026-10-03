import { formatCiDate, monthLabel } from "./workspace";
import type { CiMonthlyReport } from "./types";

const SECTIONS: { key: keyof CiMonthlyReport; label: string }[] = [
  { key: "executive_summary", label: "Executive Summary" },
  { key: "needed_attention", label: "What Needed Attention" },
  { key: "opportunities", label: "Opportunities Identified" },
  { key: "actions_taken", label: "Actions Taken" },
  { key: "health", label: "Communications Health" },
  { key: "outcomes", label: "Outcomes" },
  { key: "next_priorities", label: "Priorities for Next Month" },
  { key: "counsel", label: "Strategic Counsel" },
];

export function MonthlyReportView({
  report,
  organizationName,
}: {
  report: CiMonthlyReport;
  organizationName: string;
}) {
  return (
    <article className="ci-print-report space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          JahKnowsPR · Communications Intelligence
        </p>
        <h1 className="font-serif text-3xl font-bold leading-tight">
          {monthLabel(report.period_year, report.period_month)}
        </h1>
        <p className="text-sm text-muted-foreground">{organizationName}</p>
        {report.published_at ? (
          <p className="text-xs text-muted-foreground">Published {formatCiDate(report.published_at)}</p>
        ) : null}
      </header>
      {SECTIONS.map((section) => {
        const body = report[section.key];
        if (typeof body !== "string" || !body.trim()) return null;
        return (
          <section key={section.key} className="space-y-2">
            <h2 className="font-serif text-xl font-bold">{section.label}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
          </section>
        );
      })}
    </article>
  );
}
