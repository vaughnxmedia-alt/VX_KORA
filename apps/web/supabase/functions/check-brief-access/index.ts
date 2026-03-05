import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { access_token } = await req.json();

    if (!access_token || typeof access_token !== "string") {
      return new Response(
        JSON.stringify({ hasAccess: false, error: "Access token is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token format (hex string, 64 chars = 32 bytes)
    if (!/^[a-f0-9]{64}$/.test(access_token)) {
      return new Response(
        JSON.stringify({ hasAccess: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabaseAdmin
      .from("subscribers")
      .select("id")
      .eq("access_token", access_token)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return new Response(JSON.stringify({ hasAccess: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      console.error("Database error:", error.message);
      return new Response(
        JSON.stringify({ error: "An error occurred while checking access." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ hasAccess: !!data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Request error:", err);
    return new Response(
      JSON.stringify({ error: "Invalid request." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
