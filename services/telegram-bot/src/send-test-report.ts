/**
 * Send a test report to Juss and Jocelyn (or configured recipients) via Telegram.
 * Use this to verify the bot token and delivery path.
 *
 * Recipients (in order of precedence):
 * 1. Env: JUSS_TELEGRAM_CHAT_ID and JOCELYN_TELEGRAM_CHAT_ID
 * 2. Env: TEST_REPORT_CHAT_IDS (comma-separated, e.g. "123,456")
 * 3. DB: customers with telegram_id where first_name/business_name match TEST_REPORT_LOOKUP_NAMES (comma-separated)
 * 4. Fallback: hardcoded Juss and Jocelyn chat IDs from send-deep-insights.ts
 *
 * Required env: TELEGRAM_BOT_TOKEN
 * Optional: SUPABASE_URL, SUPABASE_SERVICE_KEY (for DB lookup)
 */

import dotenv from "dotenv"
import TelegramBot from "node-telegram-bot-api"
import { initializeDatabase, getDatabase } from "./db/client.js"

dotenv.config()

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const JUSS_CHAT_ID = process.env.JUSS_TELEGRAM_CHAT_ID
const JOCELYN_CHAT_ID = process.env.JOCELYN_TELEGRAM_CHAT_ID
const TEST_REPORT_CHAT_IDS = process.env.TEST_REPORT_CHAT_IDS
const TEST_REPORT_LOOKUP_NAMES = process.env.TEST_REPORT_LOOKUP_NAMES
const TEST_MESSAGE =
  process.env.TEST_REPORT_MESSAGE ||
  "KORA test: everything is working."

// Fallback IDs (same as send-deep-insights.ts TARGET_USERS)
const FALLBACK_RECIPIENTS: { chatId: number; name: string }[] = [
  { chatId: 8216104620, name: "Juss" },
  { chatId: 8697293004, name: "Jocelyn" },
]

interface Recipient {
  chatId: number
  name: string
}

function fromEnv(): Recipient[] {
  if (JUSS_CHAT_ID && JOCELYN_CHAT_ID) {
    return [
      { chatId: parseInt(JUSS_CHAT_ID, 10), name: "Juss" },
      { chatId: parseInt(JOCELYN_CHAT_ID, 10), name: "Jocelyn" },
    ]
  }
  if (TEST_REPORT_CHAT_IDS) {
    const ids = TEST_REPORT_CHAT_IDS.split(",").map((s) => s.trim()).filter(Boolean)
    return ids.map((id, i) => ({ chatId: parseInt(id, 10), name: `Recipient ${i + 1}` }))
  }
  return []
}

async function fromDb(): Promise<Recipient[]> {
  const names = TEST_REPORT_LOOKUP_NAMES?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (!names?.length) return []

  initializeDatabase()
  const supabase = getDatabase()
  if (!supabase) return []

  const { data: customers, error } = await supabase
    .from("customers")
    .select("telegram_id, first_name, business_name")
    .not("telegram_id", "is", null)

  if (error || !customers?.length) return []

  const matched = customers.filter((c) => {
    const first = (c.first_name || "").toLowerCase()
    const business = (c.business_name || "").toLowerCase()
    return names.some((n) => first.includes(n) || business.includes(n))
  })

  return matched.map((c) => ({
    chatId: c.telegram_id as number,
    name: (c.first_name || c.business_name || "User") as string,
  }))
}

async function resolveRecipients(): Promise<Recipient[]> {
  const fromEnvList = fromEnv()
  if (fromEnvList.length > 0) return fromEnvList

  const fromDbList = await fromDb()
  if (fromDbList.length > 0) return fromDbList

  return FALLBACK_RECIPIENTS
}

async function main(): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is required. Set it in .env")
    process.exit(1)
  }

  const recipients = await resolveRecipients()
  if (recipients.length === 0) {
    console.error("No recipients. Set JUSS_TELEGRAM_CHAT_ID + JOCELYN_TELEGRAM_CHAT_ID, TEST_REPORT_CHAT_IDS, or TEST_REPORT_LOOKUP_NAMES.")
    process.exit(1)
  }

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false })
  console.log(`Sending test report to ${recipients.length} recipient(s): ${recipients.map((r) => `${r.name} (${r.chatId})`).join(", ")}`)

  const results = await Promise.allSettled(
    recipients.map(async (r) => {
      await bot.sendMessage(r.chatId, TEST_MESSAGE)
      return r.name
    })
  )

  let ok = 0
  let fail = 0
  results.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") {
      console.log(`  OK: ${outcome.value}`)
      ok++
    } else {
      console.error(`  FAIL: ${recipients[i].name} – ${(outcome.reason as Error).message}`)
      fail++
    }
  })

  console.log(`Done. Sent: ${ok}, Failed: ${fail}`)
  process.exit(fail > 0 ? 1 : 0)
}

main()
