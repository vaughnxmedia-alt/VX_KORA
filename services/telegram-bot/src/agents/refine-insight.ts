/**
 * Refine Insight Agent
 * 
 * Handles user requests to refine/expand on previous insights.
 * Uses conversation context and learned preferences to deliver
 * personalized follow-up content.
 */

import OpenAI from "openai"
import TelegramBot from "node-telegram-bot-api"
import { createClient } from "@supabase/supabase-js"
import {
  getConversationContext,
  updateConversationContext,
  getLearnedPreferences,
  buildPersonalizedQueries,
  filterResultsByPreferences,
  scoreResultByPreferences,
  formatPreferencesForPrompt,
  addMessageToContext,
  type ConversationContext,
  type UserLearnedPreferences
} from "../db/conversation-context.js"

let _openai: OpenAI | null = null
let _supabase: ReturnType<typeof createClient> | null = null
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}
function getSupabase(): ReturnType<typeof createClient> {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error("SUPABASE_URL and key required for refine-insight")
    _supabase = createClient(url, key)
  }
  return _supabase
}
const TAVILY_API_KEY = process.env.TAVILY_API_KEY

// ============================================================================
// Types
// ============================================================================

export interface RefineRequest {
  telegramId: number
  tenantId: string
  userMessage: string
  refinementType: RefinementType
  refinementFilters: string[]
}

export type RefinementType = 
  | "perspective"    // Add demographic/perspective filter
  | "topic"          // Focus on specific topic
  | "deeper"         // More detail on same topic
  | "different"      // Different angle on same topic
  | "source"         // From specific sources
  | "recent"         // More recent news

export interface RefinedInsight {
  stories: Array<{
    headline: string
    source: string
    sourceUrl: string
    summary: string
    strategicAngle: string
    relevanceScore: number
  }>
  takeaways: string[]
  formattedMessage: string
}

// ============================================================================
// Query Building
// ============================================================================

async function buildRefinedQueries(
  request: RefineRequest,
  context: ConversationContext | null,
  preferences: UserLearnedPreferences
): Promise<string[]> {
  const queries: string[] = []

  // Get base topics from last insight
  const baseTopics = context?.lastTopics || []
  const lastQueries = context?.lastSearchQueries || []

  // Build new queries based on refinement type
  switch (request.refinementType) {
    case "perspective":
      for (const filter of request.refinementFilters) {
        for (const topic of baseTopics.slice(0, 3)) {
          queries.push(`${filter} ${topic}`)
        }
        queries.push(`${filter} PR industry news`)
        queries.push(`${filter} marketing news`)
      }
      break

    case "topic":
      for (const filter of request.refinementFilters) {
        queries.push(`${filter} news today`)
        queries.push(`${filter} industry trends`)
        queries.push(`${filter} marketing ${filter}`)
      }
      break

    case "deeper":
      for (const topic of baseTopics.slice(0, 3)) {
        queries.push(`${topic} analysis`)
        queries.push(`${topic} expert opinion`)
        queries.push(`${topic} case study`)
      }
      break

    case "different":
      for (const topic of baseTopics.slice(0, 2)) {
        queries.push(`${topic} controversy`)
        queries.push(`${topic} alternative perspective`)
        queries.push(`${topic} counterpoint`)
      }
      break

    case "source":
      for (const source of request.refinementFilters) {
        for (const topic of baseTopics.slice(0, 2)) {
          queries.push(`site:${source}.com ${topic}`)
        }
      }
      break

    case "recent":
      for (const topic of baseTopics.slice(0, 3)) {
        queries.push(`${topic} news today`)
        queries.push(`${topic} breaking news`)
      }
      break
  }

  // Apply learned preferences to personalize queries
  return buildPersonalizedQueries(queries, preferences)
}

// ============================================================================
// News Fetching
// ============================================================================

interface NewsResult {
  title: string
  url: string
  content: string
  publishedDate?: string
  score?: number
}

