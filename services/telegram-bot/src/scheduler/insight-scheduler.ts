/**
 * Insight Scheduler
 * 
 * Manages scheduled delivery of industry insights and content strategies.
 * Uses node-cron for job scheduling and checks the database for due deliveries.
 */

import cron from "node-cron"
import TelegramBot from "node-telegram-bot-api"
import { getDatabase } from "../db/client.js"
import { generateInsightReport } from "../agents/insight-report.js"
import { generateContentDraft } from "../agents/content-draft.js"

interface ScheduledDelivery {
  id: string
  tenant_id: string
  telegram_id: number
  schedule_type: "daily" | "weekly"
  delivery_time: string
  delivery_day: string | null
  report_type: "insight" | "content_3day" | "content_5day"
  is_active: boolean
  last_delivered_at: string | null
  next_delivery_at: string | null
  delivery_count: number
  error_count: number
  last_error: string | null
}

let bot: TelegramBot | null = null
let isRunning = false

/**
 * Initialize the scheduler with the Telegram bot instance
 */
export function initializeScheduler(telegramBot: TelegramBot): void {
  bot = telegramBot
  
  if (isRunning) {
    console.log("[Scheduler] Already running")
    return
  }

  // Check for due deliveries every minute
  cron.schedule("* * * * *", async () => {
    await processDueDeliveries()
  })

  // Clean up old delivered reports weekly (Sunday at 3am)
  cron.schedule("0 3 * * 0", async () => {
    await cleanupOldReports()
  })

  isRunning = true
  console.log("[Scheduler] Initialized - checking for deliveries every minute")
}

/**
 * Process all due scheduled deliveries
 */
