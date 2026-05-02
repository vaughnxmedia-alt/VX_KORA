import fs from "node:fs";
import path from "node:path";

const SITE_ORIGIN = (process.env.VITE_PUBLIC_SITE_URL || "https://www.jahknowspr.com")
  .replace(/\/$/, "")
  .replace("https://jahknowspr.com", "https://www.jahknowspr.com");
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const STATIC_BRIEF_DIR = path.join(PUBLIC_DIR, "the-brief");

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInlineMarkdown(value = "") {
  const input = String(value);
  let output = "";
  let lastIndex = 0;
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g;
  for (const match of input.matchAll(linkPattern)) {
    output += escapeHtml(input.slice(lastIndex, match.index));
    const href = match[2].startsWith("/")
      ? `${SITE_ORIGIN}${match[2]}`
      : match[2];
    output += `<a href="${escapeHtml(href)}">${escapeHtml(match[1])}</a>`;
    lastIndex = (match.index ?? 0) + match[0].length;
  }
  output += escapeHtml(input.slice(lastIndex));
  return output
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function cleanSegment(post) {
  return String(post.slug || post.id).trim().replace(/^\/+|\/+$/g, "");
}

function isLivePost(post) {
  if (post.is_hidden) return false;
  if ((post.status || "draft") !== "published") return false;
  if (!post.published_date) return false;
  if (post.publish_scheduled_at) return Date.parse(post.publish_scheduled_at) <= Date.now();
  return Date.parse(`${String(post.published_date).slice(0, 10)}T00:00:00-05:00`) <= Date.now();
}

function basicMarkdownToHtml(markdown = "") {
  const lines = String(markdown).split(/\r?\n/);
  const html = [];
  let listOpen = false;
  let listTag = "ul";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (listOpen) {
        html.push(`</${listTag}>`);
        listOpen = false;
      }
      continue;
    }
    if (line.startsWith("### ")) {
      if (listOpen) {
        html.push(`</${listTag}>`);
        listOpen = false;
      }
      html.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      if (listOpen) {
        html.push(`</${listTag}>`);
        listOpen = false;
      }
      html.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      if (listOpen) {
        html.push(`</${listTag}>`);
        listOpen = false;
      }
      html.push(`<h2>${renderInlineMarkdown(line.slice(2))}</h2>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (listOpen && listTag !== "ul") {
        html.push(`</${listTag}>`);
        listOpen = false;
      }
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
        listTag = "ul";
      }
      html.push(`<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      if (listOpen && listTag !== "ol") {
        html.push(`</${listTag}>`);
        listOpen = false;
      }
      if (!listOpen) {
        html.push("<ol>");
        listOpen = true;
        listTag = "ol";
      }
      html.push(`<li>${renderInlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>`);
    } else {
      if (listOpen) {
        html.push(`</${listTag}>`);
        listOpen = false;
      }
      html.push(`<p>${renderInlineMarkdown(line)}</p>`);
    }
  }
  if (listOpen) html.push(`</${listTag}>`);
  return html.join("\n");
}

