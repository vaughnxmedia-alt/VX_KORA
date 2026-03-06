import { Link } from "react-router-dom"
import { 
  Rss, PlayCircle, FileText, GitBranch, ListTodo, Sparkles, Database, Activity, 
  ArrowRight, Brain, Calendar, Clock, Users, Building2, RefreshCw, Loader2,
  CheckCircle2, AlertCircle
} from "lucide-react"
import { mockAgentHealth, mockGlobalIngestRuns, mockTenantItemQueue, mockKoraEvents, mockGlobalRssItems } from "@/lib/mock-data"
import { useCoreIntelligenceStore } from "@/state/coreIntelligenceStore"
import { StatusPill } from "@/components/StatusPill"
import { cn } from "@/lib/utils"

function formatTimeAgo(timestamp: string): string {
  const diffMins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return `${Math.floor(diffMins / 1440)}d ago`
}

function formatTimeUntil(timestamp: string): string {
  const diffMins = Math.floor((new Date(timestamp).getTime() - Date.now()) / 60000)
  if (diffMins < 1) return "Now"
  if (diffMins < 60) return `in ${diffMins}m`
  if (diffMins < 1440) return `in ${Math.floor(diffMins / 60)}h`
  return `in ${Math.floor(diffMins / 1440)}d`
}

const sections = [
  { to: "/core/sources", label: "Sources", description: "Manage RSS feed sources", icon: Rss, stat: "10 active" },
  { to: "/core/global-ingest", label: "Global Ingest Runs", description: "Monitor ingestion runs", icon: PlayCircle, stat: `${mockGlobalIngestRuns.length} runs` },
  { to: "/core/global-items", label: "Global Items", description: "Browse all ingested items", icon: FileText, stat: `${mockGlobalRssItems.length} items` },
  { to: "/core/tenant-routing", label: "Tenant Routing", description: "Route items to tenants", icon: GitBranch, stat: `${mockTenantItemQueue.length} queued` },
  { to: "/core/events", label: "Events Queue", description: "Process event queue", icon: ListTodo, stat: `${mockKoraEvents.filter((e) => e.status === "pending").length} pending` },
  { to: "/core/enrichment", label: "Enrichment", description: "Content enrichment status", icon: Sparkles, stat: "Active" },
  { to: "/core/rag-updates", label: "RAG Agents", description: "Industry knowledge bases", icon: Database, stat: "1 active" },
  { to: "/core/health", label: "Health and Logs", description: "System health monitoring", icon: Activity, stat: "All healthy" },
]

