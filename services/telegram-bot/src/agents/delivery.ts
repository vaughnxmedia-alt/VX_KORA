import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent"
import type { PipelineContext, AgentOutput } from "../types/pipeline"
import type { 
  BrandBlueprint, 
  ContentStrategy, 
  AudienceAnalysis,
  GeneratedDeliverables 
} from "../types/deliverables"
import { updateBrandBlueprintStatus, updateContentStrategyStatus, updateAudienceAnalysisStatus } from "../db/deliverables"
import { logOutboundDeliverable, logOutboundStatus } from "../db/telegram-messages"
import { updateTenantProfile, updatePipelineStage } from "../db/tenant-profiles"
import TelegramBot from "node-telegram-bot-api"

export interface DeliveryInput {
  brandBlueprint: BrandBlueprint
  contentStrategy: ContentStrategy
  audienceAnalysis: AudienceAnalysis
  bot: TelegramBot
}

export interface DeliveryOutput {
  deliveredCount: number
  messageIds: number[]
}

export class DeliveryAgent extends BaseIntelAgent<DeliveryInput, DeliveryOutput> {
  constructor() {
    super("DeliveryAgent", "delivery")
  }

  protected async execute(
    context: PipelineContext,
    input: DeliveryInput
  ): Promise<AgentOutput<DeliveryOutput>> {
    await updateTenantProfile(context.tenant.id, {
      deliveryStatus: "in_progress",
    })

    const messageIds: number[] = []

    try {
      await this.sendStatus(context, input.bot, "Preparing your strategy documents...")

      const blueprintMessages = await this.deliverBrandBlueprint(context, input.bot, input.brandBlueprint)
      messageIds.push(...blueprintMessages)

      await this.delay(1000)

      const strategyMessages = await this.deliverContentStrategy(context, input.bot, input.contentStrategy)
      messageIds.push(...strategyMessages)

      await this.delay(1000)

      const audienceMessages = await this.deliverAudienceAnalysis(context, input.bot, input.audienceAnalysis)
      messageIds.push(...audienceMessages)

      await updateBrandBlueprintStatus(input.brandBlueprint.id, "delivered")
      await updateContentStrategyStatus(input.contentStrategy.id, "delivered")
      await updateAudienceAnalysisStatus(input.audienceAnalysis.id, "delivered")

      await updateTenantProfile(context.tenant.id, {
        deliveryStatus: "complete",
        intakeStatus: "complete",
      })

      await updatePipelineStage(context.tenant.id, "complete")

      await this.sendCompletionMessage(context, input.bot)

      this.incrementItemsProcessed(3)

      return createAgentOutput(true, {
        deliveredCount: 3,
        messageIds,
      }, {
        nextStage: "complete",
      })

    } catch (error) {
      console.error("Delivery failed:", (error as Error).message)
      
      await updateTenantProfile(context.tenant.id, {
        deliveryStatus: "failed",
      })

      return createAgentOutput(false, undefined, {
        error: `Delivery failed: ${(error as Error).message}`,
        shouldRetry: true,
      })
    }
  }

  private async sendStatus(
    context: PipelineContext,
    bot: TelegramBot,
    message: string
  ): Promise<void> {
    const sent = await this.retrySend(bot, context.telegramChatId, message)
    if (sent) {
      await logOutboundStatus(
        context.runId,
        context.telegramId,
        context.telegramChatId,
        message,
        sent.message_id
      )
    }
  }

