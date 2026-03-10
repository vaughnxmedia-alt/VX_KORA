/**
 * Pipeline Progress Tracker
 * 
 * Tracks deep research pipeline progress in real-time, updating the database
 * after each step for dashboard visibility.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  PipelineProgress,
  PhaseHistory,
  PhaseDefinition,
  StepDefinition,
  ResearchMetrics,
  QualityMetrics,
  ProgressUpdateOptions,
  DEEP_RESEARCH_PHASES,
  TOTAL_STEPS,
  TOTAL_PHASES,
  getGlobalStepNumber,
  calculateProgressPercent,
  PipelineStatus,
  PhaseStatus
} from "../types/pipeline-progress.js";

export interface ProgressTrackerConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  updateIntervalMs?: number;
  batchUpdates?: boolean;
}

export class ProgressTracker {
  private supabase: SupabaseClient;
  private progressId: string | null = null;
  private tenantId: string;
  private currentPhase: number = 0;
  private currentStep: number = 0;
  private startedAt: Date | null = null;
  private phaseStartedAt: Date | null = null;
  private stepStartedAt: Date | null = null;
  
  // Metrics accumulators
  private queriesExecuted: number = 0;
  private sourcesFound: number = 0;
  private claimsExtracted: number = 0;
  private evidenceBundles: number = 0;
  private qualityIterations: number = 0;
  private currentConfidence: number | null = null;
  private qualityPassed: boolean | null = null;
  private errorCount: number = 0;
  private lastError: string | null = null;
  
  // Batching
  private pendingUpdate: boolean = false;
  private updateTimer: NodeJS.Timeout | null = null;
  private batchUpdates: boolean;
  private updateIntervalMs: number;

  constructor(tenantId: string, config: ProgressTrackerConfig) {
    this.tenantId = tenantId;
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    this.batchUpdates = config.batchUpdates ?? false;
    this.updateIntervalMs = config.updateIntervalMs ?? 1000;
  }

  /**
   * Initialize a new pipeline progress record
   */
  async start(): Promise<string> {
    this.startedAt = new Date();
    
    const { data, error } = await this.supabase
      .from("pipeline_progress")
      .insert({
        tenant_id: this.tenantId,
        status: "running",
        current_phase: 0,
        current_step: 0,
        total_phases: TOTAL_PHASES,
        total_steps: TOTAL_STEPS,
        progress_percent: 0,
        phase_name: "Initializing",
        step_name: "Starting pipeline",
        started_at: this.startedAt.toISOString(),
        pipeline_type: "deep_research",
        metadata: {
          estimatedDurationMs: this.getEstimatedTotalDuration()
        }
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ProgressTracker] Failed to create progress record:", error);
      throw error;
    }

    this.progressId = data?.id || null;
    if (!this.progressId) {
      throw new Error("Failed to get progress ID");
    }
    console.log(`[ProgressTracker] Started tracking: ${this.progressId}`);
    return this.progressId;
  }

  /**
   * Advance to a new phase
   */
  async advancePhase(phaseNumber: number): Promise<void> {
    const phase = DEEP_RESEARCH_PHASES.find(p => p.number === phaseNumber);
    if (!phase) {
      console.warn(`[ProgressTracker] Unknown phase: ${phaseNumber}`);
      return;
    }

    // Complete previous phase if any
    if (this.currentPhase > 0 && this.phaseStartedAt) {
      await this.completePhase(this.currentPhase);
    }

    this.currentPhase = phaseNumber;
    this.currentStep = 0;
    this.phaseStartedAt = new Date();
    this.stepStartedAt = null;

    // Create phase history record
    await this.createPhaseHistory(phase);

    // Update progress
    await this.updateProgress({
      phaseName: phase.name,
      stepName: phase.steps[0]?.name || "Starting phase"
    });

    console.log(`[ProgressTracker] Advanced to phase ${phaseNumber}: ${phase.name}`);
  }

  /**
   * Advance to a new step within current phase
   */
  async advanceStep(stepNumber: number, stepName?: string): Promise<void> {
    const phase = DEEP_RESEARCH_PHASES.find(p => p.number === this.currentPhase);
    const step = phase?.steps.find(s => s.number === stepNumber);
    
    this.currentStep = stepNumber;
    this.stepStartedAt = new Date();

    const name = stepName || step?.name || `Step ${stepNumber}`;
    
    await this.updateProgress({
      stepName: name
    });

    console.log(`[ProgressTracker] Phase ${this.currentPhase}, Step ${stepNumber}: ${name}`);
  }

  /**
   * Update research metrics
   */
  async updateMetrics(metrics: ResearchMetrics): Promise<void> {
    if (metrics.queriesExecuted !== undefined) {
      this.queriesExecuted += metrics.queriesExecuted;
    }
    if (metrics.sourcesFound !== undefined) {
      this.sourcesFound += metrics.sourcesFound;
    }
    if (metrics.claimsExtracted !== undefined) {
      this.claimsExtracted += metrics.claimsExtracted;
    }
    if (metrics.evidenceBundles !== undefined) {
      this.evidenceBundles += metrics.evidenceBundles;
    }

    await this.updateProgress({});
  }

  /**
   * Update quality metrics
   */
  async updateQuality(quality: QualityMetrics): Promise<void> {
    if (quality.confidence !== undefined) {
      this.currentConfidence = quality.confidence;
    }
    if (quality.iterations !== undefined) {
      this.qualityIterations = quality.iterations;
    }
    if (quality.passed !== undefined) {
      this.qualityPassed = quality.passed;
    }

    await this.updateProgress({});
  }

  /**
   * Record an error (does not fail the pipeline)
   */
  async recordError(error: string): Promise<void> {
    this.errorCount++;
    this.lastError = error;
    
    await this.updateProgress({
      error
    });
    
    console.error(`[ProgressTracker] Error recorded: ${error}`);
  }

  /**
   * Mark the pipeline as failed
   */
  async fail(error: string): Promise<void> {
    this.lastError = error;
    
    await this.supabase
      .from("pipeline_progress")
      .update({
        status: "failed",
        last_error: error,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", this.progressId);

    // Update current phase as failed
    if (this.currentPhase > 0) {
      await this.supabase
        .from("pipeline_phase_history")
        .update({
          status: "failed",
          error_message: error,
          completed_at: new Date().toISOString()
        })
        .eq("progress_id", this.progressId)
        .eq("phase_number", this.currentPhase);
    }

    console.error(`[ProgressTracker] Pipeline failed: ${error}`);
  }

  /**
   * Mark the pipeline as complete
   */
  async complete(): Promise<void> {
    // Complete final phase
    if (this.currentPhase > 0 && this.phaseStartedAt) {
      await this.completePhase(this.currentPhase);
    }

    const completedAt = new Date();
    const durationMs = this.startedAt 
      ? completedAt.getTime() - this.startedAt.getTime() 
      : 0;

    await this.supabase
      .from("pipeline_progress")
      .update({
        status: "completed",
        progress_percent: 100,
        phase_name: "Complete",
        step_name: "All deliverables ready",
        quality_passed: this.qualityPassed,
        completed_at: completedAt.toISOString(),
        updated_at: completedAt.toISOString(),
        metadata: {
          totalDurationMs: durationMs,
          finalMetrics: {
            queriesExecuted: this.queriesExecuted,
            sourcesFound: this.sourcesFound,
            claimsExtracted: this.claimsExtracted,
            evidenceBundles: this.evidenceBundles
          }
        }
      })
      .eq("id", this.progressId);

    console.log(`[ProgressTracker] Pipeline completed in ${Math.round(durationMs / 1000)}s`);
  }

  /**
   * Cancel the pipeline
   */
  async cancel(): Promise<void> {
    await this.supabase
      .from("pipeline_progress")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", this.progressId);

    console.log(`[ProgressTracker] Pipeline cancelled`);
  }

  /**
   * Get current progress state
   */
  getState(): {
    progressId: string | null;
    phase: number;
    step: number;
    progressPercent: number;
    metrics: ResearchMetrics;
    quality: QualityMetrics;
  } {
    return {
      progressId: this.progressId,
      phase: this.currentPhase,
      step: this.currentStep,
      progressPercent: calculateProgressPercent(this.currentPhase, this.currentStep),
      metrics: {
        queriesExecuted: this.queriesExecuted,
        sourcesFound: this.sourcesFound,
        claimsExtracted: this.claimsExtracted,
        evidenceBundles: this.evidenceBundles
      },
      quality: {
        confidence: this.currentConfidence ?? undefined,
        iterations: this.qualityIterations,
        passed: this.qualityPassed ?? undefined
      }
    };
  }

  // Private methods

  private async updateProgress(options: { phaseName?: string; stepName?: string; error?: string }): Promise<void> {
    if (!this.progressId) return;

    const progressPercent = calculateProgressPercent(this.currentPhase, this.currentStep);
    const estimatedCompletion = this.calculateEstimatedCompletion(progressPercent);

    const update: Record<string, unknown> = {
      current_phase: this.currentPhase,
      current_step: getGlobalStepNumber(this.currentPhase, this.currentStep),
      progress_percent: progressPercent,
      step_started_at: this.stepStartedAt?.toISOString(),
      queries_executed: this.queriesExecuted,
      sources_found: this.sourcesFound,
      claims_extracted: this.claimsExtracted,
      evidence_bundles: this.evidenceBundles,
      current_confidence: this.currentConfidence,
      quality_iterations: this.qualityIterations,
      quality_passed: this.qualityPassed,
      error_count: this.errorCount,
      estimated_completion_at: estimatedCompletion?.toISOString(),
      updated_at: new Date().toISOString()
    };

    if (options.phaseName) {
      update.phase_name = options.phaseName;
    }
    if (options.stepName) {
      update.step_name = options.stepName;
    }
    if (options.error) {
      update.last_error = options.error;
    }

    if (this.batchUpdates) {
      this.pendingUpdate = true;
      if (!this.updateTimer) {
        this.updateTimer = setTimeout(async () => {
          if (this.pendingUpdate) {
            await this.flushUpdate(update);
          }
          this.updateTimer = null;
        }, this.updateIntervalMs);
      }
    } else {
      await this.flushUpdate(update);
    }
  }

  private async flushUpdate(update: Record<string, unknown>): Promise<void> {
    this.pendingUpdate = false;
    
    const { error } = await this.supabase
      .from("pipeline_progress")
      .update(update)
      .eq("id", this.progressId);

    if (error) {
      console.error("[ProgressTracker] Failed to update progress:", error);
    }
  }

  private async createPhaseHistory(phase: PhaseDefinition): Promise<void> {
    if (!this.progressId) return;

    await this.supabase
      .from("pipeline_phase_history")
      .insert({
        progress_id: this.progressId,
        phase_number: phase.number,
        phase_name: phase.name,
        status: "running",
        steps_completed: 0,
        total_steps: phase.steps.length,
        started_at: new Date().toISOString(),
        metadata: {
          estimatedDurationMs: phase.estimatedDurationMs
        }
      });
  }

  private async completePhase(phaseNumber: number): Promise<void> {
    if (!this.progressId || !this.phaseStartedAt) return;

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - this.phaseStartedAt.getTime();
    const phase = DEEP_RESEARCH_PHASES.find(p => p.number === phaseNumber);

    await this.supabase
      .from("pipeline_phase_history")
      .update({
        status: "completed",
        steps_completed: phase?.steps.length || this.currentStep,
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs
      })
      .eq("progress_id", this.progressId)
      .eq("phase_number", phaseNumber);
  }

  private calculateEstimatedCompletion(currentPercent: number): Date | null {
    if (!this.startedAt || currentPercent <= 0) return null;

    const elapsedMs = Date.now() - this.startedAt.getTime();
    const estimatedTotalMs = (elapsedMs / currentPercent) * 100;
    const remainingMs = estimatedTotalMs - elapsedMs;

    return new Date(Date.now() + remainingMs);
  }

  private getEstimatedTotalDuration(): number {
    return DEEP_RESEARCH_PHASES.reduce(
      (total, phase) => total + phase.estimatedDurationMs,
      0
    );
  }
}

/**
 * Create a progress tracker instance with environment config
 */
export function createProgressTracker(tenantId: string): ProgressTracker {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  }

  return new ProgressTracker(tenantId, {
    supabaseUrl,
    supabaseServiceKey,
    batchUpdates: false, // Real-time updates for dashboard
    updateIntervalMs: 500
  });
}
