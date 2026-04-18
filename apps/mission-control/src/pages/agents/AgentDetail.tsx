import { useState } from "react"
import { Link } from "react-router-dom"
import { 
  Search, Cpu, PenTool, Layers, Send, BookOpen, MessageSquareText,
  PlayCircle, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw,
  Activity, ListTodo, FileText, BarChart3, TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AGENT_DELIVERABLES } from "@/lib/agentCatalog"

interface AgentDetailProps {
  agentId: string
}

type AgentStatus = "healthy" | "warning" | "error" | "idle"
type RunStatus = "pending" | "running" | "completed" | "failed"

interface AgentInfo {
  id: string
  name: string
  description: string
  icon: typeof Search
  status: AgentStatus
  lastRun: string
  nextRun: string | null
  successRate: number
  avgDuration: string
  totalRuns24h: number
  itemsProcessed24h: number
}

interface AgentRun {
  id: string
  status: RunStatus
  startedAt: string
  duration: string | null
  itemsProcessed: number
  errors: number
  trigger: string
}

interface QueueItem {
  id: string
  title: string
  priority: number
  scheduledFor: string | null
  status: "pending" | "processing"
  createdAt: string
}

interface LogEntry {
  id: string
  level: "info" | "warn" | "error" | "debug"
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}

const agentConfig: Record<string, Omit<AgentInfo, "status" | "lastRun" | "nextRun" | "successRate" | "avgDuration" | "totalRuns24h" | "itemsProcessed24h">> = {
  "intake-clarifier": {
    id: "intake-clarifier",
    name: "Intake Clarifier",
    description: "Processes user intake submissions, structures profiles, and handles clarifying questions for onboarding.",
    icon: MessageSquareText,
  },
  "source-discovery": {
    id: "source-discovery",
    name: "Source Discovery",
    description: "Collects source candidates from RSS feeds, YouTube channels, social media pages, public search, and web links based on tenant strategy inputs.",
    icon: Search,
  },
  "source-processing": {
    id: "source-processing",
    name: "Source Processing",
    description: "Scrapes content, transcribes media, translates text, normalizes data, parses content, and sends to LLMs for structured extraction.",
    icon: Cpu,
  },
  "content-strategy": {
    id: "content-strategy",
    name: "Content Strategy",
    description: "Transforms approved intelligence into content strategy objects, generates strategy suggestions, and prepares Telegram briefings.",
    icon: PenTool,
  },
  "campaign-assembly": {
    id: "campaign-assembly",
    name: "Campaign Assembly",
    description: "Converts approved content strategies into campaign strategy options and attaches them to the campaign flow in the main site.",
    icon: Layers,
  },
  "telegram-delivery": {
    id: "telegram-delivery",
    name: "Telegram Delivery",
    description: "Sends daily or weekly briefings to users via Telegram, including insight articles, strategy suggestions, and event alerts.",
    icon: Send,
  },
  "rag-intelligence": {
    id: "rag-intelligence",
    name: "RAG Intelligence",
    description: "Maintains tenant-specific RAG databases, embeds approved content, exposes intelligence history, and tracks usage metrics.",
    icon: BookOpen,
  },
}

const mockAgentData: Record<string, Partial<AgentInfo>> = {}

const mockRuns: AgentRun[] = []

const mockQueue: QueueItem[] = []

const mockLogs: LogEntry[] = []

const statusConfig = {
  healthy: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  warning: { color: "text-amber-400", bg: "bg-amber-400/10", icon: AlertCircle },
  error: { color: "text-red-400", bg: "bg-red-400/10", icon: XCircle },
  idle: { color: "text-gray-400", bg: "bg-gray-400/10", icon: Clock },
}

const runStatusConfig = {
  pending: { color: "text-gray-400", bg: "bg-gray-400/10" },
  running: { color: "text-blue-400", bg: "bg-blue-400/10" },
  completed: { color: "text-emerald-400", bg: "bg-emerald-400/10" },
  failed: { color: "text-red-400", bg: "bg-red-400/10" },
}

const logLevelConfig = {
  info: { color: "text-blue-400", bg: "bg-blue-400/10" },
  warn: { color: "text-amber-400", bg: "bg-amber-400/10" },
  error: { color: "text-red-400", bg: "bg-red-400/10" },
  debug: { color: "text-gray-400", bg: "bg-gray-400/10" },
}

