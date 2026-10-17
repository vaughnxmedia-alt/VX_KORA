import { Link } from "react-router-dom";
import { getFeaturedCaseStudies } from "@/content/caseStudies";
import { WORK_CATEGORY_LABELS, type CaseStudy } from "@/content/types";
import { Spread } from "./Spread";

function studyHref(study: CaseStudy) {
  return study.briefPostSlug ? `/the-brief/${study.briefPostSlug}` : `/work#${study.slug}`;
}

export function HomeSelectedWork() {
  const studies = getFeaturedCaseStudies(3);
  const [lead, ...rest] = studies;

  if (!lead) return null;

  return (
    <Spread folio="04" kicker="Selected Work" paper="cream" layer={4} id="work">
      <div className="flex items-end justify-between gap-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-dark">
          {WORK_CATEGORY_LABELS[lead.category]}
        </p>
        <Link
          to="/work"
          className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground"
        >
          All work
          <span className="h-px w-8 bg-gold-dark" />
        </Link>
      </div>

      <div className="mt-8 grid items-end gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 className="font-serif text-[clamp(2.4rem,4.6vw,4.25rem)] font-medium leading-[0.95] tracking-tight">
            <Link to={studyHref(lead)} className="hover:text-gold-dark">
              {lead.title}
            </Link>
          </h2>
          <p className="mt-5 text-sm uppercase tracking-[0.16em] text-muted-foreground">{lead.client}</p>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-foreground/85">{lead.excerpt}</p>
        </div>
        <div className="lg:col-span-4">
          {rest.map((study) => (
            <Link
              key={study.id}
              to={studyHref(study)}
              className="group block border-t border-foreground/15 py-5"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold-dark">
                {WORK_CATEGORY_LABELS[study.category]}
              </p>
              <p className="mt-2 font-serif text-2xl leading-tight group-hover:text-gold-dark">{study.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{study.client}</p>
            </Link>
          ))}
          <div className="border-t border-foreground/15" />
        </div>
      </div>
    </Spread>
  );
}
