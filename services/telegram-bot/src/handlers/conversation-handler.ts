/**
 * Conversation Handler
 * 
 * Handles natural language messages from users.
 * Classifies intent, extracts learning signals, and routes to appropriate handlers.
 * 
 * This is the main entry point for conversational intelligence.
 */

import TelegramBot from "node-telegram-bot-api"
import OpenAI from "openai"
import { getDatabase } from "../db/client.js"
import {
  getConversationContext,
  addMessageToContext,
  getLearnedPreferences
} from "../db/conversation-context.js"
import {
  learnFromMessage,
  learnFromApproval,
  learnFromRejection,
  type LearningContext
} from "../learning/learning-engine.js"
import {
  handleRefineInsight,
  parseRefinementRequest
} from "../agents/refine-insight.js"

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}
function db() {
  const s = getDatabase()
  if (!s) throw new Error("Database not configured")
  return s
}

// ============================================================================
// Types
// ============================================================================

export type ConversationIntent =
  | "refine_insight"      // "give me more African American news"
  | "change_topic"        // "what about tech news instead?"
  | "approve_content"     // "approve" / "yes" / "looks good"
  | "reject_content"      // "no" / "skip" / "not interested"
  | "ask_question"        // "what does this mean for my brand?"
  | "request_content"     // "create a post about this"
  | "request_insight"     // "give me insights" / "what's new"
  | "feedback"            // "this was helpful" / "great work"
  | "greeting"            // "hi" / "hello"
  | "help"                // "help" / "what can you do"
  | "other"               // fallback

interface IntentClassification {
  intent: ConversationIntent
  confidence: number
  extractedFilters: string[]
  reasoning: string
}

// ============================================================================
// Intent Classification
// ============================================================================

