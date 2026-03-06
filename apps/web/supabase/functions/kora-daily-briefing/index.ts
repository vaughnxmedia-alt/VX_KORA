import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = "8791517814:AAFtdYP6_sflkkiRvveS1YrT66tPYa4YeZs";
const JAHKNOWS_CHAT_ID = "8216104620";

interface IndustryInsight {
  title: string;
  snippet: string;
  source: string;
  url: string;
  categories: string[];
}

interface ContentIdea {
  pillar: string;
  type: string;
  topic: string;
  hook: string;
  hashtags: string[];
}

async function sendTelegramMessage(chatId: string, text: string, parseMode: string = "HTML") {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Telegram error:", error);
    throw new Error(`Telegram API error: ${error}`);
  }

  return response.json();
}

function generateContentIdeas(insights: IndustryInsight[], dayOfWeek: number): ContentIdea[] {
  const pillars = ["Educational", "Relatable", "Commentary"];
  const ideas: ContentIdea[] = [];

  // Educational content (2x per week - Mon, Wed)
  if (dayOfWeek === 1 || dayOfWeek === 3) {
    const educationalInsight = insights.find(i => 
      i.categories.some(c => ["PR", "Marketing", "Strategy", "Tips"].includes(c))
    ) || insights[0];

    ideas.push({
      pillar: "Educational",
      type: dayOfWeek === 1 ? "Concept Explanation" : "How-To",
      topic: educationalInsight?.title || "PR Fundamentals",
      hook: dayOfWeek === 1 
        ? `What is [concept]? Let me break it down...`
        : `Here's how to [action] in 60 seconds`,
      hashtags: ["#PRtips", "#MarketingStrategy", "#LearnPR", "#BusinessTips"],
    });
  }

  // Relatable content (2x per week - Tue, Thu)
  if (dayOfWeek === 2 || dayOfWeek === 4) {
    ideas.push({
      pillar: "Relatable",
      type: dayOfWeek === 2 ? "POV/Scenario" : "Real Talk",
      topic: dayOfWeek === 2 
        ? "The founder experience" 
        : "Behind the scenes moment",
      hook: dayOfWeek === 2
        ? `POV: You just sent the pitch email and now you're refreshing your inbox every 5 minutes`
        : `When someone says "let's circle back" for the third time this week...`,
      hashtags: ["#FounderLife", "#EntrepreneurProblems", "#RealTalk", "#BuildingInPublic"],
    });
  }

  // Commentary content (1x per week - Fri)
  if (dayOfWeek === 5) {
    const trendingInsight = insights.find(i => 
      i.categories.some(c => ["Trending", "News", "Viral", "Brand"].includes(c))
    ) || insights[0];

    ideas.push({
      pillar: "Commentary",
      type: "Analysis/Opinion",
      topic: trendingInsight?.title || "This week in PR",
      hook: `Why ${trendingInsight?.title?.split(" ").slice(0, 5).join(" ")}... matters for your brand`,
      hashtags: ["#PRAnalysis", "#BrandStrategy", "#MarketingNews", "#ThoughtLeadership"],
    });
  }

  return ideas;
}

