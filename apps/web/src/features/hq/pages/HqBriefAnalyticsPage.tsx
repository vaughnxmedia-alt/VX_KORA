import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type SourceRow = { source: string; views: number };
type DeviceRow = { device: string; views: number };
type CtaRow = { id: string; label: string; clicks: number };
type SeriesRow = { date: string; views: number };

export type BriefArticleStat = {
  key: string;
  title: string;
  published_date: string | null;
  views: number;
  readers: number;
  avg_engagement_seconds: number | null;
  cta_clicks: number;
  top_source: string | null;
};

type LivePage = { page: string; path: string; readers: number; last_seen: string };
type LiveEvent = {
  at: string;
  event_name: string;
  page: string;
  path: string;
  device: string;
  source: string;
};

export type BriefAnalyticsReport = {
  range: string;
  start: string;
  end: string;
  live?: {
    active_readers: number;
    pages_now: LivePage[];
    recent: LiveEvent[];
  };
  overview: {
    total_views: number;
    unique_readers: number;
    landing_views: number;
    avg_engagement_seconds: number | null;
    views_today: number;
    views_7d: number;
    views_30d: number;
    views_90d: number;
  };
  articles: BriefArticleStat[];
  detail: {
    key: string;
    title: string;
    published_date: string | null;
    views: number;
    readers: number;
    avg_engagement_seconds: number | null;
    cta_clicks: number;
    series: SeriesRow[];
    sources: SourceRow[];
    devices: DeviceRow[];
    ctas: CtaRow[];
  } | null;
};

const RANGES = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "all", label: "All Time" },
  { id: "custom", label: "Custom" },
] as const;

type RangeId = (typeof RANGES)[number]["id"];
type SortId = "views" | "newest" | "engagement" | "cta";

const SORTS: { id: SortId; label: string }[] = [
  { id: "views", label: "Highest views" },
  { id: "newest", label: "Newest" },
  { id: "engagement", label: "Engagement" },
  { id: "cta", label: "CTA clicks" },
];

