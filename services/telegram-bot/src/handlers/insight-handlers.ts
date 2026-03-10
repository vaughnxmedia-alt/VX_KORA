/**
 * Insight & Content Handlers
 * 
 * Telegram handlers for @korainsight, @koracontent, /schedule, and /preferences commands.
 */

import TelegramBot from "node-telegram-bot-api"
import { createClient } from "@supabase/supabase-js"
import { generateInsightReport, type InsightReportOutput } from "../agents/insight-report.js"
import { generateContentDraft, type ContentDraftOutput } from "../agents/content-draft.js"
import { USE_CASE_TEMPLATES } from "../types/insight.js"

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Handle @korainsight trigger
 * Generates and sends an industry insight report
 */
export async function handleInsightTrigger(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from?.id
  const chatId = msg.chat.id

  if (!telegramId) {
    await bot.sendMessage(chatId, "Unable to identify user.")
    return
  }

  try {
    // Find tenant
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, business_name")
      .eq("telegram_id", telegramId)
      .single()

    if (customerError || !customer) {
      await bot.sendMessage(
        chatId,
        "❌ No account found. Please complete the onboarding with @koranewstrategy first."
      )
      return
    }

    // Send processing message
    const processingMsg = await bot.sendMessage(
      chatId,
      "📊 *Generating your Industry Insight Report...*\n\n" +
      "_Scanning news sources, analyzing trends, and curating insights tailored to your profile._\n\n" +
      "This usually takes 30-60 seconds.",
      { parse_mode: "Markdown" }
    )

    // Generate the report
    const report = await generateInsightReport(
      customer.id,
      telegramId,
      "on_demand"
    )

    // Delete processing message
    await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {})

    if (!report) {
      await bot.sendMessage(
        chatId,
        "❌ Failed to generate insight report. Please try again later."
      )
      return
    }

    // Send the formatted report
    await bot.sendMessage(chatId, report.formattedMessage, { parse_mode: "Markdown" })

    // Send follow-up with options
    await bot.sendMessage(
      chatId,
      "📌 *What's next?*\n\n" +
      "• Reply `@koracontent 3day` for a 3-day content plan\n" +
      "• Reply `@koracontent 5day` for a 5-day content plan\n" +
      "• Reply `/schedule insight daily 9am` to get this daily\n\n" +
      "_Your insights are saved and used to improve future reports._",
      { parse_mode: "Markdown" }
    )

  } catch (error) {
    console.error("[handleInsightTrigger] Error:", error)
    await bot.sendMessage(
      chatId,
      "❌ An error occurred while generating your report. Please try again."
    )
  }
}

/**
 * Handle @koracontent trigger
 * Generates and sends a 3-day or 5-day content strategy
 */
export async function handleContentTrigger(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from?.id
  const chatId = msg.chat.id
  const text = msg.text || ""

  if (!telegramId) {
    await bot.sendMessage(chatId, "Unable to identify user.")
    return
  }

  // Parse strategy type from message
  let strategyType: "3day" | "5day" = "3day"
  if (text.toLowerCase().includes("5day") || text.toLowerCase().includes("5 day")) {
    strategyType = "5day"
  }

  try {
    // Find tenant
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, business_name")
      .eq("telegram_id", telegramId)
      .single()

    if (customerError || !customer) {
      await bot.sendMessage(
        chatId,
        "❌ No account found. Please complete the onboarding with @koranewstrategy first."
      )
      return
    }

    // Send processing message
    const processingMsg = await bot.sendMessage(
      chatId,
      `🎬 *Generating your ${strategyType === "3day" ? "3-Day" : "5-Day"} Content Strategy...*\n\n` +
      "_Creating ready-to-post content with captions, hashtags, and visual suggestions._\n\n" +
      "This usually takes 1-2 minutes.",
      { parse_mode: "Markdown" }
    )

    // Generate the content draft
    const draft = await generateContentDraft(
      customer.id,
      telegramId,
      strategyType
    )

    // Delete processing message
    await bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {})

    if (!draft) {
      await bot.sendMessage(
        chatId,
        "❌ Failed to generate content strategy. Please try again later."
      )
      return
    }

    // Send each message in the formatted output
    for (const message of draft.formattedMessages) {
      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Send follow-up
    await bot.sendMessage(
      chatId,
      "✅ *Your content strategy is ready!*\n\n" +
      "📌 *Pro Tips:*\n" +
      "• Screenshot or forward these to your scheduling tool\n" +
      "• Customize the captions to match your voice\n" +
      "• Adjust hashtags based on current trends\n\n" +
      "💬 Reply `/feedback` after posting to help KORA improve!",
      { parse_mode: "Markdown" }
    )

  } catch (error) {
    console.error("[handleContentTrigger] Error:", error)
    await bot.sendMessage(
      chatId,
      "❌ An error occurred while generating your content. Please try again."
    )
  }
}

