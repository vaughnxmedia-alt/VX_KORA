/**
 * K.O.R.A React Hooks
 * 
 * Custom hooks for working with KORA content strategies and campaigns.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getContentStrategies,
  getContentStrategy,
  getCampaigns,
  getCampaign,
  getCampaignsByStrategy,
  requestContentStrategy,
  requestCampaign,
  subscribeToStrategies,
  subscribeToCampaigns,
} from "./client";
import type {
  ContentStrategyOutput,
  CampaignOutput,
  RequestContentStrategyRequest,
  RequestContentStrategyResponse,
  RequestCampaignRequest,
  RequestCampaignResponse,
} from "./types";

// Content Strategies Hooks

export interface UseContentStrategiesResult {
  strategies: ContentStrategyOutput[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useContentStrategies(): UseContentStrategiesResult {
  const [strategies, setStrategies] = useState<ContentStrategyOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getContentStrategies();
      setStrategies(result.strategies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load strategies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToStrategies((updatedStrategy) => {
      setStrategies((prev) => {
        const index = prev.findIndex((s) => s.id === updatedStrategy.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = updatedStrategy;
          return updated;
        }
        return [updatedStrategy, ...prev];
      });
    });

    return unsubscribe;
  }, [fetchStrategies]);

  return { strategies, loading, error, refetch: fetchStrategies };
}

export interface UseContentStrategyResult {
  strategy: ContentStrategyOutput | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useContentStrategy(id: string | null): UseContentStrategyResult {
  const [strategy, setStrategy] = useState<ContentStrategyOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStrategy = useCallback(async () => {
    if (!id) {
      setStrategy(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getContentStrategy(id);
      setStrategy(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load strategy");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStrategy();
  }, [fetchStrategy]);

  return { strategy, loading, error, refetch: fetchStrategy };
}

export interface UseRequestContentStrategyResult {
  request: (data: RequestContentStrategyRequest) => Promise<RequestContentStrategyResponse>;
  loading: boolean;
  error: string | null;
  result: RequestContentStrategyResponse | null;
  reset: () => void;
}

export function useRequestContentStrategy(): UseRequestContentStrategyResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RequestContentStrategyResponse | null>(null);

  const request = useCallback(async (data: RequestContentStrategyRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await requestContentStrategy(data);
      setResult(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { request, loading, error, result, reset };
}

// Campaigns Hooks

export interface UseCampaignsResult {
  campaigns: CampaignOutput[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCampaigns(): UseCampaignsResult {
  const [campaigns, setCampaigns] = useState<CampaignOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getCampaigns();
      setCampaigns(result.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToCampaigns((updatedCampaign) => {
      setCampaigns((prev) => {
        const index = prev.findIndex((c) => c.id === updatedCampaign.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = updatedCampaign;
          return updated;
        }
        return [updatedCampaign, ...prev];
      });
    });

    return unsubscribe;
  }, [fetchCampaigns]);

  return { campaigns, loading, error, refetch: fetchCampaigns };
}

export function useCampaignsByStrategy(contentStrategyId: string | null): UseCampaignsResult {
  const [campaigns, setCampaigns] = useState<CampaignOutput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!contentStrategyId) {
      setCampaigns([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getCampaignsByStrategy(contentStrategyId);
      setCampaigns(result.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [contentStrategyId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return { campaigns, loading, error, refetch: fetchCampaigns };
}

export interface UseCampaignResult {
  campaign: CampaignOutput | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCampaign(id: string | null): UseCampaignResult {
  const [campaign, setCampaign] = useState<CampaignOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    if (!id) {
      setCampaign(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await getCampaign(id);
      setCampaign(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  return { campaign, loading, error, refetch: fetchCampaign };
}

export interface UseRequestCampaignResult {
  request: (data: RequestCampaignRequest) => Promise<RequestCampaignResponse>;
  loading: boolean;
  error: string | null;
  result: RequestCampaignResponse | null;
  reset: () => void;
}

export function useRequestCampaign(): UseRequestCampaignResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RequestCampaignResponse | null>(null);

  const request = useCallback(async (data: RequestCampaignRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await requestCampaign(data);
      setResult(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { request, loading, error, result, reset };
}
