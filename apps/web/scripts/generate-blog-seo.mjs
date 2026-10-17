import fs from "node:fs";
import path from "node:path";

const SITE_ORIGIN = (process.env.VITE_PUBLIC_SITE_URL || "https://www.jahknowspr.com")
  .replace(/\/$/, "")
  .replace("https://jahknowspr.com", "https://www.jahknowspr.com");
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const STATIC_BRIEF_DIR = path.join(PUBLIC_DIR, "the-brief");
const AUTHOR_PROFILE_IMAGES = {
  "jah jah": "/authors/jah-jah-profile.png",
};

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

function formatDisplayDate(value = "") {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getAuthorInitial(name = "") {
  return String(name || "JahKnowsPR").trim().charAt(0).toUpperCase() || "J";
}

function getAuthorProfileImage(name = "") {
  const path = AUTHOR_PROFILE_IMAGES[String(name).trim().toLowerCase()];
  return path ? `${SITE_ORIGIN}${path}` : null;
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
  let listItemOpen = false;

  const closeListItem = () => {
    if (listItemOpen) {
      html.push("</li>");
      listItemOpen = false;
    }
  };

  const closeList = () => {
    if (listOpen) {
      closeListItem();
      html.push(`</${listTag}>`);
      listOpen = false;
    }
  };

  const openList = (tag) => {
    if (listOpen && listTag !== tag) closeList();
    if (!listOpen) {
      html.push(`<${tag}>`);
      listOpen = true;
      listTag = tag;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      html.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      closeList();
      html.push(`<h2>${renderInlineMarkdown(line.slice(2))}</h2>`);
    } else if (/^[-*]\s+/.test(line)) {
      openList("ul");
      closeListItem();
      html.push(`<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}`);
      listItemOpen = true;
    } else if (/^\d+\.\s+/.test(line)) {
      openList("ol");
      closeListItem();
      html.push(`<li>${renderInlineMarkdown(line.replace(/^\d+\.\s+/, ""))}`);
      listItemOpen = true;
    } else {
      if (listOpen) {
        html.push(`<p>${renderInlineMarkdown(line)}</p>`);
      } else {
        html.push(`<p>${renderInlineMarkdown(line)}</p>`);
      }
    }
  }
  closeList();
  return html.join("\n");
}

function renderPostHtml(post, relatedPosts) {
  const segment = cleanSegment(post);
  const canonical = `${SITE_ORIGIN}/the-brief/${encodeURIComponent(segment)}`;
  const title = post.title || "The Brief";
  const description = post.description || post.excerpt || `Read ${title} on The Brief.`;
  const tagline = post.tagline || description;
  const image = post.cover_image_url || `${SITE_ORIGIN}/og-share-jk-pr.png`;
  const displayDate = formatDisplayDate(post.published_date);
  const authorName = post.author_name || "JahKnowsPR Firm";
  const authorProfileImage = getAuthorProfileImage(authorName);
  const relatedLinks = relatedPosts
    .filter((item) => item.id !== post.id)
    .slice(0, 3)
    .map((item) => {
      const url = `${SITE_ORIGIN}/the-brief/${encodeURIComponent(cleanSegment(item))}`;
      return `<article class="related-card">
        <a href="${url}">${escapeHtml(item.title)}</a>
        <p>${escapeHtml(item.description || item.excerpt || "")}</p>
      </article>`;
    })
    .join("\n");
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    author: {
      "@type": "Organization",
      name: authorName,
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
  <meta property="og:image:width" content="940" />
  <meta property="og:image:height" content="788" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="article:author" content="${escapeHtml(authorName)}" />
  <meta property="article:published_time" content="${escapeHtml(post.published_date || "")}" />
  <meta property="article:section" content="${escapeHtml(post.category || "Brand Strategy")}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <style>
    :root{--navy:#001f4f;--ink:#0a1a35;--muted:rgba(10,26,53,.68);--line:rgba(10,26,53,.12);--paper:#fbfaf7;--soft:#f7f3ea;--gold:#c8a24a}
    *{box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,Arial,sans-serif;line-height:1.72;-webkit-font-smoothing:antialiased}
    a{color:var(--navy);font-weight:700;text-underline-offset:3px;touch-action:manipulation;overflow-wrap:anywhere}
    .topbar{position:sticky;top:0;z-index:10;background:rgba(251,250,247,.9);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
    .topbar-inner{max-width:760px;margin:0 auto;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}
    .brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--navy);font-weight:800;letter-spacing:.02em}
    .brand-mark{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--navy);color:white;font-family:Georgia,serif;font-weight:700}
    nav{display:flex;gap:16px;flex-wrap:wrap;font-size:14px}
    nav a{font-weight:700}
    .hero-image{position:relative;height:360px;overflow:hidden;background:var(--soft)}
    .hero-image img{width:100%;height:100%;object-fit:cover;display:block}
    .hero-image::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,var(--paper),rgba(251,250,247,.42),rgba(10,26,53,.08))}
    .article{max-width:760px;margin:0 auto;padding:0 20px 56px}
    .article.has-image{margin-top:-86px;position:relative;z-index:2}
    .headline-card{background:rgba(251,250,247,.92);border:1px solid rgba(10,26,53,.08);box-shadow:0 24px 70px rgba(10,26,53,.10);padding:28px 20px 26px;text-align:center}
    .chips{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:22px}
    .chip{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;background:#fff;padding:7px 12px;font-size:13px;font-weight:800;color:var(--navy)}
    .featured{color:var(--navy);font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:800}
    h1{font-family:Georgia,'Times New Roman',serif;font-size:clamp(42px,11vw,72px);line-height:.98;letter-spacing:-.045em;margin:0;color:var(--navy)}
    .description{font-size:clamp(18px,4.6vw,24px);line-height:1.55;color:var(--muted);max-width:620px;margin:24px auto 0}
    .byline{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:18px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:20px 0;margin-top:28px;color:var(--muted);font-size:14px}
    .author{display:flex;align-items:center;gap:10px}
    .avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(0,31,79,.1);color:var(--navy);font-weight:800;overflow:hidden;border:1px solid var(--line);flex:0 0 auto}
    .avatar img{width:100%;height:100%;object-fit:cover;display:block}
    .author strong{display:block;color:var(--ink);line-height:1.1}
    .author span{display:block;font-size:12px;line-height:1.2}
    main{max-width:680px;margin:0 auto;padding:48px 20px 0}
    main p{font-size:18px;margin:0 0 28px;color:rgba(10,26,53,.88)}
    main h2{font-family:Georgia,'Times New Roman',serif;color:var(--navy);font-size:clamp(30px,7vw,42px);line-height:1.08;letter-spacing:-.03em;margin:56px 0 22px}
    main h3{font-family:Georgia,'Times New Roman',serif;color:var(--navy);font-size:26px;line-height:1.2;margin:40px 0 18px}
    main ul,main ol{padding-left:1.4rem;margin:0 0 30px;color:rgba(10,26,53,.88);font-size:18px}
    main li{margin-bottom:12px;padding-left:4px}
    main li p{font-size:inherit;line-height:inherit;margin:.35rem 0 0}
    blockquote{font-family:Georgia,'Times New Roman',serif;color:var(--navy);font-size:24px;line-height:1.45;text-align:center;margin:46px 0;padding:24px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
    .cta{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:26px 0;margin:52px 0;display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
    .button{display:inline-block;border:1px solid var(--navy);border-radius:999px;padding:11px 18px;text-decoration:none}
    .button.primary{background:var(--navy);color:#fff}
    .related{max-width:1040px;margin:0 auto;padding:56px 20px;background:rgba(10,26,53,.025);border-top:1px solid var(--line)}
    .related h2{font-family:Georgia,'Times New Roman',serif;color:var(--navy);font-size:34px;margin:0 0 24px;text-align:center}
    .related-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
    .related-card{background:#fff;border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 16px 40px rgba(10,26,53,.06)}
    .related-card a{display:block;font-size:17px;line-height:1.25;text-decoration:none}
    .related-card p{margin:10px 0 0;color:var(--muted);font-size:14px;line-height:1.45}
    footer{max-width:760px;margin:0 auto;padding:34px 20px 48px;color:var(--muted);text-align:center}
    @media (max-width:640px){
      .topbar-inner{align-items:flex-start;flex-direction:column;padding:14px 20px}
      nav{gap:12px;font-size:13px}
      .hero-image{height:320px}
      .article.has-image{margin-top:-68px}
      .headline-card{padding:24px 16px}
      .byline{align-items:flex-start;justify-content:flex-start}
      main{padding-top:38px}
      .related-grid{grid-template-columns:1fr}
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="${SITE_ORIGIN}/" aria-label="JahKnowsPR home">
        <span class="brand-mark">JK</span>
        <span>JahKnowsPR</span>
      </a>
    <nav>
      <a href="${SITE_ORIGIN}/">JahKnowsPR</a>
      <a href="${SITE_ORIGIN}/the-brief">The Brief</a>
      <a href="${SITE_ORIGIN}/free-audit">Free Audit</a>
      <a href="${SITE_ORIGIN}/brand-strategy-session">Strategy Session</a>
    </nav>
    </div>
  </div>
  ${post.cover_image_url ? `<div class="hero-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" /></div>` : ""}
  <article class="article${post.cover_image_url ? " has-image" : ""}">
    <header class="headline-card">
      <div class="chips">
        <span class="chip">${escapeHtml(post.category || "The Brief")}</span>
        ${post.is_featured ? `<span class="featured">Featured</span>` : ""}
      </div>
      <h1>${escapeHtml(title)}</h1>
      <p class="description">${escapeHtml(tagline)}</p>
      <div class="byline">
        <div class="author">
          <span class="avatar">${
            authorProfileImage
              ? `<img src="${escapeHtml(authorProfileImage)}" alt="${escapeHtml(authorName)}" />`
              : escapeHtml(getAuthorInitial(authorName))
          }</span>
          <span><strong>${escapeHtml(authorName)}</strong><span>Brand Strategist</span></span>
        </div>
        ${displayDate ? `<span>${escapeHtml(displayDate)}</span>` : ""}
        ${post.read_time ? `<span>${escapeHtml(post.read_time)}</span>` : ""}
      </div>
    </header>
  </article>
  <main>
    ${basicMarkdownToHtml(post.content || post.description || "")}
    <section class="cta">
      <a class="button primary" href="${SITE_ORIGIN}/free-audit">Start Free Audit</a>
      <a class="button" href="${SITE_ORIGIN}/brand-strategy-session">Book Strategy Session</a>
    </section>
  </main>
  ${relatedLinks ? `<section class="related"><h2>Continue Reading</h2><div class="related-grid">${relatedLinks}</div></section>` : ""}
  <footer>
    <p>JahKnowsPR Firm / Brand Diagnosis</p>
  </footer>
</body>
</html>`;
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
  fs.rmSync(STATIC_BRIEF_DIR, { recursive: true, force: true });

  for (const post of posts) {
    const segment = cleanSegment(post);
    const directory = path.join(STATIC_BRIEF_DIR, segment);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "index.html"), renderPostHtml(post, posts));
  }

  console.log(`[blog-seo] Wrote ${posts.length} static blog snapshots. Sitemap is served live from /sitemap.xml.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
