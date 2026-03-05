import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://developing-site.lovable.app",
  "https://jahknowspr.com",
  "https://www.jahknowspr.com",
];

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

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
];

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return crawlerPatterns.some(pattern => ua.includes(pattern.toLowerCase()));
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
      .select('id, title, description, excerpt, cover_image_url, author_name, published_date, category')
      .eq('id', postId)
      .single();

    if (error || !post) {
      console.error('Post not found:', error);
      return new Response('Post not found', { status: 404, headers: corsHeaders });
    }

    console.log(`Found post: ${post.title}`);

    // Get the site URL from environment or construct it
    const siteUrl = Deno.env.get('SITE_URL') || 'https://developing-site.lovable.app';
    const postUrl = `${siteUrl}/the-brief/${post.id}`;
    const imageUrl = post.cover_image_url || `${siteUrl}/logo.svg`;
    const description = post.description || post.excerpt || `Read ${post.title} on The Brief`;

    // Escape all dynamic content for HTML output
    const safeTitle = escapeHtml(post.title || '');
    const safeDescription = escapeHtml(description);
    const safeAuthor = escapeHtml(post.author_name || 'JahKnowsPR');
    const safeCategory = escapeHtml(post.category || 'Brand Strategy');
    const safePostUrl = escapeHtml(postUrl);
    const safeImageUrl = escapeHtml(imageUrl);
    const safePublishedDate = escapeHtml(post.published_date || '');

    // For crawlers, return HTML with OG meta tags
    if (isCrawler(userAgent)) {
      console.log('Serving OG meta HTML to crawler');
      
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    }

    // For regular browsers, redirect to the actual post
    console.log('Redirecting regular browser to post');
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': postUrl,
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
