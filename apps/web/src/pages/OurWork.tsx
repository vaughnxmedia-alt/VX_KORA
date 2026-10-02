import { useEffect, useMemo, useState } from "react";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbListSchema } from "@/lib/structured-data";
import { SectionHeader } from "@/components/public/SectionHeader";
import { CaseStudyCard } from "@/components/public/CaseStudyCard";
import { MediaPlacementCard } from "@/components/public/MediaPlacementCard";
import { caseStudies } from "@/content/caseStudies";
import { mediaPlacements } from "@/content/mediaPlacements";
import { WORK_CATEGORY_LABELS, type WorkCategory } from "@/content/types";
import { cn } from "@/lib/utils";

const ALL = "all" as const;

export default function OurWork() {
  const [category, setCategory] = useState<WorkCategory | typeof ALL>(ALL);

  useEffect(() => {
    document.title = "Our Work | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      "content",
      "Case studies, media placements, and selected client work demonstrating strategic communications and PR counsel.",
    );
  }, []);

  const categories = useMemo(() => {
    const set = new Set(caseStudies.map((c) => c.category));
    return Array.from(set);
  }, []);

  const filtered = useMemo(
    () => (category === ALL ? caseStudies : caseStudies.filter((c) => c.category === category)),
    [category],
  );

  return (
    <div className="min-h-screen bg-background">
      <StructuredData
        id="our-work"
        data={breadcrumbListSchema([
          { name: "Home", url: "/" },
          { name: "Our Work", url: "/work" },
        ])}
      />
      <section className="pt-28 pb-12 px-4 sm:px-6 border-b border-border">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Our work"
            title="Strategy, media, and reputation—documented as cases."
            description="We show thinking and outcomes, not a grid of unrelated deliverables. Full narratives may live on The Brief when published as analysis."
          />
        </div>
      </section>

      <section className="py-8 px-4 sm:px-6 border-b border-border bg-cream/20">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2">
          <FilterChip active={category === ALL} onClick={() => setCategory(ALL)} label="All" />
          {categories.map((cat) => (
            <FilterChip
              key={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
              label={WORK_CATEGORY_LABELS[cat]}
            />
          ))}
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((study) => (
            <CaseStudyCard key={study.id} study={study} />
          ))}
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 border-t border-border bg-muted/15">
        <div className="max-w-7xl mx-auto space-y-10">
          <SectionHeader eyebrow="Media placements" title="Selected visibility that supported strategy" />
          <div className="grid md:grid-cols-2 gap-6">
            {mediaPlacements.map((p) => (
              <MediaPlacementCard key={p.id} placement={p} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
