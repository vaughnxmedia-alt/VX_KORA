/**
 * Send Deep Industry Insights to Juss and Jocelyn
 * 
 * Uses:
 * - Core Intelligence pipeline
 * - Tavily for live news search
 * - Gemini for deep reasoning and synthesis
 * - OpenAI for structured output cleanup
 * - Learning Engine for personalized preferences
 * - Conversation Context for follow-up capability
 */

import { createClient } from "@supabase/supabase-js"
import TelegramBot from "node-telegram-bot-api"
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"
import dotenv from "dotenv"
import {
  updateConversationContext,
  getLearnedPreferences,
  buildPersonalizedQueries,
  filterResultsByPreferences,
  scoreResultByPreferences,
  formatPreferencesForPrompt,
  type UserLearnedPreferences
} from "./db/conversation-context.js"

dotenv.config()

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false })

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Tavily for news search
const TAVILY_API_KEY = process.env.TAVILY_API_KEY

// Target users
const TARGET_USERS = [
  {
    telegramId: 8216104620,
    name: "Juss",
    tenantId: "juss",
    useCase: "pr_industry" as const,
    platforms: ["instagram", "linkedin", "tiktok"],
    focusTopics: [
      "creator economy",
      "viral marketing",
      "brand strategy",
      "influencer partnerships",
      "PR crisis management",
      "social media trends"
    ]
  },
  {
    telegramId: 8697293004,
    name: "Jocelyn (JahknowsPR)",
    tenantId: "jahknowspr",
    useCase: "pr_industry" as const,
    platforms: ["instagram", "linkedin", "twitter"],
    focusTopics: [
      "PR industry news",
      "celebrity PR",
      "brand campaigns",
      "creator collaborations",
      "marketing technology",
      "audience engagement"
    ]
  }
]

interface NewsResult {
  title: string
  url: string
  content: string
  publishedDate?: string
  score?: number
}

interface TopStory {
  headline: string
  source: string
  sourceUrl: string
  summary: string
  strategicAngle: string
  relevanceScore: number
}

interface TrendingTopic {
  topic: string
  whyItMatters: string
  contentOpportunity: string
}

interface ContentOpportunity {
  idea: string
  format: string
  platform: string
  urgency: "urgent" | "this_week" | "evergreen"
  hookSuggestion: string
}

// ============================================================================
// NEWS FETCHING
// ============================================================================

async function fetchLiveNews(queries: string[]): Promise<NewsResult[]> {
  const allResults: NewsResult[] = []

  for (const query of queries) {
    try {
      if (TAVILY_API_KEY) {
        // Use Tavily API
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query,
            search_depth: "advanced",
            include_answer: false,
            include_raw_content: false,
            max_results: 5,
            topic: "news"
          })
        })

        const data = await response.json() as { results?: Array<{ title: string; url: string; content?: string; snippet?: string; published_date?: string; score?: number }> }
        if (data.results) {
          for (const r of data.results) {
            allResults.push({
              title: r.title,
              url: r.url,
              content: r.content || r.snippet || "",
              publishedDate: r.published_date,
              score: r.score
            })
          }
        }
      } else {
        // Fallback: Use web search simulation
        console.log(`[News] Searching: ${query}`)
      }
    } catch (error) {
      console.error(`[News] Search failed for: ${query}`, error)
    }
  }

  // Deduplicate
  const seen = new Set<string>()
  return allResults.filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })
}

// ============================================================================
// GEMINI - Deep Reasoning & Synthesis
// ============================================================================

