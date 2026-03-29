import { BaseIntelAgent, createAgentOutput } from "./base-intel-agent"
import type { PipelineContext, AgentOutput } from "../types/pipeline"
import type { IntakeAnswer, ClarificationResult } from "../types/intake"
import { 
  getIntakeAnswersBySession, 
  markAnswerNeedsClarification,
  getAnswersNeedingClarification 
} from "../db/intake-answers"
import { updateTenantProfile } from "../db/tenant-profiles"

export interface ClarificationInput {
  forceCheck?: boolean
}

export interface ClarificationOutput {
  answersNeedingClarification: IntakeAnswer[]
  clarificationQuestions: ClarificationQuestion[]
  allClear: boolean
}

export interface ClarificationQuestion {
  answerId: string
  originalQuestion: string
  originalAnswer: string
  clarificationReason: string
  clarificationQuestion: string
}

interface ClarificationRule {
  questionId: string
  minLength?: number
  genericPatterns?: RegExp[]
  requiredElements?: string[]
  customCheck?: (answer: string, allAnswers: IntakeAnswer[]) => ClarificationResult
}

const CLARIFICATION_RULES: ClarificationRule[] = [
  {
    questionId: "business_name",
    minLength: 2,
    genericPatterns: [/^(test|example|my business|company)$/i],
  },
  {
    questionId: "mission",
    minLength: 20,
    genericPatterns: [
      /^(to help people|to make money|to be successful|to grow)$/i,
      /^(we help|we do|we make)$/i,
    ],
  },
  {
    questionId: "vision",
    minLength: 20,
    genericPatterns: [
      /^(to be the best|to be number one|to dominate)$/i,
    ],
  },
  {
    questionId: "unique_value",
    minLength: 30,
    genericPatterns: [
      /^(quality|service|price|best)$/i,
      /^(we are different|we are unique|we stand out)$/i,
    ],
  },
  {
    questionId: "core_values",
    minLength: 10,
    genericPatterns: [
      /^(honesty|integrity|quality)$/i,
    ],
    customCheck: (answer) => {
      const values = answer.split(/[,\n]/).filter(v => v.trim().length > 0)
      if (values.length < 2) {
        return {
          needsClarification: true,
          reason: "Only provided one value",
          suggestedQuestion: "Can you share at least 3-5 core values that guide your business decisions?",
        }
      }
      return { needsClarification: false }
    },
  },
  {
    questionId: "brand_personality",
    minLength: 10,
    genericPatterns: [
      /^(good|nice|professional|friendly)$/i,
    ],
  },
  {
    questionId: "audience_pain_points",
    minLength: 15,
    customCheck: (answer) => {
      const points = answer.split(/[,\n]/).filter(p => p.trim().length > 0)
      if (points.length < 2) {
        return {
          needsClarification: true,
          reason: "Need more specific pain points",
          suggestedQuestion: "Can you describe 2-3 specific problems or frustrations your audience faces?",
        }
      }
      return { needsClarification: false }
    },
  },
  {
    questionId: "content_pillars",
    customCheck: (answer) => {
      const pillars = answer.split(/[,\n]/).filter(p => p.trim().length > 0)
      if (pillars.length < 2) {
        return {
          needsClarification: true,
          reason: "Not enough content pillars",
          suggestedQuestion: "Content pillars are the main themes for your content. Can you identify 3-4 topics you want to be known for?",
        }
      }
      return { needsClarification: false }
    },
  },
  {
    questionId: "website",
    customCheck: (answer) => {
      if (!answer || answer.toLowerCase() === "none" || answer.toLowerCase() === "n/a") {
        return { needsClarification: false }
      }
      const hasProtocol = /^https?:\/\//i.test(answer)
      const hasDomain = /\.[a-z]{2,}/i.test(answer)
      if (!hasProtocol || !hasDomain) {
        return {
          needsClarification: true,
          reason: "Website URL appears incomplete",
          suggestedQuestion: `Is your website URL "${answer}"? Please provide the full URL starting with https://`,
        }
      }
      return { needsClarification: false }
    },
  },
]

export class ClarificationAgent extends BaseIntelAgent<ClarificationInput, ClarificationOutput> {
  constructor() {
    super("ClarificationAgent", "clarification")
  }

