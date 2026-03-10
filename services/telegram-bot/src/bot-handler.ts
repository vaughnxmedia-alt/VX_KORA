import TelegramBot from "node-telegram-bot-api"
import { 
  INTAKE_QUESTIONS, 
  getNextQuestion, 
  getCurrentPhaseProgress,
  INTAKE_PHASES
} from "./intake-questions.js"
import { 
  getSession, 
  createSession, 
  updateSession, 
  saveResponse,
  saveGeneratedStrategy,
  createOrGetClient,
  deleteSession,
  saveSourceApproval,
  getSourceRecommendation
} from "./database.js"
import {
  generateFullStrategy,
  formatBrandBlueprintForTelegram,
  formatContentStrategyForTelegram,
  formatAudienceAnalysisForTelegram
} from "./strategy-generator.js"
import type { UserSession } from "./types.js"

const COMMAND_TRIGGER = "@koranewstrategy"
const CANCEL_COMMAND = "/cancel"
const RESTART_COMMAND = "/restart"
const SOURCE_APPROVE_PREFIX = "source_approve_"
const SOURCE_REJECT_PREFIX = "source_reject_"
const SOURCE_LATER_PREFIX = "source_later_"

export function setupBotHandlers(bot: TelegramBot) {
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id
    const telegramId = msg.from?.id
    const username = msg.from?.username || null
    const text = msg.text?.trim() || ""

    if (!telegramId) return

    try {
      if (text.toLowerCase() === CANCEL_COMMAND) {
        await handleCancel(bot, chatId, telegramId)
        return
      }

      if (text.toLowerCase() === RESTART_COMMAND) {
        await handleRestart(bot, chatId, telegramId, username)
        return
      }

      if (text.toLowerCase().includes(COMMAND_TRIGGER.toLowerCase())) {
        await handleNewStrategyCommand(bot, chatId, telegramId, username)
        return
      }

      const session = await getSession(telegramId)
      if (session && session.phase !== "completed") {
        await handleIntakeResponse(bot, chatId, telegramId, session, text)
        return
      }

      if (!session) {
        await bot.sendMessage(chatId, 
          `👋 Hello! I'm KORA, your AI strategy partner.\n\nTo start building your Brand Identity Blueprint, Content Strategy, and Target Audience Analysis, type:\n\n*${COMMAND_TRIGGER}*\n\nThis will begin a guided intake process that takes about 15-20 minutes.`,
          { parse_mode: "Markdown" }
        )
      }
    } catch (error) {
      console.error("Error handling message:", error)
      await bot.sendMessage(chatId, 
        "I encountered an error. Please try again or type /restart to start over."
      )
    }
  })

  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id
    const telegramId = query.from.id
    const data = query.data

    if (!chatId || !data) return

    try {
      await bot.answerCallbackQuery(query.id)
      
      // Handle source approval callbacks
      if (data.startsWith(SOURCE_APPROVE_PREFIX)) {
        const sourceId = data.replace(SOURCE_APPROVE_PREFIX, "")
        await handleSourceApproval(bot, chatId, telegramId, sourceId, "approved")
        return
      }
      
      if (data.startsWith(SOURCE_REJECT_PREFIX)) {
        const sourceId = data.replace(SOURCE_REJECT_PREFIX, "")
        await handleSourceApproval(bot, chatId, telegramId, sourceId, "rejected")
        return
      }
      
      if (data.startsWith(SOURCE_LATER_PREFIX)) {
        const sourceId = data.replace(SOURCE_LATER_PREFIX, "")
        await bot.sendMessage(chatId, "No problem! I'll remind you about this later.")
        return
      }
      
      // Handle intake callbacks
      const session = await getSession(telegramId)
      if (!session) return

      await handleIntakeResponse(bot, chatId, telegramId, session, data)
    } catch (error) {
      console.error("Error handling callback:", error)
    }
  })
}

async function handleSourceApproval(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  sourceId: string,
  status: "approved" | "rejected"
) {
  try {
    const source = await getSourceRecommendation(sourceId)
    if (!source) {
      await bot.sendMessage(chatId, "Sorry, I couldn't find that recommendation.")
      return
    }
    
    await saveSourceApproval(sourceId, status)
    
    if (status === "approved") {
      await bot.sendMessage(chatId,
        `✅ *Added to your intelligence feed!*\n\n"${source.source_title}" will now contribute to your personalized insights.\n\nI'm getting smarter for you! 🧠`,
        { parse_mode: "Markdown" }
      )
    } else {
      await bot.sendMessage(chatId,
        `Got it! I won't recommend similar content from this source.`,
        { parse_mode: "Markdown" }
      )
    }
  } catch (error) {
    console.error("Error handling source approval:", error)
    await bot.sendMessage(chatId, "Something went wrong. Please try again.")
  }
}

