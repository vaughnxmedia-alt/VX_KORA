import TelegramBot from "node-telegram-bot-api"
import { getOrchestrator } from "../pipeline/orchestrator"
import { getTenantProfileByTelegramId } from "../db/tenant-profiles"
import { clearSession } from "./message-handlers"
import { getLatestPipelineRun } from "../db/pipeline-runs"
import { getBrandBlueprint, getContentStrategy, getAudienceAnalysis } from "../db/deliverables"
import { isTestTenant } from "../types/testing"
import { sendDeliverableDebugInfo, sendTestingSummary, checkTestTenantSetup } from "../testing"

export async function handleStartCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  const fallback = "Welcome to KORA! Type @koranewstrategy to begin, or /help for commands."

  if (!telegramId) {
    await bot.sendMessage(chatId, "Could not identify user.").catch(() => {})
    return
  }

  const welcomeMessage = `Welcome to KORA!

I'm your AI-powered brand strategist. I'll help you create:
- Brand Identity Blueprint
- Target Audience Analysis  
- Content Strategy

To get started, type @koranewstrategy

Commands:
/start - Show this welcome message
/run - Trigger your personalized insight run (after intake)
/status - Check your current progress
/restart - Start a new strategy session
/feedback - Rate your deliverables (after completion)
/help - Get help`

  try {
    await bot.sendMessage(chatId, welcomeMessage)
  } catch (err) {
    console.error("handleStartCommand send error:", err)
    await bot.sendMessage(chatId, fallback).catch(() => {})
  }
}

export async function handleStatusCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  if (!telegramId) {
    await bot.sendMessage(chatId, "Could not identify user.")
    return
  }

  const tenant = await getTenantProfileByTelegramId(telegramId)

  if (!tenant) {
    await bot.sendMessage(chatId, 
      "You haven't started a strategy session yet.\n\nType @koranewstrategy to begin!")
    return
  }

  const latestRun = await getLatestPipelineRun(tenant.id)

  let statusMessage = `*Your KORA Status*\n\n`
  statusMessage += `Business: ${tenant.businessName || "Not set"}\n`
  statusMessage += `Current Stage: ${formatStage(tenant.pipelineStage)}\n\n`

  statusMessage += `*Progress:*\n`
  statusMessage += `- Intake: ${formatStatus(tenant.intakeStatus)}\n`
  statusMessage += `- Research: ${formatStatus(tenant.researchStatus)}\n`
  statusMessage += `- Generation: ${formatStatus(tenant.generationStatus)}\n`
  statusMessage += `- Review: ${formatStatus(tenant.reviewStatus)}\n`
  statusMessage += `- Delivery: ${formatStatus(tenant.deliveryStatus)}\n`

  if (tenant.pipelineError) {
    statusMessage += `\n*Last Error:* ${tenant.pipelineError}`
  }

  if (latestRun) {
    statusMessage += `\n\n*Latest Run:*\n`
    statusMessage += `Started: ${latestRun.startedAt.toLocaleString()}\n`
    statusMessage += `Status: ${latestRun.status}\n`
    if (latestRun.totalLlmCalls > 0) {
      statusMessage += `LLM Calls: ${latestRun.totalLlmCalls}\n`
    }
  }

  await bot.sendMessage(chatId, statusMessage, { parse_mode: "Markdown" })
}

export async function handleRestartCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  if (!telegramId) {
    await bot.sendMessage(chatId, "Could not identify user.")
    return
  }

  clearSession(telegramId)
  await bot.sendMessage(chatId,
    "Ready to start fresh!\n\nType @koranewstrategy to begin a new strategy session."
  )
}

export async function handleHelpCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  const helpMessage = `*KORA Help*

*Commands:*
/start - Welcome message
/run - Trigger your personalized insight run
/status - Check your progress
/restart - Start a new session
/feedback - Rate deliverables
/help - This help message

*Getting Started:*
1. Type @koranewstrategy to begin
2. Answer the questions about your brand
3. I'll research and analyze your presence
4. Receive your strategy documents

*About the Process:*
- Intake: ~15-20 questions about your brand
- Research: I analyze your website and social profiles
- Generation: AI creates your strategy documents
- Review: Quality checks before delivery
- Delivery: Documents sent here and saved in Intake; use /run for your insight run

*Need Help?*
Contact support or check the documentation.`

  if (isTestTenant(telegramId || 0)) {
    const testInfo = `\n\n*Test Tenant Features:*
- Extra feedback options
- Debug information available
- Priority support`
    
    await bot.sendMessage(chatId, helpMessage + testInfo, { parse_mode: "Markdown" })
  } else {
    await bot.sendMessage(chatId, helpMessage, { parse_mode: "Markdown" })
  }
}

const INSIGHTS_TRIGGER_URL = process.env.INSIGHTS_TRIGGER_URL || "http://127.0.0.1:3847/run"