/**
 * Handle /schedule command
 * Sets up automated delivery schedules
 */
export async function handleScheduleCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from?.id
  const chatId = msg.chat.id
  const text = msg.text || ""

  if (!telegramId) {
    await bot.sendMessage(chatId, "Unable to identify user.")
    return
  }

  // Parse the command
  // Format: /schedule <type> <frequency> <time>
  // Examples:
  //   /schedule insight daily 9am
  //   /schedule insight weekly monday 9am
  //   /schedule content_3day weekly friday 10am
  //   /schedule off
  //   /schedule status

  const parts = text.toLowerCase().split(/\s+/)
  const subcommand = parts[1] || ""

  try {
    // Find tenant
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, business_name")
      .eq("telegram_id", telegramId)
      .single()

    if (customerError || !customer) {
      await bot.sendMessage(
        chatId,
        "❌ No account found. Please complete the onboarding with @koranewstrategy first."
      )
      return
    }

    // Handle subcommands
    if (subcommand === "status" || subcommand === "") {
      await handleScheduleStatus(bot, chatId, customer.id)
      return
    }

    if (subcommand === "off" || subcommand === "stop" || subcommand === "cancel") {
      await handleScheduleCancel(bot, chatId, customer.id, telegramId)
      return
    }

    // Parse schedule parameters
    const reportType = parseReportType(subcommand)
    if (!reportType) {
      await sendScheduleHelp(bot, chatId)
      return
    }

    const frequency = parts[2] // daily or weekly
    if (!frequency || !["daily", "weekly"].includes(frequency)) {
      await sendScheduleHelp(bot, chatId)
      return
    }

    let deliveryDay: string | null = null
    let timeStr: string

    if (frequency === "weekly") {
      deliveryDay = parts[3] // monday, tuesday, etc.
      timeStr = parts[4] || "9am"
      
      const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      if (!deliveryDay || !validDays.includes(deliveryDay)) {
        await bot.sendMessage(
          chatId,
          "❌ For weekly schedules, please specify a day.\n\n" +
          "Example: `/schedule insight weekly monday 9am`",
          { parse_mode: "Markdown" }
        )
        return
      }
    } else {
      timeStr = parts[3] || "9am"
    }

    // Parse time
    const deliveryTime = parseTime(timeStr)
    if (!deliveryTime) {
      await bot.sendMessage(
        chatId,
        "❌ Could not parse time. Please use format like `9am`, `10:30am`, `2pm`.",
        { parse_mode: "Markdown" }
      )
      return
    }

    // Create or update schedule
    await createOrUpdateSchedule(
      bot,
      chatId,
      customer.id,
      telegramId,
      reportType,
      frequency as "daily" | "weekly",
      deliveryTime,
      deliveryDay
    )

  } catch (error) {
    console.error("[handleScheduleCommand] Error:", error)
    await bot.sendMessage(
      chatId,
      "❌ An error occurred while setting up your schedule. Please try again."
    )
  }
}

function parseReportType(type: string): string | null {
  const typeMap: Record<string, string> = {
    insight: "insight",
    insights: "insight",
    content: "content_3day",
    content_3day: "content_3day",
    "3day": "content_3day",
    content_5day: "content_5day",
    "5day": "content_5day"
  }
  return typeMap[type] || null
}