export function CoreOverview() {
  const { ragAgents, schedules, triggerSync } = useCoreIntelligenceStore()
  const coreAgents = mockAgentHealth.filter((a) => ["Ingest Agent", "Distributor", "Enrichment Agent", "RAG Builder"].includes(a.agent_name))

  const dailySchedules = schedules.filter((s) => s.frequency === "daily")
  const weeklySchedules = schedules.filter((s) => s.frequency === "weekly")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-royal/20 rounded-xl flex items-center justify-center">
          <Brain className="h-6 w-6 text-royal" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Core Intelligence</h1>
          <p className="text-grey-500">Data ingestion, industry RAG agents, and knowledge base management.</p>
        </div>
      </div>

      <div className="bg-grey-900/50 border border-grey-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Ingest Schedule</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan" />
              <span className="text-grey-400">Daily (JahKnowsPR)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple" />
              <span className="text-grey-400">Weekly (Clients)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-cyan/5 border border-cyan/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-cyan" />
              <span className="text-sm font-medium text-cyan">Daily Ingestion</span>
            </div>
            {dailySchedules.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between py-2 border-t border-cyan/10">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-grey-500" />
                  <span className="text-sm text-white">{schedule.clientName}</span>
                  <span className="text-xs px-2 py-0.5 bg-cyan/20 text-cyan rounded-full">Internal</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-grey-500">
                    Last: {schedule.lastRunAt ? formatTimeAgo(schedule.lastRunAt) : "Never"}
                  </span>
                  <span className="text-cyan">
                    Next: {formatTimeUntil(schedule.nextRunAt)}
                  </span>
                  {schedule.status === "completed" && (
                    <span className="flex items-center gap-1 text-green">
                      <CheckCircle2 className="h-3 w-3" />
                      {schedule.itemsIngested} items
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-purple/5 border border-purple/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-purple" />
              <span className="text-sm font-medium text-purple">Weekly Ingestion</span>
              <span className="text-xs text-grey-500 ml-auto">{weeklySchedules.length} clients</span>
            </div>
            <div className="space-y-0">
              {weeklySchedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between py-2 border-t border-purple/10">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-grey-500" />
                    <span className="text-sm text-white">{schedule.clientName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-grey-500">
                      Last: {schedule.lastRunAt ? formatTimeAgo(schedule.lastRunAt) : "Never"}
                    </span>
                    <span className="text-purple">
                      Next: {formatTimeUntil(schedule.nextRunAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-grey-900/50 border border-grey-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">Industry RAG Agents</h2>
            <p className="text-xs text-grey-500 mt-1">
              Knowledge bases that strengthen industry expertise. New industries are added when clients from new sectors join.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {ragAgents.map((agent) => (
            <div 
              key={agent.id} 
              className={cn(
                "rounded-xl border p-4",
                agent.status === "active" 
                  ? "bg-green/5 border-green/20" 
                  : "bg-yellow/5 border-yellow/20"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    agent.status === "active" ? "bg-green/20" : "bg-yellow/20"
                  )}>
                    <Database className={cn(
                      "h-5 w-5",
                      agent.status === "active" ? "text-green" : "text-yellow"
                    )} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{agent.displayName}</h3>
                    <p className="text-xs text-grey-500">{agent.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    agent.status === "active" 
                      ? "bg-green/20 text-green" 
                      : "bg-yellow/20 text-yellow"
                  )}>
                    {agent.status === "building" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {agent.status === "active" ? "Active" : "Building"}
                  </div>
                  <button
                    onClick={() => triggerSync(agent.id)}
                    disabled={agent.status === "building"}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      agent.status === "building"
                        ? "text-grey-600 cursor-not-allowed"
                        : "text-grey-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <RefreshCw className={cn("h-4 w-4", agent.status === "building" && "animate-spin")} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4 mt-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-xs text-grey-500">Sources</p>
                  <p className="text-lg font-bold text-white">{agent.sourcesCount}</p>
                </div>
                <div>
                  <p className="text-xs text-grey-500">Documents</p>
                  <p className="text-lg font-bold text-white">{agent.documentsCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-grey-500">Embeddings</p>
                  <p className="text-lg font-bold text-white">{(agent.embeddingsCount / 1000).toFixed(0)}k</p>
                </div>
                <div>
                  <p className="text-xs text-grey-500">Sync Frequency</p>
                  <p className="text-sm font-medium text-white capitalize">{agent.syncFrequency}</p>
                </div>
                <div>
                  <p className="text-xs text-grey-500">Clients</p>
                  <p className="text-lg font-bold text-white">{agent.clients.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-grey-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last sync: {agent.lastSyncAt ? formatTimeAgo(agent.lastSyncAt) : "Never"}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Next sync: {agent.nextSyncAt ? formatTimeUntil(agent.nextSyncAt) : "Not scheduled"}
                </span>
              </div>
            </div>
          ))}

          <div className="border border-dashed border-grey-700 rounded-xl p-6 text-center">
            <AlertCircle className="h-8 w-8 text-grey-600 mx-auto mb-2" />
            <p className="text-sm text-grey-500">
              New industry RAG agents are automatically created when clients from new industries are onboarded.
            </p>
            <p className="text-xs text-grey-600 mt-1">
              Currently supporting: Marketing & PR
            </p>
          </div>
        </div>
      </div>

      <div className="bg-grey-900/50 border border-grey-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">System Health</h2>
        <div className="grid grid-cols-4 gap-4">
          {coreAgents.map((agent) => (
            <div key={agent.agent_name} className="bg-grey-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white text-sm">{agent.agent_name}</span>
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
            <Link key={section.to} to={section.to} className="bg-grey-900/50 border border-grey-800 rounded-xl p-5 hover:bg-grey-900/80 hover:border-grey-700 transition-all group">
              <div className="flex items-start justify-between">
                <div className={cn("p-2.5 rounded-lg bg-grey-800 group-hover:bg-royal/20 transition-colors")}>
                  <Icon className="h-5 w-5 text-grey-400 group-hover:text-royal transition-colors" />
                </div>
                <ArrowRight className="h-4 w-4 text-grey-600 group-hover:text-royal transition-colors" />
              </div>
              <h3 className="font-semibold text-white mt-3">{section.label}</h3>
              <p className="text-sm text-grey-500 mt-1">{section.description}</p>
              <p className="text-sm font-medium text-royal mt-2">{section.stat}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
