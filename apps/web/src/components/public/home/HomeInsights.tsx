import { Link } from "react-router-dom";
import { listedInsightSeries } from "@/content/insightsSeries";
import { Spread } from "./Spread";

export function HomeInsights() {
  const [feature, ...rest] = listedInsightSeries;

  if (!feature) return null;

  return (
    <Spread folio="06" kicker="The Brief" paper="cream" layer={6} id="the-brief">
      <div className="grid items-end gap-12 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-dark">{feature.tagline}</p>
          <h2 className="mt-4 font-serif text-[clamp(4rem,10vw,8rem)] font-medium leading-[0.84] tracking-tight">
            <Link to={feature.href} className="hover:text-gold-dark">
              {feature.name}
            </Link>
          </h2>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-foreground/85">{feature.description}</p>
        </div>
        <div className="flex flex-col justify-end gap-8 lg:col-span-4">
          {rest.map((series) => (
            <Link key={series.id} to={series.href} className="group block border-t border-foreground/15 pt-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold-dark">{series.tagline}</p>
              <p className="mt-2 font-serif text-3xl leading-tight group-hover:text-gold-dark">{series.name}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{series.description}</p>
            </Link>
          ))}
          <Link
            to="/insights"
            className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground"
          >
            Insights
            <span className="h-px w-8 bg-gold-dark" />
          </Link>
        </div>
      </div>
    </Spread>
  );
}