async function synthesizeInsightsWithLLM(
  newsResults: NewsResult[],
  userContext: typeof TARGET_USERS[0],
  learnedPreferences?: UserLearnedPreferences | null
): Promise<{
  topStories: TopStory[]
  strategicTakeaways: string[]
  trendingTopics: TrendingTopic[]
  contentOpportunities: ContentOpportunity[]
}> {
  const newsContext = newsResults
    .slice(0, 20)
    .map((n, i) => `[${i + 1}] ${n.title}\nSource: ${n.url}\nContent: ${n.content}\n`)
    .join("\n---\n")

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long", 
    day: "numeric",
    year: "numeric"
  })

  // Build personalization context from learned preferences
  const personalizationContext = learnedPreferences 
    ? formatPreferencesForPrompt(learnedPreferences)
    : ""

  const systemPrompt = `You are a senior PR strategist and industry analyst working for a top PR firm. Your job is to synthesize industry intelligence into actionable briefings.
${personalizationContext ? `\n${personalizationContext}\n\nPrioritize content that matches these learned preferences.` : ""}`

  const userPrompt = `CONTEXT:
User: ${userContext.name}
Industry Focus: ${userContext.useCase === "pr_industry" ? "PR & Marketing Industry Professional" : "Content Creator"}
Primary Platforms: ${userContext.platforms.join(", ")}
Focus Topics: ${userContext.focusTopics.join(", ")}
Today's Date: ${currentDate}

${newsResults.length > 0 ? `NEWS & INTELLIGENCE GATHERED:\n${newsContext}` : `
Generate insights based on current PR/marketing industry trends as of March 2026.
Focus on topics that are timely and relevant right now:
- AI in marketing and content creation (ChatGPT, Claude, Midjourney, etc.)
- Creator economy developments (new monetization, platform changes)
- Platform algorithm changes (Instagram, TikTok, LinkedIn, YouTube)
- Brand safety and crisis management (recent brand controversies)
- Influencer marketing evolution (long-term partnerships, authenticity)
- Short-form video dominance (Reels, TikTok, Shorts)
- Social commerce trends (in-app shopping, live shopping)
- Privacy regulations affecting marketing (cookie deprecation, data laws)
`}

YOUR TASK:
Provide a strategic intelligence briefing for this user.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "topStories": [
    {
      "headline": "Story headline - be specific and current",
      "source": "Publication name",
      "sourceUrl": "URL or placeholder",
      "summary": "2-3 sentence summary of why this matters",
      "strategicAngle": "Specific action to take based on this news",
      "relevanceScore": 0.95
    }
  ],
  "strategicTakeaways": [
    "Specific actionable takeaway 1",
    "Specific actionable takeaway 2",
    "Specific actionable takeaway 3"
  ],
  "trendingTopics": [
    {
      "topic": "Topic name",
      "whyItMatters": "Why PR professionals should care",
      "contentOpportunity": "What content to create around this"
    }
  ],
  "contentOpportunities": [
    {
      "idea": "Content idea title",
      "format": "carousel/reel/video/post/thread",
      "platform": "instagram/linkedin/tiktok",
      "urgency": "urgent",
      "hookSuggestion": "Opening line or hook"
    }
  ]
}

Generate 5 top stories, 4 strategic takeaways, 4 trending topics, and 5 content opportunities.
Make them SPECIFIC, CURRENT, and ACTIONABLE for PR/marketing professionals.`

  // Try Gemini first, fallback to OpenAI
  try {
    console.log(`  [Gemini] Attempting synthesis...`)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const result = await model.generateContent(systemPrompt + "\n\n" + userPrompt)
    const responseText = result.response.text()
    
    let jsonText = responseText
    if (jsonText.includes("```json")) {
      jsonText = jsonText.split("```json")[1].split("```")[0]
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.split("```")[1].split("```")[0]
    }
    
    return JSON.parse(jsonText.trim())
  } catch (geminiError: any) {
    console.log(`  [Gemini] Failed (${geminiError.status || geminiError.message}), using OpenAI...`)
  }

  // Fallback to OpenAI
  console.log(`  [OpenAI] Synthesizing insights with GPT-4o...`)
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.8,
    response_format: { type: "json_object" }
  })

  const responseText = response.choices[0].message.content || "{}"
  
  try {
    return JSON.parse(responseText)
  } catch (e) {
    console.error("[OpenAI] Failed to parse JSON response:", e)
    return {
      topStories: [],
      strategicTakeaways: ["Review the latest industry news", "Adjust content strategy based on trends"],
      trendingTopics: [],
      contentOpportunities: []
    }
  }
}

// ============================================================================
// OPENAI - Structure & Cleanup
// ============================================================================

