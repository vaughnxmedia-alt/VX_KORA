/** Production + browser preview hosts. Auth/validation is enforced inside each function. */
const allowedOrigins = [
  "https://jahknowspr.com",
  "https://www.jahknowspr.com",
  "http://localhost:5173",
  "http://localhost:8095",
  "http://localhost:8096",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8095",
  "http://127.0.0.1:8096",
];

export function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allowedOrigin = origin || allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Backwards-compatible static export for simple cases
export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://jahknowspr.com",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
