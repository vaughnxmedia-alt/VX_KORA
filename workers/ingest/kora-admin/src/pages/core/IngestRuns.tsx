import { useState, useMemo } from "react"
import { 
  PlayCircle, CheckCircle2, XCircle, Clock, RefreshCw,
  ChevronRight, Filter, Cpu, Database, Send
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ClientDropdown } from "@/components/ClientDropdown"
import { useClients } from "@/hooks/useClients"

type RunStatus = "pending" | "running" | "completed" | "failed"
type TriggerSource = "scheduled" | "manual" | "webhook" | "event"

interface IngestRun {
  id: string
  agent_id: string
  tenant: string | null
  trigger_source: TriggerSource
  status: RunStatus
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  sources_processed: number
  items_discovered: number
  items_processed: number
  items_embedded: number
  items_routed: number
  telegram_sends: number
  llm_tokens_used: number
  llm_cost_estimate: number
  model_usage: {
    openai_tokens: number
    openai_cost: number
    gemini_tokens: number
    gemini_cost: number
  }
  error_message: string | null
}

const mockRuns: IngestRun[] = [
  { 
    id: "run-1", agent_id: "core-intelligence", tenant: "JahKnowsPR", trigger_source: "scheduled", status: "completed",
    started_at: "2024-03-06 14:00:00", completed_at: "2024-03-06 14:15:32", duration_ms: 932000,
    sources_processed: 47, items_discovered: 156, items_processed: 142, items_embedded: 89, items_routed: 67, telegram_sends: 3,
    llm_tokens_used: 45230, llm_cost_estimate: 0.12,
    model_usage: { openai_tokens: 32000, openai_cost: 0.08, gemini_tokens: 13230, gemini_cost: 0.04 },
    error_message: null
  },
  { 
    id: "run-2", agent_id: "source-discovery", tenant: "JahKnowsPR", trigger_source: "scheduled", status: "completed",
    started_at: "2024-03-06 12:00:00", completed_at: "2024-03-06 12:08:45", duration_ms: 525000,
    sources_processed: 0, items_discovered: 12, items_processed: 12, items_embedded: 0, items_routed: 0, telegram_sends: 0,
    llm_tokens_used: 8500, llm_cost_estimate: 0.02,
    model_usage: { openai_tokens: 8500, openai_cost: 0.02, gemini_tokens: 0, gemini_cost: 0 },
    error_message: null
  },
  { 
    id: "run-3", agent_id: "telegram-delivery", tenant: "JahKnowsPR", trigger_source: "scheduled", status: "completed",
    started_at: "2024-03-06 07:00:00", completed_at: "2024-03-06 07:02:15", duration_ms: 135000,
    sources_processed: 0, items_discovered: 0, items_processed: 5, items_embedded: 0, items_routed: 0, telegram_sends: 1,
    llm_tokens_used: 12400, llm_cost_estimate: 0.03,
    model_usage: { openai_tokens: 2400, openai_cost: 0.01, gemini_tokens: 10000, gemini_cost: 0.02 },
    error_message: null
  },
  { 
    id: "run-4", agent_id: "source-processing", tenant: "JahKnowsPR", trigger_source: "event", status: "running",
    started_at: "2024-03-06 14:30:00", completed_at: null, duration_ms: null,
    sources_processed: 12, items_discovered: 0, items_processed: 45, items_embedded: 23, items_routed: 0, telegram_sends: 0,
    llm_tokens_used: 18750, llm_cost_estimate: 0.05,
    model_usage: { openai_tokens: 8750, openai_cost: 0.02, gemini_tokens: 10000, gemini_cost: 0.03 },
    error_message: null
  },
  { 
    id: "run-5", agent_id: "core-intelligence", tenant: "TechFlow Solutions", trigger_source: "manual", status: "failed",
    started_at: "2024-03-06 10:00:00", completed_at: "2024-03-06 10:05:12", duration_ms: 312000,
    sources_processed: 23, items_discovered: 78, items_processed: 45, items_embedded: 0, items_routed: 0, telegram_sends: 0,
    llm_tokens_used: 15600, llm_cost_estimate: 0.04,
    model_usage: { openai_tokens: 15600, openai_cost: 0.04, gemini_tokens: 0, gemini_cost: 0 },
    error_message: "Rate limit exceeded for embedding API"
  },
  { 
    id: "run-6", agent_id: "intake-clarifier", tenant: "Meridian Capital", trigger_source: "manual", status: "completed",
    started_at: "2024-03-06 09:00:00", completed_at: "2024-03-06 09:03:22", duration_ms: 202000,
    sources_processed: 0, items_discovered: 0, items_processed: 1, items_embedded: 0, items_routed: 0, telegram_sends: 0,
    llm_tokens_used: 5200, llm_cost_estimate: 0.01,
    model_usage: { openai_tokens: 5200, openai_cost: 0.01, gemini_tokens: 0, gemini_cost: 0 },
    error_message: null
  },
]