async function formatWithOpenAI(
  insights: Awaited<ReturnType<typeof synthesizeInsightsWithLLM>>,
  userContext: typeof TARGET_USERS[0]
): Promise<string> {
  console.log(`  [OpenAI] Formatting final output...`)

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  })

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are formatting an industry intelligence report for Telegram. 
Use Markdown formatting compatible with Telegram:
- *bold* for emphasis
- _italic_ for sources/notes
- Use emojis sparingly but effectively
- Keep it scannable with clear sections
- Make it feel premium and valuable`
      },
      {
        role: "user",
        content: `Format this intelligence briefing for ${userContext.name}:

Date: ${date}

TOP STORIES:
${JSON.stringify(insights.topStories, null, 2)}

STRATEGIC TAKEAWAYS:
${JSON.stringify(insights.strategicTakeaways, null, 2)}

TRENDING TOPICS:
${JSON.stringify(insights.trendingTopics, null, 2)}

CONTENT OPPORTUNITIES:
${JSON.stringify(insights.contentOpportunities, null, 2)}

Format as a professional intelligence briefing that feels like it's from a premium consulting service.
Include all the information but make it scannable and actionable.
End with a note that this was generated by KORA Intelligence.`
      }
    ],
    temperature: 0.7
  })

  return response.choices[0].message.content || ""
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function generateAndSendInsights(user: typeof TARGET_USERS[0]) {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`Processing: ${user.name}`)
  console.log(`${"=".repeat(60)}`)

  // Step 0: Load learned preferences for personalization
  console.log(`  Loading learned preferences...`)
  let learnedPreferences: UserLearnedPreferences | null = null
  try {
    learnedPreferences = await getLearnedPreferences(user.telegramId)
    const totalSignals = 
      learnedPreferences.topicInterests.length +
      learnedPreferences.perspectivePreferences.length +
      learnedPreferences.negativeSignals.length
    console.log(`  Found ${totalSignals} learned signals`)
  } catch (e) {
    console.log(`  No learned preferences yet (new user)`)
  }

  // Step 1: Build search queries (personalized if preferences exist)
  let queries = [
    ...user.focusTopics.map(t => `${t} news today`),
    "PR industry news this week",
    "marketing trends 2026",
    "social media platform updates",
    "brand crisis news",
    "viral marketing campaign"
  ]

  // Apply learned preferences to personalize queries
  if (learnedPreferences) {
    queries = buildPersonalizedQueries(queries, learnedPreferences)
    console.log(`  Personalized to ${queries.length} queries`)
  }

  // Step 2: Fetch live news
  console.log(`  Fetching news (${queries.length} queries)...`)
  let newsResults = await fetchLiveNews(queries.slice(0, 10))
  console.log(`  Found ${newsResults.length} news items`)

  // Apply preference filtering and scoring
  if (learnedPreferences && newsResults.length > 0) {
    newsResults = filterResultsByPreferences(newsResults, learnedPreferences)
    newsResults = newsResults.map(r => ({
      ...r,
      score: scoreResultByPreferences(r, learnedPreferences!)
    }))
    newsResults.sort((a, b) => (b.score || 0) - (a.score || 0))
    console.log(`  After preference filtering: ${newsResults.length} items`)

  }

  if (newsResults.length === 0) {
    console.log(`  No live news found, generating synthetic insights...`)
  }

  // Step 3: Synthesize with AI (Gemini preferred, OpenAI fallback)
  console.log(`  Synthesizing intelligence...`)
  const insights = await synthesizeInsightsWithLLM(newsResults, user, learnedPreferences)

  // Step 4: Format with OpenAI
  console.log(`  Formatting with OpenAI...`)
  const formattedReport = await formatWithOpenAI(insights, user)

  // Step 5: Send via Telegram
  console.log(`  Sending to Telegram...`)
  
  // Send intro message
  await bot.sendMessage(
    user.telegramId,
    `🔔 *Your Intelligence Briefing Has Arrived*\n\n_Powered By Kora's Core Intelligence Agent_`,
    { parse_mode: "Markdown" }
  )

  await new Promise(r => setTimeout(r, 1000))

  // Send the main report (split if too long)
  const maxLength = 4000
  if (formattedReport.length > maxLength) {
    const parts = splitMessage(formattedReport, maxLength)
    for (const part of parts) {
      await bot.sendMessage(user.telegramId, part, { parse_mode: "Markdown" })
      await new Promise(r => setTimeout(r, 500))
    }
  } else {
    await bot.sendMessage(user.telegramId, formattedReport, { parse_mode: "Markdown" })
  }

  // Send content strategy (if opportunities exist)
  if (insights.contentOpportunities.length > 0) {
    await new Promise(r => setTimeout(r, 1000))

    let contentMsg = `\n🎯 *This Week's Content Opportunities*\n\n`
    for (const opp of insights.contentOpportunities.slice(0, 4)) {
      const urgencyEmoji = opp.urgency === "urgent" ? "⚡" : opp.urgency === "this_week" ? "📅" : "🌿"
      contentMsg += `${urgencyEmoji} *${opp.idea}*\n`
      contentMsg += `   Platform: ${opp.platform} | Format: ${opp.format}\n`
      if (opp.hookSuggestion) {
        contentMsg += `   Hook: _"${opp.hookSuggestion}"_\n`
      }
      contentMsg += `\n`
    }
    contentMsg += `_Reply with "approve" to add these to your campaign options!_`

    await bot.sendMessage(user.telegramId, contentMsg, { parse_mode: "Markdown" })
  }

  // Save to database
  try {
    await supabase.from("intel_insight_reports").insert({
      tenant_id: user.tenantId,
      report_date: new Date().toISOString().split("T")[0],
      report_type: "on_demand",
      top_stories: insights.topStories,
      strategic_takeaways: insights.strategicTakeaways,
      trending_topics: insights.trendingTopics,
      content_opportunities: insights.contentOpportunities,
      confidence_score: 0.85,
      relevance_score: 0.9
    })
    console.log(`  Saved to database`)
  } catch (e) {
    console.log(`  Could not save to database (table may not exist yet)`)
  }

  // Step 6: Save conversation context for follow-up capability
  console.log(`  Saving conversation context...`)
  try {
    // Extract topics from insights for context
    const topics = [
      ...user.focusTopics.slice(0, 3),
      ...(insights.trendingTopics || []).map(t => t.topic).slice(0, 2)
    ]

    await updateConversationContext(user.telegramId, user.tenantId, {
      lastInsightReport: {
        topStories: insights.topStories,
        trendingTopics: insights.trendingTopics,
        contentOpportunities: insights.contentOpportunities,
        generatedAt: new Date().toISOString()
      },
      searchQueries: queries.slice(0, 10),
      topics
    })
    console.log(`  Context saved - user can now reply with refinements!`)
  } catch (e) {
    console.log(`  Could not save context (tables may not exist yet)`)
  }

  // Send follow-up prompt
  await new Promise(r => setTimeout(r, 1000))
  await bot.sendMessage(
    user.telegramId,
    `💡 *Want different insights?*\n\n` +
    `Just reply with what you want:\n` +
    `• "More African American news"\n` +
    `• "Focus on tech industry"\n` +
    `• "Show me something different"\n\n` +
    `_I learn from your requests to personalize future insights!_`,
    { parse_mode: "Markdown" }
  )

  console.log(`  ✅ Complete for ${user.name}`)
}

function splitMessage(text: string, maxLength: number): string[] {
  const parts: string[] = []
  let current = ""

  const lines = text.split("\n")
  for (const line of lines) {
    if (current.length + line.length + 1 > maxLength) {
      parts.push(current)
      current = line
    } else {
      current += (current ? "\n" : "") + line
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

async function main() {
  console.log("=" .repeat(60))
  console.log("KORA Deep Intelligence Pipeline")
  console.log("Using: Core Intelligence + Sources + Gemini")
  console.log("=" .repeat(60))

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not set!")
    return
  }

  for (const user of TARGET_USERS) {
    try {
      await generateAndSendInsights(user)
    } catch (error) {
      console.error(`❌ Error processing ${user.name}:`, error)
    }
  }

  console.log("\n" + "=".repeat(60))
  console.log("Deep Intelligence Pipeline Complete!")
  console.log("=".repeat(60))
}

main().catch(console.error)
