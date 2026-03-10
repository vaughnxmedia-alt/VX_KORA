import TelegramBot from "node-telegram-bot-api"
import { getOrchestrator } from "../pipeline/orchestrator"
import { getTenantProfileByTelegramId } from "../db/tenant-profiles"
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

  if (!telegramId) {
    await bot.sendMessage(chatId, "Could not identify user.")
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
/status - Check your current progress
/restart - Start a new strategy session
/feedback - Rate your deliverables (after completion)
/help - Get help`

  await bot.sendMessage(chatId, welcomeMessage)
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
- Delivery: Documents sent here and to your dashboard

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
