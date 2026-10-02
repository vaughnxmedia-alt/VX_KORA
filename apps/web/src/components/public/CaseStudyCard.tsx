import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { CaseStudy } from "@/content/types";
import { WORK_CATEGORY_LABELS } from "@/content/types";

type CaseStudyCardProps = {
  study: CaseStudy;
};

export function CaseStudyCard({ study }: CaseStudyCardProps) {
  const detailHref = study.briefPostSlug
    ? `/the-brief/${study.briefPostSlug}`
    : `/work#${study.slug}`;

  return (
    <article className="group flex flex-col h-full rounded-lg border border-border bg-background p-6 md:p-7 hover:border-primary/30 transition-colors">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark mb-3">
        {WORK_CATEGORY_LABELS[study.category]}
      </p>
      <h3 className="text-xl font-serif font-semibold text-foreground mb-2">{study.title}</h3>
      <p className="text-sm text-muted-foreground mb-1">{study.client}</p>
      <p className="text-sm text-foreground/85 leading-relaxed flex-1">{study.excerpt}</p>
      <Link
        to={detailHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary mt-6 group-hover:gap-3 transition-all"
      >
        Read the case
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
