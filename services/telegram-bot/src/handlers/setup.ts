import TelegramBot from "node-telegram-bot-api"
import { initializeOrchestrator } from "../pipeline/orchestrator"
import { initializeDatabase } from "../db/client"
import { initializeRouter } from "../llm/router"
import {
  handleStartCommand,
  handleStatusCommand,
  handleRestartCommand,
  handleHelpCommand,
  handleRunCommand,
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

/** Wrap a handler so failures are logged and the user gets a reply instead of silence. */
function wrap(
  bot: TelegramBot,
  handler: (bot: TelegramBot, msg: TelegramBot.Message) => Promise<void>,
  fallback = "Something went wrong. Try /start or /help."
) {
  return (msg: TelegramBot.Message) => {
    const chatId = msg.chat?.id
    handler(bot, msg).catch((err) => {
      console.error("Handler error:", err)
      if (chatId) {
        bot.sendMessage(chatId, fallback).catch(() => {})
      }
    })
  }
}

export function setupBotHandlers(bot: TelegramBot): void {
  // Register handlers FIRST so the bot always responds (e.g. /start) even if init fails below.
  // Standard commands
  bot.onText(/\/start/, wrap(bot, handleStartCommand))
  bot.onText(/\/run/, wrap(bot, handleRunCommand))
  bot.onText(/\/status/, wrap(bot, handleStatusCommand))
  bot.onText(/\/restart/, wrap(bot, handleRestartCommand))
  bot.onText(/\/help/, wrap(bot, handleHelpCommand))
  bot.onText(/\/feedback/, wrap(bot, handleFeedbackCommand))
  bot.onText(/\/debug/, wrap(bot, handleDebugCommand))
  bot.onText(/\/schedule/, wrap(bot, handleScheduleCommand))
  bot.onText(/\/preferences/, wrap(bot, handlePreferencesCommand))

  // Strategy and intelligence triggers
  bot.onText(/@koranewstrategy/i, wrap(bot, handleNewStrategyTrigger))
  bot.onText(/@korainsight/i, wrap(bot, handleInsightTrigger))
  bot.onText(/@koracontent/i, wrap(bot, handleContentTrigger))

  bot.on("message", async (msg) => {
    if (!msg.text) return
    if (msg.text.startsWith("/")) return
    if (/@koranewstrategy/i.test(msg.text)) return
    if (/@korainsight/i.test(msg.text)) return
    if (/@koracontent/i.test(msg.text)) return

    const chatId = msg.chat.id
    const telegramId = msg.from?.id
    if (!telegramId) return

    try {
      if (hasActiveSession(telegramId)) {
        await handleIntakeResponse(bot, msg)
        return
      }
      await handleConversation(bot, msg)
    } catch (err) {
      console.error("Message handler error:", err)
      await bot.sendMessage(chatId, "Something went wrong. Try /start or /help.").catch(() => {})
    }
  })

  bot.on("callback_query", (query) => {
    handleCallbackQuery(bot, query).catch((err) => {
      console.error("Callback handler error:", err)
    })
  })

  bot.on("polling_error", (error) => {
    console.error("Telegram polling error (bot may stop receiving updates):", error)
  })

  // Run init after handlers are registered so /start works even if init fails.
  try {
    initializeDatabase()
    initializeRouter()
    initializeOrchestrator(bot)
    console.log("Bot handlers initialized")
  } catch (err) {
    console.error("Init failed (DB/orchestrator may be unavailable; /start still works):", err)
    console.log("Bot handlers registered (limited mode)")
  }
}
