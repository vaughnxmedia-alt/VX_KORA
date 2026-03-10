import { useState, useEffect, useMemo } from "react"
import { Brain, PenTool, Layers, MessageSquareText, FileText, Clock, CheckCircle2, Loader2, AlertCircle, ArrowRight, Lightbulb, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { ClientDropdown } from "@/components/ClientDropdown"
import { useClients } from "@/hooks/useClients"

type AgentStatus = "idle" | "running" | "healthy" | "warning" | "error"

interface SystemAgent {
  id: string
  name: string
  description: string
  icon: typeof Brain
  status: AgentStatus
  lastRun: string
  itemsProcessed: number
  route: string
}

interface ContentStrategy {
  id: string
  title: string
  tenant: string
  status: "generating" | "complete" | "pending"
  generatedAt: string
  pillars: string[]
}

interface IndustryInsight {
  id: string
  title: string
  source: string
  category: string
  relevance: number
  extractedAt: string
  summary: string
}

const systemAgents: SystemAgent[] = [
  { id: "core", name: "Core Intelligence", description: "Global ingestion, enrichment, and RAG updates", icon: Brain, status: "healthy", lastRun: "2 min ago", itemsProcessed: 1247, route: "/core" },
  { id: "intake", name: "Intake Clarifier", description: "User intake processing and profile structuring", icon: MessageSquareText, status: "healthy", lastRun: "5 min ago", itemsProcessed: 23, route: "/intake" },
  { id: "strategy", name: "Content Strategy", description: "Strategy generation and content planning", icon: PenTool, status: "running", lastRun: "Running...", itemsProcessed: 8, route: "/strategy" },
  { id: "campaigns", name: "Campaign Assembly", description: "Campaign creation and asset generation", icon: Layers, status: "healthy", lastRun: "15 min ago", itemsProcessed: 45, route: "/campaigns" },
]

const mockContentStrategies: ContentStrategy[] = [
  { id: "1", title: "Q1 2026 Content Strategy", tenant: "TechFlow Solutions", status: "complete", generatedAt: "10 min ago", pillars: ["Thought Leadership", "Product Updates", "Industry Trends"] },
  { id: "2", title: "Weekly Social Strategy", tenant: "Meridian Capital", status: "generating", generatedAt: "Generating...", pillars: ["Investment Insights", "Portfolio Highlights"] },
  { id: "3", title: "Blog Content Plan", tenant: "FinanceHub Inc", status: "complete", generatedAt: "1 hour ago", pillars: ["Fintech Trends", "Product Features", "Customer Stories"] },
  { id: "4", title: "PR Campaign Strategy", tenant: "DataViz Analytics", status: "pending", generatedAt: "Queued", pillars: ["Data Storytelling", "Case Studies"] },
]

const mockInsights: IndustryInsight[] = [
  { id: "1", title: "AI-Powered Content Creation Sees 340% Growth in Enterprise Adoption", source: "TechCrunch", category: "AI & Technology", relevance: 95, extractedAt: "3 min ago", summary: "Enterprise companies are rapidly adopting AI content tools, with spending expected to reach $15B by 2027." },
  { id: "2", title: "New SEC Guidelines Impact Fintech Marketing Strategies", source: "Financial Times", category: "Regulatory", relevance: 88, extractedAt: "8 min ago", summary: "Recent SEC updates require more transparent disclosures in fintech marketing materials." },
  { id: "3", title: "Video Content Engagement Up 67% Year-Over-Year", source: "Marketing Week", category: "Content Trends", relevance: 92, extractedAt: "12 min ago", summary: "Short-form video continues to dominate engagement metrics across all B2B platforms." },
  { id: "4", title: "Sustainability Messaging Drives 45% Higher Conversion", source: "Harvard Business Review", category: "Consumer Behavior", relevance: 85, extractedAt: "25 min ago", summary: "Brands with authentic sustainability narratives see significant conversion improvements." },
]

const statusConfig: Record<AgentStatus, { color: string; bgColor: string; icon: typeof CheckCircle2; label: string }> = {
  idle: { color: "text-gray-400", bgColor: "bg-gray-500/10", icon: Clock, label: "Idle" },
  running: { color: "text-cyan-400", bgColor: "bg-cyan-500/10", icon: Loader2, label: "Running" },
  healthy: { color: "text-green-400", bgColor: "bg-green-500/10", icon: CheckCircle2, label: "Healthy" },
  warning: { color: "text-yellow-400", bgColor: "bg-yellow-500/10", icon: AlertCircle, label: "Warning" },
  error: { color: "text-red-400", bgColor: "bg-red-500/10", icon: AlertCircle, label: "Error" },
}

export function Overview() {
  const [strategies, setStrategies] = useState(mockContentStrategies)
  const [insights] = useState(mockInsights)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const { clients, getDisplayName } = useClients()

  useEffect(() => {
    const interval = setInterval(() => {
      setStrategies(prev => prev.map(s => 
        s.status === "generating" && Math.random() > 0.7 
          ? { ...s, status: "complete" as const, generatedAt: "Just now" }
          : s
      ))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredStrategies = useMemo(() => {
    if (!selectedClientId) return strategies
    const selectedClient = clients.find(c => c.id === selectedClientId)
    const clientName = selectedClient ? getDisplayName(selectedClient) : null
    return strategies.filter(s => !clientName || s.tenant === clientName)
  }, [strategies, selectedClientId, clients, getDisplayName])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Mission Control</h1>
          <p className="text-gray-400 mt-1">Monitor system agents and real-time content generation.</p>
        </div>
        <ClientDropdown
          selectedClientId={selectedClientId}
          onClientChange={setSelectedClientId}
          allOptionLabel="All Clients"
        />
      </div>

      {/* System Agents Status */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">System Agents</h2>
          <span className="text-sm text-gray-500">All systems operational</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {systemAgents.map((agent) => {
            const status = statusConfig[agent.status]
            const StatusIcon = status.icon
            const AgentIcon = agent.icon
            
            return (
              <Link 
                key={agent.id} 
                to={agent.route}
                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition-all hover:bg-gray-800/70"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("p-2 rounded-lg", status.bgColor)}>
                    <AgentIcon className={cn("h-5 w-5", status.color)} />
                  </div>
                  <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", status.bgColor, status.color)}>
                    <StatusIcon className={cn("h-3 w-3", agent.status === "running" && "animate-spin")} />
                    {status.label}
                  </div>
                </div>
                <h3 className="font-medium text-white text-sm">{agent.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{agent.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-gray-500">{agent.lastRun}</span>
                  <span className="text-gray-400">{agent.itemsProcessed.toLocaleString()} items</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Content Strategies - Real-time */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50">
          <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              <h2 className="font-semibold text-white">Content Strategies</h2>
            </div>
            <Link to="/strategy/runs" className="text-sm text-blue-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-700/50">
            {filteredStrategies.map((strategy) => (
              <div key={strategy.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-white text-sm">{strategy.title}</h3>
                    <p className="text-xs text-gray-500">{strategy.tenant}</p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    strategy.status === "complete" && "bg-green-500/10 text-green-400",
                    strategy.status === "generating" && "bg-cyan-500/10 text-cyan-400",
                    strategy.status === "pending" && "bg-gray-500/10 text-gray-400"
                  )}>
                    {strategy.status === "generating" && <Loader2 className="h-3 w-3 animate-spin" />}
                    {strategy.status === "complete" && <CheckCircle2 className="h-3 w-3" />}
                    {strategy.status === "pending" && <Clock className="h-3 w-3" />}
                    {strategy.status.charAt(0).toUpperCase() + strategy.status.slice(1)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {strategy.pillars.map((pillar, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-400">
                      {pillar}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">{strategy.generatedAt}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Insights - Real-time */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50">
          <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <h2 className="font-semibold text-white">Industry Insights</h2>
            </div>
            <Link to="/strategy/insights" className="text-sm text-blue-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-700/50 max-h-[400px] overflow-y-auto">
            {insights.map((insight) => (
              <div key={insight.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
                    <FileText className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm line-clamp-2">{insight.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{insight.summary}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-600">{insight.source}</span>
                      <span className="px-1.5 py-0.5 bg-gray-700/50 rounded text-xs text-gray-400">{insight.category}</span>
                      <span className={cn(
                        "text-xs font-medium",
                        insight.relevance >= 90 ? "text-green-400" : insight.relevance >= 80 ? "text-yellow-400" : "text-gray-400"
                      )}>
                        {insight.relevance}% relevant
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {insight.extractedAt}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
