import { Link } from "react-router-dom";
import { SectionHeader } from "@/components/public/SectionHeader";
import { CaseStudyCard } from "@/components/public/CaseStudyCard";
import { getFeaturedCaseStudies } from "@/content/caseStudies";

export function HomeSelectedWork() {
  const studies = getFeaturedCaseStudies(3);
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <SectionHeader
            eyebrow="Selected work"
            title="Proof through communications thinking—not just logos."
          />
          <Link to="/work" className="text-sm font-medium text-primary hover:underline shrink-0">
            View our work →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studies.map((study) => (
            <CaseStudyCard key={study.id} study={study} />
          ))}
        </div>
      </div>
    </section>
  );
}