function parseTime(timeStr: string): string | null {
  // Handle formats: 9am, 9:30am, 10pm, 14:00
  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return null

  let hours = parseInt(match[1])
  const minutes = match[2] ? parseInt(match[2]) : 0
  const meridiem = match[3]?.toLowerCase()

  if (meridiem === "pm" && hours < 12) hours += 12
  if (meridiem === "am" && hours === 12) hours = 0

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`
}

async function handleScheduleStatus(
  bot: TelegramBot,
  chatId: number,
  tenantId: string
): Promise<void> {
  const { data: schedules, error } = await supabase
    .from("intel_delivery_schedules")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)

  if (error || !schedules || schedules.length === 0) {
    await bot.sendMessage(
      chatId,
      "📅 *Your Scheduled Deliveries*\n\n" +
      "_No active schedules._\n\n" +
      "Set one up with:\n" +
      "• `/schedule insight daily 9am`\n" +
      "• `/schedule insight weekly monday 9am`\n" +
      "• `/schedule content_3day weekly friday 10am`",
      { parse_mode: "Markdown" }
    )
    return
  }

  let message = "📅 *Your Scheduled Deliveries*\n\n"

  for (const schedule of schedules) {
    const typeEmoji = schedule.report_type === "insight" ? "📊" : "📝"
    const typeName = schedule.report_type === "insight" 
      ? "Industry Insights" 
      : `${schedule.report_type.replace("content_", "")} Content`
    
    const timeFormatted = formatTime12h(schedule.delivery_time)
    
    if (schedule.schedule_type === "daily") {
      message += `${typeEmoji} *${typeName}*\n`
      message += `   Every day at ${timeFormatted}\n\n`
    } else {
      message += `${typeEmoji} *${typeName}*\n`
      message += `   Every ${schedule.delivery_day} at ${timeFormatted}\n\n`
    }
  }

  message += "_To cancel all schedules: `/schedule off`_"

  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
}

async function handleScheduleCancel(
  bot: TelegramBot,
  chatId: number,
  tenantId: string,
  telegramId: number
): Promise<void> {
  const { error } = await supabase
    .from("intel_delivery_schedules")
    .update({ is_active: false })
    .eq("tenant_id", tenantId)

  if (error) {
    await bot.sendMessage(chatId, "❌ Failed to cancel schedules. Please try again.")
    return
  }

  await bot.sendMessage(
    chatId,
    "✅ *All scheduled deliveries have been cancelled.*\n\n" +
    "You can set up new schedules anytime with `/schedule`.",
    { parse_mode: "Markdown" }
  )
}

async function createOrUpdateSchedule(
  bot: TelegramBot,
  chatId: number,
  tenantId: string,
  telegramId: number,
  reportType: string,
  scheduleType: "daily" | "weekly",
  deliveryTime: string,
  deliveryDay: string | null
): Promise<void> {
  // Calculate next delivery time
  const nextDelivery = calculateNextDelivery(scheduleType, deliveryTime, deliveryDay)

  // Check if schedule exists
  const { data: existing } = await supabase
    .from("intel_delivery_schedules")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("report_type", reportType)
    .single()

  if (existing) {
    // Update existing
    await supabase
      .from("intel_delivery_schedules")
      .update({
        schedule_type: scheduleType,
        delivery_time: deliveryTime,
        delivery_day: deliveryDay,
        is_active: true,
        next_delivery_at: nextDelivery.toISOString()
      })
      .eq("id", existing.id)
  } else {
    // Create new
    await supabase
      .from("intel_delivery_schedules")
      .insert({
        tenant_id: tenantId,
        telegram_id: telegramId,
        schedule_type: scheduleType,
        delivery_time: deliveryTime,
        delivery_day: deliveryDay,
        report_type: reportType,
        is_active: true,
        next_delivery_at: nextDelivery.toISOString()
      })
  }

  const typeEmoji = reportType === "insight" ? "📊" : "📝"
  const typeName = reportType === "insight" 
    ? "Industry Insights" 
    : `${reportType.replace("content_", "")}-Day Content Strategy`
  
  const timeFormatted = formatTime12h(deliveryTime)
  const scheduleDesc = scheduleType === "daily"
    ? `every day at ${timeFormatted}`
    : `every ${deliveryDay} at ${timeFormatted}`

  await bot.sendMessage(
    chatId,
    `✅ *Schedule Set!*\n\n` +
    `${typeEmoji} *${typeName}*\n` +
    `📅 Delivery: ${scheduleDesc}\n` +
    `⏰ Next delivery: ${nextDelivery.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${timeFormatted}\n\n` +
    `_Use \`/schedule status\` to view all schedules._`,
    { parse_mode: "Markdown" }
  )
}

