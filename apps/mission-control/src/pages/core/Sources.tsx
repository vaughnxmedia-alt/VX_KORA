import { useState, useMemo } from "react"
import { 
  Rss, Youtube, Globe, Search, MessageSquare, Plus, Filter, MoreHorizontal,
  CheckCircle2, XCircle, Clock, ExternalLink, RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ClientDropdown } from "@/components/ClientDropdown"
import { useClients } from "@/hooks/useClients"

type SourceType = "rss" | "youtube" | "social" | "web" | "search"
type SourceStatus = "active" | "inactive" | "error" | "pending_approval"
type ApprovalStatus = "pending" | "approved" | "rejected" | "archived"

interface Source {
  id: string
  name: string
  source_type: SourceType
  url: string
  tenant: string | null
  status: SourceStatus
  is_active: boolean
  approval_status: ApprovalStatus
  last_checked: string | null
  relevance_score: number | null
  filter_profile_name: string | null
  items_count: number
  error_rate: number
}

const mockSources: Source[] = []

const sourceTypeIcons: Record<SourceType, typeof Rss> = {
  rss: Rss,
  youtube: Youtube,
  social: MessageSquare,
  web: Globe,
  search: Search,
}

const statusConfig = {
  active: { color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Active" },
  inactive: { color: "text-gray-400", bg: "bg-gray-400/10", label: "Inactive" },
  error: { color: "text-red-400", bg: "bg-red-400/10", label: "Error" },
  pending_approval: { color: "text-amber-400", bg: "bg-amber-400/10", label: "Pending" },
}

const approvalConfig = {
  pending: { color: "text-amber-400", icon: Clock },
  approved: { color: "text-emerald-400", icon: CheckCircle2 },
  rejected: { color: "text-red-400", icon: XCircle },
  archived: { color: "text-gray-400", icon: Clock },
}

export default function Sources() {
  const [sources] = useState<Source[]>(mockSources)
  const [filterType, setFilterType] = useState<SourceType | "all">("all")
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | "all">("all")
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const { clients, getDisplayName } = useClients()

  const filteredSources = useMemo(() => {
    return sources.filter(s => {
      if (filterType !== "all" && s.source_type !== filterType) return false
      if (filterStatus !== "all" && s.approval_status !== filterStatus) return false
      
      if (selectedClientId) {
        const selectedClient = clients.find(c => c.id === selectedClientId)
        const clientName = selectedClient ? getDisplayName(selectedClient) : null
        if (clientName && s.tenant !== clientName) return false
      }
      
      return true
    })
  }, [sources, filterType, filterStatus, selectedClientId, clients, getDisplayName])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sources</h1>
          <p className="text-gray-400 text-sm">Manage intelligence sources across all tenants</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Add Source
        </button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <ClientDropdown
          selectedClientId={selectedClientId}
          onClientChange={setSelectedClientId}
          allOptionLabel="All Clients"
        />
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filter:</span>
        </div>
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as SourceType | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Types</option>
          <option value="rss">RSS</option>
          <option value="youtube">YouTube</option>
          <option value="social">Social</option>
          <option value="web">Web</option>
          <option value="search">Search</option>
        </select>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ApprovalStatus | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </select>
        <span className="text-sm text-gray-500">{filteredSources.length} sources</span>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Source</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tenant</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Approval</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Last Checked</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Relevance</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredSources.map((source) => {
              const TypeIcon = sourceTypeIcons[source.source_type]
              const status = statusConfig[source.status]
              const approval = approvalConfig[source.approval_status]
              const ApprovalIcon = approval.icon
              
              return (
                <tr key={source.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-gray-700 rounded">
                        <TypeIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{source.name}</p>
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-gray-500 text-xs hover:text-blue-400 flex items-center gap-1">
                          {source.url.substring(0, 40)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-300 capitalize">{source.source_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-300">{source.tenant}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <ApprovalIcon className={cn("h-4 w-4", approval.color)} />
                      <span className={cn("text-sm capitalize", approval.color)}>{source.approval_status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400">{source.last_checked || "Never"}</span>
                  </td>
                  <td className="px-4 py-3">
                    {source.relevance_score !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              source.relevance_score >= 0.8 ? "bg-emerald-500" :
                              source.relevance_score >= 0.6 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${source.relevance_score * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{(source.relevance_score * 100).toFixed(0)}%</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