async function classifyIntent(
  message: string,
  hasRecentInsight: boolean
): Promise<IntentClassification> {
  const lowerMessage = message.toLowerCase().trim()

  // Quick pattern matching for common intents
  
  // Greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)[\s!.]*$/i.test(lowerMessage)) {
    return {
      intent: "greeting",
      confidence: 1.0,
      extractedFilters: [],
      reasoning: "Greeting pattern match"
    }
  }

  // Help
  if (/^(help|what can you do|commands|menu)[\s?]*$/i.test(lowerMessage)) {
    return {
      intent: "help",
      confidence: 1.0,
      extractedFilters: [],
      reasoning: "Help pattern match"
    }
  }

  // Approval
  if (/^(yes|yeah|yep|approve|approved|looks good|perfect|great|love it|do it|go ahead|send it)[\s!.]*$/i.test(lowerMessage)) {
    return {
      intent: "approve_content",
      confidence: 0.95,
      extractedFilters: [],
      reasoning: "Approval pattern match"
    }
  }

  // Rejection
  if (/^(no|nope|skip|not interested|pass|reject|don't|cancel|nevermind)[\s!.]*$/i.test(lowerMessage)) {
    return {
      intent: "reject_content",
      confidence: 0.95,
      extractedFilters: [],
      reasoning: "Rejection pattern match"
    }
  }

  // Feedback
  if (/(thanks|thank you|helpful|great work|awesome|amazing|love this)/i.test(lowerMessage) && lowerMessage.length < 50) {
    return {
      intent: "feedback",
      confidence: 0.9,
      extractedFilters: [],
      reasoning: "Feedback pattern match"
    }
  }

  // Request for insights
  if (/(give me|show me|what's new|news|insights|update me|brief me)/i.test(lowerMessage) && !hasRecentInsight) {
    return {
      intent: "request_insight",
      confidence: 0.85,
      extractedFilters: [],
      reasoning: "Insight request pattern"
    }
  }

  // Content request
  if (/(create|write|draft|make).*(post|content|caption|story|thread)/i.test(lowerMessage)) {
    return {
      intent: "request_content",
      confidence: 0.9,
      extractedFilters: [],
      reasoning: "Content creation request"
    }
  }

  // Refinement (if there's a recent insight)
  if (hasRecentInsight && /(more|different|another|focus on|about|related to|perspective|angle)/i.test(lowerMessage)) {
    const filters = extractFiltersFromMessage(lowerMessage)
    return {
      intent: "refine_insight",
      confidence: 0.85,
      extractedFilters: filters,
      reasoning: "Refinement request with recent insight context"
    }
  }

  // Question
  if (/^(what|how|why|when|where|who|can you|could you|is there|are there)/i.test(lowerMessage)) {
    return {
      intent: "ask_question",
      confidence: 0.8,
      extractedFilters: [],
      reasoning: "Question pattern"
    }
  }

  // Use LLM for complex classification
  return await classifyWithLLM(message, hasRecentInsight)
}

function extractFiltersFromMessage(message: string): string[] {
  const filters: string[] = []
  const lowerMessage = message.toLowerCase()

  const patterns = [
    { pattern: /\b(african[- ]?american|black)\b/i, filter: "African American" },
    { pattern: /\b(latino|latina|latinx|hispanic)\b/i, filter: "Latino/Hispanic" },
    { pattern: /\b(asian)\b/i, filter: "Asian" },
    { pattern: /\b(lgbtq|lgbt)\b/i, filter: "LGBTQ+" },
    { pattern: /\b(women|female)\b/i, filter: "Women" },
    { pattern: /\b(gen[- ]?z)\b/i, filter: "Gen Z" },
    { pattern: /\b(tech|technology)\b/i, filter: "Technology" },
    { pattern: /\b(fashion)\b/i, filter: "Fashion" },
    { pattern: /\b(health|wellness)\b/i, filter: "Health" },
    { pattern: /\b(finance|money)\b/i, filter: "Finance" },
    { pattern: /\b(sports)\b/i, filter: "Sports" },
    { pattern: /\b(entertainment)\b/i, filter: "Entertainment" },
    { pattern: /\b(sustainability|green|climate)\b/i, filter: "Sustainability" }
  ]

  for (const { pattern, filter } of patterns) {
    if (pattern.test(message)) {
      filters.push(filter)
    }
  }

  return filters
}

async function classifyWithLLM(
  message: string,
  hasRecentInsight: boolean
): Promise<IntentClassification> {
  const openai = getOpenAI()
  if (!openai) return { intent: "other", confidence: 0, extractedFilters: [], reasoning: "OpenAI not configured" }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Classify the user's intent in the context of a PR/marketing intelligence bot.
${hasRecentInsight ? "The user recently received an industry insight report." : "No recent insights delivered."}

Intents:
- refine_insight: User wants to narrow/expand/refine previous insights
- change_topic: User wants different topic entirely
- approve_content: User is approving something
- reject_content: User is rejecting something
- ask_question: User is asking a question about content/brand
- request_content: User wants content created
- request_insight: User wants industry insights
- feedback: User giving positive/negative feedback
- greeting: Simple hello
- help: Asking for help
- other: Doesn't fit above

Respond with JSON: { "intent": string, "confidence": number, "filters": string[], "reasoning": string }`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    })

    const text = response.choices[0].message.content || "{}"
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim())

    return {
      intent: parsed.intent || "other",
      confidence: parsed.confidence || 0.5,
      extractedFilters: parsed.filters || [],
      reasoning: parsed.reasoning || ""
    }
  } catch (e) {
    console.error("[ConversationHandler] LLM classification failed:", e)
    return {
      intent: "other",
      confidence: 0.3,
      extractedFilters: [],
      reasoning: "LLM classification failed, defaulting to other"
    }
  }
}

// ============================================================================
// Intent Handlers
// ============================================================================

async function handleGreeting(
  bot: TelegramBot,
  chatId: number,
  userName?: string
): Promise<void> {
  const greeting = userName ? `Hello ${userName}!` : "Hello!"
  await bot.sendMessage(
    chatId,
    `${greeting} 👋\n\n` +
    `I'm KORA, your PR intelligence assistant. Here's what I can do:\n\n` +
    `📊 \`@korainsight\` - Get industry insights\n` +
    `📝 \`@koracontent\` - Get content ideas\n` +
    `⚙️ \`/preferences\` - Set your preferences\n` +
    `📅 \`/schedule\` - Schedule deliveries\n\n` +
    `Or just tell me what you need in plain English!`,
    { parse_mode: "Markdown" }
  )
}

