import { useState } from "react"
import { 
  History, CheckCircle2, XCircle, Archive, RotateCcw, Filter as FilterIcon,
  User, Building2, FileText, Rss, Sparkles, Layers
} from "lucide-react"
import { cn } from "@/lib/utils"

type TargetType = "source" | "intelligence" | "strategy" | "campaign" | "enrichment"
type Action = "approved" | "rejected" | "archived" | "restored"

interface ApprovalEntry {
  id: string
  tenant: string
  user: string
  targetType: TargetType
  targetId: string
  targetTitle: string
  action: Action
  reason: string | null
  createdAt: string
}

const mockHistory: ApprovalEntry[] = []

const actionConfig: Record<Action, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  approved: { label: "Approved", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-400/10", icon: XCircle },
  archived: { label: "Archived", color: "text-gray-400", bg: "bg-gray-400/10", icon: Archive },
  restored: { label: "Restored", color: "text-blue-400", bg: "bg-blue-400/10", icon: RotateCcw },
}

const targetTypeConfig: Record<TargetType, { label: string; icon: typeof FileText }> = {
  source: { label: "Source", icon: Rss },
  intelligence: { label: "Intelligence", icon: FileText },
  strategy: { label: "Strategy", icon: Sparkles },
  campaign: { label: "Campaign", icon: Layers },
  enrichment: { label: "Enrichment", icon: Sparkles },
}

export default function ApprovalHistory() {
  const [history] = useState<ApprovalEntry[]>(mockHistory)
  const [filterAction, setFilterAction] = useState<Action | "all">("all")
  const [filterType, setFilterType] = useState<TargetType | "all">("all")
  const [filterTenant, setFilterTenant] = useState<string>("all")

  const tenants = [...new Set(history.map(h => h.tenant))]

  const filteredHistory = history.filter(h => {
    if (filterAction !== "all" && h.action !== filterAction) return false
    if (filterType !== "all" && h.targetType !== filterType) return false
    if (filterTenant !== "all" && h.tenant !== filterTenant) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Approval History</h1>
        <p className="text-gray-400 text-sm">Track all approval and rejection actions across tenants</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Actions</p>
          <p className="text-2xl font-bold text-white">{history.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Approved</p>
          <p className="text-2xl font-bold text-emerald-400">{history.filter(h => h.action === "approved").length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-400">{history.filter(h => h.action === "rejected").length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Archived</p>
          <p className="text-2xl font-bold text-gray-400">{history.filter(h => h.action === "archived").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filter:</span>
        </div>
        <select 
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Tenants</option>
          {tenants.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select 
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value as Action | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Actions</option>
          {Object.entries(actionConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as TargetType | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Types</option>
          {Object.entries(targetTypeConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {filteredHistory.map((entry) => {
          const action = actionConfig[entry.action]
          const targetType = targetTypeConfig[entry.targetType]
          const ActionIcon = action.icon
          const TypeIcon = targetType.icon
          
          return (
            <div key={entry.id} className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg", action.bg)}>
                    <ActionIcon className={cn("h-5 w-5", action.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", action.bg, action.color)}>
                        {action.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 flex items-center gap-1">
                        <TypeIcon className="h-3 w-3" />
                        {targetType.label}
                      </span>
                    </div>
                    <h3 className="text-white font-medium mb-1">{entry.targetTitle}</h3>
                    {entry.reason && (
                      <p className="text-gray-500 text-sm">Reason: {entry.reason}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.user}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {entry.tenant}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-gray-500 text-sm">{entry.createdAt}</span>
              </div>
            </div>
          )
        })}
      </div>

      {filteredHistory.length === 0 && (
        <div className="text-center py-12">
          <History className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No approval history matches your filters</p>
        </div>
      )}
    </div>
  )
}