export default function AgentDetail({ agentId }: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "runs" | "queue" | "logs">("overview")
  
  const config = agentConfig[agentId]
  const data = mockAgentData[agentId]
  
  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Agent not found: {agentId}</p>
      </div>
    )
  }

  const agent: AgentInfo = {
    ...config,
    status: data?.status || "idle",
    lastRun: data?.lastRun || "Never",
    nextRun: data?.nextRun || null,
    successRate: data?.successRate || 0,
    avgDuration: data?.avgDuration || "-",
    totalRuns24h: data?.totalRuns24h || 0,
    itemsProcessed24h: data?.itemsProcessed24h || 0,
  }

  const Icon = agent.icon
  const status = statusConfig[agent.status]
  const StatusIcon = status.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600/20 rounded-xl">
            <Icon className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
              <div className="flex items-center gap-1.5">
                <StatusIcon className={cn("h-4 w-4", status.color)} />
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}>
                  {agent.status}
                </span>
              </div>
            </div>
            <p className="text-gray-400 text-sm max-w-2xl">{agent.description}</p>
            {AGENT_DELIVERABLES[agentId] && (
              <div className="mt-4 max-w-2xl">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Required outcomes
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                  {AGENT_DELIVERABLES[agentId].map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {agentId === "rag-intelligence" && (
                  <p className="mt-3 text-sm">
                    <Link
                      to="/core/tenant-rag"
                      className="text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Open Tenant RAG (per-customer documents)
                    </Link>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <PlayCircle className="h-4 w-4" />
            Run Now
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Clock className="h-4 w-4" />
            <span>Last Run</span>
          </div>
          <p className="text-white font-semibold">{agent.lastRun}</p>
          {agent.nextRun && (
            <p className="text-gray-500 text-xs mt-1">Next: {agent.nextRun}</p>
          )}
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <BarChart3 className="h-4 w-4" />
            <span>Success Rate</span>
          </div>
          <p className={cn(
            "font-semibold text-lg",
            agent.successRate >= 0.95 ? "text-emerald-400" :
            agent.successRate >= 0.9 ? "text-amber-400" : "text-red-400"
          )}>
            {(agent.successRate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Activity className="h-4 w-4" />
            <span>Avg Duration</span>
          </div>
          <p className="text-white font-semibold">{agent.avgDuration}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>Runs (24h)</span>
          </div>
          <p className="text-white font-semibold">{agent.totalRuns24h}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <FileText className="h-4 w-4" />
            <span>Items (24h)</span>
          </div>
          <p className="text-white font-semibold">{agent.itemsProcessed24h}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="flex gap-6">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "runs", label: "Runs", icon: PlayCircle },
            { id: "queue", label: "Queue", icon: ListTodo },
            { id: "logs", label: "Logs", icon: FileText },
          ].map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "text-blue-400 border-blue-400"
                    : "text-gray-400 border-transparent hover:text-white"
                )}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Recent Runs</h3>
            <div className="space-y-2">
              {mockRuns.slice(0, 3).map((run) => {
                const runStatus = runStatusConfig[run.status]
                return (
                  <div key={run.id} className="bg-gray-800/50 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", runStatus.bg, runStatus.color)}>
                        {run.status}
                      </span>
                      <span className="text-gray-500 text-xs">{run.startedAt}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{run.itemsProcessed} items</span>
                      <span className="text-gray-500">{run.duration}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Queue Status</h3>
            {mockQueue.length > 0 ? (
              <div className="space-y-2">
                {mockQueue.map((item) => (
                  <div key={item.id} className="bg-gray-800/50 rounded-lg p-3 border border-white/5">
                    <p className="text-white text-sm mb-1">{item.title}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={item.status === "processing" ? "text-blue-400" : "text-gray-500"}>
                        {item.status === "processing" ? "Processing..." : "Pending"}
                      </span>
                      <span className="text-gray-500">Priority: {item.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Queue is empty</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "runs" && (
        <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Run ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Started</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Items</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Errors</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mockRuns.map((run) => {
                const runStatus = runStatusConfig[run.status]
                return (
                  <tr key={run.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-white text-sm font-mono">{run.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", runStatus.bg, runStatus.color)}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300 text-sm">{run.startedAt}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300 text-sm">{run.duration || "-"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white text-sm">{run.itemsProcessed}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-sm", run.errors > 0 ? "text-red-400" : "text-gray-500")}>
                        {run.errors}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-sm">{run.trigger}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "queue" && (
        <div className="space-y-3">
          {mockQueue.length > 0 ? (
            mockQueue.map((item) => (
              <div key={item.id} className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{item.title}</span>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    item.status === "processing" ? "bg-blue-400/10 text-blue-400" : "bg-gray-400/10 text-gray-400"
                  )}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">Priority: {item.priority}</span>
                  {item.scheduledFor && <span className="text-gray-500">Scheduled: {item.scheduledFor}</span>}
                  <span className="text-gray-500">Created: {item.createdAt}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <ListTodo className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Queue is empty</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-gray-900 rounded-xl border border-white/5 p-4 font-mono text-sm">
          {mockLogs.map((log) => {
            const level = logLevelConfig[log.level]
            return (
              <div key={log.id} className="flex items-start gap-3 py-1.5">
                <span className="text-gray-600 whitespace-nowrap">{log.timestamp}</span>
                <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", level.bg, level.color)}>
                  {log.level.toUpperCase()}
                </span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