function formatEngagement(seconds: number | null | undefined) {
  if (seconds == null || Number.isNaN(Number(seconds))) return "—";
  const rounded = Math.max(0, Math.round(Number(seconds)));
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (minutes <= 0) return `${rounded}s`;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function formatCount(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function liveAction(eventName: string) {
  if (eventName === "cta_click") return "Clicked a CTA";
  if (eventName === "blog_view") return "Opened";
  return "Opened";
}

async function loadBriefAnalytics(input: {
  range: RangeId;
  start: string;
  end: string;
  article: string | null;
}): Promise<BriefAnalyticsReport> {
  const { data, error } = await supabase.rpc("hq_brief_analytics", {
    p_range: input.range,
    p_start: input.range === "custom" && input.start ? input.start : null,
    p_end: input.range === "custom" && input.end ? input.end : null,
    p_article: input.article,
  });
  if (error) throw error;
  return data as BriefAnalyticsReport;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold text-primary">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Breakdown({
  title,
  rows,
  valueKey,
}: {
  title: string;
  rows: { label: string; value: number }[];
  valueKey: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section className="rounded-lg border border-border bg-background p-5">
      <h2 className="font-serif text-xl font-bold text-primary">{title}</h2>
      {!rows.length ? (
        <p className="mt-3 text-sm text-muted-foreground">No {valueKey} in this range.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{row.label}</span>
                <span className="font-medium tabular-nums">{formatCount(row.value)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function HqBriefAnalyticsPage() {
  const params = useParams();
  const articleKey = params["*"] ? decodeURIComponent(params["*"]) : null;
  const [range, setRange] = useState<RangeId>("30d");
  const [sort, setSort] = useState<SortId>("views");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const query = useQuery({
    queryKey: ["hq", "brief-analytics", range, start, end, articleKey],
    queryFn: () => loadBriefAnalytics({ range, start, end, article: articleKey }),
    refetchInterval: 5000,
  });

  const articles = useMemo(() => {
    const rows = query.data?.articles ?? [];
    return [...rows].sort((a, b) => {
      if (sort === "newest") return (b.published_date || "").localeCompare(a.published_date || "");
      if (sort === "engagement") return (b.avg_engagement_seconds || 0) - (a.avg_engagement_seconds || 0);
      if (sort === "cta") return b.cta_clicks - a.cta_clicks;
      return b.views - a.views;
    });
  }, [query.data?.articles, sort]);

  const overview = query.data?.overview;
  const detail = query.data?.detail;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {articleKey ? (
            <Link to="/hq/content/analytics" className="mb-2 inline-flex items-center text-sm text-primary hover:underline">
              <ArrowLeft className="mr-1 h-4 w-4" />
              All articles
            </Link>
          ) : (
            <Link to="/hq/content" className="mb-2 inline-flex items-center text-sm text-primary hover:underline">
              <ArrowLeft className="mr-1 h-4 w-4" />
              The Brief
            </Link>
          )}
          <h1 className="font-serif text-3xl font-bold">The Brief → Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live page views refresh every 5 seconds. A row appears when someone opens The Brief or an article.
          </p>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-background p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold">Live tracking</h2>
            <p className="text-sm text-muted-foreground">
              {formatCount(query.data?.live?.active_readers)} {Number(query.data?.live?.active_readers) === 1 ? "reader" : "readers"} in the last 2 minutes
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {query.dataUpdatedAt ? `Updated ${formatWhen(new Date(query.dataUpdatedAt).toISOString())}` : "Waiting for the first refresh"}
          </p>
        </div>
        {(query.data?.live?.pages_now || []).length ? (
          <ul className="space-y-2">
            {query.data?.live?.pages_now.map((page) => (
              <li key={page.path + page.last_seen} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-medium">{page.page}</span>
                  <span className="ml-2 text-muted-foreground">{page.path}</span>
                </span>
                <span className="text-muted-foreground">
                  {formatCount(page.readers)} now · {formatWhen(page.last_seen)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No one is on The Brief right now.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">What happened</th>
                <th className="py-2 pr-3 font-medium">Page</th>
                <th className="py-2 pr-3 font-medium">Device</th>
                <th className="py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.live?.recent || []).map((event, index) => (
                <tr key={`${event.at}-${event.path}-${index}`} className="border-t border-border">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatWhen(event.at)}</td>
                  <td className="py-2 pr-3">{liveAction(event.event_name)}</td>
                  <td className="py-2 pr-3">
                    <div className="font-medium">{event.page}</div>
                    <div className="text-xs text-muted-foreground">{event.path}</div>
                  </td>
                  <td className="py-2 pr-3 capitalize">{event.device || "unknown"}</td>
                  <td className="py-2">{event.source || "direct"}</td>
                </tr>
              ))}
              {!query.data?.live?.recent?.length && !query.isLoading ? (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    No page views have been recorded yet. Open The Brief in another tab and this list will update.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRange(item.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              range === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {range === "custom" ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Start</span>
            <input
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">End</span>
            <input
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
        </div>
      ) : null}

      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading analytics…</p> : null}
      {query.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-background p-5 text-sm">
          <p className="font-medium text-primary">Analytics could not be loaded.</p>
          <p className="mt-2 text-muted-foreground">
            Apply the Brief analytics migration in Supabase, then refresh. This page does not show placeholder numbers.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{query.error instanceof Error ? query.error.message : "Request failed"}</p>
        </div>
      ) : null}

      {overview ? (
        <>
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold">Overview</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Total Brief views" value={formatCount(overview.total_views)} hint={`${formatCount(overview.landing_views)} on the landing page`} />
              <Stat label="Unique readers" value={formatCount(overview.unique_readers)} />
              <Stat label="Average engagement" value={formatEngagement(overview.avg_engagement_seconds)} />
              <Stat label="Views today" value={formatCount(overview.views_today)} />
              <Stat label="Views last 7 days" value={formatCount(overview.views_7d)} />
              <Stat label="Views last 30 days" value={formatCount(overview.views_30d)} />
              <Stat label="Views last 90 days" value={formatCount(overview.views_90d)} />
            </div>
          </section>

          {detail ? (
            <section className="space-y-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-primary">{detail.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {detail.published_date || "Unscheduled"} · /the-brief/{detail.key}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Total views" value={formatCount(detail.views)} />
                <Stat label="Unique readers" value={formatCount(detail.readers)} />
                <Stat label="Average engagement" value={formatEngagement(detail.avg_engagement_seconds)} />
                <Stat label="CTA clicks" value={formatCount(detail.cta_clicks)} />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <Breakdown
                  title="Views over time"
                  valueKey="views"
                  rows={(detail.series || []).map((row) => ({ label: row.date, value: Number(row.views || 0) }))}
                />
                <Breakdown
                  title="Traffic sources"
                  valueKey="views"
                  rows={(detail.sources || []).map((row) => ({ label: row.source || "direct", value: Number(row.views || 0) }))}
                />
                <Breakdown
                  title="Devices"
                  valueKey="views"
                  rows={(detail.devices || []).map((row) => ({ label: row.device || "unknown", value: Number(row.views || 0) }))}
                />
                <Breakdown
                  title="CTA clicks"
                  valueKey="clicks"
                  rows={(detail.ctas || []).map((row) => ({ label: row.label || row.id, value: Number(row.clicks || 0) }))}
                />
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-xl font-bold">Article performance</h2>
              <div className="flex flex-wrap gap-2">
                {SORTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSort(item.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm",
                      sort === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Article</th>
                    <th className="px-3 py-2 font-medium">Publish date</th>
                    <th className="px-3 py-2 font-medium">Views</th>
                    <th className="px-3 py-2 font-medium">Readers</th>
                    <th className="px-3 py-2 font-medium">Engagement</th>
                    <th className="px-3 py-2 font-medium">CTA clicks</th>
                    <th className="px-3 py-2 font-medium">Top source</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.key} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <Link
                          to={`/hq/content/analytics/${encodeURIComponent(article.key)}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {article.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{article.published_date || "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{formatCount(article.views)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatCount(article.readers)}</td>
                      <td className="px-3 py-2">{formatEngagement(article.avg_engagement_seconds)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatCount(article.cta_clicks)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{article.top_source || "—"}</td>
                    </tr>
                  ))}
                  {!articles.length ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-muted-foreground">
                        No Brief articles in this range.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
