import { useState } from "react"
import { Link } from "react-router-dom"
import { 
  Brain, Rss, PlayCircle, Database, GitBranch, Sparkles, ListTodo, Activity,
  ArrowRight, CheckCircle2, Clock, AlertCircle, TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SystemMetric {
  label: string
  value: string | number
  change?: string
  trend?: "up" | "down" | "neutral"
}

interface AgentStatus {
  id: string
  name: string
  status: "healthy" | "warning" | "error" | "idle"
  lastRun: string
  itemsProcessed: number
}

const systemMetrics: SystemMetric[] = [
  { label: "Sources Active", value: 47, change: "+3 this week", trend: "up" },
  { label: "Items in Pool", value: 1234, change: "+156 today", trend: "up" },
  { label: "RAG Documents", value: 892, change: "+24 this week", trend: "up" },
  { label: "Telegram Sends", value: 12, change: "Today", trend: "neutral" },
]

const coreAgents: AgentStatus[] = [
  { id: "source-discovery", name: "Source Discovery", status: "healthy", lastRun: "2 hours ago", itemsProcessed: 47 },
  { id: "source-processing", name: "Source Processing", status: "healthy", lastRun: "1 hour ago", itemsProcessed: 156 },
  { id: "core-intelligence", name: "Core Intelligence", status: "healthy", lastRun: "30 mins ago", itemsProcessed: 89 },
  { id: "telegram-delivery", name: "Telegram Delivery", status: "idle", lastRun: "7:00 AM", itemsProcessed: 3 },
  { id: "rag-intelligence", name: "RAG Intelligence", status: "healthy", lastRun: "45 mins ago", itemsProcessed: 24 },
]

const quickLinks = [
  { to: "/core/sources", label: "Manage Sources", icon: Rss, description: "47 active sources" },
  { to: "/core/ingest-runs", label: "Ingest Runs", icon: PlayCircle, description: "Last run 30 mins ago" },
  { to: "/core/global-pool", label: "Intelligence Pool", icon: Database, description: "1,234 items" },
  { to: "/core/tenant-rag", label: "Tenant RAG", icon: GitBranch, description: "5 tenants" },
  { to: "/core/enrichment", label: "Enrichment Queue", icon: Sparkles, description: "12 pending" },
  { to: "/core/events-queue", label: "Events Queue", icon: ListTodo, description: "8 events" },
  { to: "/core/health", label: "Health and Logs", icon: Activity, description: "All systems healthy" },
]

const statusConfig = {
  healthy: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  warning: { color: "text-amber-400", bg: "bg-amber-400/10", icon: Clock },
  error: { color: "text-red-400", bg: "bg-red-400/10", icon: AlertCircle },
  idle: { color: "text-gray-400", bg: "bg-gray-400/10", icon: Clock },
}

export default function CoreOverview() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Brain className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Core Intelligence</h1>
            <p className="text-gray-400 text-sm">Global ingestion, distribution, enrichment, and RAG management</p>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {systemMetrics.map((metric) => (
          <div key={metric.label} className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
            <p className="text-gray-400 text-sm mb-1">{metric.label}</p>
            <p className="text-2xl font-bold text-white">{metric.value}</p>
            {metric.change && (
              <p className={cn(
                "text-xs mt-1",
                metric.trend === "up" ? "text-emerald-400" : 
                metric.trend === "down" ? "text-red-400" : "text-gray-500"
              )}>
                {metric.trend === "up" && <TrendingUp className="inline h-3 w-3 mr-1" />}
                {metric.change}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Agent Status Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Agent Status</h2>
        <div className="grid grid-cols-5 gap-3">
          {coreAgents.map((agent) => {
            const config = statusConfig[agent.status]
            const StatusIcon = config.icon
            return (
              <div key={agent.id} className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", config.bg, config.color)}>
                    {agent.status}
                  </span>
                  <StatusIcon className={cn("h-4 w-4", config.color)} />
                </div>
                <p className="text-white font-medium text-sm mb-1">{agent.name}</p>
                <p className="text-gray-500 text-xs">Last: {agent.lastRun}</p>
                <p className="text-gray-500 text-xs">{agent.itemsProcessed} items</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Access</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                className="bg-gray-800/50 rounded-xl p-4 border border-white/5 hover:border-blue-500/30 hover:bg-gray-800 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                  <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
                </div>
                <p className="text-white font-medium text-sm">{link.label}</p>
                <p className="text-gray-500 text-xs">{link.description}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <div className="bg-gray-800/50 rounded-xl border border-white/5 divide-y divide-white/5">
          {[
            { action: "Source Discovery completed", time: "2 hours ago", details: "47 new sources discovered" },
            { action: "Intelligence batch processed", time: "1 hour ago", details: "156 items scored and routed" },
            { action: "Telegram brief sent", time: "7:00 AM", details: "Daily briefing to JahKnowsPR" },
            { action: "RAG documents updated", time: "45 mins ago", details: "24 documents embedded" },
            { action: "Enrichment completed", time: "30 mins ago", details: "12 items marked as Make Me Smarter" },
          ].map((activity, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{activity.action}</p>
                <p className="text-gray-500 text-xs">{activity.details}</p>
              </div>
              <span className="text-gray-500 text-xs">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
