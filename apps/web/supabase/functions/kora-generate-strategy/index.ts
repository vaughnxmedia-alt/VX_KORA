import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StrategyRequest {
  customer_id: string;
  platforms: string[];
  goals: string[];
  content_window_days: number;
}

interface ContentPillar {
  name: string;
  description: string;
  topics: string[];
  percentage: number;
}

interface WeeklyTheme {
  day: string;
  pillar: string;
  content_type: string;
  example: string;
}

interface ContentStrategy {
  title: string;
  content_pillars: ContentPillar[];
  weekly_themes: WeeklyTheme[];
  post_cadence: {
    posts_per_week: number;
    breakdown: Record<string, number>;
  };
  hashtag_strategy: {
    primary: string[];
    secondary: string[];
    branded: string[];
  };
  key_messages: string[];
  expansion_strategy: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const request: StrategyRequest = await req.json();

    // Get customer info and brand blueprint
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select(`
        *,
        brand_blueprints (*)
      `)
      .eq("id", request.customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error(`Customer not found: ${customerError?.message}`);
    }

    // Get recent industry insights from ingested items
    const { data: recentInsights } = await supabase
      .from("kora_ingested_items")
      .select("title, snippet, categories")
      .eq("industry", "Marketing & PR")
      .order("published_at", { ascending: false })
      .limit(20);

    const blueprint = customer.brand_blueprints?.[0];
    const businessName = customer.business_name || `${customer.first_name} ${customer.last_name}`;

    // Generate strategy using AI or template
    const strategy: ContentStrategy = generateStrategyFromBlueprint(
      businessName,
      blueprint,
      request,
      recentInsights || []
    );

    // Save to database
    const { data: savedStrategy, error: saveError } = await supabase
      .from("kora_content_strategies")
      .insert({
        customer_id: request.customer_id,
        title: strategy.title,
        status: "active",
        content_pillars: strategy.content_pillars,
        weekly_themes: strategy.weekly_themes,
        post_cadence: strategy.post_cadence,
        hashtag_strategy: strategy.hashtag_strategy,
        key_messages: strategy.key_messages,
        target_personas: blueprint?.target_audience ? [blueprint.target_audience] : [],
        recommended_channels: request.platforms,
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save strategy: ${saveError.message}`);
    }

    // Create deliverable record
    const { data: deliverable } = await supabase
      .from("kora_deliverables")
      .insert({
        customer_id: request.customer_id,
        agent_id: "content-strategy",
        agent_name: "Content Strategy",
        deliverable_type: "Social Media Strategy",
        title: strategy.title,
        status: "complete",
        content: strategy,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Trigger telegram notification
    if (deliverable) {
      const telegramUrl = `${SUPABASE_URL}/functions/v1/telegram-notify`;
      await fetch(telegramUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          deliverable_id: deliverable.id,
          customer_id: request.customer_id,
          agent_name: "Content Strategy",
          deliverable_type: "Social Media Strategy",
          title: strategy.title,
          content: {
            content_pillars: strategy.content_pillars,
          },
        }),
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        strategy: savedStrategy,
        deliverable_id: deliverable?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating strategy:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateStrategyFromBlueprint(
  businessName: string,
  blueprint: Record<string, unknown> | null,
  request: StrategyRequest,
  insights: Array<{ title: string; snippet: string; categories: string[] }>
): ContentStrategy {
  const personality = (blueprint?.brand_personality as string) || "professional, approachable";
  const targetAudience = (blueprint?.target_audience as string) || "business professionals";
  
  // Extract trending topics from recent insights
  const trendingTopics = insights
    .flatMap(i => i.categories || [])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5);

  // Define content pillars based on blueprint and industry
  const contentPillars: ContentPillar[] = [
    {
      name: "Educational Content",
      description: "Position as an expert by teaching core concepts",
      topics: [
        "Industry fundamentals",
        "How-to guides",
        "Best practices",
        "Common mistakes to avoid",
        ...trendingTopics.slice(0, 2),
      ],
      percentage: 40,
    },
    {
      name: "Relatable/Behind-the-Scenes",
      description: "Build community and connection through authenticity",
      topics: [
        "Day in the life",
        "Founder journey",
        "Challenges and wins",
        "Team moments",
        "Real talk about the industry",
      ],
      percentage: 40,
    },
    {
      name: "Thought Leadership/Commentary",
      description: "Build authority by analyzing trends and culture",
      topics: [
        "Industry news commentary",
        "Trend analysis",
        "Case studies",
        "Predictions and insights",
        ...trendingTopics.slice(2, 4),
      ],
      percentage: 20,
    },
  ];

  // Generate weekly content mix
  const weeklyThemes: WeeklyTheme[] = [
    { day: "Monday", pillar: "Educational", content_type: "Tip or concept explanation", example: "What is [core concept]?" },
    { day: "Tuesday", pillar: "Relatable", content_type: "Personal story or POV", example: "POV: You just [relatable scenario]" },
    { day: "Wednesday", pillar: "Educational", content_type: "How-to or strategy", example: "[Topic] explained in 60 seconds" },
    { day: "Thursday", pillar: "Relatable", content_type: "Humor or real talk", example: "When someone says [common phrase]..." },
    { day: "Friday", pillar: "Commentary", content_type: "Analysis or opinion", example: "Why [recent event] matters for [audience]" },
  ];

  // Hashtag strategy
  const hashtagStrategy = {
    primary: [
      "#entrepreneurlife",
      "#businesstips",
      "#growthmindset",
      "#marketing",
      "#branding",
    ],
    secondary: [
      "#contentcreator",
      "#socialmediatips",
      "#digitalmarketing",
      "#smallbusiness",
      "#startup",
    ],
    branded: [
      `#${businessName.replace(/\s+/g, "").toLowerCase()}`,
      "#buildinginpublic",
    ],
  };

  return {
    title: `${businessName} Social Media Strategy - ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
    content_pillars: contentPillars,
    weekly_themes: weeklyThemes,
    post_cadence: {
      posts_per_week: 5,
      breakdown: {
        "Educational": 2,
        "Relatable": 2,
        "Commentary": 1,
      },
    },
    hashtag_strategy: hashtagStrategy,
    key_messages: [
      `${businessName} helps ${targetAudience} achieve their goals`,
      "Expert insights delivered in an approachable way",
      "Real stories, real results",
      "Building in public, growing together",
    ],
    expansion_strategy: "Once top-performing short-form content is identified, expand to long-form (YouTube, blog posts) on the same topics. Short-form validates, long-form deepens.",
  };
}
