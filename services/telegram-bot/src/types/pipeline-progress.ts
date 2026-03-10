/**
 * Pipeline Progress Types
 * 
 * Types for tracking deep research pipeline progress in real-time
 */

export type PipelineStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface PipelineProgress {
  id: string;
  tenantId: string;
  
  // Overall progress
  status: PipelineStatus;
  currentPhase: number;
  currentStep: number;
  totalPhases: number;
  totalSteps: number;
  progressPercent: number;
  
  // Phase-specific tracking
  phaseName: string | null;
  stepName: string | null;
  stepStartedAt: Date | null;
  
  // Research metrics
  queriesExecuted: number;
  sourcesFound: number;
  claimsExtracted: number;
  evidenceBundles: number;
  
  // Quality metrics
  currentConfidence: number | null;
  qualityIterations: number;
  qualityPassed: boolean | null;
  
  // Timing
  estimatedCompletionAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  
  // Error tracking
  lastError: string | null;
  errorCount: number;
  
  // Metadata
  pipelineType: string;
  metadata: Record<string, unknown>;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PhaseHistory {
  id: string;
  progressId: string;
  phaseNumber: number;
  phaseName: string;
  status: PhaseStatus;
  stepsCompleted: number;
  totalSteps: number;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface PhaseDefinition {
  number: number;
  name: string;
  description: string;
  steps: StepDefinition[];
  estimatedDurationMs: number;
}

export interface StepDefinition {
  number: number;
  name: string;
  description: string;
  estimatedDurationMs: number;
}

export interface ResearchMetrics {
  queriesExecuted?: number;
  sourcesFound?: number;
  claimsExtracted?: number;
  evidenceBundles?: number;
}

export interface QualityMetrics {
  confidence?: number;
  iterations?: number;
  passed?: boolean;
}

export interface ProgressUpdateOptions {
  metrics?: ResearchMetrics;
  qualityMetrics?: QualityMetrics;
  metadata?: Record<string, unknown>;
  error?: string;
}

// Phase definitions for the deep research pipeline
export const DEEP_RESEARCH_PHASES: PhaseDefinition[] = [
  {
    number: 1,
    name: 'Profile Research',
    description: 'Analyzing website, social profiles, and public presence',
    estimatedDurationMs: 4 * 60 * 1000, // 4 minutes
    steps: [
      { number: 1, name: 'Fetching website', description: 'Downloading and parsing website content', estimatedDurationMs: 30000 },
      { number: 2, name: 'Analyzing website', description: 'Extracting brand signals from website', estimatedDurationMs: 60000 },
      { number: 3, name: 'Analyzing social profiles', description: 'Reviewing social media presence', estimatedDurationMs: 90000 },
      { number: 4, name: 'Extracting brand signals', description: 'Identifying key brand attributes', estimatedDurationMs: 45000 },
      { number: 5, name: 'Compiling profile summary', description: 'Summarizing profile findings', estimatedDurationMs: 30000 },
    ]
  },
  {
    number: 2,
    name: 'Deep Research',
    description: 'Comprehensive competitor, audience, and market research',
    estimatedDurationMs: 25 * 60 * 1000, // 25 minutes
    steps: [
      // Competitor Research (8 steps)
      { number: 1, name: 'Discovering competitors', description: 'Finding relevant competitors', estimatedDurationMs: 90000 },
      { number: 2, name: 'Researching competitor 1', description: 'Deep dive on first competitor', estimatedDurationMs: 120000 },
      { number: 3, name: 'Researching competitor 2', description: 'Deep dive on second competitor', estimatedDurationMs: 120000 },
      { number: 4, name: 'Researching competitor 3', description: 'Deep dive on third competitor', estimatedDurationMs: 120000 },
      { number: 5, name: 'Researching competitor 4', description: 'Deep dive on fourth competitor', estimatedDurationMs: 120000 },
      { number: 6, name: 'Analyzing competitive landscape', description: 'Comparing all competitors', estimatedDurationMs: 90000 },
      { number: 7, name: 'Identifying differentiation', description: 'Finding unique positioning opportunities', estimatedDurationMs: 60000 },
      { number: 8, name: 'Building competitor evidence', description: 'Compiling competitor evidence bundles', estimatedDurationMs: 45000 },
      // Audience Research (9 steps)
      { number: 9, name: 'Researching demographics', description: 'Gathering demographic data', estimatedDurationMs: 90000 },
      { number: 10, name: 'Researching psychographics', description: 'Understanding audience psychology', estimatedDurationMs: 90000 },
      { number: 11, name: 'Analyzing platform behavior', description: 'How audience uses each platform', estimatedDurationMs: 120000 },
      { number: 12, name: 'Identifying pain points', description: 'Finding audience challenges', estimatedDurationMs: 90000 },
      { number: 13, name: 'Analyzing content preferences', description: 'What content resonates', estimatedDurationMs: 90000 },
      { number: 14, name: 'Researching buying behavior', description: 'Understanding purchase patterns', estimatedDurationMs: 90000 },
      { number: 15, name: 'Mapping audience journey', description: 'Creating customer journey map', estimatedDurationMs: 60000 },
      { number: 16, name: 'Validating audience claims', description: 'Cross-referencing audience data', estimatedDurationMs: 45000 },
      { number: 17, name: 'Building audience evidence', description: 'Compiling audience evidence bundles', estimatedDurationMs: 45000 },
      // Market Research (8 steps)
      { number: 18, name: 'Researching industry overview', description: 'Understanding industry landscape', estimatedDurationMs: 90000 },
      { number: 19, name: 'Analyzing market trends', description: 'Identifying growth patterns', estimatedDurationMs: 90000 },
      { number: 20, name: 'Analyzing content trends', description: 'What content performs in industry', estimatedDurationMs: 90000 },
      { number: 21, name: 'Gathering industry news', description: 'Recent developments and news', estimatedDurationMs: 60000 },
      { number: 22, name: 'Analyzing external factors', description: 'Regulatory and environmental factors', estimatedDurationMs: 60000 },
      { number: 23, name: 'Identifying opportunities', description: 'Finding market opportunities', estimatedDurationMs: 60000 },
      { number: 24, name: 'Assessing threats', description: 'Identifying potential threats', estimatedDurationMs: 45000 },
      { number: 25, name: 'Building market evidence', description: 'Compiling market evidence bundles', estimatedDurationMs: 45000 },
    ]
  },
  {
    number: 3,
    name: 'Evidence Synthesis',
    description: 'Cross-validating claims, scoring confidence, filling gaps',
    estimatedDurationMs: 7 * 60 * 1000, // 7 minutes
    steps: [
      { number: 1, name: 'Aggregating claims', description: 'Collecting all research claims', estimatedDurationMs: 30000 },
      { number: 2, name: 'Cross-referencing sources', description: 'Validating claims across sources', estimatedDurationMs: 90000 },
      { number: 3, name: 'Detecting contradictions', description: 'Identifying conflicting evidence', estimatedDurationMs: 60000 },
      { number: 4, name: 'Scoring confidence', description: 'Calculating confidence per claim', estimatedDurationMs: 60000 },
      { number: 5, name: 'Detecting research gaps', description: 'Finding missing information', estimatedDurationMs: 45000 },
      { number: 6, name: 'Filling research gaps', description: 'Executing gap-filling queries', estimatedDurationMs: 120000 },
      { number: 7, name: 'Building evidence bundles', description: 'Creating final evidence packages', estimatedDurationMs: 45000 },
      { number: 8, name: 'Calculating overall confidence', description: 'Computing aggregate confidence', estimatedDurationMs: 30000 },
    ]
  },
  {
    number: 4,
    name: 'Generation',
    description: 'Creating brand blueprint, audience analysis, and content strategy',
    estimatedDurationMs: 12 * 60 * 1000, // 12 minutes
    steps: [
      { number: 1, name: 'Generating brand blueprint', description: 'Creating brand identity document', estimatedDurationMs: 180000 },
      { number: 2, name: 'Evaluating brand blueprint', description: 'Self-review of brand content', estimatedDurationMs: 60000 },
      { number: 3, name: 'Generating audience analysis', description: 'Creating audience insights document', estimatedDurationMs: 180000 },
      { number: 4, name: 'Evaluating audience analysis', description: 'Self-review of audience content', estimatedDurationMs: 60000 },
      { number: 5, name: 'Generating content strategy', description: 'Creating strategic content plan', estimatedDurationMs: 180000 },
      { number: 6, name: 'Evaluating content strategy', description: 'Self-review of strategy content', estimatedDurationMs: 60000 },
    ]
  },
  {
    number: 5,
    name: 'Quality Review',
    description: 'Reviewing deliverables and iterating if needed',
    estimatedDurationMs: 7 * 60 * 1000, // 7 minutes
    steps: [
      { number: 1, name: 'Reviewing all deliverables', description: 'Comprehensive quality review', estimatedDurationMs: 180000 },
      { number: 2, name: 'Refining if needed', description: 'Iterating on low-scoring sections', estimatedDurationMs: 180000 },
      { number: 3, name: 'Confidentiality review', description: 'Ensuring no data leakage', estimatedDurationMs: 60000 },
    ]
  },
  {
    number: 6,
    name: 'Delivery',
    description: 'Generating PDFs and delivering via Telegram',
    estimatedDurationMs: 2 * 60 * 1000, // 2 minutes
    steps: [
      { number: 1, name: 'Generating PDFs', description: 'Creating professional PDF documents', estimatedDurationMs: 45000 },
      { number: 2, name: 'Saving to database', description: 'Persisting deliverables', estimatedDurationMs: 15000 },
      { number: 3, name: 'Sending via Telegram', description: 'Delivering documents to user', estimatedDurationMs: 30000 },
      { number: 4, name: 'Marking complete', description: 'Finalizing pipeline run', estimatedDurationMs: 10000 },
    ]
  }
];

// Calculate total steps
export const TOTAL_STEPS = DEEP_RESEARCH_PHASES.reduce(
  (total, phase) => total + phase.steps.length,
  0
);

export const TOTAL_PHASES = DEEP_RESEARCH_PHASES.length;

// Estimated total duration in milliseconds
export const ESTIMATED_TOTAL_DURATION_MS = DEEP_RESEARCH_PHASES.reduce(
  (total, phase) => total + phase.estimatedDurationMs,
  0
);

// Helper to get step number across all phases
export function getGlobalStepNumber(phaseNumber: number, stepNumber: number): number {
  let globalStep = 0;
  for (const phase of DEEP_RESEARCH_PHASES) {
    if (phase.number < phaseNumber) {
      globalStep += phase.steps.length;
    } else if (phase.number === phaseNumber) {
      globalStep += stepNumber;
      break;
    }
  }
  return globalStep;
}

// Helper to calculate progress percentage
export function calculateProgressPercent(phaseNumber: number, stepNumber: number): number {
  const globalStep = getGlobalStepNumber(phaseNumber, stepNumber);
  return Math.round((globalStep / TOTAL_STEPS) * 100);
}
