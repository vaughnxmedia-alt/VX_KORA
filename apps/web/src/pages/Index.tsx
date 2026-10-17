import { useEffect } from "react";
import { StructuredData } from "@/components/StructuredData";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";
import { HomeHero } from "@/components/public/home/HomeHero";
import { HomePositioning } from "@/components/public/home/HomePositioning";
import { HomeOffers } from "@/components/public/home/HomeOffers";
import { HomeSelectedWork } from "@/components/public/home/HomeSelectedWork";
import { HomeFounder } from "@/components/public/home/HomeFounder";
import { HomeInsights } from "@/components/public/home/HomeInsights";
import { HomeClose } from "@/components/public/home/HomeClose";

const Index = () => {
  useEffect(() => {
    document.title = "Strategic Communications & Public Relations | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      "content",
      "JahKnowsPR is a strategic communications and public relations consultancy helping leaders make smarter decisions before they communicate publicly.",
    );
    document.documentElement.classList.add("home-publication");
    return () => document.documentElement.classList.remove("home-publication");
  }, []);

  return (
    <div className="bg-background font-sans">
      <StructuredData
        id="home-org"
        data={[organizationSchema(), websiteSchema()]}
      />
      <HomeHero />
      <HomePositioning />
      <HomeOffers />
      <HomeSelectedWork />
      <HomeFounder />
      <HomeInsights />
      <HomeClose />
    </div>
  );
};

export default Index;
