import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  buildMemoryProjectionPrompt,
  findHardConstraintViolation,
  loadMemoryProjection,
  type MemoryProjection,
} from "../_shared/lls_memory_projection.ts";

const bodySchema = z.object({
  templateType: z.enum(["lead_confirmation"]).default("lead_confirmation"),
  lead: z.object({
    meetingId: z.string().uuid().optional(),
    fullName: z.string().optional(),
    businessName: z.string().optional(),
    email: z.string().optional(),
    meetingDate: z.string().optional(),
    timezone: z.string().optional(),
    sessionType: z.string().optional(),
    hostName: z.string().optional(),
  }),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "Server configuration incomplete" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const raw = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const allowedRoles = new Set(["admin", "author", "intern", "3pv"]);
    if (!roleRow || !allowedRoles.has(String(roleRow.role))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lead = parsed.data.lead;
    let memoryProjection: MemoryProjection = {
      priority_angles: [],
      avoid_patterns: [],
      prompt_modifiers: [],
      hard_constraints: [],
      projection_version: "lls-projection-v1:empty",
      strategy_id: null,
      proposal_id: null,
      messaging_angle: "unclassified",
      hook: "unclassified",
    };
    if (lead.meetingId) {
      const { data: meeting } = await supabase
        .from("meetings")
        .select("customer_id")
        .eq("id", lead.meetingId)
        .maybeSingle();
      if (meeting?.customer_id) {
        memoryProjection = await loadMemoryProjection(supabase, meeting.customer_id as string);
      }
    }
    const projectionPrompt = buildMemoryProjectionPrompt(memoryProjection);
    const prompt = [
      "Draft a concise, high-conviction confirmation email for a paid Strategy Session.",
      "Return strict JSON only with keys: subject, bodyHtml, rationale.",
      "Requirements:",
      "- Keep tone professional and warm.",
      "- Mention this is employee-approved communication.",
      "- Include exact booking context where provided.",
      "- bodyHtml should be valid HTML fragment (no markdown, no code fences).",
      "- Apply all active LLS behavior controls below. Hard constraints override copy generation.",
      projectionPrompt,
      `Lead context: ${JSON.stringify(lead)}`,
    ].join("\n");

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({ error: `Gemini request failed: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const text = String(
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    ).trim();

    let draft: { subject?: string; bodyHtml?: string; rationale?: string } = {};
    try {
      draft = JSON.parse(text);
    } catch {
      draft = {
        subject: "Confirmed — Your Strategy Session ($150)",
        bodyHtml: `<p>Hi ${escapeHtml(lead.fullName || "there")},</p><p>Your Strategy Session has been approved and confirmed. We will follow up with next steps shortly.</p>`,
        rationale: "Fallback used because model output was not valid JSON.",
      };
    }

    const violation = findHardConstraintViolation(
      `${draft.subject ?? ""}\n${draft.bodyHtml ?? ""}`,
      memoryProjection,
    );
    if (violation) {
      return new Response(
        JSON.stringify({ error: `Generated draft violated active LLS hard constraint: ${violation}` }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        subject: draft.subject || "Confirmed — Your Strategy Session ($150)",
        bodyHtml: draft.bodyHtml || "",
        rationale: draft.rationale || "",
        generatedBy: "gemini",
        lls_trace: {
          strategy_id: memoryProjection.strategy_id,
          proposal_id: memoryProjection.proposal_id,
          messaging_angle: memoryProjection.messaging_angle,
          hook: memoryProjection.hook,
          projection_version: memoryProjection.projection_version,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
