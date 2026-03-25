import { useState } from "react"
import { 
  Activity, CheckCircle2, AlertTriangle, XCircle, Cpu, DollarSign,
  BarChart3, Clock, Zap, TrendingUp, TrendingDown, RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AgentHealth {
  agent_id: string
  name: string
  status: "healthy" | "warning" | "error"
  last_run: string
  success_rate: number
  avg_duration_ms: number
  error_rate_24h: number
  queue_depth: number
}

interface LLMUsage {
  provider: string
  model: string
  requests_24h: number
  tokens_24h: number
  cost_24h: number
  avg_latency_ms: number
  error_rate: number
}

interface CostMetric {
  period: string
  openai_cost: number
  gemini_cost: number
  total_cost: number
  budget: number
}

const mockAgentHealth: AgentHealth[] = []
const mockLLMUsage: LLMUsage[] = []
const mockCostMetrics: CostMetric[] = []

const statusConfig = {
  healthy: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  warning: { color: "text-amber-400", bg: "bg-amber-400/10", icon: AlertTriangle },
  error: { color: "text-red-400", bg: "bg-red-400/10", icon: XCircle },
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export default function HealthAndLogs() {
  const [agentHealth] = useState<AgentHealth[]>(mockAgentHealth)
  const [llmUsage] = useState<LLMUsage[]>(mockLLMUsage)
  const [costMetrics] = useState<CostMetric[]>(mockCostMetrics)

  const healthyCount = agentHealth.filter(a => a.status === "healthy").length
  const warningCount = agentHealth.filter(a => a.status === "warning").length
  const errorCount = agentHealth.filter(a => a.status === "error").length

  const totalTokens = llmUsage.reduce((sum, u) => sum + u.tokens_24h, 0)
  const totalCost = llmUsage.reduce((sum, u) => sum + u.cost_24h, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Health and Logs</h1>
          <p className="text-gray-400 text-sm">Operations visibility, LLM usage, and cost tracking</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Activity className="h-4 w-4" />
            <span>System Status</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-xl">{healthyCount}</span>
            <span className="text-gray-500">/</span>
            <span className="text-amber-400 font-bold text-xl">{warningCount}</span>
            <span className="text-gray-500">/</span>
            <span className="text-red-400 font-bold text-xl">{errorCount}</span>
          </div>
          <p className="text-gray-500 text-xs mt-1">healthy / warning / error</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Cpu className="h-4 w-4" />
            <span>Total Tokens (24h)</span>
          </div>
          <p className="text-2xl font-bold text-white">{(totalTokens / 1000000).toFixed(2)}M</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <DollarSign className="h-4 w-4" />
            <span>LLM Cost (24h)</span>
          </div>
          <p className="text-2xl font-bold text-white">${totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <BarChart3 className="h-4 w-4" />
            <span>Budget Used</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {((costMetrics[2].total_cost / costMetrics[2].budget) * 100).toFixed(1)}%
          </p>
          <p className="text-gray-500 text-xs mt-1">of monthly budget</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Zap className="h-4 w-4" />
            <span>Avg Latency</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {Math.round(llmUsage.reduce((sum, u) => sum + u.avg_latency_ms, 0) / llmUsage.length)}ms
          </p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Cost Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          {costMetrics.map((metric) => (
            <div key={metric.period} className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">{metric.period}</span>
                <span className="text-white font-bold">${metric.total_cost.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 text-sm">OpenAI</span>
                  <span className="text-gray-300 text-sm">${metric.openai_cost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-400 text-sm">Gemini</span>
                  <span className="text-gray-300 text-sm">${metric.gemini_cost.toFixed(2)}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Budget</span>
                    <span className="text-gray-400">${metric.budget}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full",
                        (metric.total_cost / metric.budget) < 0.5 ? "bg-emerald-500" :
                        (metric.total_cost / metric.budget) < 0.8 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.min((metric.total_cost / metric.budget) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Health */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Agent Health</h2>
        <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Agent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Last Run</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Success Rate</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Error Rate (24h)</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Queue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {agentHealth.map((agent) => {
                const status = statusConfig[agent.status]
                const StatusIcon = status.icon
                return (
                  <tr key={agent.agent_id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-white text-sm font-medium">{agent.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={cn("h-4 w-4", status.color)} />
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}>
                          {agent.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-sm">{agent.last_run}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-sm font-medium",
                        agent.success_rate >= 0.95 ? "text-emerald-400" :
                        agent.success_rate >= 0.9 ? "text-amber-400" : "text-red-400"
                      )}>
                        {(agent.success_rate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300 text-sm">{formatDuration(agent.avg_duration_ms)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-sm",
                        agent.error_rate_24h <= 0.02 ? "text-emerald-400" :
                        agent.error_rate_24h <= 0.05 ? "text-amber-400" : "text-red-400"
                      )}>
                        {(agent.error_rate_24h * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-sm",
                        agent.queue_depth === 0 ? "text-gray-500" :
                        agent.queue_depth <= 10 ? "text-white" : "text-amber-400"
                      )}>
                        {agent.queue_depth}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* LLM Usage by Model */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">LLM Usage by Model</h2>
        <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Provider</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Model</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Requests (24h)</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tokens (24h)</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Cost (24h)</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Latency</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Error Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {llmUsage.map((usage, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-sm font-medium",
                      usage.provider === "OpenAI" ? "text-emerald-400" : "text-blue-400"
                    )}>
                      {usage.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white text-sm">{usage.model}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300 text-sm">{usage.requests_24h.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300 text-sm">{(usage.tokens_24h / 1000).toFixed(1)}k</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white text-sm font-medium">${usage.cost_24h.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300 text-sm">{usage.avg_latency_ms}ms</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-sm",
                      usage.error_rate === 0 ? "text-emerald-400" :
                      usage.error_rate <= 0.01 ? "text-amber-400" : "text-red-400"
                    )}>
                      {(usage.error_rate * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
