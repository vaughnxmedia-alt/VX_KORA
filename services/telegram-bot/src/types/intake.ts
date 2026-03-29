// Intake question and answer types

export type IntakePhase = 
  | "intro" 
  | "brand_identity" 
  | "strategy" 
  | "audience" 
  | "content_intelligence"

export type AnswerType = "user_provided" | "clarified" | "inferred"

export type ValidationRule = "text" | "list" | "url" | "choice" | "email" | "number"

export interface IntakeQuestion {
  id: string
  phase: IntakePhase
  question: string
  followUp?: string
  examples?: string[]
  validation?: ValidationRule
  choices?: string[]
  required: boolean
  minLength?: number
  maxLength?: number
  clarificationPrompt?: string
}

export interface IntakeAnswer {
  id: string
  sessionId: string
  tenantId: string
  questionId: string
  questionText: string
  rawAnswer: string
  normalizedAnswer: string | null
  answerType: AnswerType
  confidenceScore: number
  needsClarification: boolean
  clarificationReason: string | null
  clarificationQuestion: string | null
  clarifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface IntakeSession {
  id: string
  telegramId: number
  telegramUsername: string | null
  currentQuestionId: string | null
  phase: IntakePhase | "completed" | "generating"
  responses: Record<string, string>
  startedAt: Date
  lastActivity: Date
  clientId?: string
}

export interface TelegramMessage {
  id: string
  sessionId: string
  telegramId: number
  telegramChatId: number
  direction: "inbound" | "outbound"
  messageType: "question" | "answer" | "status" | "deliverable" | "clarification" | "error"
  content: string
  messageId: number | null
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface NormalizedIntakeData {
  businessName: string
  businessType: string
  website: string | null
  socialHandles: SocialHandles
  mission: string | null
  vision: string | null
  coreValues: string[]
  brandPersonality: string[]
  brandVoice: string | null
  uniqueValue: string | null
  avoidPerceptions: string[]
  brandStory: string | null
  expertiseAreas: string[]
  contentPillars: string[]
  contentFormats: string[]
  postingFrequency: string | null
  primaryPlatform: string | null
  contentGoals: string[]
  competitorInspiration: string[]
  audienceAge: string | null
  audiencePainPoints: string[]
  audienceDesires: string[]
  audienceObjections: string[]
  audiencePlatforms: string[]
  audienceSegments: string[]
  callToAction: string | null
  topicsToTrack: string[]
  contentConsumption: string | null
  thoughtLeaders: string[]
  contentToCreate: string[]
  topicsToAvoid: string[]
  additionalContext: string | null
}

export interface SocialHandles {
  instagram?: string
  twitter?: string
  linkedin?: string
  youtube?: string
  tiktok?: string
  facebook?: string
  threads?: string
}

export interface ClarificationRule {
  questionId: string
  minLength?: number
  requiredKeywords?: string[]
  genericPatterns?: RegExp[]
  customValidator?: (answer: string) => ClarificationResult
}

export interface ClarificationResult {
  needsClarification: boolean
  reason?: string
  suggestedQuestion?: string
}
