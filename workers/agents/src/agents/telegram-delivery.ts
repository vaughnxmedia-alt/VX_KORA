/**
 * Telegram Delivery Agent
 * 
 * Handles all Telegram communications:
 * - Daily/weekly briefings
 * - Strategy approval requests
 * - Make Me Smarter content
 * - Alert notifications
 */

import type { TelegramPreference, ContentStrategy, IntelligenceItem } from "@kora/sdk"
import { BaseAgent } from "../base-agent"
import type { AgentConfig, AgentContext, AgentMetrics } from "../types"

export interface TelegramDeliveryInput {
  mode: "scheduled" | "immediate"
  deliveryType: "briefing" | "approval" | "enrichment" | "alert"
  tenantId?: string
  userId?: string
  content?: {
    strategies?: Partial<ContentStrategy>[]
    insights?: Partial<IntelligenceItem>[]
    alertMessage?: string
    alertSeverity?: "info" | "warning" | "critical"
  }
}

export interface TelegramDeliveryOutput {
  messagesSent: number
  messagesDelivered: number
  messagesFailed: number
  failedRecipients: string[]
}

export class TelegramDeliveryAgent extends BaseAgent<TelegramDeliveryInput, TelegramDeliveryOutput> {
  constructor(config: AgentConfig) {
    super(
      config,
      "Telegram Delivery",
      "Handles all Telegram communications including briefings and approval requests"
    )
  }

  protected async process(
    input: TelegramDeliveryInput,
    context: AgentContext,
    metrics: AgentMetrics
  ): Promise<TelegramDeliveryOutput> {
    const { mode, deliveryType, tenantId, userId, content } = input

    const output: TelegramDeliveryOutput = {
      messagesSent: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      failedRecipients: []
    }

    try {
      const recipients = await this.getRecipients(mode, deliveryType, tenantId, userId)

      for (const recipient of recipients) {
        try {
          const message = await this.formatMessage(deliveryType, content, recipient.preferences)
          await this.sendTelegramMessage(recipient.chatId, message)
          output.messagesSent++
          output.messagesDelivered++
          metrics.itemsSucceeded++
        } catch (error) {
          console.error(`[telegram-delivery] Failed to send to ${recipient.chatId}:`, error)
          output.messagesFailed++
          output.failedRecipients.push(recipient.userId)
          metrics.itemsFailed++
        }
        metrics.itemsProcessed++
      }

      return output
    } catch (error) {
      console.error("[telegram-delivery] Error in delivery:", error)
      throw error
    }
  }

  private async getRecipients(
    mode: string,
    deliveryType: string,
    tenantId?: string,
    userId?: string
  ): Promise<Array<{ userId: string; chatId: string; preferences: TelegramPreference }>> {
    // TODO: Query users with Telegram enabled
    // Filter by:
    // - Delivery frequency (daily/weekly)
    // - Content preferences
    // - Delivery time (for scheduled mode)
    console.log(`[telegram-delivery] Getting recipients for ${deliveryType}...`)
    return []
  }

  private async formatMessage(
    deliveryType: string,
    content: TelegramDeliveryInput["content"],
    preferences: TelegramPreference
  ): Promise<string> {
    // TODO: Format message based on delivery type and user preferences
    // Use appropriate brief style (detailed/concise/bullet)
    
    switch (deliveryType) {
      case "briefing":
        return this.formatBriefing(content, preferences)
      case "approval":
        return this.formatApprovalRequest(content, preferences)
      case "enrichment":
        return this.formatEnrichmentContent(content, preferences)
      case "alert":
        return this.formatAlert(content)
      default:
        return "KORA Intelligence Update"
    }
  }

  private formatBriefing(
    content: TelegramDeliveryInput["content"],
    preferences: TelegramPreference
  ): string {
    // TODO: Format daily/weekly briefing
    // Include:
    // - Key insights summary
    // - Content strategy suggestions
    // - Upcoming events
    // - Action items
    return "🌅 *Good Morning! Here's your KORA Intelligence Briefing*\n\n..."
  }

  private formatApprovalRequest(
    content: TelegramDeliveryInput["content"],
    preferences: TelegramPreference
  ): string {
    // TODO: Format strategy approval request with inline buttons
    return "📋 *New Content Strategy for Approval*\n\n..."
  }

  private formatEnrichmentContent(
    content: TelegramDeliveryInput["content"],
    preferences: TelegramPreference
  ): string {
    // TODO: Format "Make Me Smarter" enrichment content
    return "🧠 *Make Me Smarter - New Intelligence*\n\n..."
  }

  private formatAlert(content: TelegramDeliveryInput["content"]): string {
    const severity = content?.alertSeverity ?? "info"
    const icon = severity === "critical" ? "🚨" : severity === "warning" ? "⚠️" : "ℹ️"
    return `${icon} *KORA Alert*\n\n${content?.alertMessage ?? "System notification"}`
  }

  private async sendTelegramMessage(chatId: string, message: string): Promise<void> {
    // TODO: Implement Telegram Bot API call
    // Include:
    // - Parse mode (Markdown/HTML)
    // - Inline keyboards for approvals
    // - Reply markup
    console.log(`[telegram-delivery] Sending to chat ${chatId}...`)
  }
}

export function createTelegramDeliveryAgent(config: AgentConfig): TelegramDeliveryAgent {
  return new TelegramDeliveryAgent(config)
}
