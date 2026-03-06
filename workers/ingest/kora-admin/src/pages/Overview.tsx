import { FileText, GitBranch, ListTodo, AlertTriangle, Database, RefreshCw, ArrowRight, Clock } from "lucide-react"
import { Link } from "react-router-dom"
import { KPIStatCard } from "@/components/KPIStatCard"
import { StatusPill } from "@/components/StatusPill"
import { cn } from "@/lib/utils"
import { mockAgentHealth, mockActivityFeed, mockGlobalIngestRuns, mockTenantItemQueue, mockKoraEvents } from "@/lib/mock-data"

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

const activityTypeConfig: Record<string, { icon: typeof FileText; color: string }> = {
  ingest: { icon: FileText, color: "bg-blue-100 text-blue-600" },
  routing: { icon: GitBranch, color: "bg-purple-100 text-purple-600" },
  enrichment: { icon: RefreshCw, color: "bg-yellow-100 text-yellow-600" },
  rag_sync: { icon: Database, color: "bg-cyan-100 text-cyan-600" },
  strategy: { icon: FileText, color: "bg-pink-100 text-pink-600" },
  error: { icon: AlertTriangle, color: "bg-red-100 text-red-600" },
}

export function Overview() {
  const latestRun = mockGlobalIngestRuns[0]
  const itemsIngested24h = mockGlobalIngestRuns.filter(r => new Date(r.started_at).getTime() > Date.now() - 24 * 60 * 60 * 1000).reduce((sum, r) => sum + r.items_inserted, 0)
  const itemsRouted24h = mockTenantItemQueue.filter(q => new Date(q.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000).length
  const pendingEvents = mockKoraEvents.filter(e => e.status === "pending").length
  const failedEvents = mockKoraEvents.filter(e => e.status === "failed").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-grey-900">Mission Control</h1>
        <p className="text-grey-500 mt-1">Monitor global ingestion, tenant distribution, and agent health.</p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <KPIStatCard title="Items Ingested (24h)" value={itemsIngested24h} icon={FileText} change={12} />
        <KPIStatCard title="Items Routed (24h)" value={itemsRouted24h} icon={GitBranch} change={8} />
        <KPIStatCard title="Events Pending" value={pendingEvents} icon={ListTodo} />
        <KPIStatCard title="Errors (24h)" value={failedEvents} icon={AlertTriangle} />
        <KPIStatCard title="Last RAG Refresh" value={6} format="number" icon={Database} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-card">
            <div className="p-4 border-b border-grey-100 flex items-center justify-between">
              <h2 className="font-semibold text-grey-900">System Health</h2>
              <Link to="/core/health" className="text-sm text-royal hover:underline flex items-center gap-1">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="divide-y divide-grey-50">
              {mockAgentHealth.map((agent) => (
                <div key={agent.agent_name} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2.5 h-2.5 rounded-full", agent.status === "healthy" && "bg-green-500", agent.status === "warning" && "bg-yellow-500", agent.status === "down" && "bg-red-500")} />
                    <div>
                      <p className="font-medium text-grey-900">{agent.agent_name}</p>
                      <p className="text-xs text-grey-500">Last run: {agent.last_run_at ? formatTimeAgo(agent.last_run_at) : "Never"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-grey-700">{(agent.error_rate_24h * 100).toFixed(1)}%</p>
                      <p className="text-xs text-grey-400">Error rate</p>
                    </div>
                    <StatusPill status={agent.status === "healthy" ? "healthy" : agent.status === "warning" ? "warning" : "down"} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card">
            <div className="p-4 border-b border-grey-100 flex items-center justify-between">
              <h2 className="font-semibold text-grey-900">Latest Ingest Run</h2>
              <Link to="/core/global-ingest" className="text-sm text-royal hover:underline flex items-center gap-1">View all runs <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <StatusPill status={latestRun.status === "completed" ? "completed" : latestRun.status === "running" ? "running" : "failed"} />
                  <span className="text-sm text-grey-500">{formatTimeAgo(latestRun.started_at)}</span>
                </div>
                <span className="text-sm text-grey-500">Duration: {latestRun.duration_ms ? `${(latestRun.duration_ms / 1000).toFixed(1)}s` : "Running..."}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-grey-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-grey-900">{latestRun.sources_count}</p>
                  <p className="text-xs text-grey-500">Sources</p>
                </div>
                <div className="bg-grey-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-grey-900">{latestRun.items_seen}</p>
                  <p className="text-xs text-grey-500">Items Seen</p>
                </div>
                <div className="bg-grey-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-green-600">{latestRun.items_inserted}</p>
                  <p className="text-xs text-grey-500">Inserted</p>
                </div>
                <div className="bg-grey-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-grey-400">{latestRun.items_skipped}</p>
                  <p className="text-xs text-grey-500">Skipped</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card">
          <div className="p-4 border-b border-grey-100 flex items-center justify-between">
            <h2 className="font-semibold text-grey-900">Recent Activity</h2>
            <Link to="/core/events" className="text-sm text-royal hover:underline flex items-center gap-1">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="divide-y divide-grey-50 max-h-[480px] overflow-y-auto">
            {mockActivityFeed.map((activity) => {
              const config = activityTypeConfig[activity.type] || activityTypeConfig.ingest
              const Icon = config.icon
              return (
                <div key={activity.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-grey-900 text-sm">{activity.title}</p>
                      <p className="text-xs text-grey-500 mt-0.5">{activity.description}</p>
                      {activity.tenant_name && <p className="text-xs text-grey-400 mt-1">{activity.tenant_name}</p>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-grey-400 shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
