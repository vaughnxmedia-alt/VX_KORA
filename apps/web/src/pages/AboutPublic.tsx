import { useEffect } from "react";
import { Link } from "react-router-dom";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbListSchema, personSchema } from "@/lib/structured-data";
import { SectionHeader } from "@/components/public/SectionHeader";
import { ProcessSteps } from "@/components/public/ProcessSteps";
import { CTASection } from "@/components/public/CTASection";
import { firmProfile } from "@/content/firm";
import { firmProcessSteps } from "@/content/process";
import { Button } from "@/components/ui/button";

export default function AboutPublic() {
  useEffect(() => {
    document.title = "About | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      "content",
      "Philosophy, approach, and founder perspective from JahKnowsPR—a strategic communications and public relations consultancy.",
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <StructuredData
        id="about"
        data={[
          personSchema(),
          breadcrumbListSchema([
            { name: "Home", url: "/" },
            { name: "About", url: "/about" },
          ]),
        ]}
      />
      <section className="pt-28 pb-16 px-4 sm:px-6 border-b border-border bg-cream/25">
        <div className="max-w-3xl mx-auto space-y-6">
          <SectionHeader
            eyebrow="About the firm"
            title="Strategic communications counsel—not a volume agency."
            description={firmProfile.mission}
          />
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 border-b border-border">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-2xl font-serif font-bold">Philosophy</h2>
          <p className="text-muted-foreground leading-relaxed">{firmProfile.approachIntro}</p>
          <ul className="space-y-6">
            {firmProfile.values.map((v) => (
              <li key={v.title} className="border-l-2 border-gold/50 pl-5">
                <h3 className="font-semibold text-foreground mb-1">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 border-b border-border bg-muted/15">
        <div className="max-w-7xl mx-auto space-y-10">
          <SectionHeader title="Our process" align="left" />
          <ProcessSteps steps={firmProcessSteps} />
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 border-b border-border">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-2xl font-serif font-bold">{firmProfile.founderName}</h2>
          <p className="text-muted-foreground leading-relaxed">{firmProfile.founderBio}</p>
          <Button asChild variant="outline">
            <Link to="/insights/the-brief">Read our analysis on The Brief</Link>
          </Button>
        </div>
      </section>

      <CTASection />
    </div>
  );
}