async function handleHelp(bot: TelegramBot, chatId: number): Promise<void> {
  await bot.sendMessage(
    chatId,
    `🤖 *KORA Intelligence Commands*\n\n` +
    `*Get Insights:*\n` +
    `• \`@korainsight\` - Industry news & analysis\n` +
    `• \`@koracontent 3day\` - 3-day content strategy\n` +
    `• \`@koracontent 5day\` - 5-day content strategy\n\n` +
    `*Refine Results:*\n` +
    `• "Give me more African American news"\n` +
    `• "Focus on tech industry"\n` +
    `• "Show me something different"\n\n` +
    `*Manage Settings:*\n` +
    `• \`/preferences\` - Set content preferences\n` +
    `• \`/schedule\` - Automated delivery\n` +
    `• \`/status\` - Check account status\n\n` +
    `*Tips:*\n` +
    `• I learn from your feedback to personalize insights\n` +
    `• Reply to any insight with what you want more/less of\n` +
    `• Say "approve" or "skip" to help me learn your preferences`,
    { parse_mode: "Markdown" }
  )
}

async function handleFeedback(
  bot: TelegramBot,
  chatId: number,
  message: string
): Promise<void> {
  const isPositive = /(thanks|helpful|great|awesome|love|amazing)/i.test(message)
  
  if (isPositive) {
    await bot.sendMessage(
      chatId,
      `Thank you! 🙏 I'm glad I could help.\n\n` +
      `I'm always learning from your feedback to improve. ` +
      `Let me know anytime if you want different types of insights!`
    )
  } else {
    await bot.sendMessage(
      chatId,
      `I appreciate the feedback. Let me know how I can do better!\n\n` +
      `You can tell me things like:\n` +
      `• "More tech-focused content"\n` +
      `• "Less entertainment news"\n` +
      `• "Make it more casual"`
    )
  }
}

async function handleApproval(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  tenantId: string,
  context: any
): Promise<void> {
  // Learn from approval
  if (context?.lastInsightReport) {
    await learnFromApproval(telegramId, tenantId, {
      topics: context.lastTopics || [],
      contentType: "insight"
    })
  }

  await bot.sendMessage(
    chatId,
    `✅ Got it! I've noted your approval.\n\n` +
    `This helps me understand what content works best for you. ` +
    `Future insights will include more of this type of content.`
  )
}

async function handleRejection(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  tenantId: string,
  context: any
): Promise<void> {
  // Learn from rejection
  if (context?.lastInsightReport) {
    await learnFromRejection(telegramId, tenantId, {
      topics: context.lastTopics || [],
      reason: "User rejected content"
    })
  }

  await bot.sendMessage(
    chatId,
    `Noted! I'll adjust future content based on this feedback.\n\n` +
    `Would you like me to try a different angle? ` +
    `Tell me what you'd prefer to see instead.`
  )
}

async function handleRequestInsight(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  await bot.sendMessage(
    chatId,
    `To get industry insights, say \`@korainsight\`\n\n` +
    `Or tell me what specific topics you want:\n` +
    `• "Give me tech industry news"\n` +
    `• "What's happening in PR this week?"\n` +
    `• "African American marketing trends"`,
    { parse_mode: "Markdown" }
  )
}

async function handleRequestContent(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  await bot.sendMessage(
    chatId,
    `To get content strategies, say:\n\n` +
    `• \`@koracontent 3day\` - 3-day content plan\n` +
    `• \`@koracontent 5day\` - 5-day content plan\n\n` +
    `Or tell me what specific content you need!`,
    { parse_mode: "Markdown" }
  )
}

async function handleQuestion(
  bot: TelegramBot,
  chatId: number,
  message: string
): Promise<void> {
  await bot.sendMessage(
    chatId,
    `I can help answer that! Here's what I can do:\n\n` +
    `📊 For industry questions → say \`@korainsight\`\n` +
    `📝 For content advice → say \`@koracontent\`\n` +
    `⚙️ For account questions → say \`/help\`\n\n` +
    `Could you be more specific about what you'd like to know?`,
    { parse_mode: "Markdown" }
  )
}

