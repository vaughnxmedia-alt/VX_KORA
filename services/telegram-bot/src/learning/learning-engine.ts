/**
 * Learning Engine
 * 
 * Extracts signals from EVERY user message and stores them.
 * KORA learns from every interaction to personalize future insights.
 * 
 * Signal Types:
 * - topic_interest: User wants more of a topic
 * - perspective_preference: User prefers certain perspectives/angles  
 * - source_preference: User likes certain sources
 * - negative_signal: User doesn't want certain content
 * - tone_preference: User prefers certain tones
 * - timing_signal: User engages at certain times
 */

import OpenAI from "openai"
import {
  addLearnedSignal,
  type SignalType,
  type ConversationContext
} from "../db/conversation-context.js"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ============================================================================
// Types
// ============================================================================

export interface ExtractedSignal {
  type: SignalType
  key: string
  value: number
  confidence: number
  reason: string
}

export interface LearningContext {
  userMessage: string
  lastInsightTopics?: string[]
  lastInsightReport?: any
  conversationHistory?: Array<{ role: string; content: string }>
}

// ============================================================================
// Signal Extraction
// ============================================================================

export async function extractSignalsFromMessage(
  message: string,
  context: LearningContext
): Promise<ExtractedSignal[]> {
  const signals: ExtractedSignal[] = []

  // 1. Use pattern matching for common signals (fast, no API call)
  const patternSignals = extractPatternSignals(message)
  signals.push(...patternSignals)

  // 2. Use LLM for complex signal extraction if message is substantial
  if (message.length > 20 && patternSignals.length === 0) {
    const llmSignals = await extractSignalsWithLLM(message, context)
    signals.push(...llmSignals)
  }

  // 3. Extract timing signal
  const timingSignal = extractTimingSignal()
  if (timingSignal) {
    signals.push(timingSignal)
  }

  return signals
}

