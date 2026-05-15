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
    <article className="relative min-h-[520px] overflow-hidden rounded-2xl border border-[#D8C28B]/50 bg-[#F7F3EA] p-8 text-[#0A1A35] shadow-sm">
      <div className="absolute right-0 top-0 h-32 w-32 bg-[#E6C769]/35" />
      <div className="absolute bottom-0 left-0 h-2 w-full bg-[#0A1A35]" />
      <div className="relative z-10 flex min-h-[456px] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-[#0A1A35]/15 pb-5">
          <div>
            <p className="font-serif text-lg font-black leading-none">JAHKNOWSPR</p>
            <p className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.35em] text-[#0A1A35]/60">Firm</p>
          </div>
          <p className="max-w-[180px] text-right text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[#8C6C27]">
            {eyebrow}
          </p>
        </header>
        <div className="flex flex-1 flex-col justify-center">{children}</div>
        <footer className="pt-5 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#0A1A35]/55">
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
      <p className="mt-1 text-xs italic text-[#0A1A35]/60">{summary}</p>
    </div>
  );
}

export function FreeAuditReportPreview({ report }: { report: FreeAuditReportPreviewData }) {
  return (
    <div className="max-h-[64vh] space-y-4 overflow-y-auto pr-2">
      <BrandPageShell eyebrow="Cover">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#C59B3C]">
            {report.auditAngleLabel}
          </p>
          <h2 className="font-serif text-5xl font-bold leading-none md:text-7xl">
            {report.businessName} Diagnosis
          </h2>
          <div className="mx-auto mt-8 h-1 w-28 bg-[#C59B3C]" />
        </div>
      </BrandPageShell>

      <BrandPageShell eyebrow="Ratings">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#C59B3C]">Ratings Page</p>
            <h3 className="font-serif text-4xl font-bold leading-tight">Brand Readiness Scores</h3>
            <p className="mt-4 text-sm leading-6 text-[#0A1A35]/70">{report.executiveSummary}</p>
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
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#C59B3C]">Public Source Intelligence</p>
            <h3 className="font-serif text-4xl font-bold leading-tight">Approved findings from Evidence Capture</h3>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-[#0A1A35]/75">
              {report.evidence.socialHighlights.map((highlight) => (
                <li key={highlight} className="rounded-2xl border border-[#0A1A35]/10 bg-white/70 p-4">
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </BrandPageShell>
      ) : null}

      {report.sections.map((section) => (
        <BrandPageShell key={section.id} eyebrow={`Deliverable ${section.label}`}>
          <div className="grid gap-8 md:grid-cols-[0.75fr_1.25fr] md:items-start">
            <div className="min-w-0">
              <p className="text-6xl font-black leading-none text-[#C59B3C]">{section.label}</p>
              <h3 className="mt-4 font-serif text-4xl font-bold leading-tight">{section.title}</h3>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#0A1A35]/50">
                {section.scoreLabel} / {section.score}/100
              </p>
              <p className="mt-4 text-sm leading-6 text-[#0A1A35]/70">{section.subtitle}</p>
            </div>
            <div className="min-w-0 space-y-5">
              <div className="rounded-2xl border border-[#0A1A35]/10 bg-white/70 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C59B3C]">Diagnosis</p>
                <p className="mt-3 break-words text-sm leading-7 text-[#0A1A35]/75">{section.diagnosis}</p>
              </div>
              <div className="rounded-2xl border border-[#0A1A35]/10 bg-white/50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C59B3C]">Evidence</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#0A1A35]/75">
                  {section.evidence.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C59B3C]" />
                      <span className="break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C59B3C]">Why It Matters</p>
                  <p className="mt-2 text-sm leading-6 text-[#0A1A35]/75">{section.whyItMatters}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C59B3C]">Next Move</p>
                  <p className="mt-2 text-sm leading-6 text-[#0A1A35]/75">{section.nextMove}</p>
                </div>
              </div>
            </div>
          </div>
        </BrandPageShell>
      ))}
    </div>
  );
}
