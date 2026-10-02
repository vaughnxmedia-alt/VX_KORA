import { Link } from "react-router-dom";
import { SectionHeader } from "@/components/public/SectionHeader";
import { InsightCard } from "@/components/public/InsightCard";
import { insightSeries } from "@/content/insightsSeries";

export function HomeInsights() {
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 bg-cream/20 border-b border-border">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <SectionHeader
            eyebrow="Thought leadership"
            title="See how we think"
            description="The firm’s judgment should be visible before you hire us. Explore our editorial series on strategy, market behavior, and communications decisions."
          />
          <Link to="/insights" className="text-sm font-medium text-primary hover:underline shrink-0">
            Insights hub →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {insightSeries.map((series) => (
            <InsightCard key={series.id} series={series} />
          ))}
        </div>
      </div>
    </section>
  );
}
