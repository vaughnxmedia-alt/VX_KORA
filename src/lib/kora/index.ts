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
  getIntegrationApiStatuses,
  saveIntegrationApiKey,
} from "./client";

export { SOCIAL_INTEGRATION_PROVIDERS } from "./integrationProviders";
export type { SocialIntegrationProvider } from "./integrationProviders";

// React hooks
export {
  useContentStrategies,
  useContentStrategy,
  useRequestContentStrategy,
  useCampaigns,
  useCampaignsByStrategy,
  useCampaign,
  useRequestCampaign,
  useIntegrationApiConnections,
} from "./hooks";

// Type exports for hooks
export type {
  UseContentStrategiesResult,
  UseContentStrategyResult,
  UseRequestContentStrategyResult,
  UseCampaignsResult,
  UseCampaignResult,
  UseRequestCampaignResult,
  UseIntegrationApiConnectionsResult,
} from "./hooks";
