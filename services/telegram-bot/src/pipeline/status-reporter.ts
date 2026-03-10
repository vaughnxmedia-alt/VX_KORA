import TelegramBot from "node-telegram-bot-api"
import type { PipelineStage } from "../types/research"
import { STATUS_MESSAGES, StatusMessageKey } from "../types/pipeline"

export class StatusReporter {
  private bot: TelegramBot
  private chatId: number
  private lastMessageId: number | null = null

  constructor(bot: TelegramBot, chatId: number) {
    this.bot = bot
    this.chatId = chatId
  }

  async reportStage(stage: PipelineStage): Promise<void> {
    const messageKey = this.getStatusKeyForStage(stage)
    const message = STATUS_MESSAGES[messageKey]
    
    await this.sendStatus(message)
  }

  async reportStatus(key: StatusMessageKey): Promise<void> {
    const message = STATUS_MESSAGES[key]
    await this.sendStatus(message)
  }

  async reportCustom(message: string): Promise<void> {
    await this.sendStatus(message)
  }

  async reportError(error: string, recoverable: boolean = true): Promise<void> {
    const message = recoverable 
      ? `I encountered a small issue: ${error}. Retrying...`
      : `I encountered an issue: ${error}. Please type /restart to try again.`
    
    await this.sendStatus(message)
  }

  async reportProgress(step: number, total: number, description: string): Promise<void> {
    const percentage = Math.round((step / total) * 100)
    const progressBar = this.createProgressBar(percentage)
    const message = `${progressBar} ${percentage}%\n${description}`
    
    await this.sendStatus(message)
  }

  private async sendStatus(message: string): Promise<void> {
    try {
      if (this.lastMessageId) {
        try {
          await this.bot.editMessageText(message, {
            chat_id: this.chatId,
            message_id: this.lastMessageId,
          })
          return
        } catch (e) {
          // Message cannot be edited, send new one
        }
      }

      const sent = await this.bot.sendMessage(this.chatId, message)
      this.lastMessageId = sent.message_id
    } catch (error) {
      console.error("Failed to send status:", (error as Error).message)
    }
  }

  private getStatusKeyForStage(stage: PipelineStage): StatusMessageKey {
    const stageMap: Record<PipelineStage, StatusMessageKey> = {
      intake: "intake_saving",
      clarification: "intake_clarifying",
      research: "research_starting",
      generation: "generation_brand",
      review: "review_starting",
      delivery: "delivery_preparing",
      complete: "delivery_sending",
      error: "error_generic",
    }
    return stageMap[stage] || "error_generic"
  }

  private createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10)
    const empty = 10 - filled
    return "[" + "=".repeat(filled) + " ".repeat(empty) + "]"
  }

  clearLastMessage(): void {
    this.lastMessageId = null
  }
}

export const STAGE_DESCRIPTIONS: Record<PipelineStage, string> = {
  intake: "Saving your responses",
  clarification: "Reviewing your answers for clarity",
  research: "Researching your public presence",
  generation: "Generating your strategy documents",
  review: "Quality checking before delivery",
  delivery: "Sending your documents",
  complete: "All done!",
  error: "Something went wrong",
}

export const DETAILED_STATUS_FLOW = [
  { stage: "intake" as PipelineStage, message: "Saving your responses..." },
  { stage: "clarification" as PipelineStage, message: "Checking if I need more details..." },
  { stage: "research" as PipelineStage, message: "Researching your public presence..." },
  { stage: "research" as PipelineStage, message: "Analyzing your website..." },
  { stage: "research" as PipelineStage, message: "Auditing your social profiles..." },
  { stage: "generation" as PipelineStage, message: "Analyzing your brand signals..." },
  { stage: "generation" as PipelineStage, message: "Building your audience profile..." },
  { stage: "generation" as PipelineStage, message: "Crafting your content strategy..." },
  { stage: "review" as PipelineStage, message: "Reviewing quality before delivery..." },
  { stage: "delivery" as PipelineStage, message: "Preparing your documents..." },
  { stage: "delivery" as PipelineStage, message: "Sending your strategy package..." },
]