export async function handleRunCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  if (!telegramId) {
    await bot.sendMessage(chatId, "Could not identify user.")
    return
  }

  try {
    const secret = process.env.TRIGGER_RUN_SECRET?.trim()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (secret) headers["x-trigger-secret"] = secret
    const res = await fetch(INSIGHTS_TRIGGER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ telegram_id: telegramId }),
    })
    const text = await res.text()
    let body: { ok?: boolean; message?: string; error?: string }
    try {
      body = JSON.parse(text) as typeof body
    } catch {
      body = {}
    }
    if (res.status === 202 && body.ok) {
      await bot.sendMessage(
        chatId,
        "Your personalized insight run has been started. You’ll receive your briefing here shortly.",
        { parse_mode: "Markdown" }
      )
    } else if (res.status === 429) {
      await bot.sendMessage(chatId, "A run is already in progress. Please wait a moment and try again.")
    } else {
      await bot.sendMessage(
        chatId,
        "The insight server isn’t available right now. Use Mission Control → Ingest Runs → **Trigger Run**, or try again later.",
        { parse_mode: "Markdown" }
      )
    }
  } catch {
    await bot.sendMessage(
      chatId,
      "Could not reach the insight server. Use Mission Control → Ingest Runs → **Trigger Run**, or try again later.",
      { parse_mode: "Markdown" }
    )
  }
}

export async function handleFeedbackCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  if (!telegramId) {
    await bot.sendMessage(chatId, "Could not identify user.")
    return
  }

  const tenant = await getTenantProfileByTelegramId(telegramId)

  if (!tenant || tenant.deliveryStatus !== "complete") {
    await bot.sendMessage(chatId,
      "You need to complete the strategy process before providing feedback.\n\nType @koranewstrategy to get started!"
    )
    return
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "Rate Brand Blueprint", callback_data: "feedback_brand" },
      ],
      [
        { text: "Rate Audience Analysis", callback_data: "feedback_audience" },
      ],
      [
        { text: "Rate Content Strategy", callback_data: "feedback_strategy" },
      ],
      [
        { text: "Overall Feedback", callback_data: "feedback_overall" },
      ],
    ],
  }

  await bot.sendMessage(chatId,
    "Which deliverable would you like to rate?",
    { reply_markup: keyboard }
  )
}

export async function handleDebugCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id
  const telegramId = msg.from?.id

  if (!telegramId) {
    await bot.sendMessage(chatId, "Could not identify user.")
    return
  }

  if (!isTestTenant(telegramId)) {
    await bot.sendMessage(chatId, "Debug commands are only available for test tenants.")
    return
  }

  const text = msg.text || ""
  const parts = text.split(" ")
  const subCommand = parts[1] || "help"

  switch (subCommand) {
    case "brand":
      await sendDeliverableDebugInfo(bot, chatId, telegramId, "brand_blueprint")
      break
    case "audience":
      await sendDeliverableDebugInfo(bot, chatId, telegramId, "audience_analysis")
      break
    case "strategy":
      await sendDeliverableDebugInfo(bot, chatId, telegramId, "content_strategy")
      break
    case "summary":
      await sendTestingSummary(bot, chatId)
      break
    case "check":
      const { valid, issues } = await checkTestTenantSetup()
      if (valid) {
        await bot.sendMessage(chatId, "All test tenants are properly configured.")
      } else {
        await bot.sendMessage(chatId, `Test tenant issues:\n${issues.join("\n")}`)
      }
      break
    default:
      await bot.sendMessage(chatId,
        `*Debug Commands (Test Tenants Only)*\n\n` +
        `/debug brand - Show brand blueprint debug info\n` +
        `/debug audience - Show audience analysis debug info\n` +
        `/debug strategy - Show content strategy debug info\n` +
        `/debug summary - Show all test tenant feedback summary\n` +
        `/debug check - Verify test tenant setup`,
        { parse_mode: "Markdown" }
      )
  }
}

function formatStage(stage: string): string {
  const stageNames: Record<string, string> = {
    intake: "Gathering Information",
    clarification: "Clarifying Details",
    research: "Researching",
    generation: "Generating Documents",
    review: "Quality Review",
    delivery: "Delivering",
    complete: "Complete",
    error: "Error Occurred",
  }
  return stageNames[stage] || stage
}

function formatStatus(status: string): string {
  const statusIcons: Record<string, string> = {
    pending: "[ ]",
    in_progress: "[~]",
    clarifying: "[?]",
    complete: "[x]",
    passed: "[x]",
    failed: "[!]",
    skipped: "[-]",
    brand: "[B]",
    audience: "[A]",
    strategy: "[S]",
    regenerating: "[R]",
  }
  return statusIcons[status] || `[${status}]`
}
