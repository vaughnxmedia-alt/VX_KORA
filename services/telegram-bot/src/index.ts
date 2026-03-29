import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, "..", ".env") })

import TelegramBot from "node-telegram-bot-api"
import { initializeOpenAI } from "./strategy-generator.js"
import { setupBotHandlers } from "./handlers/setup.js"
import { initializeScheduler } from "./scheduler/insight-scheduler.js"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is required")
  console.error("Please set it in your .env file (use the token from BotFather for your bot, e.g. @VX_kora_bot)")
  process.exit(1)
}

console.log("🚀 Starting KORA Telegram Bot...")

const openai = initializeOpenAI()
if (openai) {
  console.log("✅ OpenAI initialized")
} else {
  console.warn("⚠️ OpenAI not configured - strategy generation will fail")
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })
console.log("✅ Telegram Bot connected (polling)")

// Log every message in dev so we see if Telegram is delivering updates
bot.on("message", (msg) => {
  console.log("[incoming]", msg.chat?.id, msg.text || "(no text)")
})

try {
  setupBotHandlers(bot)
  console.log("✅ Bot handlers registered")
  initializeScheduler(bot)
  console.log("✅ Insight scheduler initialized")
} catch (err) {
  console.error("Startup error (bot may not reply to commands):", err)
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 KORA Telegram Bot is now running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commands:
  /start          - Welcome and command list
  /run            - Trigger your insight run
  @koranewstrategy - Start new strategy intake
  @korainsight    - Get industry insight report
  @koracontent    - Get content strategy (3day/5day)
  /schedule       - Set up automated delivery
  /restart        - Restart intake from beginning

The bot will:
  1. Guide users through brand intake questions
  2. Generate Brand Blueprint, Content Strategy, Audience Analysis
  3. Deliver daily/weekly industry insights
  4. Generate ready-to-post content strategies
  5. Save everything to Supabase

Press Ctrl+C to stop.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

process.on("SIGINT", () => {
  console.log("\n\nShutting down KORA Bot...")
  bot.stopPolling()
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\n\nShutting down KORA Bot...")
  bot.stopPolling()
  process.exit(0)
})

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error)
})