function calculateNextDelivery(
  scheduleType: "daily" | "weekly",
  deliveryTime: string,
  deliveryDay: string | null
): Date {
  const now = new Date()
  const [hours, minutes] = deliveryTime.split(":").map(Number)
  
  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  if (scheduleType === "daily") {
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
  } else if (scheduleType === "weekly" && deliveryDay) {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6
    }
    const targetDay = dayMap[deliveryDay]
    const currentDay = now.getDay()
    
    let daysUntil = targetDay - currentDay
    if (daysUntil < 0) daysUntil += 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    
    next.setDate(next.getDate() + daysUntil)
  }

  return next
}

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  const meridiem = hours >= 12 ? "PM" : "AM"
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${meridiem}`
}

async function sendScheduleHelp(bot: TelegramBot, chatId: number): Promise<void> {
  await bot.sendMessage(
    chatId,
    "📅 *Schedule Command Usage*\n\n" +
    "*Set up daily delivery:*\n" +
    "`/schedule insight daily 9am`\n" +
    "`/schedule content_3day daily 10am`\n\n" +
    "*Set up weekly delivery:*\n" +
    "`/schedule insight weekly monday 9am`\n" +
    "`/schedule content_5day weekly friday 10am`\n\n" +
    "*Manage schedules:*\n" +
    "`/schedule status` - View active schedules\n" +
    "`/schedule off` - Cancel all schedules\n\n" +
    "*Report types:*\n" +
    "• `insight` - Industry news & insights\n" +
    "• `content_3day` - 3-day content strategy\n" +
    "• `content_5day` - 5-day content strategy",
    { parse_mode: "Markdown" }
  )
}

/**
 * Handle /preferences command
 * Allows users to set their content preferences
 */
export async function handlePreferencesCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from?.id
  const chatId = msg.chat.id
  const text = msg.text || ""

  if (!telegramId) {
    await bot.sendMessage(chatId, "Unable to identify user.")
    return
  }

  try {
    // Find tenant
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, business_name")
      .eq("telegram_id", telegramId)
      .single()

    if (customerError || !customer) {
      await bot.sendMessage(
        chatId,
        "❌ No account found. Please complete the onboarding with @koranewstrategy first."
      )
      return
    }

    // Parse the command
    const parts = text.toLowerCase().split(/\s+/)
    const subcommand = parts[1] || ""

    if (subcommand === "" || subcommand === "status") {
      await showPreferencesStatus(bot, chatId, customer.id)
      return
    }

    if (subcommand === "usecase" || subcommand === "type") {
      const useCase = parts[2] as "pr" | "creator" | "general" | undefined
      await setUseCase(bot, chatId, customer.id, useCase)
      return
    }

    if (subcommand === "platforms") {
      const platforms = parts.slice(2)
      await setPlatforms(bot, chatId, customer.id, platforms)
      return
    }

    if (subcommand === "tone") {
      const tone = parts[2] as "professional" | "casual" | "creator" | undefined
      await setTone(bot, chatId, customer.id, tone)
      return
    }

    if (subcommand === "podcast") {
      const podcastName = parts.slice(2).join(" ")
      await setPodcastName(bot, chatId, customer.id, podcastName)
      return
    }

    // Show help
    await sendPreferencesHelp(bot, chatId)

  } catch (error) {
    console.error("[handlePreferencesCommand] Error:", error)
    await bot.sendMessage(
      chatId,
      "❌ An error occurred. Please try again."
    )
  }
}

async function showPreferencesStatus(
  bot: TelegramBot,
  chatId: number,
  tenantId: string
): Promise<void> {
  const { data: prefs } = await supabase
    .from("intel_content_preferences")
    .select("*")
    .eq("tenant_id", tenantId)
    .single()

  if (!prefs) {
    await bot.sendMessage(
      chatId,
      "⚙️ *Content Preferences*\n\n" +
      "_No preferences set yet._\n\n" +
      "Set your profile type to get started:\n" +
      "• `/preferences usecase pr` - PR/Marketing professional\n" +
      "• `/preferences usecase creator` - Podcast/Content creator\n" +
      "• `/preferences usecase general` - General content\n\n" +
      "Use `/preferences help` for all options.",
      { parse_mode: "Markdown" }
    )
    return
  }

  const useCaseEmoji = prefs.primary_use_case === "pr_industry" ? "📊" 
    : prefs.primary_use_case === "podcast_creator" ? "🎬" : "📱"
  
  const toneEmoji = prefs.content_tone === "professional" ? "💼"
    : prefs.content_tone === "casual" ? "😊" : "🎤"

  let message = `⚙️ *Your Content Preferences*\n\n`
  message += `${useCaseEmoji} *Use Case:* ${formatUseCase(prefs.primary_use_case)}\n`
  message += `${toneEmoji} *Tone:* ${prefs.content_tone}\n`
  message += `📱 *Platforms:* ${(prefs.platform_priority || []).join(", ") || "Not set"}\n`
  
  if (prefs.focus_topics && prefs.focus_topics.length > 0) {
    message += `🎯 *Focus Topics:* ${prefs.focus_topics.slice(0, 3).join(", ")}\n`
  }
  
  if (prefs.podcast_name) {
    message += `🎙️ *Podcast:* ${prefs.podcast_name}\n`
  }
  
  if (prefs.industry_focus && prefs.industry_focus.length > 0) {
    message += `🏢 *Industries:* ${prefs.industry_focus.join(", ")}\n`
  }

  message += `\n_Use \`/preferences help\` to see how to update these._`

  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
}

