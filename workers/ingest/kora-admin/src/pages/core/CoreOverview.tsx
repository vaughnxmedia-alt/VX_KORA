import { Link } from "react-router-dom"
import { Rss, PlayCircle, FileText, GitBranch, ListTodo, Sparkles, Database, Activity, ArrowRight, Brain } from "lucide-react"
import { mockAgentHealth, mockGlobalIngestRuns, mockTenantItemQueue, mockKoraEvents, mockGlobalRssItems } from "@/lib/mock-data"
import { StatusPill } from "@/components/StatusPill"
import { cn } from "@/lib/utils"

function formatTimeAgo(timestamp: string): string {
  const diffMins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

const sections = [
  { to: "/core/sources", label: "Sources", description: "Manage RSS feed sources", icon: Rss, stat: "5 active" },
  { to: "/core/global-ingest", label: "Global Ingest Runs", description: "Monitor ingestion runs", icon: PlayCircle, stat: `${mockGlobalIngestRuns.length} runs` },
  { to: "/core/global-items", label: "Global Items", description: "Browse all ingested items", icon: FileText, stat: `${mockGlobalRssItems.length} items` },
  { to: "/core/tenant-routing", label: "Tenant Routing", description: "Route items to tenants", icon: GitBranch, stat: `${mockTenantItemQueue.length} queued` },
  { to: "/core/events", label: "Events Queue", description: "Process event queue", icon: ListTodo, stat: `${mockKoraEvents.filter((e) => e.status === "pending").length} pending` },
  { to: "/core/enrichment", label: "Enrichment", description: "Content enrichment status", icon: Sparkles, stat: "Active" },
  { to: "/core/rag-updates", label: "RAG Updates", description: "Knowledge base sync", icon: Database, stat: "Synced" },
  { to: "/core/health", label: "Health and Logs", description: "System health monitoring", icon: Activity, stat: "All healthy" },
]

export function CoreOverview() {
  const coreAgents = mockAgentHealth.filter((a) => ["Ingest Agent", "Distributor", "Enrichment Agent", "RAG Builder"].includes(a.agent_name))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-royal/10 rounded-xl flex items-center justify-center">
          <Brain className="h-6 w-6 text-royal" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-grey-900">Core Intelligence Agent</h1>
          <p className="text-grey-500">Global data ingestion, tenant distribution, enrichment, and RAG management.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <h2 className="font-semibold text-grey-900 mb-4">Agent Health</h2>
        <div className="grid grid-cols-4 gap-4">
          {coreAgents.map((agent) => (
            <div key={agent.agent_name} className="bg-grey-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-grey-900 text-sm">{agent.agent_name}</span>
                <StatusPill status={agent.status} />
              </div>
              <div className="text-xs text-grey-500">
                <p>Last run: {agent.last_run_at ? formatTimeAgo(agent.last_run_at) : "Never"}</p>
                <p>Error rate: {(agent.error_rate_24h * 100).toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.to} to={section.to} className="bg-white rounded-xl shadow-card p-5 hover:shadow-card-hover transition-shadow group">
              <div className="flex items-start justify-between">
                <div className={cn("p-2.5 rounded-lg bg-grey-50 group-hover:bg-royal/10 transition-colors")}>
                  <Icon className="h-5 w-5 text-grey-500 group-hover:text-royal transition-colors" />
                </div>
                <ArrowRight className="h-4 w-4 text-grey-300 group-hover:text-royal transition-colors" />
              </div>
              <h3 className="font-semibold text-grey-900 mt-3">{section.label}</h3>
              <p className="text-sm text-grey-500 mt-1">{section.description}</p>
              <p className="text-sm font-medium text-royal mt-2">{section.stat}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
