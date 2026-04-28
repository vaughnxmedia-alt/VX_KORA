import { Logo } from "@/components/Logo";

type AuditTemplateDeckPreviewProps = {
  title: string;
  businessName?: string;
  imageUrl: string | null;
};

const DELIVERABLES = [
  {
    label: "01",
    title: "Positioning Gap",
    subtitle: "Where the brand is currently misaligned.",
    insight: "Offset layers show the gap between what the audience sees and what the brand needs them to understand.",
  },
  {
    label: "02",
    title: "Audience Clarity",
    subtitle: "Who the message is actually reaching.",
    insight: "Fragmented structure shows where audience belief, pain, and offer clarity are not yet connected.",
  },
  {
    label: "03",
    title: "Authority Structure",
    subtitle: "How credible the brand feels at first glance.",
    insight: "Stacked hierarchy shows whether trust is being built with enough weight and consistency.",
  },
  {
    label: "04",
    title: "Messaging Angle",
    subtitle: "The clearest strategic angle to test next.",
    insight: "A single aligned center line shows what the brand should make easier to understand.",
  },
  {
    label: "05",
    title: "Conversion Path",
    subtitle: "What blocks attention from becoming action.",
    insight: "The broken flow line shows where interest fails to become a booked strategy session.",
  },
];

function BrandPageShell({
  children,
  eyebrow,
}: {
  children: React.ReactNode;
  eyebrow: string;
}) {
  return (
    <article className="relative min-h-[520px] overflow-hidden rounded-2xl border border-[#D8C28B]/50 bg-[#F7F3EA] p-8 text-[#0A1A35] shadow-sm">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-[#C59B3C]/20" />
      <div className="absolute bottom-0 left-0 h-2 w-full bg-[#0A1A35]" />
      <div className="relative z-10 flex h-full min-h-[456px] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-[#0A1A35]/15 pb-5">
          <Logo className="scale-90 origin-left" />
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

export function AuditTemplateDeckPreview({ title }: AuditTemplateDeckPreviewProps) {
  const diagnosisTitle = `${title || "Business"} Diagnosis`;
  return (
    <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-2">
      <BrandPageShell eyebrow="Cover">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-5xl font-bold leading-none md:text-7xl">
            {diagnosisTitle}
          </h2>
          <div className="mx-auto mt-8 h-1 w-28 bg-[#C59B3C]" />
        </div>
      </BrandPageShell>

      <BrandPageShell eyebrow="Ratings">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#C59B3C]">Ratings Page</p>
            <h3 className="font-serif text-4xl font-bold leading-tight">Brand Readiness Scores</h3>
            <p className="mt-4 text-sm leading-6 text-[#0A1A35]/70">
              Five core ratings summarize the current brand diagnosis before the deliverables break down what needs to change.
            </p>
          </div>
          <div className="space-y-4">
            {["Positioning", "Audience", "Authority", "Messaging", "Conversion"].map((label, index) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-[0.18em]">
                  <span>{label}</span>
                  <span>{[43, 55, 61, 67, 46][index]}/100</span>
                </div>
                <div className="h-3 rounded-full bg-[#0A1A35]/10">
                  <div
                    className="h-3 rounded-full bg-[#C59B3C]"
                    style={{ width: `${[43, 55, 61, 67, 46][index]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </BrandPageShell>

      {DELIVERABLES.map((deliverable) => (
        <BrandPageShell key={deliverable.title} eyebrow={`Deliverable ${deliverable.label}`}>
          <div className="grid gap-8 md:grid-cols-[0.75fr_1.25fr] md:items-center">
            <div>
              <p className="text-6xl font-black leading-none text-[#C59B3C]">{deliverable.label}</p>
              <h3 className="mt-4 font-serif text-4xl font-bold leading-tight">{deliverable.title}</h3>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#0A1A35]/50">
                {deliverable.subtitle}
              </p>
            </div>
            <div className="space-y-5">
              <div className="relative h-52 overflow-hidden rounded-2xl border border-[#0A1A35]/15 bg-white">
                <div className="absolute left-10 top-10 h-24 w-48 rotate-[-8deg] border-2 border-[#0A1A35]" />
                <div className="absolute left-20 top-20 h-24 w-48 rotate-[5deg] bg-[#C59B3C]/30" />
                <div className="absolute bottom-10 right-10 h-2 w-40 bg-[#0A1A35]" />
                <div className="absolute bottom-10 right-10 h-2 w-16 bg-[#C59B3C]" />
              </div>
              <p className="max-w-xl text-base leading-7 text-[#0A1A35]/75">{deliverable.insight}</p>
            </div>
          </div>
        </BrandPageShell>
      ))}
    </div>
  );
}
