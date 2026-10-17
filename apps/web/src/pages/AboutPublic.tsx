import { useEffect, useState } from "react";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbListSchema, personSchema } from "@/lib/structured-data";
import { SectionHeader } from "@/components/public/SectionHeader";
import { ProcessSteps } from "@/components/public/ProcessSteps";
import { CTASection } from "@/components/public/CTASection";
import { aboutPage, firmProfile } from "@/content/firm";
import { firmProcessSteps } from "@/content/process";

export default function AboutPublic() {
  useEffect(() => {
    document.title = "About | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      "content",
      "JahKnowsPR helps clients communicate with intention—strategy before exposure, and credibility over noise.",
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
      <StorySection
        eyebrow={aboutPage.firm.eyebrow}
        title={aboutPage.firm.title}
        paragraphs={aboutPage.firm.paragraphs}
        className="pt-28 pb-16 px-4 sm:px-6 border-b border-border bg-cream/25"
        heading="h1"
      />
      <StorySection
        eyebrow={aboutPage.philosophy.eyebrow}
        title={aboutPage.philosophy.title}
        paragraphs={aboutPage.philosophy.paragraphs}
        className="py-16 px-4 sm:px-6 border-b border-border"
      />
      <StorySection
        eyebrow={aboutPage.building.eyebrow}
        paragraphs={aboutPage.building.paragraphs}
        closing={aboutPage.building.closing}
        className="py-16 px-4 sm:px-6 border-b border-border bg-muted/15"
      />

      <section className="py-16 px-4 sm:px-6 border-b border-border">
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
          </div>
        </div>
      </section>

      <CTASection />
    </div>
  );
}

function StorySection({
  eyebrow,
  title,
  paragraphs,
  closing,
  className,
  heading = "h2",
}: {
  eyebrow: string;
  title?: string;
  paragraphs: readonly string[];
  closing?: string;
  className: string;
  heading?: "h1" | "h2";
}) {
  const Heading = heading;
  return (
    <section className={className}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-dark">{eyebrow}</p>
          {title ? (
            <Heading className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-balance">
              {title}
            </Heading>
          ) : null}
        </div>
        <div className="space-y-4">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="text-muted-foreground leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
        {closing ? <p className="font-serif text-xl text-foreground">{closing}</p> : null}
      </div>
    </section>
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
      <figcaption className="mt-5 text-center">
        <blockquote className="font-serif text-[1.05rem] leading-snug text-foreground">
          <p>“Attention expires.</p>
          <p>Positioning compounds.”</p>
        </blockquote>
        <p className="font-signature mt-6 text-[2.7rem] leading-none text-primary">Jocelyn Vaughn</p>
      </figcaption>
    </figure>
  );
}
