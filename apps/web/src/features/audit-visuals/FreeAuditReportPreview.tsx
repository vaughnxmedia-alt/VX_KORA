export type FreeAuditReportWarning = {
  severity: "info" | "warning" | "error";
  title: string;
  detail: string;
};

export type FreeAuditReportPreviewData = {
  auditId: string;
  businessName: string;
  contactName: string;
  recipient: string;
  subject: string;
  filename: string;
  generatedAt: string;
  readinessLevel: string;
  intentLabel: string;
  auditAngleLabel: string;
  executiveSummary: string;
  scores: Array<{
    key: string;
    label: string;
    value: number;
    summary: string;
  }>;
  sections: Array<{
    id: string;
    label: string;
    title: string;
    subtitle: string;
    scoreLabel: string;
    score: number;
    diagnosis: string;
    evidence: string[];
    whyItMatters: string;
    nextMove: string;
    cta: string;
  }>;
  warnings: FreeAuditReportWarning[];
  evidence: {
    growthGoal: string;
    currentBlocker: string;
    targetAudience: string;
    presence: string[];
    industry: string;
    aesthetic: string;
    recommendedVibe: string;
    socialHighlights?: string[];
    socialEvidenceCount?: number;
  };
};

function BrandPageShell({
  children,
  eyebrow,
}: {
  children: React.ReactNode;
  eyebrow: string;
}) {
  return (
    <article className="relative min-h-0 overflow-hidden rounded-2xl border border-[#D8C28B]/50 bg-[#F7F3EA] p-4 text-[#0A1A35] shadow-sm sm:min-h-[520px] sm:p-6 md:p-8">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 bg-[#E6C769]/35 sm:h-32 sm:w-32" />
      <div className="absolute bottom-0 left-0 h-2 w-full bg-[#0A1A35]" />
      <div className="relative z-10 flex min-h-0 flex-col sm:min-h-[456px]">
        <header className="flex items-start justify-between gap-3 border-b border-[#0A1A35]/15 pb-4 sm:gap-4 sm:pb-5">
          <div className="min-w-0">
            <p className="font-serif text-base font-black leading-none sm:text-lg">JAHKNOWSPR</p>
            <p className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.28em] text-[#0A1A35]/70 sm:tracking-[0.35em]">
              Firm
            </p>
          </div>
          <p className="max-w-[42%] shrink-0 text-right text-[0.58rem] font-semibold uppercase leading-snug tracking-[0.18em] text-[#6B5218] sm:max-w-[180px] sm:text-[0.62rem] sm:tracking-[0.28em]">
            {eyebrow}
          </p>
        </header>
        <div className="flex min-w-0 flex-1 flex-col justify-center py-4 sm:py-0">{children}</div>
        <footer className="pt-4 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-[#0A1A35]/70 sm:pt-5 sm:text-[0.65rem] sm:tracking-[0.28em]">
          JahKnowsPR Firm / Brand Diagnosis
        </footer>
      </div>
    </article>
  );
}

function ScoreRow({ label, value, summary }: { label: string; value: number; summary: string }) {
  const width = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em]">
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div className="h-3 rounded-full bg-[#0A1A35]/10">
        <div className="h-3 rounded-full bg-[#C59B3C]" style={{ width }} />
      </div>
      <p className="mt-1 break-words text-xs italic text-[#0A1A35]/75">{summary}</p>
    </div>
  );
}

