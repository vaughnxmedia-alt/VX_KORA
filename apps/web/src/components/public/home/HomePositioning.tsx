import { SectionHeader } from "@/components/public/SectionHeader";
import { positioningPillars } from "@/content/process";

export function HomePositioning() {
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 bg-cream/30 border-b border-border">
      <div className="max-w-7xl mx-auto space-y-12">
        <SectionHeader
          title="We don't start with content. We start with strategy."
          description="Every public-facing decision sends a message. JahKnowsPR helps you determine what should be communicated, why it matters, who needs to hear it, how you should be positioned, and what the communication should accomplish."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {positioningPillars.map((pillar) => (
            <div key={pillar.title} className="rounded-lg border border-border bg-background p-6">
              <h3 className="text-lg font-serif font-semibold text-foreground mb-2">{pillar.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