async function processDueDeliveries(): Promise<void> {
  if (!bot) {
    console.error("[Scheduler] Bot not initialized")
    return
  }
  const supabase = getDatabase()
  if (!supabase) return

  try {
    // Get all due deliveries
    const { data: dueDeliveries, error } = await supabase
      .from("intel_delivery_schedules")
      .select("*")
      .eq("is_active", true)
      .lte("next_delivery_at", new Date().toISOString())
      .order("next_delivery_at", { ascending: true })
      .limit(10) // Process max 10 at a time to avoid overload

    if (error) {
      if ((error as { code?: string }).code === "PGRST205") {
        // Table intel_delivery_schedules missing; avoid logging every minute
        if (!process.env.KORA_SCHEDULER_TABLE_WARNED) {
          process.env.KORA_SCHEDULER_TABLE_WARNED = "1"
          console.warn("[Scheduler] Table intel_delivery_schedules not found; scheduled delivery disabled. Create the table or ignore if you don't use /schedule.")
        }
      } else {
        console.error("[Scheduler] Error fetching due deliveries:", error)
      }
      return
    }

    if (!dueDeliveries || dueDeliveries.length === 0) {
      return // No deliveries due
    }

    console.log(`[Scheduler] Processing ${dueDeliveries.length} due deliveries`)

    for (const delivery of dueDeliveries as ScheduledDelivery[]) {
      await processDelivery(delivery)
      // Small delay between deliveries
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

  } catch (error) {
    console.error("[Scheduler] Error processing deliveries:", error)
  }
}

/**
 * Process a single scheduled delivery
 */
async function processDelivery(delivery: ScheduledDelivery): Promise<void> {
  if (!bot) return

  console.log(`[Scheduler] Processing ${delivery.report_type} for tenant ${delivery.tenant_id}`)

  try {
    // Generate and send the report
    switch (delivery.report_type) {
      case "insight":
        await deliverInsightReport(delivery)
        break
      case "content_3day":
        await deliverContentDraft(delivery, "3day")
        break
      case "content_5day":
        await deliverContentDraft(delivery, "5day")
        break
    }

    // Update delivery record
    const nextDelivery = calculateNextDelivery(
      delivery.schedule_type,
      delivery.delivery_time,
      delivery.delivery_day
    )

    await supabase
      .from("intel_delivery_schedules")
      .update({
        last_delivered_at: new Date().toISOString(),
        next_delivery_at: nextDelivery.toISOString(),
        delivery_count: delivery.delivery_count + 1,
        last_error: null
      })
      .eq("id", delivery.id)

    console.log(`[Scheduler] Successfully delivered ${delivery.report_type} to ${delivery.telegram_id}`)

  } catch (error: any) {
    console.error(`[Scheduler] Delivery failed for ${delivery.id}:`, error)

    // Record error
    await supabase
      .from("intel_delivery_schedules")
      .update({
        error_count: delivery.error_count + 1,
        last_error: error.message || "Unknown error"
      })
      .eq("id", delivery.id)

    // If too many errors, deactivate the schedule
    if (delivery.error_count + 1 >= 5) {
      await supabase
        .from("intel_delivery_schedules")
        .update({ is_active: false })
        .eq("id", delivery.id)

      // Notify user
      try {
        await bot.sendMessage(
          delivery.telegram_id,
          "⚠️ *Scheduled Delivery Paused*\n\n" +
          `Your scheduled ${delivery.report_type} delivery has been paused due to repeated errors.\n\n` +
          "Use `/schedule status` to check your schedules and `/schedule` to set up a new one.",
          { parse_mode: "Markdown" }
        )
      } catch {}
    }
  }
}

/**
 * Deliver an insight report
 */
async function deliverInsightReport(delivery: ScheduledDelivery): Promise<void> {
  if (!bot) return
  const supabase = getDatabase()
  if (!supabase) return

  // Send processing notification
  const processingMsg = await bot.sendMessage(
    delivery.telegram_id,
    "📊 *Your scheduled Industry Insights are ready!*\n\n_Generating your report..._",
    { parse_mode: "Markdown" }
  )

  // Generate the report
  const report = await generateInsightReport(
    delivery.tenant_id,
    delivery.telegram_id,
    delivery.schedule_type === "daily" ? "daily" : "weekly"
  )

  // Delete processing message
  await bot.deleteMessage(delivery.telegram_id, processingMsg.message_id).catch(() => {})

  if (!report) {
    throw new Error("Failed to generate insight report")
  }

  // Send the report
  await bot.sendMessage(delivery.telegram_id, report.formattedMessage, { parse_mode: "Markdown" })

  // Update report with message ID
  await supabase
    .from("intel_insight_reports")
    .update({ 
      delivered_at: new Date().toISOString(),
      telegram_message_id: processingMsg.message_id
    })
    .eq("tenant_id", delivery.tenant_id)
    .eq("report_date", report.reportDate.toISOString().split("T")[0])
}

/**
 * Deliver a content draft
 */
async function deliverContentDraft(
  delivery: ScheduledDelivery,
  strategyType: "3day" | "5day"
): Promise<void> {
  if (!bot) return
  const supabase = getDatabase()
  if (!supabase) return

  // Send processing notification
  const processingMsg = await bot.sendMessage(
    delivery.telegram_id,
    `📝 *Your scheduled ${strategyType === "3day" ? "3-Day" : "5-Day"} Content Strategy is ready!*\n\n_Generating your content..._`,
    { parse_mode: "Markdown" }
  )

  // Generate the draft
  const draft = await generateContentDraft(
    delivery.tenant_id,
    delivery.telegram_id,
    strategyType
  )

  // Delete processing message
  await bot.deleteMessage(delivery.telegram_id, processingMsg.message_id).catch(() => {})

  if (!draft) {
    throw new Error("Failed to generate content draft")
  }

  // Send each message
  const messageIds: number[] = []
  for (const message of draft.formattedMessages) {
    const sent = await bot.sendMessage(delivery.telegram_id, message, { parse_mode: "Markdown" })
    messageIds.push(sent.message_id)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Update draft with message IDs
  await supabase
    .from("intel_content_drafts")
    .update({
      delivered_at: new Date().toISOString(),
      telegram_message_ids: messageIds
    })
    .eq("tenant_id", delivery.tenant_id)
    .eq("start_date", draft.startDate.toISOString().split("T")[0])
}

/**
 * Calculate the next delivery time
 */
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
    // Add 1 day
    next.setDate(next.getDate() + 1)
  } else if (scheduleType === "weekly" && deliveryDay) {
    // Add 7 days
    next.setDate(next.getDate() + 7)
  }

  return next
}

/**
 * Clean up old reports (keep last 30 days)
 */
async function cleanupOldReports(): Promise<void> {
  const supabase = getDatabase()
  if (!supabase) return

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 30)

  try {
    // Delete old insight reports
    await supabase
      .from("intel_insight_reports")
      .delete()
      .lt("created_at", cutoffDate.toISOString())

    // Delete old content drafts
    await supabase
      .from("intel_content_drafts")
      .delete()
      .lt("created_at", cutoffDate.toISOString())

    console.log("[Scheduler] Cleaned up reports older than 30 days")
  } catch (error) {
    console.error("[Scheduler] Error cleaning up old reports:", error)
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): { isRunning: boolean; hasBot: boolean } {
  return {
    isRunning,
    hasBot: bot !== null
  }
}

/**
 * Manually trigger a delivery (for testing)
 */
export async function triggerDelivery(
  tenantId: string,
  telegramId: number,
  reportType: "insight" | "content_3day" | "content_5day"
): Promise<boolean> {
  if (!bot) return false

  const mockDelivery: ScheduledDelivery = {
    id: "manual",
    tenant_id: tenantId,
    telegram_id: telegramId,
    schedule_type: "daily",
    delivery_time: "09:00:00",
    delivery_day: null,
    report_type: reportType,
    is_active: true,
    last_delivered_at: null,
    next_delivery_at: null,
    delivery_count: 0,
    error_count: 0,
    last_error: null
  }

  try {
    await processDelivery(mockDelivery)
    return true
  } catch {
    return false
  }
}