async function fetchNews(queries: string[]): Promise<NewsResult[]> {
  if (!TAVILY_API_KEY) {
    console.log("[RefineInsight] No Tavily API key, skipping news fetch")
    return []
  }

  const allResults: NewsResult[] = []

  for (const query of queries.slice(0, 6)) {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (e) {
      console.error(`[RefineInsight] Search failed for: ${query}`, e)
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
// Synthesis
// ============================================================================

async function synthesizeRefinedInsights(
  newsResults: NewsResult[],
  request: RefineRequest,
  context: ConversationContext | null,
  preferences: UserLearnedPreferences
): Promise<RefinedInsight> {
  const preferencesPrompt = formatPreferencesForPrompt(preferences)
  const refinementContext = request.refinementFilters.join(", ")

  const newsContext = newsResults
    .slice(0, 15)
    .map((n, i) => `[${i + 1}] ${n.title}\nURL: ${n.url}\nContent: ${n.content}`)
    .join("\n---\n")

  const openai = getOpenAI()
  if (!openai) throw new Error("OPENAI_API_KEY required for refinement")
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a senior PR strategist providing refined industry intelligence.
The user has requested more specific insights with these filters: ${refinementContext}

${preferencesPrompt}

Respond with JSON only (no markdown):
{
  "stories": [
    {
      "headline": "Story headline",
      "source": "Publication name",
      "sourceUrl": "URL",
      "summary": "2-3 sentence summary",
      "strategicAngle": "Why this matters and what action to take",
      "relevanceScore": 0.95
    }
  ],
  "takeaways": ["Actionable insight 1", "Actionable insight 2"]
}

Pick the 4-5 most relevant stories that match the user's refinement request.
Make strategic angles specific and actionable.`
      },
      {
        role: "user",
        content: `User's refinement request: "${request.userMessage}"

Filters applied: ${refinementContext}

News articles to analyze:
${newsContext}

Generate refined insights (JSON only):`
      }
    ],
    temperature: 0.7,
    response_format: { type: "json_object" }
  })

  const text = response.choices[0].message.content || "{}"
  
  try {
    const parsed = JSON.parse(text)
    return {
      stories: parsed.stories || [],
      takeaways: parsed.takeaways || [],
      formattedMessage: ""
    }
  } catch (e) {
    console.error("[RefineInsight] Failed to parse response:", e)
    return { stories: [], takeaways: [], formattedMessage: "" }
  }
}

function formatRefinedInsights(
  insight: RefinedInsight,
  request: RefineRequest,
  preferences: UserLearnedPreferences
): string {
  const filterLabel = request.refinementFilters
    .map(f => f.charAt(0).toUpperCase() + f.slice(1).replace(/_/g, " "))
    .join(", ")

  let message = `🔍 *Refined Insights: ${filterLabel}*\n\n`

  if (insight.stories.length === 0) {
    message += `_No matching stories found. Try a different angle or check back later._\n`
    return message
  }

  message += `📰 *Top Stories*\n`
  for (let i = 0; i < Math.min(insight.stories.length, 4); i++) {
    const story = insight.stories[i]
    message += `\n${i + 1}. *${story.headline}*\n`
    message += `   _${story.source}_\n`
    message += `   ${story.strategicAngle}\n`
  }

  if (insight.takeaways.length > 0) {
    message += `\n💡 *Key Takeaways*\n`
    for (const takeaway of insight.takeaways.slice(0, 3)) {
      message += `• ${takeaway}\n`
    }
  }

  // Note about learning
  message += `\n---\n`
  message += `_I've noted your interest in ${filterLabel.toLowerCase()}. Future insights will include more of this content._`

  return message
}

// ============================================================================
// Main Handler
// ============================================================================

export async function handleRefineInsight(
  bot: TelegramBot,
  telegramId: number,
  chatId: number,
  request: RefineRequest
): Promise<void> {
  console.log(`[RefineInsight] Processing refinement for user ${telegramId}`)
  console.log(`  Type: ${request.refinementType}`)
  console.log(`  Filters: ${request.refinementFilters.join(", ")}`)

  try {
    // Send processing message
    const processingMsg = await bot.sendMessage(
      chatId,
      `🔍 *Searching for ${request.refinementFilters.join(", ")} content...*\n\n` +
      `_Applying your preferences and finding relevant stories._`,
      { parse_mode: "Markdown" }
    )

    // Load context and preferences
    const context = await getConversationContext(telegramId)
    const preferences = await getLearnedPreferences(telegramId)

    // Build queries
    const queries = await buildRefinedQueries(request, context, preferences)
    console.log(`[RefineInsight] Generated ${queries.length} queries`)

    // Fetch news
    let newsResults = await fetchNews(queries)
    console.log(`[RefineInsight] Found ${newsResults.length} news items`)

    // Filter and score by preferences
    newsResults = filterResultsByPreferences(newsResults, preferences)
    newsResults = newsResults.map(r => ({
      ...r,
      score: scoreResultByPreferences(r, preferences)
    }))
    newsResults.sort((a, b) => (b.score || 0) - (a.score || 0))

    // Synthesize insights
    const insight = await synthesizeRefinedInsights(
      newsResults,
      request,
      context,
      preferences
    )

    // Format message
    insight.formattedMessage = formatRefinedInsights(insight, request, preferences)

    // Delete processing message
    await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {})

    // Send result
    await bot.sendMessage(chatId, insight.formattedMessage, { parse_mode: "Markdown" })

    // Update context
    await updateConversationContext(telegramId, request.tenantId, {
      lastInsightReport: insight,
      searchQueries: queries,
      topics: request.refinementFilters
    })

    // Add to conversation history
    await addMessageToContext(telegramId, request.tenantId, "user", request.userMessage)
    await addMessageToContext(telegramId, request.tenantId, "assistant", insight.formattedMessage)

    // Offer follow-up options
    await bot.sendMessage(
      chatId,
      `*What would you like to do next?*\n\n` +
      `• Reply with another refinement (e.g., "more tech news")\n` +
      `• Say \`@koracontent\` for content ideas based on these insights\n` +
      `• Say "go deeper" for more analysis on these topics`,
      { parse_mode: "Markdown" }
    )

  } catch (error) {
    console.error("[RefineInsight] Error:", error)
    await bot.sendMessage(
      chatId,
      "❌ I had trouble finding those specific insights. Try rephrasing your request or ask for a different angle."
    )
  }
}

// ============================================================================
// Request Parsing
// ============================================================================

export async function parseRefinementRequest(
  message: string,
  telegramId: number,
  tenantId: string
): Promise<RefineRequest | null> {
  const lowerMessage = message.toLowerCase()

  // Detect refinement type and filters using patterns first
  let refinementType: RefinementType = "topic"
  const filters: string[] = []

  // Perspective patterns
  const perspectivePatterns = [
    { pattern: /\b(african[- ]?american|black)\b/i, filter: "African American" },
    { pattern: /\b(latino|latina|latinx|hispanic)\b/i, filter: "Latino/Hispanic" },
    { pattern: /\b(asian[- ]?american|asian)\b/i, filter: "Asian" },
    { pattern: /\b(lgbtq|lgbt|queer)\b/i, filter: "LGBTQ+" },
    { pattern: /\b(women[- ]?owned|female[- ]?led|women)\b/i, filter: "Women" },
    { pattern: /\b(gen[- ]?z)\b/i, filter: "Gen Z" },
    { pattern: /\b(small[- ]?business|startup)\b/i, filter: "Small Business" }
  ]

  for (const { pattern, filter } of perspectivePatterns) {
    if (pattern.test(message)) {
      refinementType = "perspective"
      filters.push(filter)
    }
  }

  // Topic patterns
  if (filters.length === 0) {
    const topicPatterns = [
      { pattern: /\b(tech|technology)\b/i, filter: "Technology" },
      { pattern: /\b(fashion|style)\b/i, filter: "Fashion" },
      { pattern: /\b(health|wellness)\b/i, filter: "Health" },
      { pattern: /\b(finance|money)\b/i, filter: "Finance" },
      { pattern: /\b(sports)\b/i, filter: "Sports" },
      { pattern: /\b(entertainment|celebrity)\b/i, filter: "Entertainment" },
      { pattern: /\b(music)\b/i, filter: "Music" },
      { pattern: /\b(food|restaurant)\b/i, filter: "Food" },
      { pattern: /\b(sustainability|climate|green)\b/i, filter: "Sustainability" }
    ]

    for (const { pattern, filter } of topicPatterns) {
      if (pattern.test(message)) {
        refinementType = "topic"
        filters.push(filter)
      }
    }
  }

  // Type detection
  if (/(deeper|more detail|expand|elaborate|analysis)/i.test(lowerMessage)) {
    refinementType = "deeper"
  } else if (/(different|other|alternative|another angle)/i.test(lowerMessage)) {
    refinementType = "different"
  } else if (/(recent|latest|today|breaking|new)/i.test(lowerMessage)) {
    refinementType = "recent"
  }

  // If no filters detected, use LLM to extract
  if (filters.length === 0) {
    const llmFilters = await extractFiltersWithLLM(message)
    filters.push(...llmFilters)
  }

  if (filters.length === 0) {
    return null
  }

  return {
    telegramId,
    tenantId,
    userMessage: message,
    refinementType,
    refinementFilters: filters
  }
}

async function extractFiltersWithLLM(message: string): Promise<string[]> {
  const openai = getOpenAI()
  if (!openai) return []
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract the key topics or filters the user wants to see in their news/insights.
Return a JSON array of 1-3 filter keywords.
Example: ["African American", "Tech Industry", "Small Business"]
Be specific and preserve the user's wording where possible.`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    })

    const text = response.choices[0].message.content || "[]"
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim())
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error("[RefineInsight] LLM filter extraction failed:", e)
    return []
  }
}
