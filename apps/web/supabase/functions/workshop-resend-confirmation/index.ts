/**
 * Owner or strategist resend. Does not create a registration.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendWorkshopConfirmationEmail } from "../_shared/workshop-email.ts";

const bodySchema = z.object({ registrationId: z.string().uuid() });

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!jwt || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: role } = await supabase.rpc("get_hq_role", { check_uid: userData.user.id });
  if (role !== "owner" && role !== "strategist") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid registration" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: claim, error } = await supabase.rpc("claim_workshop_confirmation_email", {
    p_registration_id: parsed.data.registrationId,
    p_force: true,
  });
  if (error || !claim?.ok) {
    return new Response(JSON.stringify({ error: "Only a confirmed registration can be resent." }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!claim.claimed) {
    return new Response(JSON.stringify({ error: "A confirmation email is already being sent." }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sent = await sendWorkshopConfirmationEmail(supabase, claim);
  return new Response(JSON.stringify({ ok: sent.sent, error: sent.error ?? null }), {
    status: sent.sent ? 200 : 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
