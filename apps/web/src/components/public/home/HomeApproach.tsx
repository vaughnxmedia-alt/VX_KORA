import { SectionHeader } from "@/components/public/SectionHeader";
import { ProcessSteps } from "@/components/public/ProcessSteps";
import { firmProcessSteps } from "@/content/process";

export function HomeApproach() {
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 border-b border-border">
      <div className="max-w-7xl mx-auto space-y-12">
        <SectionHeader
          eyebrow="Firm approach"
          title="How JahKnowsPR works"
          description="A disciplined process for high-stakes communication—whether you are launching, responding, or building long-term credibility."
        />
        <ProcessSteps steps={firmProcessSteps} />
      </div>
    </section>
  );
}
