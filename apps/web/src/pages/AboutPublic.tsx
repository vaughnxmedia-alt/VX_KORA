import { useEffect, useState } from "react";
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

      <section className="py-16 md:py-20 px-4 sm:px-6 border-b border-border bg-cream/20">
        <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16 items-start">
          <FounderPortrait name={firmProfile.founderName} src={firmProfile.founderPhoto} />
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-dark">Founder</p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">{firmProfile.founderName}</h2>
              <p className="text-base font-medium text-foreground">{firmProfile.founderTitle}</p>
            </div>
            <div className="space-y-4">
              {firmProfile.founderBio.map((paragraph) => (
                <p key={paragraph.slice(0, 32)} className="text-muted-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
            <Button asChild variant="outline">
              <Link to="/insights/the-brief">Read our analysis on The Brief</Link>
            </Button>
          </div>
        </div>
      </section>

      <CTASection />
    </div>
  );
}

function FounderPortrait({ name, src }: { name: string; src: string }) {
  const [missing, setMissing] = useState(false);

  return (
    <figure className="mx-auto w-full max-w-[280px]">
      {missing ? (
        <div className="flex aspect-[4/5] flex-col justify-end border border-border bg-[linear-gradient(165deg,#0A1A35_0%,#16325c_62%,#8d7340_140%)] p-6">
          <span className="font-serif text-5xl text-white">JV</span>
        </div>
      ) : (
        <img
          src={src}
          alt={`Portrait of ${name}`}
          width={819}
          height={1024}
          className="h-auto w-full border border-border"
          onError={() => setMissing(true)}
        />
      )}
      <figcaption className="mt-4 space-y-1 text-foreground">
        <p className="font-serif text-lg leading-snug">“Attention expires. Positioning compounds.”</p>
        <p className="font-signature -mt-1 text-[2.75rem] leading-none text-primary">Jocelyn Vaughn</p>
      </figcaption>
    </figure>
  );
}
