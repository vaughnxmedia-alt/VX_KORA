import { useEffect } from "react";
import { StructuredData } from "@/components/StructuredData";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";
import { HomeHero } from "@/components/public/home/HomeHero";
import { HomePositioning } from "@/components/public/home/HomePositioning";
import { HomeOffers } from "@/components/public/home/HomeOffers";
import { HomeSelectedWork } from "@/components/public/home/HomeSelectedWork";
import { HomeInsights } from "@/components/public/home/HomeInsights";
import { HomeApproach } from "@/components/public/home/HomeApproach";
import { CTASection } from "@/components/public/CTASection";

const Index = () => {
  useEffect(() => {
    document.title = "Strategic Communications & Public Relations | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      "content",
      "JahKnowsPR is a strategic communications and public relations consultancy helping leaders make smarter decisions before they communicate publicly.",
    );
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans">
      <StructuredData
        id="home-org"
        data={[organizationSchema(), websiteSchema()]}
      />
      <HomeHero />
      <HomePositioning />
      <HomeOffers />
      <HomeSelectedWork />
      <HomeInsights />
      <HomeApproach />
      <CTASection />
    </div>
  );
};

export default Index;