function renderPostHtml(post, relatedPosts) {
  const segment = cleanSegment(post);
  const canonical = `${SITE_ORIGIN}/the-brief/${encodeURIComponent(segment)}`;
  const title = post.title || "The Brief";
  const description = post.description || post.excerpt || `Read ${title} on The Brief.`;
  const image = post.cover_image_url || `${SITE_ORIGIN}/og-share-jk-pr.png`;
  const relatedLinks = relatedPosts
    .filter((item) => item.id !== post.id)
    .slice(0, 3)
    .map((item) => {
      const url = `${SITE_ORIGIN}/the-brief/${encodeURIComponent(cleanSegment(item))}`;
      return `<li><a href="${url}">${escapeHtml(item.title)}</a></li>`;
    })
    .join("\n");
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    author: {
      "@type": "Organization",
      name: "JahKnowsPR Firm",
    },
    publisher: {
      "@type": "Organization",
      name: "JahKnowsPR Firm",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/og-share-jk-pr.png`,
      },
    },
    datePublished: post.published_date,
    dateModified: post.updated_at || post.published_date,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    url: canonical,
    image,
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <title>${escapeHtml(title)} | The Brief | JahKnowsPR</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="JahKnowsPR" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="article:author" content="JahKnowsPR Firm" />
  <meta property="article:published_time" content="${escapeHtml(post.published_date || "")}" />
  <meta property="article:section" content="${escapeHtml(post.category || "Brand Strategy")}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <style>
    body{margin:0;background:#f7f3ea;color:#0a1a35;font-family:Inter,Arial,sans-serif;line-height:1.65}
    header,main,footer{max-width:760px;margin:0 auto;padding:32px 20px}
    nav{display:flex;gap:18px;flex-wrap:wrap;font-size:14px}
    a{color:#0a1a35;font-weight:700;text-underline-offset:3px}
    h1{font-family:Georgia,serif;font-size:clamp(42px,8vw,76px);line-height:.95;margin:48px 0 18px}
    h2{font-family:Georgia,serif;font-size:32px;margin-top:44px}
    h3{font-family:Georgia,serif;font-size:24px;margin-top:32px}
    .meta,.description{color:rgba(10,26,53,.72)}
    .cta{border-top:1px solid rgba(10,26,53,.16);border-bottom:1px solid rgba(10,26,53,.16);padding:24px 0;margin:44px 0;display:flex;gap:14px;flex-wrap:wrap}
    .button{display:inline-block;border:1px solid #0a1a35;border-radius:999px;padding:10px 16px;text-decoration:none}
    .button.primary{background:#0a1a35;color:#fff}
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="${SITE_ORIGIN}/">JahKnowsPR</a>
      <a href="${SITE_ORIGIN}/the-brief">The Brief</a>
      <a href="${SITE_ORIGIN}/free-audit">Free Audit</a>
      <a href="${SITE_ORIGIN}/brand-strategy-session">Strategy Session</a>
    </nav>
    <p class="meta">${escapeHtml(post.category || "The Brief")} · ${escapeHtml(post.published_date || "")} · ${escapeHtml(post.read_time || "")}</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="description">${escapeHtml(description)}</p>
  </header>
  <main>
    ${basicMarkdownToHtml(post.content || post.description || "")}
    <section class="cta">
      <a class="button primary" href="${SITE_ORIGIN}/free-audit">Start Free Audit</a>
      <a class="button" href="${SITE_ORIGIN}/brand-strategy-session">Book Strategy Session</a>
    </section>
    ${relatedLinks ? `<section><h2>Continue Reading</h2><ul>${relatedLinks}</ul></section>` : ""}
  </main>
  <footer>
    <p>JahKnowsPR Firm / Brand Diagnosis</p>
  </footer>
</body>
</html>`;
}

function renderSitemap(posts) {
  const locationPaths = [
    "/locations",
    "/locations/texas",
    "/locations/beaumont-tx",
    "/locations/port-arthur-tx",
    "/locations/orange-tx",
    "/locations/houston-tx",
    "/locations/dallas-tx",
    "/locations/san-antonio-tx",
    "/locations/austin-tx",
  ];
  const answerPaths = [
    "/answers",
    "/answers/pr-vs-marketing",
    "/answers/what-is-brand-strategy",
    "/answers/what-does-a-publicist-do",
    "/answers/why-content-gets-attention-but-not-clients",
    "/answers/how-to-get-media-coverage-in-texas",
    "/answers/do-i-need-pr-or-marketing-first",
    "/answers/what-is-authority-strategy",
    "/answers/how-to-build-local-brand-authority",
  ];
  const servicePaths = [
    "/work-with-me",
    "/free-audit",
    "/brand-strategy-session",
    "/strategy-session",
    "/consultation/creative-production",
    "/consultation/campaign-retainer",
  ];
  const staticUrls = [
    ["/", "1.0"],
    ["/the-brief", "0.7"],
    ...servicePaths.map((pathname) => [pathname, pathname === "/free-audit" ? "0.9" : "0.8"]),
    ...locationPaths.map((pathname) => [pathname, pathname === "/locations/texas" ? "0.8" : "0.7"]),
    ...answerPaths.map((pathname) => [pathname, pathname === "/answers" ? "0.8" : "0.7"]),
  ];
  const urls = staticUrls.map(([pathname, priority]) => `  <url>
    <loc>${SITE_ORIGIN}${pathname === "/" ? "/" : pathname}</loc>
    <priority>${priority}</priority>
  </url>`);
  for (const post of posts) {
    const lastmod = String(post.updated_at || post.published_date || "").slice(0, 10);
    urls.push(`  <url>
    <loc>${SITE_ORIGIN}/the-brief/${encodeURIComponent(cleanSegment(post))}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <priority>0.7</priority>
  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

async function main() {
  loadDotEnv();
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey) {
    console.warn("[blog-seo] Missing Supabase env; keeping existing sitemap/static blog files.");
    return;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/blog_posts?select=id,slug,title,description,excerpt,content,category,read_time,published_date,publish_scheduled_at,updated_at,author_name,cover_image_url,status,is_hidden&is_hidden=eq.false&status=eq.published&order=published_date.desc`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!response.ok) throw new Error(`[blog-seo] Could not fetch blog posts: ${await response.text()}`);

  const posts = (await response.json()).filter(isLivePost);
  fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap.xml"), renderSitemap(posts));
  fs.rmSync(STATIC_BRIEF_DIR, { recursive: true, force: true });

  for (const post of posts) {
    const segment = cleanSegment(post);
    const directory = path.join(STATIC_BRIEF_DIR, segment);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "index.html"), renderPostHtml(post, posts));
  }

  console.log(`[blog-seo] Wrote sitemap and ${posts.length} static blog snapshots.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
