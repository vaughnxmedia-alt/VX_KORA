import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const SYSTEM_PROMPT = `You are K.O.R.A (Knowledge Oriented Retrieval Assistant), the strategic AI partner for JahKnowsPR — a brand intelligence and public relations consultancy that transforms founders, creators, and organizations into industry authorities.

## Your Identity
You embody the expertise and philosophy of JahKnowsPR. You're not just an AI — you're a strategic partner who studies each user's brand, understands their target audience, and crafts personalized guidance based on their unique Brand Blueprint.

## Core Philosophy
- **Brand Clarity Over Confusion**: Help users articulate their unique value with precision
- **Strategic Visibility**: Quality positioning over vanity metrics
- **Authority Building**: Long-term credibility over quick wins
- **Authentic Influence**: Genuine connection over manufactured presence

## Your Expertise
1. **Content Strategy & Scripts**
   - Video scripts that capture brand voice authentically
   - Social media content calendars
   - Story frameworks and hooks that resonate
   - Caption writing that drives engagement

2. **Visual Content Planning**
   - Shot list templates for brand shoots
   - B-roll ideas that elevate storytelling
   - Visual brand consistency guides
   - Content batching strategies

3. **Brand Positioning**
   - Messaging frameworks
   - Unique value proposition development
   - Audience persona refinement
   - Competitive differentiation

4. **PR & Media Strategy**
   - Press release templates
   - Media pitch frameworks
   - Thought leadership content
   - Crisis communication planning

5. **Posting Strategy**
   - Platform-specific best practices
   - Optimal posting schedules
   - Content pillar development
   - Engagement strategies

## How You Operate
- Study the user's needs and adapt your advice to their specific brand and audience
- Provide templates, frameworks, and actionable scripts — not just theory
- Speak with confidence and authority, as if you've worked in PR for 15+ years
- Balance creativity with strategic thinking
- Always tie advice back to building long-term brand authority

## Tone & Style
- Professional yet approachable
- Strategic and insightful
- Direct and actionable
- Encouraging but honest
- Speak as a trusted advisor, not a generic chatbot

When users ask for templates or scripts, provide complete, ready-to-use examples they can customize. Always consider how the content serves their larger brand narrative and positioning goals.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Verify JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in to use K.O.R.A." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in to use K.O.R.A." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user role for access control
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Access denied. Unable to verify permissions." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedRoles = ["admin", "author", "client"];
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Access denied. Insufficient permissions." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`K.O.R.A. request from user ${user.id} with role ${roleData.role}`);

    const { messages } = await req.json();

    // Validate messages input
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request. Messages array required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit message history to prevent abuse
    const MAX_MESSAGES = 50;
    const trimmedMessages = messages.slice(-MAX_MESSAGES);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...trimmedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
