/**
 * Intake Clarifier Agent
 * 
 * First point of contact for new data entering the system:
 * - Classifies content type and relevance
 * - Extracts key entities and topics
 * - Determines routing priority
 * - Flags content requiring manual review
 */

import type { IntelligenceItem, ContentType, SignalType } from "@kora/sdk"
import { BaseAgent } from "../base-agent"
import type { AgentConfig, AgentContext, AgentMetrics } from "../types"

export interface IntakeClarifierInput {
  items: Array<{
    id?: string
    rawContent: string
    sourceUrl?: string
    sourceType?: string
    metadata?: Record<string, unknown>
  }>
  autoApprove?: boolean
}

export interface IntakeClarifierOutput {
  classifiedItems: Array<{
    originalId?: string
    contentType: ContentType
    signalType: SignalType
    topics: string[]
    entities: string[]
    relevanceScore: number
    priority: "high" | "medium" | "low"
    requiresReview: boolean
    reviewReason?: string
  }>
  itemsRequiringReview: number
}

export class IntakeClarifierAgent extends BaseAgent<IntakeClarifierInput, IntakeClarifierOutput> {
  constructor(config: AgentConfig) {
    super(
      config,
      "Intake Clarifier",
      "Classifies and routes incoming content based on type, relevance, and priority"
    )
  }

  protected async process(
    input: IntakeClarifierInput,
    context: AgentContext,
    metrics: AgentMetrics
  ): Promise<IntakeClarifierOutput> {
    const { items, autoApprove = false } = input

    const classifiedItems: IntakeClarifierOutput["classifiedItems"] = []
    let itemsRequiringReview = 0

    for (const item of items) {
      try {
        const classification = await this.classifyItem(item, metrics)
        
        if (classification.requiresReview) {
          itemsRequiringReview++
        }

        classifiedItems.push({
          originalId: item.id,
          ...classification
        })

        metrics.itemsSucceeded++
      } catch (error) {
        console.error(`[intake-clarifier] Error classifying item:`, error)
        metrics.itemsFailed++
      }
      metrics.itemsProcessed++
    }

    return {
      classifiedItems,
      itemsRequiringReview
    }
  }

  private async classifyItem(
    item: IntakeClarifierInput["items"][0],
    metrics: AgentMetrics
  ): Promise<Omit<IntakeClarifierOutput["classifiedItems"][0], "originalId">> {
    // Step 1: Determine content type
    const contentType = await this.determineContentType(item)
    
    // Step 2: Identify signal type
    const signalType = await this.identifySignalType(item)
    
    // Step 3: Extract topics and entities
    const { topics, entities } = await this.extractTopicsAndEntities(item, metrics)
    
    // Step 4: Calculate relevance score
    const relevanceScore = await this.calculateRelevance(item, topics, entities)
    
    // Step 5: Determine priority
    const priority = this.determinePriority(relevanceScore, signalType)
    
    // Step 6: Check if review needed
    const { requiresReview, reviewReason } = this.checkReviewRequirement(
      item, contentType, relevanceScore
    )

    return {
      contentType,
      signalType,
      topics,
      entities,
      relevanceScore,
      priority,
      requiresReview,
      reviewReason
    }
  }

  private async determineContentType(
    item: IntakeClarifierInput["items"][0]
  ): Promise<ContentType> {
    // TODO: Use LLM to classify content type
    // - article, video, social_post, podcast, news, report
    console.log("[intake-clarifier] Determining content type...")
    return "article"
  }

  private async identifySignalType(
    item: IntakeClarifierInput["items"][0]
  ): Promise<SignalType> {
    // TODO: Identify signal type
    // - trend, insight, event, controversy, opportunity, threat
    console.log("[intake-clarifier] Identifying signal type...")
    return "insight"
  }

  private async extractTopicsAndEntities(
    item: IntakeClarifierInput["items"][0],
    metrics: AgentMetrics
  ): Promise<{ topics: string[]; entities: string[] }> {
    // TODO: Use LLM to extract topics and named entities
    console.log("[intake-clarifier] Extracting topics and entities...")
    return { topics: [], entities: [] }
  }

  private async calculateRelevance(
    item: IntakeClarifierInput["items"][0],
    topics: string[],
    entities: string[]
  ): Promise<number> {
    // TODO: Calculate relevance score (0-1)
    // Based on:
    // - Topic match with system-wide interests
    // - Entity recognition
    // - Source reputation
    // - Content freshness
    return 0.5
  }

  private determinePriority(
    relevanceScore: number,
    signalType: SignalType
  ): "high" | "medium" | "low" {
    // High priority: controversies, threats, high-relevance trends
    if (signalType === "controversy" || signalType === "threat") return "high"
    if (relevanceScore >= 0.8) return "high"
    if (relevanceScore >= 0.5) return "medium"
    return "low"
  }

  private checkReviewRequirement(
    item: IntakeClarifierInput["items"][0],
    contentType: ContentType,
    relevanceScore: number
  ): { requiresReview: boolean; reviewReason?: string } {
    // Flag for review if:
    // - Low relevance but from trusted source
    // - Contains potentially sensitive content
    // - Classification confidence is low
    
    if (relevanceScore < 0.3) {
      return { 
        requiresReview: true, 
        reviewReason: "Low relevance score - confirm before discarding" 
      }
    }
    
    return { requiresReview: false }
  }
}

export function createIntakeClarifierAgent(config: AgentConfig): IntakeClarifierAgent {
  return new IntakeClarifierAgent(config)
}
