import TelegramBot from "node-telegram-bot-api"
import { getTenantProfileByTelegramId } from "../db/tenant-profiles"
import { getBrandBlueprint, getContentStrategy, getAudienceAnalysis } from "../db/deliverables"
import { createTestingFeedback } from "../db/testing-feedback"
import type { DeliverableType } from "../types/deliverables"
import type { FeedbackForm } from "../types/testing"

interface FeedbackSession {
  deliverableType: DeliverableType
  deliverableId: string
  tenantId: string
  currentQuestion: number
  answers: Partial<FeedbackForm>
}

const feedbackSessions = new Map<number, FeedbackSession>()

const FEEDBACK_QUESTIONS = [
  { key: "contextQuality", text: "How well does this reflect your business? (1-5)" },
  { key: "researchDepth", text: "How thorough is the research/analysis? (1-5)" },
  { key: "usefulness", text: "How useful is this for your business? (1-5)" },
  { key: "brandAlignment", text: "How well does this align with your brand? (1-5)" },
  { key: "formattingQuality", text: "How clear and readable is the output? (1-5)" },
  { key: "overallGrade", text: "Overall, how would you rate this? (1-5)" },
]

export async function handleCallbackQuery(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
): Promise<void> {
  const chatId = query.message?.chat.id
  const telegramId = query.from.id
  const data = query.data

  if (!chatId || !data) return

  await bot.answerCallbackQuery(query.id)

  if (data.startsWith("feedback_")) {
    await handleFeedbackCallback(bot, chatId, telegramId, data)
    return
  }

  if (data.startsWith("rating_")) {
    await handleRatingCallback(bot, chatId, telegramId, data)
    return
  }

  if (data.startsWith("source_")) {
    await handleSourceCallback(bot, chatId, telegramId, data)
    return
  }
}

async function handleFeedbackCallback(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  data: string
): Promise<void> {
  const feedbackType = data.replace("feedback_", "")
  
  const tenant = await getTenantProfileByTelegramId(telegramId)
  if (!tenant) {
    await bot.sendMessage(chatId, "Could not find your profile. Please try again.")
    return
  }

  let deliverableType: DeliverableType
  let deliverableId: string | null = null

  switch (feedbackType) {
    case "brand":
      deliverableType = "brand_blueprint"
      const brand = await getBrandBlueprint(tenant.id)
      deliverableId = brand?.id || null
      break
    case "audience":
      deliverableType = "audience_analysis"
      const audience = await getAudienceAnalysis(tenant.id)
      deliverableId = audience?.id || null
      break
    case "strategy":
      deliverableType = "content_strategy"
      const strategy = await getContentStrategy(tenant.id)
      deliverableId = strategy?.id || null
      break
    case "overall":
      deliverableType = "brand_blueprint"
      const overall = await getBrandBlueprint(tenant.id)
      deliverableId = overall?.id || null
      break
    default:
      await bot.sendMessage(chatId, "Unknown feedback type.")
      return
  }

  if (!deliverableId) {
    await bot.sendMessage(chatId, "Could not find the deliverable to rate.")
    return
  }

  feedbackSessions.set(telegramId, {
    deliverableType,
    deliverableId,
    tenantId: tenant.id,
    currentQuestion: 0,
    answers: {
      deliverableType,
      deliverableId,
    },
  })

  await sendFeedbackQuestion(bot, chatId, telegramId, 0)
}

async function sendFeedbackQuestion(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  questionIndex: number
): Promise<void> {
  const question = FEEDBACK_QUESTIONS[questionIndex]
  if (!question) {
    await completeFeedback(bot, chatId, telegramId)
    return
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "1", callback_data: `rating_${question.key}_1` },
        { text: "2", callback_data: `rating_${question.key}_2` },
        { text: "3", callback_data: `rating_${question.key}_3` },
        { text: "4", callback_data: `rating_${question.key}_4` },
        { text: "5", callback_data: `rating_${question.key}_5` },
      ],
    ],
  }

  await bot.sendMessage(chatId, question.text, { reply_markup: keyboard })
}

async function handleRatingCallback(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  data: string
): Promise<void> {
  const session = feedbackSessions.get(telegramId)
  if (!session) {
    await bot.sendMessage(chatId, "No active feedback session. Use /feedback to start.")
    return
  }

  const parts = data.replace("rating_", "").split("_")
  const key = parts.slice(0, -1).join("_")
  const value = parseInt(parts[parts.length - 1], 10)

  const keyMap: Record<string, keyof FeedbackForm> = {
    contextQuality: "contextQuality",
    researchDepth: "researchDepth",
    usefulness: "usefulness",
    brandAlignment: "brandAlignment",
    formattingQuality: "formattingQuality",
    overallGrade: "overallGrade",
  }

  const formKey = keyMap[key]
  if (formKey) {
    (session.answers as Record<string, number>)[formKey] = value
  }

  session.currentQuestion++
  feedbackSessions.set(telegramId, session)

  await sendFeedbackQuestion(bot, chatId, telegramId, session.currentQuestion)
}

async function completeFeedback(
  bot: TelegramBot,
  chatId: number,
  telegramId: number
): Promise<void> {
  const session = feedbackSessions.get(telegramId)
  if (!session) return

  const feedback = await createTestingFeedback(
    session.tenantId,
    session.answers as FeedbackForm,
    telegramId,
    undefined
  )

  feedbackSessions.delete(telegramId)

  if (feedback) {
    await bot.sendMessage(chatId,
      "Thank you for your feedback! Your input helps us improve KORA.\n\n" +
      "Would you like to rate another deliverable? Use /feedback to continue."
    )
  } else {
    await bot.sendMessage(chatId,
      "Thank you for your feedback! There was an issue saving it, but we appreciate your time."
    )
  }
}

async function handleSourceCallback(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  data: string
): Promise<void> {
  const parts = data.replace("source_", "").split("_")
  const action = parts[0]
  const sourceId = parts.slice(1).join("_")

  if (action === "approve") {
    await bot.sendMessage(chatId, 
      "Source approved! This content will be added to your intelligence feed."
    )
  } else if (action === "reject") {
    await bot.sendMessage(chatId,
      "Source rejected. I won't use this content."
    )
  }
}
