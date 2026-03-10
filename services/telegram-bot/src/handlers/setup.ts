import TelegramBot from "node-telegram-bot-api"
import { initializeOrchestrator } from "../pipeline/orchestrator"
import { initializeDatabase } from "../db/client"
import { initializeRouter } from "../llm/router"
import {
  handleStartCommand,
  handleStatusCommand,
  handleRestartCommand,
  handleHelpCommand,
  handleFeedbackCommand,
  handleDebugCommand,
} from "./command-handlers"
import {
  handleNewStrategyTrigger,
  handleIntakeResponse,
  hasActiveSession,
} from "./message-handlers"
import { handleCallbackQuery } from "./callback-handlers"
import {
  handleInsightTrigger,
  handleContentTrigger,
  handleScheduleCommand,
  handlePreferencesCommand,
} from "./insight-handlers"
import { handleConversation } from "./conversation-handler.js"

export function setupBotHandlers(bot: TelegramBot): void {
  initializeDatabase()
  initializeRouter()
  initializeOrchestrator(bot)

  // Standard commands
  bot.onText(/\/start/, (msg) => handleStartCommand(bot, msg))
  bot.onText(/\/status/, (msg) => handleStatusCommand(bot, msg))
  bot.onText(/\/restart/, (msg) => handleRestartCommand(bot, msg))
  bot.onText(/\/help/, (msg) => handleHelpCommand(bot, msg))
  bot.onText(/\/feedback/, (msg) => handleFeedbackCommand(bot, msg))
  bot.onText(/\/debug/, (msg) => handleDebugCommand(bot, msg))
  
  // Schedule command for automated delivery
  bot.onText(/\/schedule/, (msg) => handleScheduleCommand(bot, msg))
  
  // Preferences command for content customization
  bot.onText(/\/preferences/, (msg) => handlePreferencesCommand(bot, msg))

  // Strategy triggers
  bot.onText(/@koranewstrategy/i, (msg) => handleNewStrategyTrigger(bot, msg))
  
  // Intelligence triggers
  bot.onText(/@korainsight/i, (msg) => handleInsightTrigger(bot, msg))
  bot.onText(/@koracontent/i, (msg) => handleContentTrigger(bot, msg))

  bot.on("message", async (msg) => {
    if (!msg.text) return
    if (msg.text.startsWith("/")) return
    // Skip all trigger messages - these are handled by specific handlers above
    if (/@koranewstrategy/i.test(msg.text)) return
    if (/@korainsight/i.test(msg.text)) return
    if (/@koracontent/i.test(msg.text)) return

    const telegramId = msg.from?.id
    if (!telegramId) return

    // Priority 1: Active intake session (onboarding questionnaire)
    if (hasActiveSession(telegramId)) {
      await handleIntakeResponse(bot, msg)
      return
    }

    // Priority 2: Conversational follow-ups (refinements, approvals, questions)
    // This enables natural language interaction after insights are delivered
    await handleConversation(bot, msg)
  })

  bot.on("callback_query", (query) => handleCallbackQuery(bot, query))

  bot.on("polling_error", (error) => {
    console.error("Polling error:", error)
  })

  console.log("Bot handlers initialized")
}