async function setUseCase(
  bot: TelegramBot,
  chatId: number,
  tenantId: string,
  useCase: "pr" | "creator" | "general" | undefined
): Promise<void> {
  const useCaseMap: Record<string, string> = {
    pr: "pr_industry",
    creator: "podcast_creator",
    general: "general"
  }

  if (!useCase || !useCaseMap[useCase]) {
    await bot.sendMessage(
      chatId,
      "📋 *Choose your use case:*\n\n" +
      "`/preferences usecase pr` - PR/Marketing professional\n" +
      "• Industry news focus\n" +
      "• Professional tone\n" +
      "• LinkedIn-first strategy\n\n" +
      "`/preferences usecase creator` - Podcast/Content creator\n" +
      "• Creator economy focus\n" +
      "• Authentic tone\n" +
      "• YouTube/TikTok-first strategy\n\n" +
      "`/preferences usecase general` - General content\n" +
      "• Balanced focus\n" +
      "• Professional tone\n" +
      "• Instagram/LinkedIn strategy",
      { parse_mode: "Markdown" }
    )
    return
  }

  const primaryUseCase = useCaseMap[useCase]
  const template = USE_CASE_TEMPLATES[primaryUseCase] || USE_CASE_TEMPLATES.general

  // Upsert preferences
  await supabase
    .from("intel_content_preferences")
    .upsert({
      tenant_id: tenantId,
      primary_use_case: primaryUseCase,
      platform_priority: template.platformPriority,
      content_tone: template.contentTone,
      focus_topics: template.focusTopics,
      industry_focus: template.industryFocus || [],
      podcast_themes: template.podcastThemes || []
    }, { onConflict: "tenant_id" })

  const emoji = useCase === "pr" ? "📊" : useCase === "creator" ? "🎬" : "📱"
  await bot.sendMessage(
    chatId,
    `${emoji} *Profile Updated!*\n\n` +
    `Your profile is now set to: *${formatUseCase(primaryUseCase)}*\n\n` +
    `Default settings have been applied:\n` +
    `• Platforms: ${template.platformPriority?.join(", ")}\n` +
    `• Tone: ${template.contentTone}\n` +
    `• Focus: ${template.focusTopics?.slice(0, 3).join(", ")}\n\n` +
    `_Customize further with \`/preferences help\`_`,
    { parse_mode: "Markdown" }
  )
}

