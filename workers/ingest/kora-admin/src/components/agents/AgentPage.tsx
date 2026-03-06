import { 
  ClipboardCheck, 
  Search, 
  Users, 
  Fingerprint, 
  FileText, 
  Rocket, 
  FileOutput,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  type LucideIcon 
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAgentStore, type Agent, type Deliverable } from "@/state/agentStore"
import { ClientSelector } from "@/components/ClientSelector"

const iconMap: Record<string, LucideIcon> = {
  "clipboard-check": ClipboardCheck,
  "search": Search,
  "users": Users,
  "fingerprint": Fingerprint,
  "file-text": FileText,
  "rocket": Rocket,
  "file-output": FileOutput,
}

const statusConfig = {
  pending: { color: "text-grey-400", bg: "bg-grey-800/50", icon: Clock, label: "Pending" },
  in_progress: { color: "text-cyan", bg: "bg-cyan/10", icon: Loader2, label: "In Progress" },
  complete: { color: "text-green", bg: "bg-green/10", icon: CheckCircle2, label: "Complete" },
  failed: { color: "text-red", bg: "bg-red/10", icon: XCircle, label: "Failed" },
}

interface AgentPageProps {
  agentId: string
}

export function AgentPage({ agentId }: AgentPageProps) {
  const { agents, selectedClientId, runAgent, getDeliverablesByAgent } = useAgentStore()
  
  const agent = agents.find((a) => a.id === agentId)
  const deliverables = getDeliverablesByAgent(agentId)
  
  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-grey-500">Agent not found</p>
      </div>
    )
  }

  const Icon = iconMap[agent.icon] || FileText
  const isRunning = agent.status === "running"

  const stats = {
    total: deliverables.length,
    pending: deliverables.filter((d) => d.status === "pending").length,
    inProgress: deliverables.filter((d) => d.status === "in_progress").length,
    complete: deliverables.filter((d) => d.status === "complete").length,
    failed: deliverables.filter((d) => d.status === "failed").length,
  }

  const groupedDeliverables = deliverables.reduce((acc, d) => {
    if (!acc[d.clientId]) {
      acc[d.clientId] = { clientName: d.clientName, items: [] }
    }
    acc[d.clientId].items.push(d)
    return acc
  }, {} as Record<string, { clientName: string; items: Deliverable[] }>)

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-royal/20 rounded-xl flex items-center justify-center">
            <Icon className="h-6 w-6 text-royal" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{agent.name}</h1>
            <p className="text-sm text-grey-500 max-w-lg">{agent.description}</p>
          </div>
        </div>

        <button
          onClick={() => runAgent(agent.id)}
          disabled={isRunning || !selectedClientId}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            isRunning || !selectedClientId
              ? "bg-grey-800 text-grey-500 cursor-not-allowed"
              : "bg-royal hover:bg-royal/80 text-white"
          )}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Agent
            </>
          )}
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-grey-500 uppercase tracking-wider mb-2">
          Filter by Client
        </label>
        <ClientSelector />
      </div>

      {!selectedClientId && (
        <div className="bg-yellow/10 border border-yellow/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow">Select a client to run agent</p>
            <p className="text-xs text-yellow/70 mt-1">
              Choose a specific client from the dropdown above to run this agent and generate deliverables.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-grey-900/50 border border-grey-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-grey-500 uppercase tracking-wide">Total</p>
        </div>
        <div className="bg-cyan/5 border border-cyan/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-cyan">{stats.inProgress}</p>
          <p className="text-xs text-cyan/70 uppercase tracking-wide">In Progress</p>
        </div>
        <div className="bg-green/5 border border-green/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-green">{stats.complete}</p>
          <p className="text-xs text-green/70 uppercase tracking-wide">Complete</p>
        </div>
        <div className="bg-red/5 border border-red/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-red">{stats.failed}</p>
          <p className="text-xs text-red/70 uppercase tracking-wide">Failed</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-grey-400 uppercase tracking-wider">
          Deliverables
        </h2>
        <p className="text-xs text-grey-600 mt-1">
          {agent.deliverables.join(" / ")}
        </p>
      </div>

      {selectedClientId ? (
        <div className="space-y-3">
          {deliverables.map((deliverable) => (
            <DeliverableCard key={deliverable.id} deliverable={deliverable} />
          ))}
          {deliverables.length === 0 && (
            <div className="bg-grey-900/50 border border-grey-800 rounded-xl p-8 text-center">
              <p className="text-grey-500">No deliverables found for this client</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDeliverables).map(([clientId, { clientName, items }]) => (
            <div key={clientId} className="bg-grey-900/30 border border-grey-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-grey-900/50 border-b border-grey-800">
                <h3 className="text-sm font-medium text-white">{clientName}</h3>
              </div>
              <div className="p-3 space-y-2">
                {items.map((deliverable) => (
                  <DeliverableCard key={deliverable.id} deliverable={deliverable} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DeliverableCard({ deliverable, compact = false }: { deliverable: Deliverable; compact?: boolean }) {
  const status = statusConfig[deliverable.status]
  const StatusIcon = status.icon

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border transition-all",
      "bg-grey-900/50 hover:bg-grey-900/80 border-grey-800",
      compact ? "p-2.5" : "p-4"
    )}>
      <div className={cn("rounded-lg flex items-center justify-center", status.bg, compact ? "w-8 h-8" : "w-10 h-10")}>
        <StatusIcon className={cn(status.color, deliverable.status === "in_progress" && "animate-spin", compact ? "h-4 w-4" : "h-5 w-5")} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-white truncate", compact ? "text-xs" : "text-sm")}>
          {deliverable.title}
        </p>
        {!compact && (
          <p className="text-xs text-grey-500 mt-0.5">
            {deliverable.completedAt 
              ? `Completed ${deliverable.completedAt.toLocaleDateString()}`
              : `Created ${deliverable.createdAt.toLocaleDateString()}`
            }
          </p>
        )}
      </div>

      <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full", status.bg)}>
        <span className={cn("text-xs font-medium", status.color)}>{status.label}</span>
      </div>
    </div>
  )
}
