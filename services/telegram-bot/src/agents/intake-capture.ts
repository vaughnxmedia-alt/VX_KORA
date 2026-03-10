import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent"
import type { PipelineContext, AgentOutput } from "../types/pipeline"
import type { IntakeAnswer, NormalizedIntakeData, SocialHandles } from "../types/intake"
import { createIntakeAnswer, getIntakeAnswersBySession } from "../db/intake-answers"
import { updateTenantProfile } from "../db/tenant-profiles"

export interface IntakeCaptureInput {
  questionId: string
  questionText: string
  rawAnswer: string
}

export interface IntakeCaptureOutput {
  answer: IntakeAnswer
  allAnswers: IntakeAnswer[]
  normalizedData: NormalizedIntakeData | null
  isComplete: boolean
}

export class IntakeCaptureAgent extends BaseIntelAgent<IntakeCaptureInput, IntakeCaptureOutput> {
  constructor() {
    super("IntakeCaptureAgent", "intake")
  }

  protected async execute(
    context: PipelineContext,
    input: IntakeCaptureInput
  ): Promise<AgentOutput<IntakeCaptureOutput>> {
    const answer = await createIntakeAnswer({
      sessionId: context.runId,
      tenantId: context.tenantId,
      questionId: input.questionId,
      questionText: input.questionText,
      rawAnswer: input.rawAnswer,
      normalizedAnswer: this.normalizeAnswer(input.rawAnswer),
      answerType: "user_provided",
      confidenceScore: 1.0,
    })

    if (!answer) {
      return createAgentOutput(false, undefined, {
        error: "Failed to save intake answer",
        shouldRetry: true,
      })
    }

    this.incrementItemsProcessed()

    const allAnswers = await getIntakeAnswersBySession(context.runId)

    await this.updateTenantFromAnswers(context.tenant.id, allAnswers)

    const normalizedData = this.buildNormalizedData(allAnswers)

    const isComplete = this.checkIfIntakeComplete(allAnswers)

    return createAgentOutput(true, {
      answer,
      allAnswers,
      normalizedData,
      isComplete,
    }, {
      nextStage: isComplete ? "clarification" : undefined,
      updatedContext: {
        intakeAnswers: allAnswers,
        normalizedIntake: normalizedData,
      },
    })
  }

  private normalizeAnswer(raw: string): string {
    let normalized = raw.trim()
    
    normalized = normalized.replace(/\s+/g, " ")
    
    return normalized
  }

  private async updateTenantFromAnswers(
    tenantId: string,
    answers: IntakeAnswer[]
  ): Promise<void> {
    const getAnswer = (qId: string) => 
      answers.find(a => a.questionId === qId)?.rawAnswer

    const businessName = getAnswer("business_name")
    const website = getAnswer("website")
    const socialHandles = this.parseSocialHandles(getAnswer("social_handles") || "")
    const businessType = getAnswer("business_type")

    await updateTenantProfile(tenantId, {
      businessName: businessName || undefined,
      websiteUrl: website || undefined,
      socialHandles: Object.keys(socialHandles).length > 0 ? socialHandles : undefined,
      businessType: businessType || undefined,
      intakeStatus: "in_progress",
    })
  }

  private parseSocialHandles(raw: string): Partial<SocialHandles> {
    const handles: Partial<SocialHandles> = {}
    
    const instagramMatch = raw.match(/@?([a-zA-Z0-9_.]+)\s*(?:instagram|ig)/i) ||
                          raw.match(/instagram[:\s]*@?([a-zA-Z0-9_.]+)/i)
    if (instagramMatch) handles.instagram = `@${instagramMatch[1].replace(/^@/, "")}`

    const twitterMatch = raw.match(/@?([a-zA-Z0-9_]+)\s*(?:twitter|x\.com)/i) ||
                        raw.match(/(?:twitter|x)[:\s]*@?([a-zA-Z0-9_]+)/i)
    if (twitterMatch) handles.twitter = `@${twitterMatch[1].replace(/^@/, "")}`

    const linkedinMatch = raw.match(/linkedin\.com\/(?:in|company)\/([a-zA-Z0-9-]+)/i)
    if (linkedinMatch) handles.linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`

    const youtubeMatch = raw.match(/youtube\.com\/(?:@|channel\/|c\/)?([a-zA-Z0-9_-]+)/i)
    if (youtubeMatch) handles.youtube = `https://youtube.com/@${youtubeMatch[1]}`

    const tiktokMatch = raw.match(/@?([a-zA-Z0-9_.]+)\s*tiktok/i) ||
                       raw.match(/tiktok[:\s]*@?([a-zA-Z0-9_.]+)/i)
    if (tiktokMatch) handles.tiktok = `@${tiktokMatch[1].replace(/^@/, "")}`

    return handles
  }

  private buildNormalizedData(answers: IntakeAnswer[]): NormalizedIntakeData | null {
    if (answers.length === 0) return null

    const getAnswer = (qId: string) => 
      answers.find(a => a.questionId === qId)?.rawAnswer || ""

    const parseList = (raw: string): string[] => {
      if (!raw) return []
      return raw
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
    }

    return {
      businessName: getAnswer("business_name"),
      businessType: getAnswer("business_type"),
      website: getAnswer("website") || null,
      socialHandles: this.parseSocialHandles(getAnswer("social_handles")),
      mission: getAnswer("mission") || null,
      vision: getAnswer("vision") || null,
      coreValues: parseList(getAnswer("core_values")),
      brandPersonality: parseList(getAnswer("brand_personality")),
      brandVoice: getAnswer("brand_voice") || null,
      uniqueValue: getAnswer("unique_value") || null,
      avoidPerceptions: parseList(getAnswer("avoid_perception")),
      brandStory: getAnswer("brand_story") || null,
      expertiseAreas: parseList(getAnswer("expertise_areas")),
      contentPillars: parseList(getAnswer("content_pillars")),
      contentFormats: parseList(getAnswer("content_formats")),
      postingFrequency: getAnswer("posting_frequency") || null,
      primaryPlatform: getAnswer("primary_platform") || null,
      contentGoals: parseList(getAnswer("content_goals")),
      competitorInspiration: parseList(getAnswer("competitor_inspiration")),
      audienceAge: getAnswer("audience_age") || null,
      audiencePainPoints: parseList(getAnswer("audience_pain_points")),
      audienceDesires: parseList(getAnswer("audience_desires")),
      audienceObjections: parseList(getAnswer("audience_objections")),
      audiencePlatforms: parseList(getAnswer("audience_platforms")),
      audienceSegments: parseList(getAnswer("audience_segments")),
      callToAction: getAnswer("call_to_action") || null,
      topicsToTrack: parseList(getAnswer("topics_to_track")),
      contentConsumption: getAnswer("content_consumption") || null,
      thoughtLeaders: parseList(getAnswer("thought_leaders")),
      contentToCreate: parseList(getAnswer("content_to_create")),
      topicsToAvoid: parseList(getAnswer("topics_to_avoid")),
      additionalContext: getAnswer("additional_context") || null,
    }
  }

  private checkIfIntakeComplete(answers: IntakeAnswer[]): boolean {
    const requiredQuestions = [
      "business_name",
      "business_type",
      "mission",
      "unique_value",
      "content_pillars",
      "primary_platform",
      "audience_pain_points",
    ]

    const answeredIds = new Set(answers.map(a => a.questionId))
    return requiredQuestions.every(q => answeredIds.has(q))
  }
}

export const intakeCaptureAgent = new IntakeCaptureAgent()