  protected async execute(
    context: PipelineContext,
    input: ClarificationInput
  ): Promise<AgentOutput<ClarificationOutput>> {
    const alreadyFlagged = await getAnswersNeedingClarification(context.runId)
    if (alreadyFlagged.length > 0 && !input.forceCheck) {
      return createAgentOutput(true, {
        answersNeedingClarification: alreadyFlagged,
        clarificationQuestions: alreadyFlagged.map(a => ({
          answerId: a.id,
          originalQuestion: a.questionText,
          originalAnswer: a.rawAnswer,
          clarificationReason: a.clarificationReason || "Needs more detail",
          clarificationQuestion: a.clarificationQuestion || "Can you provide more detail?",
        })),
        allClear: false,
      })
    }

    const allAnswers = context.intakeAnswers.length > 0 
      ? context.intakeAnswers 
      : await getIntakeAnswersBySession(context.runId)

    const clarificationQuestions: ClarificationQuestion[] = []

    for (const answer of allAnswers) {
      const result = await this.checkAnswer(answer, allAnswers)
      
      if (result.needsClarification) {
        await markAnswerNeedsClarification(
          answer.id,
          result.reason || "Answer needs more detail",
          result.suggestedQuestion || "Can you provide more detail?"
        )

        clarificationQuestions.push({
          answerId: answer.id,
          originalQuestion: answer.questionText,
          originalAnswer: answer.rawAnswer,
          clarificationReason: result.reason || "Needs more detail",
          clarificationQuestion: result.suggestedQuestion || "Can you provide more detail?",
        })

        this.incrementItemsProcessed()
      }
    }

    const allClear = clarificationQuestions.length === 0

    if (!allClear) {
      await updateTenantProfile(context.tenant.id, {
        intakeStatus: "clarifying",
      })
    }

    const answersNeedingClarification = await getAnswersNeedingClarification(context.runId)

    return createAgentOutput(true, {
      answersNeedingClarification,
      clarificationQuestions,
      allClear,
    }, {
      nextStage: allClear ? "research" : undefined,
    })
  }

  private async checkAnswer(
    answer: IntakeAnswer,
    allAnswers: IntakeAnswer[]
  ): Promise<ClarificationResult> {
    const rule = CLARIFICATION_RULES.find(r => r.questionId === answer.questionId)
    
    if (!rule) {
      return this.defaultCheck(answer)
    }

    if (rule.customCheck) {
      const customResult = rule.customCheck(answer.rawAnswer, allAnswers)
      if (customResult.needsClarification) {
        return customResult
      }
    }

    if (rule.minLength && answer.rawAnswer.length < rule.minLength) {
      return {
        needsClarification: true,
        reason: `Answer is too short (${answer.rawAnswer.length} chars, need at least ${rule.minLength})`,
        suggestedQuestion: `Can you expand on "${answer.rawAnswer}"? I need more detail to create an accurate strategy.`,
      }
    }

    if (rule.genericPatterns) {
      for (const pattern of rule.genericPatterns) {
        if (pattern.test(answer.rawAnswer)) {
          return {
            needsClarification: true,
            reason: "Answer appears too generic",
            suggestedQuestion: `"${answer.rawAnswer}" is quite broad. Can you be more specific about what makes this unique to your business?`,
          }
        }
      }
    }

    return { needsClarification: false }
  }

  private defaultCheck(answer: IntakeAnswer): ClarificationResult {
    if (answer.rawAnswer.length < 3) {
      return {
        needsClarification: true,
        reason: "Answer is too short",
        suggestedQuestion: "Can you provide more detail?",
      }
    }

    const genericResponses = [
      /^(yes|no|maybe|idk|i don't know|not sure|n\/a)$/i,
      /^(good|bad|ok|fine|great|nice)$/i,
    ]

    for (const pattern of genericResponses) {
      if (pattern.test(answer.rawAnswer.trim())) {
        return {
          needsClarification: true,
          reason: "Answer is too vague",
          suggestedQuestion: `I need more than "${answer.rawAnswer}". Can you elaborate on this?`,
        }
      }
    }

    return { needsClarification: false }
  }

  async generateClarificationQuestion(
    answer: IntakeAnswer,
    reason: string
  ): Promise<string> {
    const response = await this.router.complete({
      taskType: "structured_output",
      agentName: this.getName(),
      tenantId: answer.tenantId,
      prompt: `Generate a friendly, specific follow-up question to get more detail from the user.

Original Question: ${answer.questionText}
User's Answer: "${answer.rawAnswer}"
Why we need clarification: ${reason}

Generate a conversational follow-up question that:
1. Acknowledges their answer
2. Explains why more detail would help
3. Asks a specific follow-up

Return JSON: { "question": "..." }`,
      jsonSchema: {
        type: "object",
        properties: {
          question: { type: "string" }
        },
        required: ["question"]
      },
    })

    this.recordLLMUsage(response.totalTokens, response.costUsd)

    const parsed = JSON.parse(response.content)
    return parsed.question
  }
}

export const clarificationAgent = new ClarificationAgent()
