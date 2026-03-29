/**
 * Pipeline Progress Card
 * 
 * Displays real-time pipeline progress with animated progress bar,
 * phase breakdown, research metrics, and status indicators.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  usePipelineProgress, 
  formatTimeRemaining, 
  getPhaseIcon,
  getStatusColorClass
} from '@/hooks/usePipelineProgress';
import { PHASES } from '@/types/pipeline-progress';
import type { PipelineProgress, PhaseHistory } from '@/types/pipeline-progress';

interface PipelineProgressCardProps {
  customerId: string | null | undefined;
  onComplete?: () => void;
  compact?: boolean;
}

export function PipelineProgressCard({ 
  customerId, 
  onComplete,
  compact = false 
}: PipelineProgressCardProps) {
  const {
    progress,
    phases,
    isLoading,
    error,
    hasActiveProgress,
    timeRemaining,
    isRunning,
    isCompleted,
    isFailed,
  } = usePipelineProgress(customerId);

  // Call onComplete callback when pipeline completes
  React.useEffect(() => {
    if (isCompleted && onComplete) {
      onComplete();
    }
  }, [isCompleted, onComplete]);

  // Don't render if no active progress
  if (!progress || (!hasActiveProgress && !isCompleted && !isFailed)) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="mb-6 animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 bg-gray-200 rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-4 bg-gray-200 rounded w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null;
  }

  return (
    <Card className={`mb-6 ${isRunning ? 'border-blue-200 bg-blue-50/50' : ''} ${isCompleted ? 'border-green-200 bg-green-50/50' : ''} ${isFailed ? 'border-red-200 bg-red-50/50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon status={progress.status} />
            <div>
              <CardTitle className="text-lg">
                {getStatusTitle(progress.status)}
              </CardTitle>
              <CardDescription>
                {progress.phase_name && isRunning
                  ? `${progress.phase_name}: ${progress.step_name || 'Processing...'}`
                  : getStatusDescription(progress.status)
                }
              </CardDescription>
            </div>
          </div>
          
          {isRunning && timeRemaining !== null && (
            <div className="text-sm text-muted-foreground">
              {formatTimeRemaining(timeRemaining)}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress.progress_percent}%</span>
          </div>
          <Progress 
            value={progress.progress_percent} 
            className={`h-2 ${isRunning ? 'animate-pulse' : ''}`}
          />
        </div>

        {/* Phase breakdown (not in compact mode) */}
        {!compact && isRunning && (
          <PhaseBreakdown 
            currentPhase={progress.current_phase} 
            phases={phases}
          />
        )}

        {/* Research metrics */}
        {!compact && progress.status === 'running' && (
          <ResearchMetrics progress={progress} />
        )}

        {/* Quality metrics (when available) */}
        {!compact && progress.current_confidence !== null && (
          <QualityMetrics progress={progress} />
        )}

        {/* Error display */}
        {isFailed && progress.last_error && (
          <div className="rounded-md bg-red-100 p-3 text-sm text-red-800">
            <p className="font-medium">Pipeline failed</p>
            <p className="mt-1 text-red-700">{progress.last_error}</p>
          </div>
        )}

        {/* Completion message */}
        {isCompleted && (
          <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
            <p className="font-medium">Your documents are ready!</p>
            <p className="mt-1 text-green-700">
              Check your Telegram for the PDF documents, or view them below.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Status icon component
function StatusIcon({ status }: { status: PipelineProgress['status'] }) {
  switch (status) {
    case 'queued':
      return (
        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
          <ClockIcon className="h-5 w-5 text-gray-500" />
        </div>
      );
    case 'running':
      return (
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
          <SpinnerIcon className="h-5 w-5 text-blue-600 animate-spin" />
        </div>
      );
    case 'completed':
      return (
        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
          <CheckIcon className="h-5 w-5 text-green-600" />
        </div>
      );
    case 'failed':
      return (
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
          <AlertIcon className="h-5 w-5 text-red-600" />
        </div>
      );
    default:
      return null;
  }
}

// Phase breakdown component
function PhaseBreakdown({ 
  currentPhase, 
  phases 
}: { 
  currentPhase: number; 
  phases: PhaseHistory[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Phases</p>
      <div className="grid grid-cols-6 gap-1">
        {PHASES.map((phase) => {
          const phaseHistory = phases.find(p => p.phase_number === phase.number);
          const isActive = phase.number === currentPhase;
          const isComplete = phaseHistory?.status === 'completed';
          const isFailed = phaseHistory?.status === 'failed';
          
          return (
            <div 
              key={phase.number}
              className={`
                relative p-2 rounded text-center text-xs
                ${isActive ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
                ${isComplete ? 'bg-green-100' : ''}
                ${isFailed ? 'bg-red-100' : ''}
                ${!isActive && !isComplete && !isFailed ? 'bg-gray-100' : ''}
              `}
              title={`${phase.name}: ${phase.description}`}
            >
              <div className={`font-medium ${isActive ? 'text-blue-700' : isComplete ? 'text-green-700' : 'text-gray-600'}`}>
                {phase.number}
              </div>
              <div className={`truncate ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                {phase.name.split(' ')[0]}
              </div>
              {isComplete && (
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckIcon className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Research metrics component
function ResearchMetrics({ progress }: { progress: PipelineProgress }) {
  const metrics = [
    { label: 'Queries', value: progress.queries_executed, icon: '🔍' },
    { label: 'Sources', value: progress.sources_found, icon: '📄' },
    { label: 'Claims', value: progress.claims_extracted, icon: '💡' },
    { label: 'Evidence', value: progress.evidence_bundles, icon: '📊' },
  ];

  const hasMetrics = metrics.some(m => m.value > 0);
  if (!hasMetrics) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Research Progress</p>
      <div className="grid grid-cols-4 gap-2">
        {metrics.map((metric) => (
          <div 
            key={metric.label}
            className="bg-gray-50 rounded p-2 text-center"
          >
            <div className="text-lg font-semibold">{metric.value}</div>
            <div className="text-xs text-muted-foreground">{metric.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Quality metrics component
function QualityMetrics({ progress }: { progress: PipelineProgress }) {
  const confidencePercent = Math.round((progress.current_confidence || 0) * 100);
  
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Quality Score</p>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Progress value={confidencePercent} className="h-2" />
        </div>
        <div className="text-sm font-medium">
          {confidencePercent}%
        </div>
        {progress.quality_passed !== null && (
          <div className={`text-sm ${progress.quality_passed ? 'text-green-600' : 'text-yellow-600'}`}>
            {progress.quality_passed ? '✓ Passed' : `Iteration ${progress.quality_iterations}`}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getStatusTitle(status: PipelineProgress['status']): string {
  switch (status) {
    case 'queued':
      return 'Preparing Research Pipeline';
    case 'running':
      return 'Research in Progress';
    case 'completed':
      return 'Research Complete';
    case 'failed':
      return 'Pipeline Failed';
    case 'cancelled':
      return 'Pipeline Cancelled';
    default:
      return 'Pipeline Status';
  }
}

function getStatusDescription(status: PipelineProgress['status']): string {
  switch (status) {
    case 'queued':
      return 'Your request is queued and will start shortly...';
    case 'running':
      return 'Gathering intelligence and generating your documents...';
    case 'completed':
      return 'All documents have been generated and delivered.';
    case 'failed':
      return 'An error occurred during processing.';
    case 'cancelled':
      return 'This pipeline was cancelled.';
    default:
      return '';
  }
}

// SVG Icons
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

export default PipelineProgressCard;
