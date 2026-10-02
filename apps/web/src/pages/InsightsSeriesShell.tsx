import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbListSchema } from "@/lib/structured-data";
import { SectionHeader } from "@/components/public/SectionHeader";
import { getInsightSeries } from "@/content/insightsSeries";
import type { InsightSeriesId } from "@/content/types";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { filterLiveBriefPosts } from "@/lib/brief-listing";

type Props = {
  seriesId: InsightSeriesId;
};

type SeriesPost = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  published_date: string | null;
  publication_status?: string | null;
  status?: string | null;
  is_hidden?: boolean | null;
  publish_scheduled_at?: string | null;
};

const contentTypeBySeries: Record<InsightSeriesId, string> = {
  "the-brief": "the-brief",
  "spam-report": "spam-report",
  "pr-court": "pr-court",
};

export default function InsightsSeriesShell({ seriesId }: Props) {
  const series = getInsightSeries(seriesId);
  const [posts, setPosts] = useState<SeriesPost[]>([]);

  useEffect(() => {
    if (!series) return;
    document.title = `${series.name} | JahKnowsPR Insights`;
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute("content", series.description);
  }, [series]);

  useEffect(() => {
    if (seriesId === "the-brief") return;
    let cancelled = false;
    (async () => {
      // Prefer content_type filter (post HQ migration); fall back to category name
      let { data, error } = await supabase
        .from("blog_posts")
        .select(
          "id,title,slug,excerpt,published_date,publication_status,status,is_hidden,publish_scheduled_at,content_type",
        )
        .eq("is_hidden", false)
        .eq("content_type", contentTypeBySeries[seriesId])
        .order("published_date", { ascending: false });

      if (error) {
        const fallback = await supabase
          .from("blog_posts")
          .select(
            "id,title,slug,excerpt,published_date,publication_status,status,is_hidden,publish_scheduled_at,category",
          )
          .eq("is_hidden", false)
          .ilike("category", seriesId === "spam-report" ? "%spam%" : "%court%")
          .order("published_date", { ascending: false });
        data = fallback.data as typeof data;
        error = fallback.error;
      }

      if (cancelled || error) return;
      const live = filterLiveBriefPosts(
        ((data ?? []) as SeriesPost[]).map((p) => ({
          ...p,
          description: p.excerpt || "",
          category: "",
          read_time: "",
          author_name: "",
        })),
      );
      setPosts(live as SeriesPost[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  if (!series) {
    return (
      <main className="min-h-screen grid place-items-center px-4">
        <p className="text-muted-foreground">Series not found.</p>
      </main>
    );
  }

  const isBrief = seriesId === "the-brief";

  return (
    <div className="min-h-screen bg-background">
      <StructuredData
        id={`insights-${seriesId}`}
        data={breadcrumbListSchema([
          { name: "Home", url: "/" },
          { name: "Insights", url: "/insights" },
          { name: series.name, url: series.href },
        ])}
      />
      <section className="pt-28 pb-12 px-4 sm:px-6 border-b border-border">
        <div className="max-w-3xl mx-auto space-y-6">
          <SectionHeader eyebrow={series.tagline} title={series.name} description={series.description} />
          {isBrief ? (
            <Button asChild>
              <Link to="/the-brief">Open The Brief</Link>
            </Button>
          ) : posts.length ? (
            <ul className="space-y-4 text-left">
              {posts.map((p) => (
                <li key={p.id} className="border-b border-border pb-4">
                  <Link
                    to={`/the-brief/${p.slug || p.id}`}
                    className="font-serif text-xl font-semibold text-primary hover:underline"
                  >
                    {p.title}
                  </Link>
                  {p.excerpt ? (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{p.excerpt}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-cream/30 p-8 text-sm text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground mb-2">No published pieces yet</p>
              <p>
                {series.name} articles published from JahKnowsPR HQ will appear here. Drafts stay private. Explore{" "}
                <Link to="/the-brief" className="text-primary underline underline-offset-2">
                  The Brief
                </Link>{" "}
                meanwhile.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