function formatDailyBriefing(
  insights: IndustryInsight[], 
  contentIdeas: ContentIdea[],
  date: Date
): string {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = dayNames[date.getDay()];
  const dateStr = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  let message = `☀️ <b>Good Morning, Justice!</b>\n`;
  message += `📅 ${dayOfWeek}, ${dateStr}\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🧠 <b>KORA DAILY BRIEFING</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Today's Content Strategy
  message += `📝 <b>TODAY'S CONTENT</b>\n\n`;
  
  if (contentIdeas.length > 0) {
    contentIdeas.forEach((idea, index) => {
      const pillarEmoji = {
        "Educational": "🎓",
        "Relatable": "💬",
        "Commentary": "🎯",
      }[idea.pillar] || "📌";

      message += `${pillarEmoji} <b>${idea.pillar} Content</b>\n`;
      message += `   Type: ${idea.type}\n`;
      message += `   Topic: ${idea.topic}\n`;
      message += `   Hook: <i>"${idea.hook}"</i>\n`;
      message += `   Tags: ${idea.hashtags.slice(0, 3).join(" ")}\n\n`;
    });
  } else {
    message += `   Today is a rest day. Review analytics and engage with your audience!\n\n`;
  }

  // Industry Insights
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔍 <b>INDUSTRY INSIGHTS</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (insights.length > 0) {
    insights.slice(0, 3).forEach((insight, index) => {
      message += `${index + 1}. <b>${insight.title}</b>\n`;
      message += `   ${insight.snippet.slice(0, 100)}...\n`;
      message += `   📰 ${insight.source}\n\n`;
    });
  } else {
    message += `   No new insights today. Core Intelligence will sync tonight.\n\n`;
  }

  // Weekly reminder based on day
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💡 <b>QUICK TIP</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const tips: Record<number, string> = {
    0: "Sunday: Plan your content for the week ahead. Batch filming saves time!",
    1: "Monday: Start strong with educational content. Position yourself as the expert.",
    2: "Tuesday: Relatable content builds community. Be authentic!",
    3: "Wednesday: Mid-week education keeps your audience learning.",
    4: "Thursday: End the work week with something fun and relatable.",
    5: "Friday: Commentary content shows you're plugged into the industry.",
    6: "Saturday: Engage with comments and DMs. Build those relationships!",
  };

  message += `${tips[date.getDay()]}\n\n`;

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `<i>Powered by K.O.R.A. | VaughnX Technology</i>`;

  return message;
}

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();

    // Fetch recent industry insights from Core Intelligence
    const { data: recentItems, error: itemsError } = await supabase
      .from("kora_ingested_items")
      .select("title, snippet, source_id, url, categories")
      .order("published_at", { ascending: false })
      .limit(10);

    // Also try the main RSS items table if KORA tables don't exist yet
    let insights: IndustryInsight[] = [];
    
    if (recentItems && recentItems.length > 0) {
      insights = recentItems.map(item => ({
        title: item.title,
        snippet: item.snippet || "",
        source: item.source_id || "Industry Source",
        url: item.url || "",
        categories: item.categories || [],
      }));
    } else {
      // Fallback to mock insights for now
      insights = [
        {
          title: "AI Tools Reshaping PR Industry Workflows",
          snippet: "New AI-powered tools are transforming how PR professionals manage media relations and content creation...",
          source: "PR Week",
          url: "https://prweek.com",
          categories: ["AI", "PR", "Technology"],
        },
        {
          title: "Social Media Algorithm Changes Impact Brand Visibility",
          snippet: "Recent platform updates are affecting organic reach, prompting brands to rethink their content strategies...",
          source: "Social Media Today",
          url: "https://socialmediatoday.com",
          categories: ["Social Media", "Marketing", "Trending"],
        },
        {
          title: "Authenticity Drives Gen Z Brand Loyalty",
          snippet: "Research shows younger consumers prioritize genuine brand storytelling over polished marketing...",
          source: "Marketing Week",
          url: "https://marketingweek.com",
          categories: ["Brand", "Strategy", "Research"],
        },
      ];
    }

    // Generate content ideas based on day of week
    const contentIdeas = generateContentIdeas(insights, now.getDay());

    // Format the daily briefing message
    const briefingMessage = formatDailyBriefing(insights, contentIdeas, now);

    // Send to Telegram
    await sendTelegramMessage(JAHKNOWS_CHAT_ID, briefingMessage);

    // Log the briefing
    console.log(`Daily briefing sent at ${now.toISOString()}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Daily briefing sent",
        timestamp: now.toISOString(),
        insights_count: insights.length,
        content_ideas_count: contentIdeas.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending daily briefing:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