function extractPatternSignals(message: string): ExtractedSignal[] {
  const signals: ExtractedSignal[] = []
  const lowerMessage = message.toLowerCase()

  // Perspective/demographic preferences
  const perspectivePatterns: Array<{ pattern: RegExp; key: string }> = [
    { pattern: /\b(african[- ]?american|black)\b/i, key: "african_american" },
    { pattern: /\b(latino|latina|latinx|hispanic)\b/i, key: "latino_hispanic" },
    { pattern: /\b(asian[- ]?american|asian)\b/i, key: "asian" },
    { pattern: /\b(lgbtq|lgbt|queer|pride)\b/i, key: "lgbtq" },
    { pattern: /\b(women[- ]?owned|female[- ]?led|women in)\b/i, key: "women_led" },
    { pattern: /\b(gen[- ]?z|gen z)\b/i, key: "gen_z" },
    { pattern: /\b(millennial)\b/i, key: "millennial" },
    { pattern: /\b(small[- ]?business|smb|startup)\b/i, key: "small_business" },
    { pattern: /\b(enterprise|corporate|fortune 500)\b/i, key: "enterprise" },
    { pattern: /\b(local|community)\b/i, key: "local_community" }
  ]

  for (const { pattern, key } of perspectivePatterns) {
    if (pattern.test(message)) {
      const isPositive = !/(not|don't|no |without|exclude|skip)/i.test(lowerMessage)
      signals.push({
        type: isPositive ? "perspective_preference" : "negative_signal",
        key,
        value: isPositive ? 1.0 : -1.0,
        confidence: 0.9,
        reason: `User mentioned "${key.replace(/_/g, " ")}" in message`
      })
    }
  }

  // Topic interests
  const topicPatterns: Array<{ pattern: RegExp; key: string }> = [
    { pattern: /\b(tech|technology|ai|artificial intelligence)\b/i, key: "technology" },
    { pattern: /\b(fashion|style|clothing)\b/i, key: "fashion" },
    { pattern: /\b(health|wellness|fitness)\b/i, key: "health_wellness" },
    { pattern: /\b(finance|money|investing|crypto)\b/i, key: "finance" },
    { pattern: /\b(sports|athletics|nfl|nba)\b/i, key: "sports" },
    { pattern: /\b(entertainment|celebrity|hollywood)\b/i, key: "entertainment" },
    { pattern: /\b(politics|government|policy)\b/i, key: "politics" },
    { pattern: /\b(music|artist|album)\b/i, key: "music" },
    { pattern: /\b(food|restaurant|culinary)\b/i, key: "food" },
    { pattern: /\b(travel|tourism|destination)\b/i, key: "travel" },
    { pattern: /\b(real estate|housing|property)\b/i, key: "real_estate" },
    { pattern: /\b(sustainability|climate|green|eco)\b/i, key: "sustainability" }
  ]

  // Only add topic signals if there's a "more" or interest indicator
  const hasInterestIndicator = /(more|interested in|focus on|show me|give me|want)/i.test(lowerMessage)
  
  if (hasInterestIndicator) {
    for (const { pattern, key } of topicPatterns) {
      if (pattern.test(message)) {
        const isNegative = /(not interested|don't want|no more|less|skip|exclude)/i.test(lowerMessage)
        signals.push({
          type: isNegative ? "negative_signal" : "topic_interest",
          key,
          value: isNegative ? -1.0 : 1.0,
          confidence: 0.85,
          reason: `User expressed ${isNegative ? "disinterest" : "interest"} in ${key.replace(/_/g, " ")}`
        })
      }
    }
  }

  // Tone preferences
  const tonePatterns: Array<{ pattern: RegExp; key: string }> = [
    { pattern: /\b(casual|relaxed|informal)\b/i, key: "casual" },
    { pattern: /\b(professional|formal|business)\b/i, key: "professional" },
    { pattern: /\b(fun|funny|humorous|playful)\b/i, key: "playful" },
    { pattern: /\b(serious|straight|direct)\b/i, key: "serious" },
    { pattern: /\b(detailed|in-depth|comprehensive)\b/i, key: "detailed" },
    { pattern: /\b(brief|short|quick|concise)\b/i, key: "concise" }
  ]

  for (const { pattern, key } of tonePatterns) {
    if (pattern.test(message) && /(make it|keep it|more|prefer|want)/i.test(lowerMessage)) {
      signals.push({
        type: "tone_preference",
        key,
        value: 1.0,
        confidence: 0.8,
        reason: `User requested ${key} tone`
      })
    }
  }

  // Negative signals - explicit rejections
  const negativePatterns = [
    { pattern: /not interested in (.+?)(?:\.|$|,)/i, extractor: (m: RegExpMatchArray) => m[1] },
    { pattern: /don't (?:want|show|include) (.+?)(?:\.|$|,)/i, extractor: (m: RegExpMatchArray) => m[1] },
    { pattern: /skip (.+?)(?:\.|$|,)/i, extractor: (m: RegExpMatchArray) => m[1] },
    { pattern: /no more (.+?)(?:\.|$|,)/i, extractor: (m: RegExpMatchArray) => m[1] },
    { pattern: /exclude (.+?)(?:\.|$|,)/i, extractor: (m: RegExpMatchArray) => m[1] }
  ]

  for (const { pattern, extractor } of negativePatterns) {
    const match = message.match(pattern)
    if (match) {
      const topic = extractor(match).trim().toLowerCase().replace(/\s+/g, "_")
      if (topic.length > 2 && topic.length < 50) {
        signals.push({
          type: "negative_signal",
          key: topic,
          value: -1.0,
          confidence: 0.9,
          reason: `User explicitly rejected: ${topic.replace(/_/g, " ")}`
        })
      }
    }
  }

  // Source preferences
  const sourcePatterns: Array<{ pattern: RegExp; key: string }> = [
    { pattern: /\b(forbes)\b/i, key: "forbes" },
    { pattern: /\b(techcrunch)\b/i, key: "techcrunch" },
    { pattern: /\b(nytimes|new york times)\b/i, key: "nytimes" },
    { pattern: /\b(wsj|wall street journal)\b/i, key: "wsj" },
    { pattern: /\b(prweek|pr week)\b/i, key: "prweek" },
    { pattern: /\b(adage|ad age)\b/i, key: "adage" },
    { pattern: /\b(mashable)\b/i, key: "mashable" },
    { pattern: /\b(wired)\b/i, key: "wired" },
    { pattern: /\b(bbc)\b/i, key: "bbc" },
    { pattern: /\b(cnn)\b/i, key: "cnn" },
    { pattern: /\b(essence)\b/i, key: "essence" },
    { pattern: /\b(ebony)\b/i, key: "ebony" },
    { pattern: /\b(the root)\b/i, key: "theroot" }
  ]

  for (const { pattern, key } of sourcePatterns) {
    if (pattern.test(message) && /(like|prefer|from|more from|love)/i.test(lowerMessage)) {
      signals.push({
        type: "source_preference",
        key,
        value: 1.0,
        confidence: 0.85,
        reason: `User expressed preference for ${key}`
      })
    }
  }

  return signals
}

async function extractSignalsWithLLM(
  message: string,
  context: LearningContext
): Promise<ExtractedSignal[]> {
  try {
    const contextInfo = context.lastInsightTopics?.length
      ? `The user was previously shown insights about: ${context.lastInsightTopics.join(", ")}`
      : ""

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a learning system that extracts user preferences from messages.
Extract any signals about what the user wants more of, less of, or how they prefer content.

Signal types:
- topic_interest: User wants more of a topic
- perspective_preference: User wants content from a certain perspective (demographic, industry, etc.)
- source_preference: User likes certain news sources
- negative_signal: User explicitly doesn't want something (value should be negative)
- tone_preference: User prefers certain content tone

Respond with JSON array of signals. Be conservative - only extract clear signals.
Each signal: { "type": string, "key": string, "value": number, "reason": string }
Value: 1.0 for positive, -1.0 for negative, 0.5 for mild preference.
Key should be lowercase with underscores, no spaces.`
        },
        {
          role: "user",
          content: `${contextInfo}\n\nUser message: "${message}"\n\nExtract learning signals (JSON array only, no markdown):`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })

    const text = response.choices[0].message.content || "[]"
    let signals: ExtractedSignal[] = []

    try {
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim())
      if (Array.isArray(parsed)) {
        signals = parsed.map(s => ({
          type: s.type as SignalType,
          key: s.key,
          value: s.value,
          confidence: 0.7,
          reason: s.reason
        }))
      }
    } catch (e) {
      console.error("[LearningEngine] Failed to parse LLM response:", e)
    }

    return signals.filter(s => 
      ["topic_interest", "perspective_preference", "source_preference", "negative_signal", "tone_preference"].includes(s.type)
    )
  } catch (e) {
    console.error("[LearningEngine] LLM extraction failed:", e)
    return []
  }
}

function extractTimingSignal(): ExtractedSignal | null {
  const now = new Date()
  const hour = now.getHours()
  
  let timeSlot: string
  if (hour >= 5 && hour < 9) timeSlot = "early_morning"
  else if (hour >= 9 && hour < 12) timeSlot = "morning"
  else if (hour >= 12 && hour < 14) timeSlot = "midday"
  else if (hour >= 14 && hour < 17) timeSlot = "afternoon"
  else if (hour >= 17 && hour < 20) timeSlot = "evening"
  else if (hour >= 20 && hour < 23) timeSlot = "night"
  else timeSlot = "late_night"

  return {
    type: "timing_signal",
    key: timeSlot,
    value: 0.3,
    confidence: 1.0,
    reason: `User engaged during ${timeSlot.replace(/_/g, " ")}`
  }
}

// ============================================================================
// Learning Operations
// ============================================================================

export async function learnFromMessage(
  telegramId: number,
  tenantId: string,
  message: string,
  context: LearningContext
): Promise<ExtractedSignal[]> {
  console.log(`[LearningEngine] Processing message from user ${telegramId}`)

  const signals = await extractSignalsFromMessage(message, context)

  if (signals.length === 0) {
    console.log("[LearningEngine] No signals extracted")
    return []
  }

  console.log(`[LearningEngine] Extracted ${signals.length} signals:`)

  for (const signal of signals) {
    console.log(`  - ${signal.type}:${signal.key} = ${signal.value} (${signal.reason})`)
    
    await addLearnedSignal(
      telegramId,
      tenantId,
      signal.type,
      signal.key,
      signal.value,
      message,
      {
        lastInsightTopics: context.lastInsightTopics,
        extractedAt: new Date().toISOString(),
        confidence: signal.confidence
      }
    )
  }

  return signals
}

export async function learnFromApproval(
  telegramId: number,
  tenantId: string,
  approvedContent: {
    topics?: string[]
    source?: string
    contentType?: string
  }
): Promise<void> {
  console.log(`[LearningEngine] Learning from approval for user ${telegramId}`)

  if (approvedContent.topics) {
    for (const topic of approvedContent.topics) {
      await addLearnedSignal(
        telegramId,
        tenantId,
        "topic_interest",
        topic.toLowerCase().replace(/\s+/g, "_"),
        0.5,
        "User approved content",
        { approvedTopics: approvedContent.topics }
      )
    }
  }

  if (approvedContent.source) {
    await addLearnedSignal(
      telegramId,
      tenantId,
      "source_preference",
      approvedContent.source.toLowerCase().replace(/\s+/g, "_"),
      0.5,
      "User approved content from this source",
      { source: approvedContent.source }
    )
  }
}

export async function learnFromRejection(
  telegramId: number,
  tenantId: string,
  rejectedContent: {
    topics?: string[]
    reason?: string
  }
): Promise<void> {
  console.log(`[LearningEngine] Learning from rejection for user ${telegramId}`)

  if (rejectedContent.topics) {
    for (const topic of rejectedContent.topics) {
      await addLearnedSignal(
        telegramId,
        tenantId,
        "negative_signal",
        topic.toLowerCase().replace(/\s+/g, "_"),
        -0.3,
        rejectedContent.reason || "User rejected content",
        { rejectedTopics: rejectedContent.topics }
      )
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export { type SignalType }
