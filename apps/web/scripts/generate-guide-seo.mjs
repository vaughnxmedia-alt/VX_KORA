import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const GUIDE_SOURCE = path.join(ROOT, "src/content/guides/beforeYouBuildTheBrand.ts");
const SITE_ORIGIN = (process.env.VITE_PUBLIC_SITE_URL || "https://www.jahknowspr.com")
  .replace(/\/$/, "")
  .replace("https://jahknowspr.com", "https://www.jahknowspr.com");
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-share-jk-pr.png`;
const GUIDE_CATEGORY = "Brand Foundation";
const HUB_DESCRIPTION =
  "Download the free JahKnowsPR starter guide and learn the brand foundation steps to complete before your website, social media, content, or visuals.";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function unescapeTsString(value = "") {
  return String(value).replace(/\\"/g, '"').replace(/\\n/g, "\n");
}

function parseGuideSource() {
  const src = fs.readFileSync(GUIDE_SOURCE, "utf8");
  const hubTitle = unescapeTsString(src.match(/GUIDE_HUB_TITLE = "([^"]+)"/)?.[1] || "Before You Build the Brand");
  const hubPath = src.match(/GUIDE_HUB_PATH = "([^"]+)"/)?.[1] || "/the-brief/before-you-build-the-brand-starter-guide";
  const seriesBase = src.match(/GUIDE_SERIES_BASE_PATH = "([^"]+)"/)?.[1] || "/the-brief/before-you-build-the-brand";
  const guideTitle = unescapeTsString(src.match(/GUIDE_TITLE = "([^"]+)"/)?.[1] || "Before You Build the Brand");

  const articles = [];
  const articlePattern =
    /slideNumber:\s*(\d+)[\s\S]*?blogTitle:\s*"([^"]+)"[\s\S]*?slug:\s*"([^"]+)"[\s\S]*?excerpt:\s*"([^"]+)"[\s\S]*?bodyCopy:\s*\[([\s\S]*?)\],/g;

  for (const match of src.matchAll(articlePattern)) {
    const bodyLines = [...match[5].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((item) => unescapeTsString(item[1]));
    articles.push({
      slug: match[3],
      slideNumber: Number(match[1]),
      blogTitle: unescapeTsString(match[2]),
      excerpt: unescapeTsString(match[4]),
      bodyCopy: bodyLines,
      path: `${seriesBase}/${match[3]}`,
    });
  }

  return { hubTitle, hubPath, guideTitle, articles };
}

function renderGuideHtml({
  title,
  description,
  pathname,
  section = GUIDE_CATEGORY,
  bodyHtml,
  relatedLinks = "",
  chips = "",
}) {
  const canonical = `${SITE_ORIGIN}${pathname}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    articleSection: section,
    url: canonical,
    publisher: {
      "@type": "Organization",
      name: "JahKnowsPR Firm",
      logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
    },
    image: DEFAULT_OG_IMAGE,
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <title>${escapeHtml(title)} | JahKnowsPR</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="JahKnowsPR" />
  <meta property="og:image" content="${DEFAULT_OG_IMAGE}" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="article:section" content="${escapeHtml(section)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <style>
    :root{--navy:#001f4f;--ink:#0a1a35;--muted:rgba(10,26,53,.68);--line:rgba(10,26,53,.12);--paper:#fbfaf7;--gold:#c8a24a}
    *{box-sizing:border-box}
    body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,Arial,sans-serif;line-height:1.72}
    a{color:var(--navy);font-weight:700;text-decoration:none}
    .topbar{position:sticky;top:0;z-index:10;background:rgba(251,250,247,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
    .topbar-inner{max-width:960px;margin:0 auto;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .brand{display:flex;align-items:center;gap:10px;color:var(--navy);font-weight:800}
    nav{display:flex;gap:14px;flex-wrap:wrap;font-size:14px}
    .hero{background:var(--navy);color:#fff;padding:56px 20px}
    .hero-inner{max-width:960px;margin:0 auto}
    .eyebrow{display:inline-block;border:1px solid rgba(200,162,74,.45);border-radius:999px;padding:8px 14px;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}
    h1{font-family:Georgia,'Times New Roman',serif;font-size:clamp(34px,8vw,58px);line-height:1.02;margin:18px 0 0}
    .lede{max-width:760px;font-size:18px;color:rgba(255,255,255,.84);margin-top:18px}
    main{max-width:760px;margin:0 auto;padding:40px 20px 56px}
    main h2{font-family:Georgia,'Times New Roman',serif;color:var(--navy);font-size:30px;margin:40px 0 16px}
    main p{font-size:18px;margin:0 0 22px}
    main ul{padding-left:1.3rem;margin:0 0 24px}
    main li{margin-bottom:10px}
    .cta{display:flex;gap:12px;flex-wrap:wrap;margin:36px 0}
    .button{display:inline-block;border-radius:999px;padding:12px 18px;border:1px solid var(--navy)}
    .button.primary{background:var(--navy);color:#fff}
    .button.gold{background:var(--gold);color:var(--navy);border-color:var(--gold)}
    .toc{max-width:960px;margin:0 auto;padding:0 20px 56px}
    .toc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .toc-card{border:1px solid var(--line);border-radius:18px;padding:18px;background:#fff}
    .toc-card h3{margin:8px 0 0;font-size:17px;line-height:1.25;color:var(--navy)}
    .toc-card p{margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.45}
    .slide{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
    footer{max-width:760px;margin:0 auto;padding:0 20px 48px;color:var(--muted);text-align:center}
    @media (max-width:720px){.toc-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="${SITE_ORIGIN}/"><span>JK</span><span>JahKnowsPR</span></a>
      <nav>
        <a href="${SITE_ORIGIN}/the-brief">The Brief</a>
        <a href="${canonical}">This Guide</a>
        <a href="${SITE_ORIGIN}/free-audit">Free Audit</a>
      </nav>
    </div>
  </div>
  <section class="hero">
    <div class="hero-inner">
      ${chips}
      <h1>${escapeHtml(title)}</h1>
      <p class="lede">${escapeHtml(description)}</p>
      <div class="cta">
        <a class="button gold" href="${canonical}#download-guide">Download the Full Guide</a>
        <a class="button" href="${SITE_ORIGIN}/free-audit">Start Free Brand Audit</a>
      </div>
    </div>
  </section>
  <main id="download-guide">
    ${bodyHtml}
    <div class="cta">
      <a class="button primary" href="${SITE_ORIGIN}/free-audit">Start Free Brand Audit</a>
      <a class="button" href="${SITE_ORIGIN}/brand-strategy-session">Book Strategy Session</a>
    </div>
  </main>
  ${relatedLinks}
  <footer><p>JahKnowsPR Firm / Brand Foundation</p></footer>
</body>
</html>`;
}

function renderHubHtml({ hubTitle, hubPath, guideTitle, articles }) {
  const bodyHtml = `
    <h2>What this guide is</h2>
    <p><strong>${escapeHtml(guideTitle)}</strong> is a beginner-friendly brand foundation guide for new business owners, founders, creators, and professionals who are building from the beginning.</p>
    <p>It is not a custom audit report. It is an educational starting point that helps you make better decisions before you spend money on websites, logos, content strategies, social media pages, or ads.</p>
    <h2>Who this guide is for</h2>
    <p>This guide is for anyone with an idea, new business, early brand, service, product, personal brand, creative practice, or professional offer that needs more clarity before going public.</p>
    <h2>Why brand foundation matters</h2>
    <p>Your foundation helps people understand what you do, who you help, why it matters, what makes you different, why they should trust you, and what step they should take next.</p>
    <p>Use the full guide to complete your foundation steps before moving into audit and execution.</p>
  `;

  const toc = articles
    .map(
      (article) => `<a class="toc-card" href="${SITE_ORIGIN}${article.path}">
        <p class="slide">Slide ${article.slideNumber}</p>
        <h3>${escapeHtml(article.blogTitle)}</h3>
        <p>${escapeHtml(article.excerpt)}</p>
      </a>`,
    )
    .join("\n");

  const relatedLinks = `<section class="toc"><h2 style="font-family:Georgia,serif;color:var(--navy);text-align:center;margin:0 0 24px">Full Table of Contents</h2><div class="toc-grid">${toc}</div></section>`;

  return renderGuideHtml({
    title: hubTitle,
    description: HUB_DESCRIPTION,
    pathname: hubPath,
    bodyHtml,
    relatedLinks,
    chips: `<span class="eyebrow">The Making of a Brand</span>`,
  });
}

function renderArticleHtml(article, hubPath) {
  const paragraphs = article.bodyCopy.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");
  const bodyHtml = `
    <p>This article expands on the <strong>${escapeHtml(article.blogTitle)}</strong> slide from the JahKnowsPR starter guide.</p>
    ${paragraphs}
    <p><a href="${SITE_ORIGIN}${hubPath}">Back to the full guide hub</a></p>
  `;

  return renderGuideHtml({
    title: article.blogTitle,
    description: article.excerpt,
    pathname: article.path,
    bodyHtml,
  });
}

function appendGuideUrlsToSitemap(paths) {
  const sitemapPath = path.join(PUBLIC_DIR, "sitemap.xml");
  if (!fs.existsSync(sitemapPath)) return;
  const xml = fs.readFileSync(sitemapPath, "utf8");
  if (xml.includes(`${SITE_ORIGIN}/the-brief/before-you-build-the-brand-starter-guide`)) return;

  const entries = paths
    .map(
      (pathname) => `  <url>
    <loc>${SITE_ORIGIN}${pathname}</loc>
    <priority>0.8</priority>
  </url>`,
    )
    .join("\n");

  const updated = xml.replace("</urlset>", `${entries}\n</urlset>`);
  fs.writeFileSync(sitemapPath, updated);
}

function writeGuidePage(relativeDir, html) {
  const directory = path.join(PUBLIC_DIR, relativeDir);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), html);
}

function main() {
  const { hubTitle, hubPath, guideTitle, articles } = parseGuideSource();
  if (!articles.length) {
    throw new Error("[guide-seo] Could not parse guide articles from beforeYouBuildTheBrand.ts");
  }

  const hubDir = hubPath.replace(/^\//, "");
  writeGuidePage(hubDir, renderHubHtml({ hubTitle, hubPath, guideTitle, articles }));

  for (const article of articles) {
    const articleDir = article.path.replace(/^\//, "");
    writeGuidePage(articleDir, renderArticleHtml(article, hubPath));
  }

  appendGuideUrlsToSitemap([hubPath, ...articles.map((article) => article.path)]);

  console.log(`[guide-seo] Wrote hub + ${articles.length} guide article snapshots.`);
}

main();
