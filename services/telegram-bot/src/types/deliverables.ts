// Deliverable types with confidence scoring

export type DeliverableType = "brand_blueprint" | "content_strategy" | "audience_analysis"
export type DeliverableStatus = "draft" | "reviewing" | "approved" | "delivered" | "rejected"
export type SourceType = "user_input" | "research" | "inferred" | "generated"

export interface ConfidenceField<T> {
  value: T
  confidence: number
  source: SourceType
  evidence?: string
}

export interface CoreValue {
  value: string
  explanation: string
  confidence: number
  source: SourceType
}

export interface BrandPersonalityTrait {
  trait: string
  description: string
  confidence: number
}

export interface BrandVoice {
  tone: string
  languageStyle: string
  principles: string[]
  confidence: number
}

export interface VisualIdentityGuidelines {
  colorPsychology: string
  imageryStyle: string
  typographyDirection: string
}

export interface BrandBlueprint {
  id: string
  tenantId: string
  version: number
  status: DeliverableStatus
  
  brandEssence: string | null
  brandEssenceConfidence: number | null
  brandEssenceSource: SourceType | null
  
  missionStatement: string | null
  missionConfidence: number | null
  missionSource: SourceType | null
  
  visionStatement: string | null
  visionConfidence: number | null
  visionSource: SourceType | null
  
  coreValues: CoreValue[]
  
  brandPersonality: BrandPersonalityTrait[]
  brandPersonalityConfidence: number | null
  
  uniqueValueProposition: string | null
  uvpConfidence: number | null
  uvpSource: SourceType | null
  
  brandVoice: BrandVoice | null
  
  visualIdentityGuidelines: VisualIdentityGuidelines | null
  
  positioningStatement: string | null
  positioningConfidence: number | null
  
  avoidPerceptions: string[]
  
  brandStory: string | null
  brandStoryConfidence: number | null
  
  overallConfidenceScore: number | null
  lowConfidenceSections: string[]
  researchGaps: ResearchGap[]
  
  generatedAt: Date | null
  reviewedAt: Date | null
  deliveredAt: Date | null
  
  createdAt: Date
  updatedAt: Date
}

export interface ResearchGap {
  section: string
  gapDescription: string
}

export interface ContentPillar {
  name: string
  description: string
  contentTypes: string[]
  frequency: string
  confidence: number
  rationale: string
}

export interface ContentTheme {
  theme: string
  description: string
  confidence: number
}

export interface PostingSchedule {
  optimalTimes: string[]
  frequencyByPlatform: Record<string, string>
  confidence: number
}

export interface PlatformStrategy {
  platform: string
  focus: string
  contentTypes: string[]
  postingFrequency: string
  confidence: number
}

export interface ContentMix {
  educational: number
  entertaining: number
  promotional: number
  inspirational: number
}

export interface ExampleWeekContent {
  day: string
  contentType: string
  topic: string
  platform: string
  rationale: string
}

export interface HashtagStrategy {
  primary: string[]
  secondary: string[]
  avoid: string[]
  confidence: number
}

export interface ContentStrategy {
  id: string
  tenantId: string
  version: number
  status: DeliverableStatus
  
  contentPillars: ContentPillar[]
  contentThemes: ContentTheme[]
  postingSchedule: PostingSchedule | null
  platformStrategy: PlatformStrategy[]
  contentMix: ContentMix | null
  exampleWeek: ExampleWeekContent[]
  hashtagStrategy: HashtagStrategy | null
  
  growthStrategy: string | null
  growthStrategyConfidence: number | null
  
  keyTips: string[]
  
  overallConfidenceScore: number | null
  lowConfidenceSections: string[]
  researchGaps: ResearchGap[]
  
  generatedAt: Date | null
  reviewedAt: Date | null
  deliveredAt: Date | null
  
  createdAt: Date
  updatedAt: Date
}

export interface PrimaryAudience {
  demographics: string
  psychographics: string
  painPoints: string[]
  aspirations: string[]
  confidence: number
}

export interface AudienceSegment {
  name: string
  description: string
  sizeEstimate: string
  engagementApproach: string
  confidence: number
  source: SourceType
}

export interface PlatformAudience {
  platform: string
  audienceType: string
  behavior: string
  bestContent: string
  confidence: number
}

export interface AudienceMotivation {
  motivation: string
  evidence: string
  confidence: number
}

export interface ContentAttraction {
  type: string
  whyItWorks: string
  confidence: number
}

export interface PersonalityType {
  type: string
  description: string
  approach: string
  confidence: number
}

export interface AudienceJourney {
  awarenessStage: string
  considerationStage: string
  decisionStage: string
}

export interface VerifiedSignal {
  signal: string
  source: string
  evidence: string
}

export interface InferredAssumption {
  assumption: string
  basis: string
  confidence: number
}

export interface AudienceAnalysis {
  id: string
  tenantId: string
  version: number
  status: DeliverableStatus
  
  overview: string | null
  overviewConfidence: number | null
  
  primaryAudience: PrimaryAudience | null
  audienceSegments: AudienceSegment[]
  platformBreakdown: PlatformAudience[]
  
  audiencePsychology: string | null
  psychologyConfidence: number | null
  
  audienceMotivations: AudienceMotivation[]
  contentTypesThatAttract: ContentAttraction[]
  personalityTypes: PersonalityType[]
  audienceJourney: AudienceJourney | null
  engagementTriggers: string[]
  audienceFlywheel: string | null
  
  verifiedSignals: VerifiedSignal[]
  inferredAssumptions: InferredAssumption[]
  
  overallConfidenceScore: number | null
  lowConfidenceSections: string[]
  researchGaps: ResearchGap[]
  
  generatedAt: Date | null
  reviewedAt: Date | null
  deliveredAt: Date | null
  
  createdAt: Date
  updatedAt: Date
}

export interface DeliverableReview {
  id: string
  tenantId: string
  deliverableType: DeliverableType
  deliverableId: string
  reviewRound: number
  
  formattingScore: number | null
  specificityScore: number | null
  researchDepthScore: number | null
  brandAlignmentScore: number | null
  actionabilityScore: number | null
  overallScore: number | null
  
  malformedFields: MalformedField[]
  genericStatements: GenericStatement[]
  unsupportedAssumptions: UnsupportedAssumption[]
  missingResearch: MissingResearch[]
  
  passedReview: boolean
  reviewNotes: string | null
  improvementActions: ImprovementAction[]
  
  reviewedAt: Date
  createdAt: Date
}

export interface MalformedField {
  fieldPath: string
  issue: string
  rawValue: string
}

export interface GenericStatement {
  fieldPath: string
  text: string
  suggestion: string
}

export interface UnsupportedAssumption {
  fieldPath: string
  assumption: string
  needs: string
}

export interface MissingResearch {
  section: string
  whatIsMissing: string
}

export interface ImprovementAction {
  action: string
  field: string
  priority: "high" | "medium" | "low"
}

export interface ConfidenceScore {
  id: string
  tenantId: string
  deliverableType: DeliverableType
  deliverableId: string
  fieldPath: string
  confidenceScore: number
  sourceType: SourceType
  supportingEvidence: SupportingEvidence[]
  createdAt: Date
}

export interface SupportingEvidence {
  sourceId?: string
  findingId?: string
  excerpt: string
}

export interface GeneratedDeliverables {
  brandBlueprint: BrandBlueprint | null
  contentStrategy: ContentStrategy | null
  audienceAnalysis: AudienceAnalysis | null
}
