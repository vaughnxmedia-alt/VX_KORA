/**
 * K.O.R.A Module Exports
 * 
 * Central export for all KORA-related types, hooks, and utilities.
 */

// Types
export * from "./types";

// Client-side functions
export {
  requestContentStrategy,
  requestCampaign,
  getContentStrategies,
  getContentStrategy,
  getCampaigns,
  getCampaign,
  getCampaignsByStrategy,
  subscribeToStrategies,
  subscribeToCampaigns,
} from "./client";

// React hooks
export {
  useContentStrategies,
  useContentStrategy,
  useRequestContentStrategy,
  useCampaigns,
  useCampaignsByStrategy,
  useCampaign,
  useRequestCampaign,
} from "./hooks";

// Type exports for hooks
export type {
  UseContentStrategiesResult,
  UseContentStrategyResult,
  UseRequestContentStrategyResult,
  UseCampaignsResult,
  UseCampaignResult,
  UseRequestCampaignResult,
} from "./hooks";
