import { useState } from "react"
import { 
  Bot, 
  ChevronDown, 
  ChevronUp, 
  PlayCircle, 
  CheckCircle2, 
  XCircle,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAgentStore } from "@/state/agentStore"
import { AgentItem } from "./AgentItem"

interface AgentSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function AgentSidebar({ collapsed = false, onToggleCollapse }: AgentSidebarProps) {
  const { agents, runAgent, resetAgent } = useAgentStore()
  const [isExpanded, setIsExpanded] = useState(true)

  const stats = {
    total: agents.length,
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

  if (collapsed) {
    return (
      <aside className="w-16 bg-background border-l border-white/5 flex flex-col items-center py-4 gap-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-grey-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Expand Agents Panel"
        >
          <Bot className="h-5 w-5" />
        </button>
        
        <div className="w-8 h-px bg-white/10 my-2" />
        
        {stats.running > 0 && (
          <div className="relative">
            <PlayCircle className="h-5 w-5 text-cyan animate-pulse" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan text-[10px] font-bold text-background rounded-full flex items-center justify-center">
              {stats.running}
            </span>
          </div>
        )}
        
        {stats.complete > 0 && (
          <div className="relative">
            <CheckCircle2 className="h-5 w-5 text-green" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green text-[10px] font-bold text-background rounded-full flex items-center justify-center">
              {stats.complete}
            </span>
          </div>
        )}
        
        {stats.error > 0 && (
          <div className="relative">
            <XCircle className="h-5 w-5 text-red" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red text-[10px] font-bold text-background rounded-full flex items-center justify-center">
              {stats.error}
            </span>
          </div>
        )}
      </aside>
    )
  }

  return (
    <aside className="w-80 bg-background border-l border-white/5 flex flex-col">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple/20 rounded-lg flex items-center justify-center">
              <Bot className="h-4 w-4 text-purple" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">KORA Agents</h2>
              <p className="text-xs text-grey-500">{stats.total} agents available</p>
            </div>
          </div>
          
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-md text-grey-500 hover:text-white hover:bg-white/10 transition-colors"
              title="Collapse panel"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="bg-cyan/10 rounded-lg px-2 py-1.5 text-center">
              <p className="text-lg font-bold text-cyan">{stats.running}</p>
              <p className="text-[10px] text-cyan/70 uppercase tracking-wide">Running</p>
            </div>
            <div className="bg-green/10 rounded-lg px-2 py-1.5 text-center">
              <p className="text-lg font-bold text-green">{stats.complete}</p>
              <p className="text-[10px] text-green/70 uppercase tracking-wide">Complete</p>
            </div>
            <div className="bg-red/10 rounded-lg px-2 py-1.5 text-center">
              <p className="text-lg font-bold text-red">{stats.error}</p>
              <p className="text-[10px] text-red/70 uppercase tracking-wide">Errors</p>
            </div>
          </div>
        </div>

        <button
          onClick={runAllAgents}
          disabled={stats.running > 0}
          className={cn(
            "w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            stats.running > 0
              ? "bg-grey-800 text-grey-500 cursor-not-allowed"
              : "bg-gradient-to-r from-royal to-purple hover:opacity-90 text-white"
          )}
        >
          <Zap className="h-4 w-4" />
          Run All Agents
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-grey-500 uppercase tracking-wider hover:text-grey-400 transition-colors"
          >
            <span>Agent Pipeline</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-2">
              {agents.map((agent, index) => (
                <div key={agent.id} className="relative">
                  {index < agents.length - 1 && (
                    <div className="absolute left-[22px] top-[52px] w-0.5 h-4 bg-grey-800" />
                  )}
                  <AgentItem
                    agent={agent}
                    onRun={runAgent}
                    onReset={resetAgent}
                    compact
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-grey-600">
          <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span>System operational</span>
        </div>
      </div>
    </aside>
  )
}
