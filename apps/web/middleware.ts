import { rewrite } from "@vercel/functions";

/**
 * Guide routes have static HTML snapshots for social crawlers (correct og:url/title).
 * Real visitors should get the React SPA (HubPage) so the live UI matches the app design.
 */
const GUIDE_PATH_PREFIXES = [
  "/the-brief/before-you-build-the-brand-starter-guide",
  "/the-brief/before-you-build-the-brand/",
];

const CRAWLER_USER_AGENT =
  /facebookexternalhit|facebot|twitterbot|linkedinbot|pinterest|slackbot|telegrambot|whatsapp|discordbot|googlebot|bingbot|applebot|embedly|quora link preview|outbrain|vkshare|w3c_validator/i;

function isSocialOrSearchCrawler(userAgent: string) {
  return CRAWLER_USER_AGENT.test(userAgent);
}

function isGuidePath(pathname: string) {
  return GUIDE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix),
  );
}

export const config = {
  matcher: [
    "/the-brief/before-you-build-the-brand-starter-guide",
    "/the-brief/before-you-build-the-brand/:path*",
  ],
};

export default function middleware(request: Request) {
  const { pathname } = new URL(request.url);
  if (!isGuidePath(pathname)) {
    return;
  }

  const userAgent = request.headers.get("user-agent") || "";
  if (isSocialOrSearchCrawler(userAgent)) {
    return;
  }

  return rewrite(new URL("/index.html", request.url));
}
