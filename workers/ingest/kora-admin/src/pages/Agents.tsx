import { 
  Bot, 
  Zap, 
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAgentStore } from "@/state/agentStore"
import { AgentItem } from "@/components/agents/AgentItem"
import { ClientSelector } from "@/components/ClientSelector"

export function Agents() {
  const { agents, selectedClientId, runAgent, resetAgent } = useAgentStore()

  const stats = {
    total: agents.length,
    idle: agents.filter((a) => a.status === "idle").length,
    running: agents.filter((a) => a.status === "running").length,
    complete: agents.filter((a) => a.status === "complete").length,
    error: agents.filter((a) => a.status === "error").length,
  }

  const runAllAgents = () => {
    agents.forEach((agent, index) => {
      setTimeout(() => {
        runAgent(agent.id)
      }, index * 500)
    })
  }

  const resetAllAgents = () => {
    agents.forEach((agent) => {
      resetAgent(agent.id)
    })
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple/20 rounded-xl flex items-center justify-center">
            <Bot className="h-5 w-5 text-purple" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">KORA Agent Pipeline</h1>
            <p className="text-sm text-grey-500">
              Manage and monitor the AI agent pipeline for Brand Blueprint generation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetAllAgents}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-grey-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All
          </button>
          <button
            onClick={runAllAgents}
            disabled={stats.running > 0 || !selectedClientId}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              stats.running > 0 || !selectedClientId
                ? "bg-grey-800 text-grey-500 cursor-not-allowed"
                : "bg-gradient-to-r from-royal to-purple hover:opacity-90 text-white"
            )}
          >
            <Zap className="h-4 w-4" />
            Run All Agents
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-grey-500 uppercase tracking-wider mb-2">
          Select Client
        </label>
        <ClientSelector />
      </div>

      {!selectedClientId && (
        <div className="bg-yellow/10 border border-yellow/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow">Select a client to run agents</p>
            <p className="text-xs text-yellow/70 mt-1">
              Choose a specific client from the dropdown above to run the full agent pipeline and generate their Brand Blueprint.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-grey-900/50 border border-grey-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-grey-800 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-grey-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.idle}</p>
              <p className="text-xs text-grey-500 uppercase tracking-wide">Idle</p>
            </div>
          </div>
        </div>

        <div className="bg-cyan/5 border border-cyan/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan/20 rounded-lg flex items-center justify-center">
              <PlayCircle className="h-5 w-5 text-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan">{stats.running}</p>
              <p className="text-xs text-cyan/70 uppercase tracking-wide">Running</p>
            </div>
          </div>
        </div>

        <div className="bg-green/5 border border-green/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green">{stats.complete}</p>
              <p className="text-xs text-green/70 uppercase tracking-wide">Complete</p>
            </div>
          </div>
        </div>

        <div className="bg-red/5 border border-red/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red/20 rounded-lg flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red">{stats.error}</p>
              <p className="text-xs text-red/70 uppercase tracking-wide">Errors</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-grey-400 uppercase tracking-wider">
          Agent Pipeline
        </h2>
        <p className="text-xs text-grey-600 mt-1">
          Click an agent to view deliverables. Agents execute in sequence to build the complete Brand Blueprint.
        </p>
      </div>

      <div className="space-y-3 pl-10">
        {agents.map((agent, index) => (
          <div key={agent.id} className="relative">
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-6 h-6 bg-grey-800 rounded-full flex items-center justify-center text-xs font-bold text-grey-500 border-2 border-grey-700">
              {index + 1}
            </div>
            {index < agents.length - 1 && (
              <div className="absolute -left-7 top-[60%] w-0.5 h-10 bg-grey-800" />
            )}
            <AgentItem
              agent={agent}
              onRun={runAgent}
              onReset={resetAgent}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
