/**
 * Mission Control: mock data cleared for real trial runs.
 * Wire Supabase/API here when ready; helpers return empty until then.
 */
import type {
  Tenant,
  TenantProfile,
  GlobalRssItem,
  GlobalIngestRun,
  TenantItemQueue,
  TenantRoutingRun,
  KoraEvent,
  ContentStrategy,
  AgentHealth,
  ActivityItem,
} from "./types"

export const mockTenants: Tenant[] = []
export const mockTenantProfiles: Record<string, TenantProfile> = {}
export const mockGlobalRssItems: GlobalRssItem[] = []
export const mockGlobalIngestRuns: GlobalIngestRun[] = []
export const mockTenantItemQueue: TenantItemQueue[] = []
export const mockTenantRoutingRuns: TenantRoutingRun[] = []
export const mockKoraEvents: KoraEvent[] = []
export const mockContentStrategies: ContentStrategy[] = []
export const mockAgentHealth: AgentHealth[] = []
export const mockActivityFeed: ActivityItem[] = []

export function getTenantById(id: string): Tenant | undefined {
  return mockTenants.find((t) => t.id === id)
}

export function getTenantProfile(tenantId: string): TenantProfile | undefined {
  return mockTenantProfiles[tenantId]
}

export function getTenantQueue(tenantId: string): TenantItemQueue[] {
  return mockTenantItemQueue
    .filter((q) => q.tenant_id === tenantId)
    .map((q) => ({ ...q, item: mockGlobalRssItems.find((i) => i.id === q.global_item_id) }))
}

export function getLatestRoutingRun(tenantId: string): TenantRoutingRun | undefined {
  return mockTenantRoutingRuns
    .filter((r) => r.tenant_id === tenantId)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
}
