/**
 * Pipeline Progress Types for Dashboard
 */

export type PipelineStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface PipelineProgress {
  id: string;
  tenant_id: string;
  
  // Overall progress
  status: PipelineStatus;
  current_phase: number;
  current_step: number;
  total_phases: number;
  total_steps: number;
  progress_percent: number;
  
  // Phase-specific tracking
  phase_name: string | null;
  step_name: string | null;
  step_started_at: string | null;
  
  // Research metrics
  queries_executed: number;
  sources_found: number;
  claims_extracted: number;
  evidence_bundles: number;
  
  // Quality metrics
  current_confidence: number | null;
  quality_iterations: number;
  quality_passed: boolean | null;
  
  // Timing
  estimated_completion_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  
  // Error tracking
  last_error: string | null;
  error_count: number;
  
  // Metadata
  pipeline_type: string;
  metadata: Record<string, unknown>;
  
  created_at: string;
  updated_at: string;
}

export interface PhaseHistory {
  id: string;
  progress_id: string;
  phase_number: number;
  phase_name: string;
  status: PhaseStatus;
  steps_completed: number;
  total_steps: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PhaseDefinition {
  number: number;
  name: string;
  description: string;
  estimatedMinutes: number;
}

// Phase definitions matching the pipeline
export const PHASES: PhaseDefinition[] = [
  {
    number: 1,
    name: 'Profile Research',
    description: 'Analyzing your public presence',
    estimatedMinutes: 4,
  },
  {
    number: 2,
    name: 'Deep Research',
    description: 'Competitors, audience, and market analysis',
    estimatedMinutes: 25,
  },
  {
    number: 3,
    name: 'Evidence Synthesis',
    description: 'Cross-validating and scoring findings',
    estimatedMinutes: 7,
  },
  {
    number: 4,
    name: 'Generation',
    description: 'Creating your brand strategy documents',
    estimatedMinutes: 12,
  },
  {
    number: 5,
    name: 'Quality Review',
    description: 'Ensuring highest quality output',
    estimatedMinutes: 7,
  },
  {
    number: 6,
    name: 'Delivery',
    description: 'Preparing and sending documents',
    estimatedMinutes: 2,
  },
];

export const TOTAL_ESTIMATED_MINUTES = PHASES.reduce(
  (total, phase) => total + phase.estimatedMinutes,
  0
);
