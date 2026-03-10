/**
 * Pipeline Progress Hook
 * 
 * Provides real-time pipeline progress tracking via Supabase Realtime subscriptions.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PipelineProgress, PhaseHistory } from '@/types/pipeline-progress';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface UsePipelineProgressOptions {
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export interface UsePipelineProgressReturn {
  progress: PipelineProgress | null;
  phases: PhaseHistory[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  hasActiveProgress: boolean;
  timeRemaining: number | null;
  isRunning: boolean;
  isCompleted: boolean;
  isFailed: boolean;
}

/**
 * Hook to subscribe to pipeline progress updates for a customer
 * 
 * @param customerId - The customer ID to track progress for (not user_id, but customers.id)
 * @param options - Optional configuration
 */
export function usePipelineProgress(
  customerId: string | null | undefined,
  options: UsePipelineProgressOptions = {}
): UsePipelineProgressReturn {
  const { autoRefresh = false, refreshIntervalMs = 30000 } = options;

  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [phases, setPhases] = useState<PhaseHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch active pipeline progress
  const fetchProgress = useCallback(async () => {
    if (!customerId) {
      setProgress(null);
      setPhases([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch latest active or recently completed progress
      const { data: progressData, error: progressError } = await supabase
        .from('pipeline_progress')
        .select('*')
        .eq('tenant_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

      if (progressData) {
        setProgress(progressData as PipelineProgress);

        // Fetch phase history
        const { data: phaseData, error: phaseError } = await supabase
          .from('pipeline_phase_history')
          .select('*')
          .eq('progress_id', progressData.id)
          .order('phase_number', { ascending: true });

        if (phaseError) {
          console.error('Error fetching phase history:', phaseError);
        } else {
          setPhases((phaseData as PhaseHistory[]) || []);
        }
      } else {
        setProgress(null);
        setPhases([]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching pipeline progress:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!customerId) return;

    let channel: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      // Initial fetch
      await fetchProgress();

      // Subscribe to changes
      channel = supabase
        .channel(`pipeline_progress:${customerId}`)
        .on<PipelineProgress>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pipeline_progress',
            filter: `tenant_id=eq.${customerId}`,
          },
          (payload: RealtimePostgresChangesPayload<PipelineProgress>) => {
            console.log('[usePipelineProgress] Received update:', payload.eventType);
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newProgress = payload.new as PipelineProgress;
              setProgress(newProgress);
              
              // Refetch phases when progress updates
              fetchPhases(newProgress.id);
            } else if (payload.eventType === 'DELETE') {
              setProgress(null);
              setPhases([]);
            }
          }
        )
        .subscribe((status) => {
          console.log('[usePipelineProgress] Subscription status:', status);
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        console.log('[usePipelineProgress] Unsubscribing from channel');
        supabase.removeChannel(channel);
      }
    };
  }, [customerId, fetchProgress]);

  // Auto-refresh interval (optional)
  useEffect(() => {
    if (!autoRefresh || !customerId) return;

    const interval = setInterval(fetchProgress, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalMs, customerId, fetchProgress]);

  // Helper to fetch phases
  const fetchPhases = async (progressId: string) => {
    try {
      const { data, error } = await supabase
        .from('pipeline_phase_history')
        .select('*')
        .eq('progress_id', progressId)
        .order('phase_number', { ascending: true });

      if (!error && data) {
        setPhases(data as PhaseHistory[]);
      }
    } catch (err) {
      console.error('Error fetching phases:', err);
    }
  };

  // Calculate time remaining
  const timeRemaining = progress?.estimated_completion_at
    ? Math.max(0, new Date(progress.estimated_completion_at).getTime() - Date.now())
    : null;

  // Derived states
  const hasActiveProgress = !!progress && ['queued', 'running'].includes(progress.status);
  const isRunning = progress?.status === 'running';
  const isCompleted = progress?.status === 'completed';
  const isFailed = progress?.status === 'failed';

  return {
    progress,
    phases,
    isLoading,
    error,
    refetch: fetchProgress,
    hasActiveProgress,
    timeRemaining,
    isRunning,
    isCompleted,
    isFailed,
  };
}

/**
 * Format time remaining in human-readable format
 */
export function formatTimeRemaining(ms: number | null): string {
  if (ms === null || ms <= 0) return 'Calculating...';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `~${hours}h ${remainingMinutes}m remaining`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `~${minutes}m ${remainingSeconds}s remaining`;
  } else {
    return `~${seconds}s remaining`;
  }
}

/**
 * Get phase icon based on status
 */
export function getPhaseIcon(status: PhaseHistory['status']): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'running':
      return '⏳';
    case 'failed':
      return '✗';
    case 'skipped':
      return '⊝';
    default:
      return '○';
  }
}

/**
 * Get status color class
 */
export function getStatusColorClass(status: PipelineProgress['status']): string {
  switch (status) {
    case 'running':
      return 'text-blue-600';
    case 'completed':
      return 'text-green-600';
    case 'failed':
      return 'text-red-600';
    case 'cancelled':
      return 'text-gray-600';
    default:
      return 'text-gray-400';
  }
}
