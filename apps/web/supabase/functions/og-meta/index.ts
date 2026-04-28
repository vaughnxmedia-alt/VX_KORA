/**
 * Open Graph / crawler HTML for blog posts.
 * Optional secret: SITE_URL — public site origin for canonical links (default https://www.jahknowspr.com).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Social media crawler user agents
const crawlerPatterns = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'Pinterest',
  'Slackbot',
  'TelegramBot',
  'WhatsApp',
  'Discordbot',
  'Googlebot',
  'bingbot',
  'applebot',
];

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return crawlerPatterns.some(pattern => ua.includes(pattern.toLowerCase()));
}

/** Match DB RLS: published, not hidden, and schedule instant reached. */
function isPostPubliclyShareable(post: {
  published_date: string | null;
  publish_scheduled_at?: string | null;
  status?: string | null;
  is_hidden?: boolean | null;
}): boolean {
  if (post.is_hidden === true) return false;
  if ((post.status ?? "published") !== "published") return false;
  if (!post.published_date) return false;
  const scheduled = post.publish_scheduled_at?.trim();
  if (scheduled) {
    return new Date(scheduled).getTime() <= Date.now();
  }
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  const todayNy = `${y}-${m}-${d}`;
  return post.published_date <= todayNy;
}

// HTML entity encoding to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get('id');
    const userAgent = req.headers.get('user-agent') || '';

    console.log(`OG Meta request - Post ID: ${postId}, User-Agent: ${userAgent}`);

    if (!postId) {
      return new Response('Missing post ID', { status: 400, headers: corsHeaders });
    }

    // Validate postId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(postId)) {
      return new Response('Invalid post ID format', { status: 400, headers: corsHeaders });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the blog post
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title, description, excerpt, cover_image_url, author_name, published_date, publish_scheduled_at, category, status, is_hidden')
      .eq('id', postId)
      .single();

    if (error || !post) {
      console.error('Post not found:', error);
      return new Response('Post not found', { status: 404, headers: corsHeaders });
    }

    if (!isPostPubliclyShareable(post)) {
      return new Response('Post not available', { status: 404, headers: corsHeaders });
    }

    console.log(`Found post: ${post.title}`);

    // Get the site URL from environment or construct it
    const siteUrl = (Deno.env.get("SITE_URL") || "https://www.jahknowspr.com").replace(/\/$/, "");
    const pathSegment = ((post.slug && String(post.slug).trim()) || post.id).replace(/^\/+|\/+$/g, "");
    const postUrl = `${siteUrl}/the-brief/${encodeURIComponent(pathSegment)}`;
    const rawCover = (post.cover_image_url || "").trim();
    const imageUrl = rawCover
      ? (rawCover.startsWith("http://") || rawCover.startsWith("https://")
        ? rawCover
        : `${siteUrl}${rawCover.startsWith("/") ? "" : "/"}${rawCover}`)
      : `${siteUrl}/og-share-jk-pr.png`;
    const description = post.description || post.excerpt || `Read ${post.title} on The Brief`;

    // Escape all dynamic content for HTML output
    const safeTitle = escapeHtml(post.title || '');
    const safeDescription = escapeHtml(description);
    const safeAuthor = escapeHtml(post.author_name || 'JahKnowsPR');
    const safeCategory = escapeHtml(post.category || 'Brand Strategy');
    const safePostUrl = escapeHtml(postUrl);
    const safeImageUrl = escapeHtml(imageUrl);
    const safePublishedDate = escapeHtml(post.published_date || '');

    console.log(`Serving OG meta HTML (crawler=${isCrawler(userAgent)})`);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0A1A35">
  <title>${safeTitle} | The Brief</title>
  <meta name="description" content="${safeDescription}">
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${safePostUrl}">
  <meta property="og:image" content="${safeImageUrl}">
  <meta property="og:image:width" content="940">
  <meta property="og:image:height" content="788">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:site_name" content="The Brief">
  <meta property="article:author" content="${safeAuthor}">
  <meta property="article:published_time" content="${safePublishedDate}">
  <meta property="article:section" content="${safeCategory}">
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImageUrl}">
  <meta name="twitter:image:alt" content="${safeTitle}">
  <meta name="twitter:creator" content="@jahknowspr">
  
  <!-- Redirect to actual page for any browser that renders this -->
  <meta http-equiv="refresh" content="0;url=${safePostUrl}">
  <link rel="canonical" href="${safePostUrl}">
</head>
<body>
  <p>Redirecting to <a href="${safePostUrl}">${safeTitle}</a>...</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src *; script-src 'none';",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    });

  } catch (error) {
    console.error('Error in og-meta function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
