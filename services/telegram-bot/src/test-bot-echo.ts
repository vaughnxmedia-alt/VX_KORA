/**
 * Minimal test: bot receives messages and replies. Use only to verify Telegram + token.
 * For the real flow (/start → welcome → @koranewstrategy questionnaire), run: npm run dev
 */
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, "..", ".env") })

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not set. Create .env in services/telegram-bot with TELEGRAM_BOT_TOKEN=...")
  process.exit(1)
}

import TelegramBot from "node-telegram-bot-api"

console.log("Starting echo test bot...")
console.log("For the real bot (welcome + questionnaire), run: npm run dev")
const bot = new TelegramBot(token, { polling: true })

bot.on("message", (msg) => {
  const chatId = msg.chat?.id
  const text = (msg.text || "").trim()
  console.log("Received:", text || "(no text)")
  if (!chatId) return

  // If they send /start, tell them how to get the real welcome + questionnaire
  if (text === "/start" || text.toLowerCase() === "/start") {
    bot.sendMessage(
      chatId,
      "This is the echo test only.\n\n" +
        "For the welcome message and the @koranewstrategy questionnaire, run the full bot:\n\n" +
        "  npm run dev\n\n" +
        "Then send /start here again (with the full bot running) to get the real flow."
    )
      .then(() => console.log("Replied with instructions"))
      .catch((err) => console.error("Send failed:", err))
    return
  }

  bot.sendMessage(chatId, "Got it! If you see this, the bot receives messages.")
    .then(() => console.log("Replied to chat"))
    .catch((err) => console.error("Send failed:", err))
})

bot.on("polling_error", (err) => {
  console.error("Polling error:", err.message || err)
})

console.log("Echo bot running. Send /start to get instructions; send anything else to get 'Got it!'")
console.log("Press Ctrl+C to stop.")
