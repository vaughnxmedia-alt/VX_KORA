import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { InsightSeries } from "@/content/types";

type InsightCardProps = {
  series: InsightSeries;
};

export function InsightCard({ series }: InsightCardProps) {
  return (
    <Link
      to={series.href}
      className="group block h-full rounded-lg border border-border bg-card p-6 md:p-8 hover:border-primary/25 transition-colors"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-dark mb-2">
        {series.tagline}
      </p>
      <h3 className="text-2xl font-serif font-bold text-foreground mb-3">{series.name}</h3>
      <p className="text-muted-foreground leading-relaxed">{series.description}</p>
      <span className="inline-flex items-center gap-2 text-sm font-medium text-primary mt-6 group-hover:gap-3 transition-all">
        Explore
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
