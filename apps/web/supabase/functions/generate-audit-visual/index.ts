import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const bodySchema = z.object({
  visualType: z.enum(["hero", "score", "insight"]).default("hero"),
  prompt: z.string().min(80),
  promptData: z.object({
    client_name: z.string(),
    positioning_score: z.number(),
    audience_score: z.number(),
    authority_score: z.number(),
    messaging_score: z.number(),
    conversion_score: z.number(),
    messaging_angle: z.string(),
    primary_gap: z.string(),
    audience_pain: z.string(),
    brand_tone: z.string(),
    industry: z.string(),
    readiness_level: z.enum(["HOT", "WARM", "COLD"]),
    lls_memory_context: z.string().nullable().optional(),
  }),
});

async function requestImage(prompt: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "high",
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Image API failed (${response.status}): ${text}`);
  }

  const parsed = JSON.parse(text) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const first = parsed.data?.[0];
  if (first?.url) return first.url;
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  throw new Error("Image API returned no usable output.");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { visualType, prompt, promptData } = parsed.data;
    const qualityPrompt = [
      prompt,
      "Quality guard:",
      "- Must feel premium editorial and strategic.",
      "- Reject Canva template look, startup dashboard look, and generic marketing icons.",
      "- Use abstract geometric symbolism only.",
    ].join("\n");

    let imageUrl: string | null = null;
    let lastError: string | null = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        imageUrl = await requestImage(qualityPrompt);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    if (!imageUrl) throw new Error(lastError || "Could not generate visual.");

    return new Response(
      JSON.stringify({
        imageUrl,
        visualType,
        prompt,
        model: "gpt-image-1",
        client: promptData.client_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-audit-visual error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
