import { useState } from "react"
import { Plus, Building2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/DataTable"
import { StatusPill } from "@/components/StatusPill"
import { DetailDrawer } from "@/components/DetailDrawer"
import { mockTenants, getTenantProfile } from "@/lib/mock-data"
import type { Tenant } from "@/lib/types"

function formatTimeAgo(timestamp: string): string {
  const diffMins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

export function Tenants() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)

  const filteredTenants = mockTenants.filter((tenant) => tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) || tenant.industry.toLowerCase().includes(searchQuery.toLowerCase()))

  const columns = [
    { key: "name" as const, header: "Tenant", render: (tenant: Tenant) => <div className="flex items-center gap-3"><div className="w-8 h-8 bg-royal/10 rounded-lg flex items-center justify-center"><Building2 className="h-4 w-4 text-royal" /></div><div><p className="font-medium text-grey-900">{tenant.name}</p><p className="text-xs text-grey-500">{tenant.slug}</p></div></div> },
    { key: "industry" as const, header: "Industry", render: (tenant: Tenant) => <span className="text-grey-600">{tenant.industry}</span> },
    { key: "target_audience" as const, header: "Target Audience", render: (tenant: Tenant) => <span className="text-grey-500 text-sm max-w-xs truncate block">{tenant.target_audience || "—"}</span> },
    { key: "is_active" as const, header: "Status", render: (tenant: Tenant) => <StatusPill status={tenant.is_active ? "active" : "draft"} label={tenant.is_active ? "Active" : "Inactive"} /> },
    { key: "updated_at" as const, header: "Last Updated", render: (tenant: Tenant) => <span className="text-grey-500 text-sm">{formatTimeAgo(tenant.updated_at)}</span> },
  ]

  const selectedProfile = selectedTenant ? getTenantProfile(selectedTenant.id) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-grey-900">Tenants</h1>
          <p className="text-grey-500 mt-1">Manage client tenants and their configurations.</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Tenant</Button>
      </div>

      <div className="bg-white rounded-xl shadow-card">
        <div className="p-4 border-b border-grey-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-400" />
            <Input placeholder="Search tenants..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>
        <DataTable data={filteredTenants} columns={columns} keyExtractor={(t) => t.id} onRowClick={setSelectedTenant} emptyMessage="No tenants found" />
      </div>

      <DetailDrawer isOpen={!!selectedTenant} onClose={() => setSelectedTenant(null)} title={selectedTenant?.name || ""} description={selectedTenant?.industry}>
        {selectedTenant && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <StatusPill status={selectedTenant.is_active ? "active" : "draft"} label={selectedTenant.is_active ? "Active" : "Inactive"} />
              <span className="text-sm text-grey-500">ID: {selectedTenant.id}</span>
            </div>
            <div><p className="text-xs text-grey-500 uppercase tracking-wider mb-1">Target Audience</p><p className="text-grey-900">{selectedTenant.target_audience || "Not specified"}</p></div>
            {selectedProfile ? (
              <>
                <div><p className="text-xs text-grey-500 uppercase tracking-wider mb-1">Description</p><p className="text-sm text-grey-700">{selectedProfile.company_description}</p></div>
                <div><p className="text-xs text-grey-500 uppercase tracking-wider mb-1">Keywords</p><div className="flex flex-wrap gap-1">{selectedProfile.keywords.map((kw) => <span key={kw} className="text-xs bg-grey-100 text-grey-600 px-1.5 py-0.5 rounded">{kw}</span>)}</div></div>
                <div><p className="text-xs text-grey-500 uppercase tracking-wider mb-1">Competitors</p><div className="flex flex-wrap gap-1">{selectedProfile.competitors.map((comp) => <span key={comp} className="text-xs bg-orange/10 text-orange px-1.5 py-0.5 rounded">{comp}</span>)}</div></div>
                <div><p className="text-xs text-grey-500 uppercase tracking-wider mb-1">Content Preferences</p><div className="bg-grey-50 rounded-lg p-3 text-sm"><p><span className="text-grey-500">Tone:</span> {selectedProfile.content_preferences.tone}</p><p><span className="text-grey-500">Formats:</span> {selectedProfile.content_preferences.formats.join(", ")}</p><p><span className="text-grey-500">Frequency:</span> {selectedProfile.content_preferences.frequency}</p></div></div>
              </>
            ) : <p className="text-sm text-grey-500 italic">No profile configured for this tenant.</p>}
            <div className="text-xs text-grey-400"><p>Created: {new Date(selectedTenant.created_at).toLocaleDateString()}</p><p>Updated: {new Date(selectedTenant.updated_at).toLocaleDateString()}</p></div>
          </div>
        )}
      </DetailDrawer>
    </div>
  )
}
