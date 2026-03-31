const allowedOrigins = [
  "https://developing-site.lovable.app",
  "https://jahknowspr.com",
  "https://www.jahknowspr.com",
  "http://localhost:5173",
  "http://localhost:8095",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8095",
];

/**
 * Echo common dev origins so the browser CORS check passes (e.g. Vite --host LAN IP, non-default ports).
 * Does not replace auth; these are public booking functions only.
 */
function isLikelyLocalDevOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    const h = u.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return true;
    if (h === "0.0.0.0") return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    return false;
  } catch {
    return false;
  }
}

export function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : isLikelyLocalDevOrigin(origin)
      ? origin
      : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Backwards-compatible static export for simple cases
export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://developing-site.lovable.app",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
