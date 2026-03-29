import { useState } from "react"
import { 
  Sparkles, CheckCircle2, XCircle, Send, Database, BookOpen, Clock,
  Filter, MoreHorizontal, Eye, ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

type EnrichmentType = "make_smarter" | "telegram_brief" | "strategy_candidate" | "rag_addition" | "review"
type EnrichmentStatus = "pending" | "processing" | "completed" | "rejected"

interface EnrichmentItem {
  id: string
  intelligence_item_id: string
  title: string
  source: string
  tenant: string | null
  enrichment_type: EnrichmentType
  status: EnrichmentStatus
  priority: number
  requested_by: string | null
  created_at: string
  result: {
    action_taken?: "approved" | "rejected" | "sent_to_telegram" | "added_to_rag" | "converted_to_strategy"
    output_id?: string
    notes?: string
  } | null
}

const mockItems: EnrichmentItem[] = []

const enrichmentTypeConfig: Record<EnrichmentType, { label: string; color: string; bg: string; icon: typeof Sparkles }> = {
  make_smarter: { label: "Make Me Smarter", color: "text-purple-400", bg: "bg-purple-400/10", icon: Sparkles },
  telegram_brief: { label: "Telegram Brief", color: "text-blue-400", bg: "bg-blue-400/10", icon: Send },
  strategy_candidate: { label: "Strategy Candidate", color: "text-amber-400", bg: "bg-amber-400/10", icon: BookOpen },
  rag_addition: { label: "RAG Addition", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: Database },
  review: { label: "Review", color: "text-gray-400", bg: "bg-gray-400/10", icon: Eye },
}

const statusConfig: Record<EnrichmentStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-400/10" },
  processing: { label: "Processing", color: "text-blue-400", bg: "bg-blue-400/10" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-400/10" },
}

export default function Enrichment() {
  const [items] = useState<EnrichmentItem[]>(mockItems)
  const [filterType, setFilterType] = useState<EnrichmentType | "all">("all")
  const [filterStatus, setFilterStatus] = useState<EnrichmentStatus | "all">("all")

  const filteredItems = items.filter(item => {
    if (filterType !== "all" && item.enrichment_type !== filterType) return false
    if (filterStatus !== "all" && item.status !== filterStatus) return false
    return true
  })

  const pendingCount = items.filter(i => i.status === "pending").length
  const processingCount = items.filter(i => i.status === "processing").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Enrichment Queue</h1>
          <p className="text-gray-400 text-sm">Approved sources and materials for tenant RAG enhancement</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">{pendingCount} pending</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">{processingCount} processing</span>
          </div>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterType("all")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
            filterType === "all" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
          )}
        >
          All Types
        </button>
        {Object.entries(enrichmentTypeConfig).map(([key, config]) => {
          const Icon = config.icon
          const count = items.filter(i => i.enrichment_type === key).length
          return (
            <button
              key={key}
              onClick={() => setFilterType(key as EnrichmentType)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                filterType === key ? cn(config.bg, config.color) : "bg-gray-800 text-gray-400 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {config.label}
              <span className="text-xs opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Status:</span>
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as EnrichmentStatus | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Status</option>
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const typeConfig = enrichmentTypeConfig[item.enrichment_type]
          const TypeIcon = typeConfig.icon
          const status = statusConfig[item.status]
          
          return (
            <div 
              key={item.id} 
              className="bg-gray-800/50 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
                    <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium">{item.title}</h3>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", status.bg, status.color)}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">Source: {item.source}</span>
                      {item.tenant && (
                        <span className="text-blue-400">Tenant: {item.tenant}</span>
                      )}
                      <span className="text-gray-500">Priority: {item.priority}</span>
                      <span className="text-gray-500">{item.created_at}</span>
                    </div>
                    {item.requested_by && (
                      <p className="text-gray-500 text-xs mt-1">Requested by: {item.requested_by}</p>
                    )}
                    {item.result && (
                      <div className="mt-2 p-2 bg-gray-900/50 rounded-lg">
                        <p className="text-emerald-400 text-sm">
                          Action: {item.result.action_taken?.replace(/_/g, " ")}
                        </p>
                        {item.result.notes && (
                          <p className="text-gray-500 text-xs mt-1">{item.result.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === "pending" && (
                    <>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors">
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  )}
                  <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No enrichment items match your filters</p>
        </div>
      )}
    </div>
  )
}