export async function sendSourceRecommendation(
  bot: TelegramBot,
  chatId: number,
  sourceId: string,
  sourceTitle: string,
  sourceUrl: string,
  relevanceReason: string
) {
  const message = `🧠 *I found content to make me smarter for you!*\n\n📰 *${sourceTitle}*\n\n${relevanceReason}\n\n🔗 ${sourceUrl}\n\n_Approve this source to add it to your intelligence feed._`

  await bot.sendMessage(chatId, message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `${SOURCE_APPROVE_PREFIX}${sourceId}` },
          { text: "❌ Not for me", callback_data: `${SOURCE_REJECT_PREFIX}${sourceId}` }
        ],
        [
          { text: "⏰ Remind me later", callback_data: `${SOURCE_LATER_PREFIX}${sourceId}` }
        ]
      ]
    }
  })
}

async function handleNewStrategyCommand(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  username: string | null
) {
  const existingSession = await getSession(telegramId)
  
  if (existingSession && existingSession.phase !== "completed") {
    const progress = getCurrentPhaseProgress(existingSession.current_question_id || "welcome")
    await bot.sendMessage(chatId,
      `You have an intake in progress.\n\n📍 Phase: ${progress.phase}\n📊 Progress: ${progress.current}/${progress.total}\n\nContinuing where you left off...\n\nType /restart to start over or /cancel to cancel.`,
      { parse_mode: "Markdown" }
    )
    
    const currentQuestion = INTAKE_QUESTIONS.find(
      q => q.id === existingSession.current_question_id
    ) || INTAKE_QUESTIONS[0]
    
    await sendQuestion(bot, chatId, currentQuestion)
    return
  }

  await deleteSession(telegramId)
  const session = await createSession(telegramId, username)
  
  const firstQuestion = INTAKE_QUESTIONS[0]
  await updateSession(telegramId, { current_question_id: firstQuestion.id })
  await sendQuestion(bot, chatId, firstQuestion)
}

async function handleIntakeResponse(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  session: UserSession,
  response: string
) {
  const currentQuestion = INTAKE_QUESTIONS.find(
    q => q.id === session.current_question_id
  )

  if (!currentQuestion) {
    await sendQuestion(bot, chatId, INTAKE_QUESTIONS[0])
    return
  }

  if (currentQuestion.validation === "choice" && currentQuestion.choices) {
    const isValid = currentQuestion.choices.some(
      c => c.toLowerCase() === response.toLowerCase() || 
           currentQuestion.choices!.indexOf(response) !== -1
    )
    if (!isValid && !response.match(/^\d+$/)) {
      await bot.sendMessage(chatId, 
        "Please select one of the options provided, or type the number of your choice."
      )
      await sendQuestion(bot, chatId, currentQuestion)
      return
    }
    
    if (response.match(/^\d+$/)) {
      const index = parseInt(response) - 1
      if (currentQuestion.choices[index]) {
        response = currentQuestion.choices[index]
      }
    }
  }

  await saveResponse(telegramId, currentQuestion.id, response)

  const nextQuestion = getNextQuestion(currentQuestion.id)

  if (!nextQuestion || currentQuestion.id === "completion") {
    await handleIntakeComplete(bot, chatId, telegramId)
    return
  }

  const currentPhase = currentQuestion.phase
  const nextPhase = nextQuestion.phase

  if (currentPhase !== nextPhase) {
    const phaseLabel = INTAKE_PHASES[nextPhase as keyof typeof INTAKE_PHASES]
    await bot.sendMessage(chatId,
      `✅ *${INTAKE_PHASES[currentPhase as keyof typeof INTAKE_PHASES]}* complete!\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n📍 Moving to: *${phaseLabel}*`,
      { parse_mode: "Markdown" }
    )
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  await updateSession(telegramId, { 
    current_question_id: nextQuestion.id,
    phase: nextQuestion.phase as UserSession["phase"]
  })
  
  await sendQuestion(bot, chatId, nextQuestion)
}

async function sendQuestion(
  bot: TelegramBot,
  chatId: number,
  question: typeof INTAKE_QUESTIONS[0]
) {
  const progress = getCurrentPhaseProgress(question.id)
  
  let messageText = question.question

  if (question.examples && question.examples.length > 0) {
    messageText += "\n\n_Examples:_"
    question.examples.forEach(ex => {
      messageText += `\n• ${ex}`
    })
  }

  if (question.id !== "welcome" && question.id !== "completion") {
    messageText = `📍 ${progress.phase} (${progress.current}/${progress.total})\n\n${messageText}`
  }

  if (question.validation === "choice" && question.choices) {
    const keyboard = question.choices.map((choice, index) => [{
      text: choice,
      callback_data: choice.substring(0, 64)
    }])

    await bot.sendMessage(chatId, messageText, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard
      }
    })
  } else if (question.validation === "list" && question.choices) {
    messageText += "\n\n_Select multiple by typing them separated by commas, or type the numbers:_"
    question.choices.forEach((choice, index) => {
      messageText += `\n${index + 1}. ${choice}`
    })

    await bot.sendMessage(chatId, messageText, { parse_mode: "Markdown" })
  } else {
    await bot.sendMessage(chatId, messageText, { parse_mode: "Markdown" })
  }
}

