import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { caseStudies } from "@/content/caseStudies";
import { WORK_CATEGORY_LABELS, type CaseStudy } from "@/content/types";
import { supabase, supabaseIsConfigured } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Spread } from "./Spread";

function studyHref(study: CaseStudy) {
  return study.briefPostSlug ? `/the-brief/${study.briefPostSlug}` : `/work#${study.slug}`;
}

function displayHeadline(study: CaseStudy) {
  return study.homeHeadline ?? study.title;
}

function StudyImage({ src }: { src?: string }) {
  if (!src) return <div className="aspect-[940/788] w-full bg-primary" />;
  return (
    <img
      src={src}
      alt=""
      width={940}
      height={788}
      loading="lazy"
      decoding="async"
      sizes="(min-width: 1024px) 46vw, 100vw"
      className="work-photo h-auto w-full"
    />
  );
}

export function HomeSelectedWork() {
  const studies = caseStudies.slice(0, 3);
  const [lead, ...rest] = studies;
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!supabaseIsConfigured) return;
    const slugs = caseStudies.slice(0, 3).flatMap((study) => (study.briefPostSlug ? [study.briefPostSlug] : []));
    if (slugs.length === 0) return;
    let cancelled = false;
    supabase
      .from("blog_posts")
      .select("slug, cover_image_url")
      .in("slug", slugs)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const next: Record<string, string> = {};
        for (const row of data) {
          if (row.cover_image_url) next[row.slug] = row.cover_image_url;
        }
        setCovers(next);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!lead) return null;

  const viewAll = (
    <Link
      to="/work"
      className="mb-1 ml-auto inline-flex min-h-11 shrink-0 items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground sm:ml-0"
    >
      View all work
      <span className="h-px w-8 bg-gold-dark" />
    </Link>
  );

  return (
    <Spread
      folio="04"
      kicker="Selected Work"
      paper="cream"
      layer={4}
      id="work"
      lockup
      pin={false}
      headerAside={viewAll}
    >
      <article>
        <Link to={studyHref(lead)} className="group grid items-end gap-8 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <StudyImage src={lead.briefPostSlug ? covers[lead.briefPostSlug] : undefined} />
          </div>
          <div className="lg:col-span-5 lg:pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-dark">
              {WORK_CATEGORY_LABELS[lead.category]}
            </p>
            <h3 className="mt-4 font-serif text-[clamp(2.15rem,3.8vw,3.5rem)] font-medium leading-[0.98] tracking-tight group-hover:text-gold-dark">
              {displayHeadline(lead)}
            </h3>
            <p className="mt-5 text-sm uppercase tracking-[0.16em] text-muted-foreground">{lead.client}</p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-foreground md:text-lg">{lead.excerpt}</p>
          </div>
        </Link>
      </article>

      {rest.length > 0 ? (
        <div
          className={cn(
            "mt-14 grid gap-12 lg:mt-20",
            rest.length > 1 ? "lg:grid-cols-12 lg:gap-x-10" : "lg:grid-cols-12",
          )}
        >
          {rest.map((study, index) => (
            <article
              key={study.id}
              className={cn(
                rest.length === 1 && "lg:col-span-7",
                rest.length > 1 && index === 0 && "lg:col-span-7",
                rest.length > 1 && index === 1 && "lg:col-span-4 lg:col-start-9 lg:mt-24",
              )}
            >
              <Link to={studyHref(study)} className="group block min-h-11">
                <StudyImage src={study.briefPostSlug ? covers[study.briefPostSlug] : undefined} />
                <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
                  {WORK_CATEGORY_LABELS[study.category]}
                </p>
                <h3 className="mt-2 font-serif text-[clamp(1.55rem,2.2vw,2.15rem)] font-medium leading-tight group-hover:text-gold-dark">
                  {displayHeadline(study)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{study.client}</p>
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </Spread>
  );
}