async function setPlatforms(
  bot: TelegramBot,
  chatId: number,
  tenantId: string,
  platforms: string[]
): Promise<void> {
  const validPlatforms = ["instagram", "linkedin", "tiktok", "youtube", "twitter", "facebook"]
  
  if (platforms.length === 0) {
    await bot.sendMessage(
      chatId,
      "📱 *Set your platform priorities:*\n\n" +
      "List platforms in order of priority:\n" +
      "`/preferences platforms instagram linkedin`\n\n" +
      "Available: instagram, linkedin, tiktok, youtube, twitter, facebook",
      { parse_mode: "Markdown" }
    )
    return
  }

  const filtered = platforms.filter(p => validPlatforms.includes(p))
  if (filtered.length === 0) {
    await bot.sendMessage(chatId, "❌ No valid platforms specified. Try: instagram, linkedin, tiktok, youtube, twitter, facebook")
    return
  }

  await supabase
    .from("intel_content_preferences")
    .update({ platform_priority: filtered })
    .eq("tenant_id", tenantId)

  await bot.sendMessage(
    chatId,
    `✅ *Platforms Updated!*\n\nPriority order: ${filtered.join(" → ")}`,
    { parse_mode: "Markdown" }
  )
}

async function setTone(
  bot: TelegramBot,
  chatId: number,
  tenantId: string,
  tone: "professional" | "casual" | "creator" | undefined
): Promise<void> {
  const validTones = ["professional", "casual", "creator"]
  
  if (!tone || !validTones.includes(tone)) {
    await bot.sendMessage(
      chatId,
      "🎤 *Set your content tone:*\n\n" +
      "`/preferences tone professional` - Authoritative, informative\n" +
      "`/preferences tone casual` - Conversational, relatable\n" +
      "`/preferences tone creator` - Authentic, personal",
      { parse_mode: "Markdown" }
    )
    return
  }

  await supabase
    .from("intel_content_preferences")
    .update({ content_tone: tone })
    .eq("tenant_id", tenantId)

  const emoji = tone === "professional" ? "💼" : tone === "casual" ? "😊" : "🎤"
  await bot.sendMessage(
    chatId,
    `${emoji} *Tone Updated!*\n\nContent tone set to: *${tone}*`,
    { parse_mode: "Markdown" }
  )
}

async function setPodcastName(
  bot: TelegramBot,
  chatId: number,
  tenantId: string,
  podcastName: string
): Promise<void> {
  if (!podcastName || podcastName.trim().length === 0) {
    await bot.sendMessage(
      chatId,
      "🎙️ *Set your podcast name:*\n\n" +
      "`/preferences podcast The Creative Tech Show`\n\n" +
      "This helps KORA generate content that ties into your podcast.",
      { parse_mode: "Markdown" }
    )
    return
  }

  await supabase
    .from("intel_content_preferences")
    .update({ podcast_name: podcastName.trim() })
    .eq("tenant_id", tenantId)

  await bot.sendMessage(
    chatId,
    `🎙️ *Podcast Name Set!*\n\nYour podcast: *${podcastName.trim()}*\n\n_Content will now reference your show!_`,
    { parse_mode: "Markdown" }
  )
}

function formatUseCase(useCase: string): string {
  const names: Record<string, string> = {
    pr_industry: "PR/Marketing Professional",
    podcast_creator: "Podcast/Content Creator",
    general: "General Content"
  }
  return names[useCase] || useCase
}

async function sendPreferencesHelp(bot: TelegramBot, chatId: number): Promise<void> {
  await bot.sendMessage(
    chatId,
    "⚙️ *Preferences Command Usage*\n\n" +
    "*View current settings:*\n" +
    "`/preferences` or `/preferences status`\n\n" +
    "*Set your profile type:*\n" +
    "`/preferences usecase pr` - PR/Marketing\n" +
    "`/preferences usecase creator` - Podcast/Creator\n" +
    "`/preferences usecase general` - General\n\n" +
    "*Customize platforms:*\n" +
    "`/preferences platforms instagram linkedin tiktok`\n\n" +
    "*Set content tone:*\n" +
    "`/preferences tone professional`\n" +
    "`/preferences tone casual`\n" +
    "`/preferences tone creator`\n\n" +
    "*For creators - set podcast name:*\n" +
    "`/preferences podcast My Show Name`",
    { parse_mode: "Markdown" }
  )
}
