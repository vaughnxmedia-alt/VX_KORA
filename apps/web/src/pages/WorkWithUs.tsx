import { useEffect } from "react";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbListSchema, serviceSchema } from "@/lib/structured-data";
import { SectionHeader } from "@/components/public/SectionHeader";
import { OfferCard } from "@/components/public/OfferCard";
import { CTASection } from "@/components/public/CTASection";
import { coreOffers } from "@/content/offers";
import { firmProfile } from "@/content/firm";

export default function WorkWithUs() {
  useEffect(() => {
    document.title = "Work With Us | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      "content",
      "Strategic Communications Sessions, defined PR projects, and ongoing communications counsel for leaders and organizations.",
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <StructuredData
        id="work-with-us"
        data={[
          serviceSchema({
            name: "JahKnowsPR Strategic Communications",
            description: firmProfile.mission,
            url: "/work-with-us",
            serviceType: "Strategic communications and public relations consultancy",
            areaServed: "United States",
          }),
          breadcrumbListSchema([
            { name: "Home", url: "/" },
            { name: "Work With Us", url: "/work-with-us" },
          ]),
        ]}
      />
      <section className="pt-28 pb-12 px-4 sm:px-6 border-b border-border bg-cream/25">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Work with us"
            title="Three ways to engage—aligned to how serious the moment is."
            description={firmProfile.approachIntro}
          />
        </div>
      </section>
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
          {coreOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </section>
      <section className="py-12 px-4 sm:px-6 border-t border-border bg-muted/20">
        <div className="max-w-3xl mx-auto text-sm text-muted-foreground leading-relaxed space-y-4">
          <p>
            <strong className="text-foreground font-medium">Supporting execution:</strong> Creative production,
            content, and campaign activations may be scoped within a Strategic Communications + PR Project when
            they serve the strategy. They are not standalone primary offers on this site.
          </p>
          <p>
            Legacy paths such as creative consultations and campaign inquiries remain available for existing
            relationships; new engagements should begin with counsel or a defined project conversation.
          </p>
        </div>
      </section>
      <CTASection />
    </div>
  );
}