async function handleOther(
  bot: TelegramBot,
  chatId: number,
  message: string
): Promise<void> {
  await bot.sendMessage(
    chatId,
    `I'm not sure what you're looking for. Here are some things I can help with:\n\n` +
    `📊 \`@korainsight\` - Industry news & insights\n` +
    `📝 \`@koracontent\` - Content strategies\n` +
    `⚙️ \`/preferences\` - Update your preferences\n` +
    `❓ \`/help\` - See all commands\n\n` +
    `Or just tell me what kind of news/content you want!`,
    { parse_mode: "Markdown" }
  )
}

// ============================================================================
// Main Handler
// ============================================================================

export async function handleConversation(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from?.id
  const chatId = msg.chat.id
  const message = msg.text || ""
  const userName = msg.from?.first_name

  if (!telegramId || !message) return

  console.log(`[ConversationHandler] Processing message from ${telegramId}: "${message.slice(0, 50)}..."`)

  try {
    // Get user's tenant ID
    const { data: customer } = await db()
      .from("customers")
      .select("id")
      .eq("telegram_id", telegramId)
      .single()

    const tenantId = customer?.id || ""

    // Load conversation context
    const context = await getConversationContext(telegramId)
    const hasRecentInsight = !!(context?.lastInsightAt && 
      Date.now() - new Date(context.lastInsightAt).getTime() < 30 * 60 * 1000) // 30 min

    // Classify intent
    const classification = await classifyIntent(message, hasRecentInsight)
    console.log(`[ConversationHandler] Intent: ${classification.intent} (${classification.confidence})`)

    // Always learn from the message
    if (tenantId) {
      const learningContext: LearningContext = {
        userMessage: message,
        lastInsightTopics: context?.lastTopics,
        lastInsightReport: context?.lastInsightReport
      }
      await learnFromMessage(telegramId, tenantId, message, learningContext)
    }

    // Route based on intent
    switch (classification.intent) {
      case "greeting":
        await handleGreeting(bot, chatId, userName)
        break

      case "help":
        await handleHelp(bot, chatId)
        break

      case "feedback":
        await handleFeedback(bot, chatId, message)
        break

      case "approve_content":
        await handleApproval(bot, chatId, telegramId, tenantId, context)
        break

      case "reject_content":
        await handleRejection(bot, chatId, telegramId, tenantId, context)
        break

      case "refine_insight":
        if (!tenantId) {
          await bot.sendMessage(
            chatId,
            "Please complete onboarding first with `@koranewstrategy`",
            { parse_mode: "Markdown" }
          )
          return
        }

        const request = await parseRefinementRequest(message, telegramId, tenantId)
        if (request) {
          await handleRefineInsight(bot, telegramId, chatId, request)
        } else {
          await bot.sendMessage(
            chatId,
            `I'd be happy to refine your insights! Could you be more specific about what you'd like?\n\n` +
            `Examples:\n` +
            `• "More African American news"\n` +
            `• "Focus on tech industry"\n` +
            `• "Give me something different"`
          )
        }
        break

      case "change_topic":
        if (!tenantId) {
          await bot.sendMessage(chatId, "Please complete onboarding first with `@koranewstrategy`", { parse_mode: "Markdown" })
          return
        }
        
        const topicRequest = await parseRefinementRequest(message, telegramId, tenantId)
        if (topicRequest) {
          await handleRefineInsight(bot, telegramId, chatId, topicRequest)
        } else {
          await handleRequestInsight(bot, chatId)
        }
        break

      case "request_insight":
        await handleRequestInsight(bot, chatId)
        break

      case "request_content":
        await handleRequestContent(bot, chatId)
        break

      case "ask_question":
        await handleQuestion(bot, chatId, message)
        break

      case "other":
      default:
        // Try to see if it's a refinement request anyway
        if (tenantId && hasRecentInsight) {
          const fallbackRequest = await parseRefinementRequest(message, telegramId, tenantId)
          if (fallbackRequest && fallbackRequest.refinementFilters.length > 0) {
            await handleRefineInsight(bot, telegramId, chatId, fallbackRequest)
            return
          }
        }
        await handleOther(bot, chatId, message)
        break
    }

    // Add message to context
    if (tenantId) {
      await addMessageToContext(telegramId, tenantId, "user", message)
    }

  } catch (error) {
    console.error("[ConversationHandler] Error:", error)
    await bot.sendMessage(
      chatId,
      "I encountered an issue processing that. Please try again or say `/help` for assistance.",
      { parse_mode: "Markdown" }
    )
  }
}
