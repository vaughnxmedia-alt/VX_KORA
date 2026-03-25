import { Link } from "react-router-dom"
import { 
  ClipboardCheck, 
  Search, 
  Users, 
  Fingerprint, 
  FileText, 
  Rocket, 
  FileOutput,
  Play,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  Circle,
  ExternalLink,
  type LucideIcon 
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Agent, AgentStatus } from "@/state/agentStore"

const iconMap: Record<string, LucideIcon> = {
  "clipboard-check": ClipboardCheck,
  "search": Search,
  "users": Users,
  "fingerprint": Fingerprint,
  "file-text": FileText,
  "rocket": Rocket,
  "file-output": FileOutput,
}

const statusConfig: Record<AgentStatus, { 
  color: string
  bgColor: string
  borderColor: string
  icon: LucideIcon
  label: string
}> = {
  idle: {
    color: "text-grey-400",
    bgColor: "bg-grey-800/50",
    borderColor: "border-grey-700",
    icon: Circle,
    label: "Idle",
  },
  running: {
    color: "text-cyan",
    bgColor: "bg-cyan/10",
    borderColor: "border-cyan/30",
    icon: Loader2,
    label: "Running",
  },
  complete: {
    color: "text-green",
    bgColor: "bg-green/10",
    borderColor: "border-green/30",
    icon: CheckCircle2,
    label: "Complete",
  },
  error: {
    color: "text-red",
    bgColor: "bg-red/10",
    borderColor: "border-red/30",
    icon: XCircle,
    label: "Error",
  },
}

interface AgentItemProps {
  agent: Agent
  onRun: (id: string) => void
  onReset: (id: string) => void
  compact?: boolean
  showLink?: boolean
}

export function AgentItem({ agent, onRun, onReset, compact = false, showLink = true }: AgentItemProps) {
  const Icon = iconMap[agent.icon] || FileText
  const status = statusConfig[agent.status]
  const StatusIcon = status.icon
  const isRunning = agent.status === "running"
  const canReset = agent.status === "complete" || agent.status === "error"

  return (
    <div 
      className={cn(
        "group relative rounded-xl border transition-all duration-200",
        "bg-grey-900/50 hover:bg-grey-900/80",
        status.borderColor,
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-start gap-3">
        <Link 
          to={agent.route}
          className={cn(
            "shrink-0 rounded-lg flex items-center justify-center transition-colors hover:ring-2 hover:ring-royal/50",
            compact ? "w-9 h-9" : "w-10 h-10",
            status.bgColor
          )}
        >
          <Icon className={cn("transition-colors", status.color, compact ? "h-4 w-4" : "h-5 w-5")} />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link to={agent.route} className="hover:underline">
              <h3 className={cn("font-medium text-white truncate", compact ? "text-sm" : "text-sm")}>
                {agent.name}
              </h3>
            </Link>
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              status.bgColor,
              status.color
            )}>
              <StatusIcon className={cn("h-3 w-3", isRunning && "animate-spin")} />
              <span>{status.label}</span>
            </div>
          </div>

          {!compact && (
            <p className="text-xs text-grey-500 line-clamp-2 leading-relaxed">
              {agent.description}
            </p>
          )}

          {agent.lastRun && !compact && (
            <p className="text-xs text-grey-600 mt-2">
              Last run: {agent.lastRun.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1">
          {showLink && !compact && (
            <Link
              to={agent.route}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                "text-grey-500 hover:text-white hover:bg-white/10",
                "opacity-0 group-hover:opacity-100"
              )}
              title="View agent details"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
          
          {canReset && (
            <button
              onClick={() => onReset(agent.id)}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                "text-grey-500 hover:text-white hover:bg-white/10",
                "opacity-0 group-hover:opacity-100"
              )}
              title="Reset agent"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={() => onRun(agent.id)}
            disabled={isRunning}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
              isRunning
                ? "bg-cyan/20 text-cyan cursor-not-allowed"
                : "bg-royal hover:bg-royal/80 text-white",
              compact && "px-2 py-1"
            )}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className={cn(compact && "hidden sm:inline")}>Running</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                <span className={cn(compact && "hidden sm:inline")}>Run</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isRunning && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-grey-800 rounded-b-xl overflow-hidden">
          <div className="h-full bg-cyan animate-pulse" style={{ width: "60%" }} />
        </div>
      )}
    </div>
  )
}
