// Testing and feedback types

import type { DeliverableType } from "./deliverables"

export interface TestTenant {
  name: string
  telegramId: number
  customerId: string
  isTestTenant: true
}

export const TEST_TENANTS: TestTenant[] = [
  {
    name: "Juss",
    telegramId: 8216104620,
    customerId: "juss",
    isTestTenant: true,
  },
  {
    name: "JahKnowsPR",
    telegramId: 8697293004,
    customerId: "jahknowspr",
    isTestTenant: true,
  },
]

export interface TestingFeedback {
  id: string
  tenantId: string
  deliverableType: DeliverableType
  deliverableId: string
  pipelineRunId: string | null
  
  testerTelegramId: number | null
  testerName: string | null
  
  // Grading (1-5 scale)
  contextQuality: number | null
  researchDepth: number | null
  usefulness: number | null
  brandAlignment: number | null
  formattingQuality: number | null
  overallGrade: number | null
  
  // Qualitative feedback
  feedbackNotes: string | null
  improvementSuggestions: string | null
  specificIssues: SpecificIssue[]
  whatWorkedWell: string[]
  
  createdAt: Date
}

export interface SpecificIssue {
  section: string
  issue: string
}

export interface FeedbackForm {
  deliverableType: DeliverableType
  deliverableId: string
  
  contextQuality?: number
  researchDepth?: number
  usefulness?: number
  brandAlignment?: number
  formattingQuality?: number
  overallGrade?: number
  
  feedbackNotes?: string
  improvementSuggestions?: string
  specificIssues?: SpecificIssue[]
  whatWorkedWell?: string[]
}

export interface FeedbackQuestion {
  id: string
  question: string
  type: "rating" | "text" | "multi_select"
  options?: string[]
  required: boolean
}

export const FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
  {
    id: "context_quality",
    question: "How well did the output reflect your business context? (1-5)",
    type: "rating",
    required: true,
  },
  {
    id: "research_depth",
    question: "How thorough was the research and analysis? (1-5)",
    type: "rating",
    required: true,
  },
  {
    id: "usefulness",
    question: "How useful is this for your actual business? (1-5)",
    type: "rating",
    required: true,
  },
  {
    id: "brand_alignment",
    question: "How well does this align with your brand? (1-5)",
    type: "rating",
    required: true,
  },
  {
    id: "formatting_quality",
    question: "How clear and well-formatted was the output? (1-5)",
    type: "rating",
    required: true,
  },
  {
    id: "overall_grade",
    question: "Overall, how would you rate this deliverable? (1-5)",
    type: "rating",
    required: true,
  },
  {
    id: "what_worked",
    question: "What worked well?",
    type: "text",
    required: false,
  },
  {
    id: "improvements",
    question: "What could be improved?",
    type: "text",
    required: false,
  },
]

export interface FeedbackSummary {
  tenantId: string
  totalFeedback: number
  averageContextQuality: number
  averageResearchDepth: number
  averageUsefulness: number
  averageBrandAlignment: number
  averageFormattingQuality: number
  averageOverallGrade: number
  commonIssues: string[]
  commonPraise: string[]
}

export function isTestTenant(telegramId: number): boolean {
  return TEST_TENANTS.some(t => t.telegramId === telegramId)
}

export function getTestTenant(telegramId: number): TestTenant | undefined {
  return TEST_TENANTS.find(t => t.telegramId === telegramId)
}
