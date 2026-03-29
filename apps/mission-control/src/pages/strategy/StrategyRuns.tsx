import { useState } from "react"
import { Play, FileText, Target, Calendar, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/DataTable"
import { StatusPill } from "@/components/StatusPill"
import { DetailDrawer } from "@/components/DetailDrawer"
import { TenantSelector } from "@/components/TenantSelector"
import { mockTenants, mockContentStrategies, getTenantById } from "@/lib/mock-data"
import type { Tenant, ContentStrategy } from "@/lib/types"

function formatTimeAgo(timestamp: string): string {
  const diffMins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

export function StrategyRuns() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState<ContentStrategy | null>(null)

  const filteredStrategies = selectedTenant ? mockContentStrategies.filter((s) => s.tenant_id === selectedTenant.id) : mockContentStrategies

  const columns = [
    { key: "title" as const, header: "Strategy", render: (strategy: ContentStrategy) => <div><p className="font-medium text-grey-900">{strategy.title}</p><p className="text-xs text-grey-500">{getTenantById(strategy.tenant_id)?.name}</p></div> },
    { key: "status" as const, header: "Status", render: (strategy: ContentStrategy) => <StatusPill status={strategy.status as "active" | "draft"} /> },
    { key: "strategy_data" as const, header: "Pillars", render: (strategy: ContentStrategy) => <span className="text-grey-600">{strategy.strategy_data.content_pillars.length}</span> },
    { key: "created_at" as const, header: "Created", render: (strategy: ContentStrategy) => <span className="text-grey-500 text-sm">{formatTimeAgo(strategy.created_at)}</span> },
    { key: "updated_at" as const, header: "Updated", render: (strategy: ContentStrategy) => <span className="text-grey-500 text-sm">{formatTimeAgo(strategy.updated_at)}</span> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-grey-900">Content Strategy Runs</h1>
          <p className="text-grey-500 mt-1">View and manage AI-generated content strategies for each tenant.</p>
        </div>
        <div className="flex items-center gap-3">
          <TenantSelector tenants={mockTenants.filter((t) => t.is_active)} selectedTenant={selectedTenant} onSelect={setSelectedTenant} className="w-64" />
          <Button><Play className="h-4 w-4 mr-2" />Generate Strategy</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card">
        <DataTable data={filteredStrategies} columns={columns} keyExtractor={(s) => s.id} onRowClick={setSelectedStrategy} emptyMessage="No strategies found" />
      </div>

      <DetailDrawer isOpen={!!selectedStrategy} onClose={() => setSelectedStrategy(null)} title={selectedStrategy?.title || ""} description={getTenantById(selectedStrategy?.tenant_id || "")?.name} width="lg">
        {selectedStrategy && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <StatusPill status={selectedStrategy.status as "active" | "draft"} />
              <span className="text-sm text-grey-500">Created {formatTimeAgo(selectedStrategy.created_at)}</span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-grey-700 mb-2 flex items-center gap-2"><FileText className="h-4 w-4" />Executive Summary</h3>
              <p className="text-sm text-grey-600 bg-grey-50 rounded-lg p-3">{selectedStrategy.strategy_data.executive_summary}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-grey-700 mb-2 flex items-center gap-2"><Target className="h-4 w-4" />Target Personas</h3>
              <div className="flex flex-wrap gap-2">
                {selectedStrategy.strategy_data.target_personas.map((persona) => <span key={persona} className="text-sm bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg">{persona}</span>)}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-grey-700 mb-3 flex items-center gap-2"><Megaphone className="h-4 w-4" />Content Pillars</h3>
              <div className="space-y-3">
                {selectedStrategy.strategy_data.content_pillars.map((pillar) => (
                  <div key={pillar.name} className="bg-grey-50 rounded-lg p-4">
                    <h4 className="font-medium text-grey-900">{pillar.name}</h4>
                    <p className="text-sm text-grey-600 mt-1">{pillar.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pillar.topics.map((topic) => <span key={topic} className="text-xs bg-white text-grey-600 px-1.5 py-0.5 rounded border border-grey-200">{topic}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-grey-700 mb-2 flex items-center gap-2"><Calendar className="h-4 w-4" />Content Calendar</h3>
              <div className="bg-grey-50 rounded-lg p-3">
                <p className="text-sm text-grey-700">Frequency: <span className="font-medium">{selectedStrategy.strategy_data.content_calendar.frequency}</span></p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedStrategy.strategy_data.content_calendar.themes.map((theme) => <span key={theme} className="text-xs bg-white text-grey-600 px-1.5 py-0.5 rounded border border-grey-200">{theme}</span>)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-grey-700 mb-2">Key Messages</h3>
              <ul className="space-y-1">
                {selectedStrategy.strategy_data.key_messages.map((msg, idx) => <li key={idx} className="text-sm text-grey-600 flex items-start gap-2"><span className="text-royal">•</span>{msg}</li>)}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-grey-700 mb-2">Competitive Positioning</h3>
              <p className="text-sm text-grey-600 italic">"{selectedStrategy.strategy_data.competitive_positioning}"</p>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  )
}