  private async deliverBrandBlueprint(
    context: PipelineContext,
    bot: TelegramBot,
    blueprint: BrandBlueprint
  ): Promise<number[]> {
    const messageIds: number[] = []

    const header = `*Brand Identity Blueprint*\n\n`
    
    let content = header

    if (blueprint.brandEssence) {
      content += `*Brand Essence*\n${this.sanitize(blueprint.brandEssence)}\n\n`
    }

    if (blueprint.missionStatement) {
      content += `*Mission*\n${this.sanitize(blueprint.missionStatement)}\n\n`
    }

    if (blueprint.visionStatement) {
      content += `*Vision*\n${this.sanitize(blueprint.visionStatement)}\n\n`
    }

    const sent1 = await this.retrySend(bot, context.telegramChatId, content, { parse_mode: "Markdown" })
    if (sent1) messageIds.push(sent1.message_id)

    if (blueprint.coreValues.length > 0) {
      let valuesContent = `*Core Values*\n\n`
      for (const cv of blueprint.coreValues) {
        valuesContent += `• *${this.sanitize(cv.value)}*: ${this.sanitize(cv.explanation)}\n`
      }
      
      const sent2 = await this.retrySend(bot, context.telegramChatId, valuesContent, { parse_mode: "Markdown" })
      if (sent2) messageIds.push(sent2.message_id)
    }

    let moreContent = ""

    if (blueprint.uniqueValueProposition) {
      moreContent += `*Unique Value Proposition*\n${this.sanitize(blueprint.uniqueValueProposition)}\n\n`
    }

    if (blueprint.brandVoice) {
      moreContent += `*Brand Voice*\n`
      moreContent += `Tone: ${this.sanitize(blueprint.brandVoice.tone)}\n`
      moreContent += `Style: ${this.sanitize(blueprint.brandVoice.languageStyle)}\n\n`
    }

    if (blueprint.positioningStatement) {
      moreContent += `*Positioning*\n${this.sanitize(blueprint.positioningStatement)}\n\n`
    }

    if (moreContent) {
      const sent3 = await this.retrySend(bot, context.telegramChatId, moreContent, { parse_mode: "Markdown" })
      if (sent3) messageIds.push(sent3.message_id)
    }

    for (const msgId of messageIds) {
      await logOutboundDeliverable(
        context.runId,
        context.telegramId,
        context.telegramChatId,
        "Brand Blueprint",
        "brand_blueprint",
        msgId
      )
    }

    return messageIds
  }

  private async deliverContentStrategy(
    context: PipelineContext,
    bot: TelegramBot,
    strategy: ContentStrategy
  ): Promise<number[]> {
    const messageIds: number[] = []

    const header = `*Content Strategy*\n\n`
    let content = header

    if (strategy.contentPillars.length > 0) {
      content += `*Content Pillars*\n\n`
      for (const pillar of strategy.contentPillars) {
        content += `• *${this.sanitize(pillar.name)}*\n`
        content += `  ${this.sanitize(pillar.description)}\n`
        content += `  Frequency: ${this.sanitize(pillar.frequency)}\n\n`
      }
    }

    const sent1 = await this.retrySend(bot, context.telegramChatId, content, { parse_mode: "Markdown" })
    if (sent1) messageIds.push(sent1.message_id)

    if (strategy.platformStrategy.length > 0) {
      let platformContent = `*Platform Strategy*\n\n`
      for (const ps of strategy.platformStrategy) {
        platformContent += `*${this.sanitize(ps.platform)}*\n`
        platformContent += `Focus: ${this.sanitize(ps.focus)}\n`
        platformContent += `Posting: ${this.sanitize(ps.postingFrequency)}\n\n`
      }

      const sent2 = await this.retrySend(bot, context.telegramChatId, platformContent, { parse_mode: "Markdown" })
      if (sent2) messageIds.push(sent2.message_id)
    }

    if (strategy.exampleWeek.length > 0) {
      let weekContent = `*Example Week*\n\n`
      for (const day of strategy.exampleWeek.slice(0, 5)) {
        weekContent += `*${this.sanitize(day.day)}*: ${this.sanitize(day.contentType)}\n`
        weekContent += `Topic: ${this.sanitize(day.topic)}\n`
        weekContent += `Platform: ${this.sanitize(day.platform)}\n\n`
      }

      const sent3 = await this.retrySend(bot, context.telegramChatId, weekContent, { parse_mode: "Markdown" })
      if (sent3) messageIds.push(sent3.message_id)
    }

    if (strategy.keyTips.length > 0) {
      let tipsContent = `*Key Tips*\n\n`
      for (const tip of strategy.keyTips) {
        tipsContent += `• ${this.sanitize(tip)}\n`
      }

      const sent4 = await this.retrySend(bot, context.telegramChatId, tipsContent, { parse_mode: "Markdown" })
      if (sent4) messageIds.push(sent4.message_id)
    }

    for (const msgId of messageIds) {
      await logOutboundDeliverable(
        context.runId,
        context.telegramId,
        context.telegramChatId,
        "Content Strategy",
        "content_strategy",
        msgId
      )
    }

    return messageIds
  }