export function FreeAuditReportPreview({
  report,
  variant = "default",
}: {
  report: FreeAuditReportPreviewData;
  variant?: "default" | "mobile";
}) {
  const containerClass =
    variant === "mobile"
      ? "space-y-4 overflow-x-hidden"
      : "max-h-[64vh] space-y-4 overflow-x-hidden overflow-y-auto pr-1 sm:pr-2";

  return (
    <div className={containerClass}>
      <BrandPageShell eyebrow="Cover">
        <div className="mx-auto w-full max-w-2xl text-center">
          <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[#8C6C27] sm:mb-4 sm:text-xs sm:tracking-[0.3em]">
            {report.auditAngleLabel}
          </p>
          <h2 className="break-words font-serif text-3xl font-bold leading-tight sm:text-5xl sm:leading-none md:text-7xl">
            {report.businessName} Diagnosis
          </h2>
          <div className="mx-auto mt-6 h-1 w-20 bg-[#C59B3C] sm:mt-8 sm:w-28" />
        </div>
      </BrandPageShell>

      <BrandPageShell eyebrow="Ratings">
        <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-8">
          <div className="min-w-0">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#8C6C27] sm:tracking-[0.3em]">
              Ratings Page
            </p>
            <h3 className="break-words font-serif text-2xl font-bold leading-tight sm:text-4xl">
              Brand Readiness Scores
            </h3>
            <p className="mt-4 break-words text-sm leading-6 text-[#0A1A35]/80">{report.executiveSummary}</p>
          </div>
          <div className="space-y-4">
            {report.scores.map((score) => (
              <ScoreRow key={score.key} label={score.label} value={score.value} summary={score.summary} />
            ))}
          </div>
        </div>
      </BrandPageShell>

      {report.evidence.socialHighlights?.length ? (
        <BrandPageShell eyebrow="Evidence">
          <div className="mx-auto w-full max-w-3xl min-w-0">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#8C6C27] sm:tracking-[0.3em]">
              Public Source Intelligence
            </p>
            <h3 className="break-words font-serif text-2xl font-bold leading-tight sm:text-4xl">
              Approved findings from Evidence Capture
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#0A1A35]/80 sm:mt-6 sm:leading-7">
              {report.evidence.socialHighlights.map((highlight) => (
                <li key={highlight} className="break-words rounded-2xl border border-[#0A1A35]/10 bg-white/70 p-3 sm:p-4">
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </BrandPageShell>
      ) : null}

      {report.sections.map((section) => (
        <BrandPageShell key={section.id} eyebrow={`Deliverable ${section.label}`}>
          <div className="grid gap-6 md:grid-cols-[0.75fr_1.25fr] md:items-start md:gap-8">
            <div className="min-w-0">
              <p className="text-4xl font-black leading-none text-[#8C6C27] sm:text-6xl">{section.label}</p>
              <h3 className="mt-3 break-words font-serif text-2xl font-bold leading-tight sm:mt-4 sm:text-4xl">
                {section.title}
              </h3>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#0A1A35]/65 sm:text-sm sm:tracking-[0.2em]">
                {section.scoreLabel} / {section.score}/100
              </p>
              <p className="mt-3 break-words text-sm leading-6 text-[#0A1A35]/80 sm:mt-4">{section.subtitle}</p>
            </div>
            <div className="min-w-0 space-y-4 sm:space-y-5">
              <div className="rounded-2xl border border-[#0A1A35]/10 bg-white/70 p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8C6C27] sm:tracking-[0.25em]">Diagnosis</p>
                <p className="mt-3 break-words text-sm leading-6 text-[#0A1A35]/80 sm:leading-7">{section.diagnosis}</p>
              </div>
              <div className="rounded-2xl border border-[#0A1A35]/10 bg-white/50 p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8C6C27] sm:tracking-[0.25em]">Evidence</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#0A1A35]/80">
                  {section.evidence.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C59B3C]" />
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8C6C27] sm:tracking-[0.25em]">Why It Matters</p>
                  <p className="mt-2 break-words text-sm leading-6 text-[#0A1A35]/80">{section.whyItMatters}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8C6C27] sm:tracking-[0.25em]">Next Move</p>
                  <p className="mt-2 break-words text-sm leading-6 text-[#0A1A35]/80">{section.nextMove}</p>
                </div>
              </div>
            </div>
          </div>
        </BrandPageShell>
      ))}
    </div>
  );
}
