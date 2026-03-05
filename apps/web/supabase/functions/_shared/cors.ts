const allowedOrigins = [
  "https://developing-site.lovable.app",
  "https://jahknowspr.com",
  "https://www.jahknowspr.com",
];

export function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Backwards-compatible static export for simple cases
export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://developing-site.lovable.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