  private async deliverAudienceAnalysis(
    context: PipelineContext,
    bot: TelegramBot,
    analysis: AudienceAnalysis
  ): Promise<number[]> {
    const messageIds: number[] = []

    const header = `*Target Audience Analysis*\n\n`
    let content = header

    if (analysis.overview) {
      content += `*Overview*\n${this.sanitize(analysis.overview)}\n\n`
    }

    if (analysis.primaryAudience) {
      content += `*Primary Audience*\n`
      content += `Demographics: ${this.sanitize(analysis.primaryAudience.demographics)}\n`
      content += `Psychographics: ${this.sanitize(analysis.primaryAudience.psychographics)}\n\n`
    }

    const sent1 = await this.retrySend(bot, context.telegramChatId, content, { parse_mode: "Markdown" })
    if (sent1) messageIds.push(sent1.message_id)

    if (analysis.audienceSegments.length > 0) {
      let segmentsContent = `*Audience Segments*\n\n`
      for (const seg of analysis.audienceSegments) {
        segmentsContent += `*${this.sanitize(seg.name)}*\n`
        segmentsContent += `${this.sanitize(seg.description)}\n`
        segmentsContent += `Approach: ${this.sanitize(seg.engagementApproach)}\n\n`
      }

      const sent2 = await this.retrySend(bot, context.telegramChatId, segmentsContent, { parse_mode: "Markdown" })
      if (sent2) messageIds.push(sent2.message_id)
    }

    if (analysis.audienceMotivations.length > 0) {
      let motivationsContent = `*Audience Motivations*\n\n`
      for (const m of analysis.audienceMotivations.slice(0, 5)) {
        motivationsContent += `• ${this.sanitize(m.motivation)}\n`
      }

      const sent3 = await this.retrySend(bot, context.telegramChatId, motivationsContent, { parse_mode: "Markdown" })
      if (sent3) messageIds.push(sent3.message_id)
    }

    for (const msgId of messageIds) {
      await logOutboundDeliverable(
        context.runId,
        context.telegramId,
        context.telegramChatId,
        "Audience Analysis",
        "audience_analysis",
        msgId
      )
    }

    return messageIds
  }

  private async sendCompletionMessage(
    context: PipelineContext,
    bot: TelegramBot
  ): Promise<void> {
    const message = `Your strategy documents are ready!\n\n` +
      `They’re saved in the Intake agent. To get your *personalized insights*: go to **Mission Control** → Ingest Runs → **Trigger Run**, or type \`/run\` here for an insight run just for you.\n\n` +
      `Commands:\n` +
      `/run - Trigger your personalized insight run\n` +
      `/status - Check your current status\n` +
      `/feedback - Rate and review your deliverables\n` +
      `/restart - Start a new strategy session`

    const sent = await this.retrySend(bot, context.telegramChatId, message)
    if (sent) {
      await logOutboundStatus(
        context.runId,
        context.telegramId,
        context.telegramChatId,
        message,
        sent.message_id
      )
    }
  }

  private async retrySend(
    bot: TelegramBot,
    chatId: number,
    text: string,
    options?: TelegramBot.SendMessageOptions,
    maxRetries: number = 3
  ): Promise<TelegramBot.Message | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await bot.sendMessage(chatId, text, options)
      } catch (error) {
        console.error(`Send failed (attempt ${attempt + 1}):`, (error as Error).message)
        
        if (attempt < maxRetries - 1) {
          await this.delay(1000 * (attempt + 1))
        }
      }
    }
    return null
  }

  private sanitize(text: string | null | undefined): string {
    if (!text) return ""
    
    let sanitized = text
      .replace(/\[object Object\]/g, "")
      .replace(/undefined/g, "")
      .replace(/null/g, "")
      .replace(/NaN/g, "")

    sanitized = sanitized
      .replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&")

    sanitized = sanitized.replace(/\\([*_])/g, "$1")

    return sanitized.trim()
  }
}

export const deliveryAgent = new DeliveryAgent()
