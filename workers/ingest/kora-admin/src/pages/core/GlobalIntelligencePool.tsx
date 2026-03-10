import { useState } from "react"
import { 
  Database, CheckCircle2, XCircle, Archive, Sparkles, GitBranch, ExternalLink,
  Filter, Search, MoreHorizontal, Eye, Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

type IntelligenceStatus = "discovered" | "processing" | "ready" | "routed" | "archived" | "rejected"
type ContentType = "article" | "video" | "podcast" | "social_post" | "event" | "report" | "thread"
type ParserStatus = "pending" | "parsed" | "enriched" | "failed"

interface IntelligenceItem {
  id: string
  title: string
  source_name: string
  source_type: string
  content_type: ContentType
  url: string
  extracted_summary: string | null
  language: string
  status: IntelligenceStatus
  parser_status: ParserStatus
  tenant_matches: { tenant_id: string; tenant_name: string; score: number }[]
  relevance_score: number
  discovered_at: string
  is_event: boolean
}

const mockItems: IntelligenceItem[] = [
  {
    id: "1", title: "How TikTok Changed Creator Marketing Forever", source_name: "AdAge", source_type: "rss",
    content_type: "article", url: "https://adage.com/article/123", extracted_summary: "A deep dive into how TikTok's algorithm has fundamentally shifted the creator economy and brand partnerships...",
    language: "en", status: "ready", parser_status: "enriched",
    tenant_matches: [{ tenant_id: "1", tenant_name: "JahKnowsPR", score: 0.94 }],
    relevance_score: 0.94, discovered_at: "2 hours ago", is_event: false
  },
  {
    id: "2", title: "Brand Crisis Management in the Age of Cancel Culture", source_name: "PR Week", source_type: "rss",
    content_type: "article", url: "https://prweek.com/article/456", extracted_summary: "Experts weigh in on how brands should navigate the increasingly treacherous waters of social media backlash...",
    language: "en", status: "ready", parser_status: "enriched",
    tenant_matches: [{ tenant_id: "1", tenant_name: "JahKnowsPR", score: 0.91 }, { tenant_id: "2", tenant_name: "Acme Corp", score: 0.72 }],
    relevance_score: 0.91, discovered_at: "3 hours ago", is_event: false
  },
  {
    id: "3", title: "Gary Vee on Building Personal Brands in 2024", source_name: "Gary Vee", source_type: "youtube",
    content_type: "video", url: "https://youtube.com/watch?v=abc123", extracted_summary: "Gary discusses the evolving landscape of personal branding and why authenticity matters more than ever...",
    language: "en", status: "processing", parser_status: "parsed",
    tenant_matches: [{ tenant_id: "1", tenant_name: "JahKnowsPR", score: 0.88 }],
    relevance_score: 0.88, discovered_at: "1 hour ago", is_event: false
  },
  {
    id: "4", title: "Social Media Marketing Summit 2024", source_name: "Eventbrite", source_type: "web",
    content_type: "event", url: "https://eventbrite.com/e/789", extracted_summary: "Join industry leaders for a 3-day conference on the future of social media marketing...",
    language: "en", status: "discovered", parser_status: "pending",
    tenant_matches: [],
    relevance_score: 0.75, discovered_at: "30 mins ago", is_event: true
  },
  {
    id: "5", title: "Instagram Algorithm Update Affects Reach", source_name: "Social Media Today", source_type: "rss",
    content_type: "article", url: "https://socialmediatoday.com/article/999", extracted_summary: "Instagram's latest algorithm change is causing significant drops in organic reach for business accounts...",
    language: "en", status: "routed", parser_status: "enriched",
    tenant_matches: [{ tenant_id: "1", tenant_name: "JahKnowsPR", score: 0.89 }],
    relevance_score: 0.89, discovered_at: "5 hours ago", is_event: false
  },
]

const statusConfig = {
  discovered: { color: "text-gray-400", bg: "bg-gray-400/10", label: "Discovered" },
  processing: { color: "text-blue-400", bg: "bg-blue-400/10", label: "Processing" },
  ready: { color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Ready" },
  routed: { color: "text-purple-400", bg: "bg-purple-400/10", label: "Routed" },
  archived: { color: "text-gray-500", bg: "bg-gray-500/10", label: "Archived" },
  rejected: { color: "text-red-400", bg: "bg-red-400/10", label: "Rejected" },
}

const contentTypeLabels: Record<ContentType, string> = {
  article: "Article",
  video: "Video",
  podcast: "Podcast",
  social_post: "Social Post",
  event: "Event",
  report: "Report",
  thread: "Thread",
}

export default function GlobalIntelligencePool() {
  const [items] = useState<IntelligenceItem[]>(mockItems)
  const [filterStatus, setFilterStatus] = useState<IntelligenceStatus | "all">("all")
  const [filterType, setFilterType] = useState<ContentType | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const filteredItems = items.filter(item => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false
    if (filterType !== "all" && item.content_type !== filterType) return false
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.id)))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Global Intelligence Pool</h1>
          <p className="text-gray-400 text-sm">Newly discovered items before routing and enrichment</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors">
                <CheckCircle2 className="h-4 w-4" />
                Approve ({selectedItems.size})
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
                <XCircle className="h-4 w-4" />
                Reject
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
                <Archive className="h-4 w-4" />
                Archive
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                <Sparkles className="h-4 w-4" />
                Enrich
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                <GitBranch className="h-4 w-4" />
                Route
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = items.filter(i => i.status === key).length
          return (
            <div key={key} className={cn("rounded-lg p-3 border border-white/5", config.bg)}>
              <p className={cn("text-2xl font-bold", config.color)}>{count}</p>
              <p className="text-gray-400 text-xs">{config.label}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as IntelligenceStatus | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="all">All Status</option>
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ContentType | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="all">All Types</option>
          {Object.entries(contentTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Items Table */}
      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                  onChange={selectAll}
                  className="rounded border-gray-600"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Source</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tenant Matches</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Relevance</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredItems.map((item) => {
              const status = statusConfig[item.status]
              
              return (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-gray-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-md">
                      <p className="text-white text-sm font-medium truncate">{item.title}</p>
                      {item.extracted_summary && (
                        <p className="text-gray-500 text-xs truncate mt-0.5">{item.extracted_summary}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.discovered_at}
                        </span>
                        {item.is_event && (
                          <span className="text-amber-400 text-xs font-medium">Event</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-gray-300 text-sm">{item.source_name}</p>
                      <p className="text-gray-500 text-xs capitalize">{item.source_type}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-300">{contentTypeLabels[item.content_type]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.tenant_matches.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.tenant_matches.map((match) => (
                          <span key={match.tenant_id} className="text-xs px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400">
                            {match.tenant_name} ({(match.score * 100).toFixed(0)}%)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            item.relevance_score >= 0.8 ? "bg-emerald-500" :
                            item.relevance_score >= 0.6 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${item.relevance_score * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{(item.relevance_score * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <Eye className="h-4 w-4" />
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