async function handleIntakeComplete(
  bot: TelegramBot,
  chatId: number,
  telegramId: number
) {
  await updateSession(telegramId, { phase: "generating" })
  
  await bot.sendMessage(chatId,
    `⏳ *Generating your strategy documents...*\n\nThis may take 1-2 minutes. I'm using AI to create:\n\n🎨 Brand Identity Blueprint\n📝 Content Strategy\n👥 Target Audience Analysis\n\nPlease wait...`,
    { parse_mode: "Markdown" }
  )

  const session = await getSession(telegramId)
  if (!session) return

  try {
    const strategy = await generateFullStrategy(session)
    
    if (!strategy) {
      throw new Error("Failed to generate strategy")
    }

    const clientId = await createOrGetClient(
      telegramId,
      session.responses.business_name || `User ${telegramId}`,
      undefined
    )

    strategy.client_id = clientId
    await saveGeneratedStrategy(strategy)

    await bot.sendMessage(chatId,
      `✅ *Your strategy documents are ready!*\n\nI'll send them to you now in three parts.`,
      { parse_mode: "Markdown" }
    )

    await new Promise(resolve => setTimeout(resolve, 500))
    
    await bot.sendMessage(chatId, 
      formatBrandBlueprintForTelegram(strategy.brand_blueprint),
      { parse_mode: "Markdown" }
    )

    await new Promise(resolve => setTimeout(resolve, 500))
    
    await bot.sendMessage(chatId,
      formatContentStrategyForTelegram(strategy.content_strategy),
      { parse_mode: "Markdown" }
    )

    await new Promise(resolve => setTimeout(resolve, 500))
    
    await bot.sendMessage(chatId,
      formatAudienceAnalysisForTelegram(strategy.audience_analysis),
      { parse_mode: "Markdown" }
    )

    await bot.sendMessage(chatId,
      `🎉 *That's everything!*\n\nYour complete strategy package includes:\n✅ Brand Identity Blueprint\n✅ Content Strategy with Example Week\n✅ Target Audience Analysis\n\nThese documents are now saved to your profile. You can access them anytime through the KORA dashboard.\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n*What's Next?*\n\n1. Review your strategy documents\n2. Start creating content based on your pillars\n3. Follow your example week schedule\n4. Track your progress in KORA\n\nNeed to update your strategy? Just type *${COMMAND_TRIGGER}* again anytime.\n\nThank you for trusting KORA! 🚀`,
      { parse_mode: "Markdown" }
    )

    await updateSession(telegramId, { phase: "completed" })
    
  } catch (error) {
    console.error("Error generating strategy:", error)
    await bot.sendMessage(chatId,
      `❌ I encountered an error generating your strategy.\n\nYour responses have been saved. Please try again with /restart or contact support if the issue persists.`,
      { parse_mode: "Markdown" }
    )
  }
}

async function handleCancel(
  bot: TelegramBot,
  chatId: number,
  telegramId: number
) {
  const session = await getSession(telegramId)
  
  if (!session || session.phase === "completed") {
    await bot.sendMessage(chatId,
      "You don't have an active intake session to cancel."
    )
    return
  }

  await deleteSession(telegramId)
  await bot.sendMessage(chatId,
    `Intake cancelled. Your progress has been cleared.\n\nTo start again, type *${COMMAND_TRIGGER}*`,
    { parse_mode: "Markdown" }
  )
}

async function handleRestart(
  bot: TelegramBot,
  chatId: number,
  telegramId: number,
  username: string | null
) {
  await deleteSession(telegramId)
  await bot.sendMessage(chatId,
    `Previous session cleared. Starting fresh...`,
    { parse_mode: "Markdown" }
  )
  
  await handleNewStrategyCommand(bot, chatId, telegramId, username)
}
