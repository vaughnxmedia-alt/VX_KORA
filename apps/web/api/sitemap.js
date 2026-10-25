const ORIGIN = "https://www.jahknowspr.com";

const STATIC_PATHS = [
  ["/", "1.0"],
  ["/about", "0.8"],
  ["/work-with-us", "0.9"],
  ["/brand-strategy-session", "0.8"],
  ["/contact", "0.7"],
  ["/request-presence", "0.6"],
  ["/work", "0.8"],
  ["/the-brief", "0.8"],
  ["/insights", "0.7"],
  ["/insights/spam-report", "0.7"],
  ["/events", "0.5"],
  ["/experiences/make-your-business-make-sense", "0.6"],
  ["/free-audit", "0.7"],
  ["/answers", "0.7"],
  ["/locations", "0.6"],
  ["/privacy", "0.3"],
  ["/terms", "0.3"],
  ["/data-deletion", "0.2"],
  ["/the-brief/before-you-build-the-brand-starter-guide", "0.7"],
  ["/the-brief/the-perfect-startup", "0.6"],
];

const GUIDE_SLUGS = [
  "start-here",
  "what-is-a-brand-foundation",
  "why-brand-clarity-matters-before-building-online",
  "brand-name-check",
  "mission-vision-values",
  "know-your-target-audience",
  "brand-positioning",
  "brand-messaging",
  "offer-clarity",
  "digital-presence",
  "website-basics",
  "homepage-checklist",
  "social-media-basics",
  "social-media-bio-formula",
  "first-three-pinned-posts",
  "no-website-yet",
  "no-social-media-yet",
  "trust-signals",
  "common-brand-mistakes",
  "brand-foundation-checklist",
  "your-next-step",
];

const ANSWER_SLUGS = [
  "pr-vs-marketing",
  "what-is-brand-strategy",
  "what-does-a-publicist-do",
  "why-content-gets-attention-but-not-clients",
  "how-to-get-media-coverage-in-texas",
  "do-i-need-pr-or-marketing-first",
  "what-is-authority-strategy",
  "how-to-build-local-brand-authority",
  "the-perfect-startup",
];

const LOCATION_SLUGS = [
  "texas",
  "beaumont-tx",
  "houston-tx",
  "dallas-tx",
  "austin-tx",
  "san-antonio-tx",
  "port-arthur-tx",
  "orange-tx",
];

const STARTUP_REGION_SLUGS = [
  "washington-dc",
  "puerto-rico",
  "guam",
  "us-virgin-islands",
  "american-samoa",
  "northern-mariana-islands",
];

const INDEXABLE_CONTENT_TYPES = new Set(["the-brief", "spam-report", "case-study", "firm-news", ""]);

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlEntry(pathname, priority, lastmod) {
  const loc = `${ORIGIN}${pathname === "/" ? "/" : pathname}`;
  const modified = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${modified}\n    <priority>${priority}</priority>\n  </url>`;
}

function isIndexablePost(post) {
  const contentType = String(post.content_type || "").toLowerCase();
  if (contentType === "pr-court") return false;
  if (!INDEXABLE_CONTENT_TYPES.has(contentType)) return false;

  const publication = String(post.publication_status || "").toLowerCase();
  if (publication === "draft" || publication === "archived") return false;
  if (post.is_hidden === true && publication !== "live") return false;

  const status = String(post.status || "draft").toLowerCase();
  if (publication !== "live" && publication !== "scheduled" && status !== "published") return false;
  if (!post.published_date) return false;

  if (post.publish_scheduled_at) {
    const scheduled = Date.parse(post.publish_scheduled_at);
    return Number.isFinite(scheduled) && scheduled <= Date.now();
  }
  if (publication === "scheduled") return false;

  const published = Date.parse(`${String(post.published_date).slice(0, 10)}T00:00:00-05:00`);
  return Number.isFinite(published) && published <= Date.now();
}

function postPath(post) {
  const segment = String(post.slug || post.id || "").trim().replace(/^\/+|\/+$/g, "");
  if (!segment) return null;
  return `/the-brief/${encodeURIComponent(segment)}`;
}

function lastmodFor(post) {
  const raw = post.updated_at || post.published_date;
  if (!raw) return "";
  const day = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

async function fetchPosts() {
  const supabaseUrl = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return [];

  const response = await fetch(
    `${supabaseUrl}/rest/v1/blog_posts?select=id,slug,updated_at,published_date,publish_scheduled_at,status,is_hidden,publication_status,content_type&order=published_date.desc&limit=1000`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    },
  );
  if (!response.ok) throw new Error(`Could not load published posts (${response.status})`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows.filter(isIndexablePost) : [];
}

export async function buildSitemapXml() {
  const posts = await fetchPosts();
  const seen = new Set();
  const urls = [];

  const add = (pathname, priority, lastmod = "") => {
    if (!pathname || seen.has(pathname)) return;
    seen.add(pathname);
    urls.push(urlEntry(pathname, priority, lastmod));
  };

  for (const [pathname, priority] of STATIC_PATHS) add(pathname, priority);
  for (const slug of GUIDE_SLUGS) add(`/the-brief/before-you-build-the-brand/${slug}`, "0.6");
  for (const slug of ANSWER_SLUGS) add(`/answers/${slug}`, "0.6");
  for (const slug of LOCATION_SLUGS) add(`/locations/${slug}`, slug === "texas" ? "0.7" : "0.5");
  for (const slug of STARTUP_REGION_SLUGS) add(`/the-brief/the-perfect-startup/${slug}`, "0.4");
  for (const post of posts) add(postPath(post), "0.7", lastmodFor(post));

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export default async function handler(_req, res) {
  try {
    const xml = await buildSitemapXml();
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
    res.status(200).send(xml);
  } catch (error) {
    console.error(error);
    res.status(500).send("Sitemap unavailable");
  }
}