const statusConfig = {
  pending: { color: "text-gray-400", bg: "bg-gray-400/10", icon: Clock, label: "Pending" },
  running: { color: "text-blue-400", bg: "bg-blue-400/10", icon: RefreshCw, label: "Running" },
  completed: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2, label: "Completed" },
  failed: { color: "text-red-400", bg: "bg-red-400/10", icon: XCircle, label: "Failed" },
}

const triggerConfig = {
  scheduled: { label: "Scheduled", color: "text-blue-400" },
  manual: { label: "Manual", color: "text-purple-400" },
  webhook: { label: "Webhook", color: "text-amber-400" },
  event: { label: "Event", color: "text-cyan-400" },
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "-"
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${seconds}s`
}

export default function IngestRuns() {
  const [runs] = useState<IngestRun[]>(mockRuns)
  const [filterAgent, setFilterAgent] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<RunStatus | "all">("all")
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const { clients, getDisplayName } = useClients()

  const filteredRuns = useMemo(() => {
    return runs.filter(r => {
      if (filterAgent !== "all" && r.agent_id !== filterAgent) return false
      if (filterStatus !== "all" && r.status !== filterStatus) return false
      
      if (selectedClientId) {
        const selectedClient = clients.find(c => c.id === selectedClientId)
        const clientName = selectedClient ? getDisplayName(selectedClient) : null
        if (clientName && r.tenant !== clientName) return false
      }
      
      return true
    })
  }, [runs, filterAgent, filterStatus, selectedClientId, clients, getDisplayName])

  const agents = [...new Set(runs.map(r => r.agent_id))]

  const totalRuns = filteredRuns.length
  const totalItems = filteredRuns.reduce((sum, r) => sum + r.items_processed, 0)
  const totalTelegram = filteredRuns.reduce((sum, r) => sum + r.telegram_sends, 0)
  const totalCost = filteredRuns.reduce((sum, r) => sum + r.llm_cost_estimate, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ingest Runs</h1>
          <p className="text-gray-400 text-sm">Track all ingestion jobs and their performance</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <PlayCircle className="h-4 w-4" />
          Trigger Run
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Runs (24h)</p>
          <p className="text-2xl font-bold text-white">{totalRuns}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Items Processed</p>
          <p className="text-2xl font-bold text-white">{totalItems}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Telegram Sends</p>
          <p className="text-2xl font-bold text-white">{totalTelegram}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">LLM Cost (24h)</p>
          <p className="text-2xl font-bold text-white">${totalCost.toFixed(2)}</p>
        </div>
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
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Agents</option>
          {agents.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as RunStatus | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Run</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Agent</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tenant</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Trigger</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Items</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Model Usage</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredRuns.map((run) => {
              const status = statusConfig[run.status]
              const StatusIcon = status.icon
              const trigger = triggerConfig[run.trigger_source]
              
              return (
                <tr key={run.id} className="hover:bg-white/5 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-mono">{run.id}</span>
                      <ChevronRight className="h-4 w-4 text-gray-600" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-300">{run.agent_id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-300">{run.tenant}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-sm", trigger.color)}>{trigger.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={cn("h-4 w-4", status.color, run.status === "running" && "animate-spin")} />
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}>
                        {status.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400">{formatDuration(run.duration_ms)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-400" title="Sources">
                        <Cpu className="h-3 w-3 inline mr-1" />{run.sources_processed}
                      </span>
                      <span className="text-gray-400" title="Processed">
                        <Database className="h-3 w-3 inline mr-1" />{run.items_processed}
                      </span>
                      <span className="text-gray-400" title="Telegram">
                        <Send className="h-3 w-3 inline mr-1" />{run.telegram_sends}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-400">OpenAI: {(run.model_usage.openai_tokens / 1000).toFixed(1)}k</span>
                      <span className="text-blue-400">Gemini: {(run.model_usage.gemini_tokens / 1000).toFixed(1)}k</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-white text-sm font-medium">${run.llm_cost_estimate.toFixed(2)}</span>
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
