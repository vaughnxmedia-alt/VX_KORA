import "dotenv/config"
import TelegramBot from "node-telegram-bot-api"
import { initializeDatabase } from "./database.js"
import { initializeOpenAI } from "./strategy-generator.js"
import { setupBotHandlers } from "./bot-handler.js"
import { initializeScheduler } from "./scheduler/insight-scheduler.js"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is required")
  console.error("Please set it in your .env file")
  process.exit(1)
}

console.log("🚀 Starting KORA Telegram Bot...")

initializeDatabase()
console.log("✅ Database initialized")

const openai = initializeOpenAI()
if (openai) {
  console.log("✅ OpenAI initialized")
} else {
  console.warn("⚠️ OpenAI not configured - strategy generation will fail")
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })
console.log("✅ Telegram Bot connected")

setupBotHandlers(bot)
console.log("✅ Bot handlers registered")

initializeScheduler(bot)
console.log("✅ Insight scheduler initialized")

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 KORA Telegram Bot is now running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commands:
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
