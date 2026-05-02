import { useState, useEffect } from "react"
import { MessageSquareText, Shield, Users, CheckCircle2, Clock, Loader2, ArrowRight, RefreshCw } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { ClientDropdown } from "@/components/ClientDropdown"
import { OFFICIAL_CLIENT_ID } from "@/hooks/useClients"
import { supabase } from "@/lib/supabase"

type AgentStatus = "idle" | "running" | "completed" | "pending"

interface Stats {
  totalIntakes: number
  brandsBuilt: number
  strategiesCreated: number
  audienceReports: number
  intakesInProgress: number
}

const statusConfig: Record<AgentStatus, { color: string; bgColor: string; icon: typeof CheckCircle2; label: string }> = {
  idle: { color: "text-gray-400", bgColor: "bg-gray-500/10", icon: Clock, label: "Idle" },
  running: { color: "text-cyan-400", bgColor: "bg-cyan-500/10", icon: Loader2, label: "Running" },
  completed: { color: "text-green-400", bgColor: "bg-green-500/10", icon: CheckCircle2, label: "Completed" },
  pending: { color: "text-amber-400", bgColor: "bg-amber-500/10", icon: Clock, label: "Pending" },
}

export default function IntakeOverview() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(OFFICIAL_CLIENT_ID)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalIntakes: 0,
    brandsBuilt: 0,
    strategiesCreated: 0,
    audienceReports: 0,
    intakesInProgress: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    
    const [intakesRes, blueprintsRes, strategiesRes, audienceRes] = await Promise.all([
      supabase.from("telegram_intake_sessions").select("id, phase", { count: "exact" }),
      supabase.from("brand_blueprints").select("id", { count: "exact" }),
      supabase.from("content_strategies").select("id", { count: "exact" }),
      supabase.from("audience_analyses").select("id", { count: "exact" })
    ])

    const inProgress = (intakesRes.data || []).filter(i => i.phase !== "completed").length

    setStats({
      totalIntakes: intakesRes.count || 0,
      brandsBuilt: blueprintsRes.count || 0,
      strategiesCreated: strategiesRes.count || 0,
      audienceReports: audienceRes.count || 0,
      intakesInProgress: inProgress
    })
    
    setLoading(false)
  }

  const intakeAgents = [
    { 
      id: "clarifier", 
      name: "Intake Clarifier", 
      description: "Clean user inputs and structure profiles", 
      icon: MessageSquareText, 
      status: stats.intakesInProgress > 0 ? "running" as AgentStatus : (stats.totalIntakes > 0 ? "completed" as AgentStatus : "idle" as AgentStatus),
      route: "/intake/clarifier", 
      lastRun: stats.totalIntakes > 0 ? "Active" : "No intakes yet",
      completedCount: stats.totalIntakes
    },
    { 
      id: "brand-identity", 
      name: "Brand Identity", 
      description: "Brand Identity report (includes strategy content)", 
      icon: Shield, 
      status: stats.brandsBuilt > 0 ? "completed" as AgentStatus : "idle" as AgentStatus,
      route: "/intake/brand-identity", 
      lastRun: stats.brandsBuilt > 0 ? "Ready" : "Waiting for intakes",
      completedCount: stats.brandsBuilt
    },
    { 
      id: "audience-intelligence", 
      name: "Audiences", 
      description: "Build target audience analysis", 
      icon: Users, 
      status: stats.audienceReports > 0 ? "completed" as AgentStatus : "idle" as AgentStatus,
      route: "/intake/audience-intelligence", 
      lastRun: stats.audienceReports > 0 ? "Ready" : "Waiting for intakes",
      completedCount: stats.audienceReports
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Intake Agent</h1>
          <p className="text-gray-400 text-sm">
            Data from Strategy Sessions and Telegram; Brand Identity reports include strategy content.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
          <ClientDropdown
            selectedClientId={selectedClientId}
            onClientChange={setSelectedClientId}
            allOptionLabel="All KORA Clients"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Intakes</p>
          <p className="text-2xl font-bold text-white">{loading ? "..." : stats.totalIntakes}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Brands Built</p>
          <p className="text-2xl font-bold text-white">{loading ? "..." : stats.brandsBuilt}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Strategies Created</p>
          <p className="text-2xl font-bold text-white">{loading ? "..." : stats.strategiesCreated}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Audience Reports</p>
          <p className="text-2xl font-bold text-white">{loading ? "..." : stats.audienceReports}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Pipeline Agents</h2>
        <div className="grid grid-cols-2 gap-4">
          {intakeAgents.map((agent) => {
            const status = statusConfig[agent.status]
            const StatusIcon = status.icon
            const AgentIcon = agent.icon
            
            return (
              <Link 
                key={agent.id} 
                to={agent.route}
                className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 hover:border-gray-600 transition-all hover:bg-gray-800/70"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("p-3 rounded-lg", status.bgColor)}>
                    <AgentIcon className={cn("h-6 w-6", status.color)} />
                  </div>
                  <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", status.bgColor, status.color)}>
                    <StatusIcon className={cn("h-3 w-3", agent.status === "running" && "animate-spin")} />
                    {status.label}
                  </div>
                </div>
                <h3 className="font-semibold text-white">{agent.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{agent.description}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-500">{agent.lastRun}</span>
                  <span className="text-gray-400">{agent.completedCount} completed</span>
                </div>
                <div className="mt-3 flex items-center text-blue-400 text-sm">
                  View details <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
