import { useEffect } from "react";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbListSchema } from "@/lib/structured-data";
import { SectionHeader } from "@/components/public/SectionHeader";
import { InsightCard } from "@/components/public/InsightCard";
import { listedInsightSeries } from "@/content/insightsSeries";

export default function InsightsHub() {
  useEffect(() => {
    document.title = "Insights | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      "content",
      "Thought leadership from JahKnowsPR: The Brief and SPAM Report.",
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <StructuredData
        id="insights-hub"
        data={breadcrumbListSchema([
          { name: "Home", url: "/" },
          { name: "Insights", url: "/insights" },
        ])}
      />
      <section className="pt-28 pb-16 px-4 sm:px-6 border-b border-border bg-cream/25">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Insights"
            title="Where our thinking lives before it becomes execution."
            description="Strategic communications analysis, market behavior, and long-form judgment on public decisions—so you can see how we counsel before you engage."
          />
        </div>
      </section>
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          {listedInsightSeries.map((series) => (
            <InsightCard key={series.id} series={series} />
          ))}
        </div>
      </section>
    </div>
  );
}
