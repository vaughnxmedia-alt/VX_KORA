import { useState } from "react"
import { RefreshCw, Building2, GitBranch, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/DataTable"
import { StatusPill } from "@/components/StatusPill"
import { TenantSelector } from "@/components/TenantSelector"
import { KPIStatCard } from "@/components/KPIStatCard"
import { mockTenants, getTenantProfile, getTenantQueue, getLatestRoutingRun, mockGlobalRssItems } from "@/lib/mock-data"
import type { Tenant, TenantItemQueue } from "@/lib/types"

function formatTimeAgo(timestamp: string): string {
  const diffMins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

export function TenantRouting() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(mockTenants[0])

  const tenantProfile = selectedTenant ? getTenantProfile(selectedTenant.id) : null
  const tenantQueue = selectedTenant ? getTenantQueue(selectedTenant.id) : []
  const latestRun = selectedTenant ? getLatestRoutingRun(selectedTenant.id) : null

  const queueWithItems = tenantQueue.map((q) => ({ ...q, item: mockGlobalRssItems.find((i) => i.id === q.global_item_id) }))

  const queueColumns = [
    { key: "item" as const, header: "Item", render: (queue: TenantItemQueue & { item?: typeof mockGlobalRssItems[0] }) => <div className="max-w-sm"><p className="font-medium text-grey-900 truncate">{queue.item?.title || "Unknown"}</p><p className="text-xs text-grey-500">{queue.item?.source_name}</p></div> },
    { key: "relevance_score" as const, header: "Relevance", render: (queue: TenantItemQueue) => <div className="flex items-center gap-2"><div className="w-16 h-2 bg-grey-100 rounded-full overflow-hidden"><div className="h-full bg-royal rounded-full" style={{ width: `${queue.relevance_score * 100}%` }} /></div><span className="text-sm font-medium text-grey-700">{(queue.relevance_score * 100).toFixed(0)}%</span></div> },
    { key: "relevance_reasons" as const, header: "Reasons", render: (queue: TenantItemQueue) => <div className="flex flex-wrap gap-1 max-w-xs">{queue.relevance_reasons.slice(0, 2).map((reason, idx) => <span key={idx} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{reason}</span>)}{queue.relevance_reasons.length > 2 && <span className="text-xs text-grey-400">+{queue.relevance_reasons.length - 2}</span>}</div> },
    { key: "is_processed" as const, header: "Status", render: (queue: TenantItemQueue) => <StatusPill status={queue.is_processed ? "completed" : "pending"} label={queue.is_processed ? "Processed" : "Pending"} /> },
    { key: "created_at" as const, header: "Routed", render: (queue: TenantItemQueue) => <span className="text-grey-500 text-sm">{formatTimeAgo(queue.created_at)}</span> },
  ]

  const handleRerunRouting = () => {
    alert(`Routing requested for ${selectedTenant?.name}. Event inserted into kora_events queue.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-grey-900">Tenant Routing</h1>
          <p className="text-grey-500 mt-1">Route global items to tenants based on relevance scoring.</p>
        </div>
        <div className="flex items-center gap-3">
          <TenantSelector tenants={mockTenants.filter((t) => t.is_active)} selectedTenant={selectedTenant} onSelect={setSelectedTenant} className="w-64" />
          <Button onClick={handleRerunRouting} disabled={!selectedTenant}><RefreshCw className="h-4 w-4 mr-2" />Re-run Routing</Button>
        </div>
      </div>

      {selectedTenant && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <KPIStatCard title="Items in Queue" value={tenantQueue.length} icon={GitBranch} />
            <KPIStatCard title="Pending Processing" value={tenantQueue.filter((q) => !q.is_processed).length} icon={Clock} />
            <KPIStatCard title="Avg Relevance" value={Math.round((tenantQueue.reduce((sum, q) => sum + q.relevance_score, 0) / tenantQueue.length || 0) * 100)} format="percent" />
            <div className="bg-white rounded-xl p-4 shadow-card">
              <p className="text-sm text-grey-500">Last Routing</p>
              <p className="text-2xl font-semibold text-grey-900 mt-1">{latestRun ? formatTimeAgo(latestRun.started_at) : "Never"}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-xl shadow-card">
              <div className="p-4 border-b border-grey-100 flex items-center justify-between">
                <h2 className="font-semibold text-grey-900">Item Queue</h2>
                <span className="text-sm text-grey-500">{tenantQueue.length} items</span>
              </div>
              <DataTable data={queueWithItems} columns={queueColumns} keyExtractor={(q) => q.id} emptyMessage="No items in queue for this tenant" />
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-royal/10 rounded-lg flex items-center justify-center"><Building2 className="h-5 w-5 text-royal" /></div>
                  <div><h3 className="font-semibold text-grey-900">{selectedTenant.name}</h3><p className="text-sm text-grey-500">{selectedTenant.industry}</p></div>
                </div>
                {tenantProfile ? (
                  <div className="space-y-4">
                    <div><p className="text-xs text-grey-500 uppercase tracking-wider mb-1">Description</p><p className="text-sm text-grey-700">{tenantProfile.company_description}</p></div>
                    <div><p className="text-xs text-grey-500 uppercase tracking-wider mb-1">Keywords</p><div className="flex flex-wrap gap-1">{tenantProfile.keywords.map((kw) => <span key={kw} className="text-xs bg-grey-100 text-grey-600 px-1.5 py-0.5 rounded">{kw}</span>)}</div></div>
                    <div><p className="text-xs text-grey-500 uppercase tracking-wider mb-1">Competitors</p><div className="flex flex-wrap gap-1">{tenantProfile.competitors.map((comp) => <span key={comp} className="text-xs bg-orange/10 text-orange px-1.5 py-0.5 rounded">{comp}</span>)}</div></div>
                  </div>
                ) : <p className="text-sm text-grey-500 italic">No profile configured</p>}
              </div>
              {latestRun && (
                <div className="bg-white rounded-xl shadow-card p-5">
                  <h3 className="font-semibold text-grey-900 mb-3">Last Routing Run</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-grey-500">Status</span><StatusPill status={latestRun.status === "completed" ? "completed" : "failed"} /></div>
                    <div className="flex justify-between"><span className="text-grey-500">Items Evaluated</span><span className="text-grey-900 font-medium">{latestRun.items_evaluated}</span></div>
                    <div className="flex justify-between"><span className="text-grey-500">Items Routed</span><span className="text-green-600 font-medium">{latestRun.items_routed}</span></div>
                    <div className="flex justify-between"><span className="text-grey-500">Avg Relevance</span><span className="text-grey-900 font-medium">{(latestRun.avg_relevance_score * 100).toFixed(0)}%</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!selectedTenant && (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <Building2 className="h-12 w-12 text-grey-300 mx-auto mb-4" />
          <h3 className="font-semibold text-grey-900 mb-2">Select a Tenant</h3>
          <p className="text-grey-500">Choose a tenant from the dropdown above to view their item queue and routing status.</p>
        </div>
      )}
    </div>
  )
}
