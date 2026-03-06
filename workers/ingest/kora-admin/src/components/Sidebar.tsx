import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { LayoutDashboard, Rss, PlayCircle, FileText, ListTodo, Sparkles, Database, Users, ChevronDown, ChevronRight, Brain, MessageSquareText, PenTool, Layers, Activity, Key, Shield, Globe, Home, GitBranch, Building2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem { to: string; label: string; icon?: LucideIcon }
interface AgentGroup { id: string; label: string; description: string; icon: LucideIcon; overviewPath: string; items: NavItem[] }

const agentGroups: AgentGroup[] = [
  {
    id: "core-intelligence", label: "Core Intelligence", description: "Global ingestion, distribution, enrichment, and RAG", icon: Brain, overviewPath: "/core",
    items: [
      { to: "/core/sources", label: "Sources", icon: Rss },
      { to: "/core/global-ingest", label: "Global Ingest Runs", icon: PlayCircle },
      { to: "/core/global-items", label: "Global Items", icon: FileText },
      { to: "/core/tenant-routing", label: "Tenant Routing", icon: GitBranch },
      { to: "/core/events", label: "Events Queue", icon: ListTodo },
      { to: "/core/enrichment", label: "Enrichment", icon: Sparkles },
      { to: "/core/rag-updates", label: "RAG Updates", icon: Database },
      { to: "/core/health", label: "Health and Logs", icon: Activity },
    ],
  },
  {
    id: "intake-clarifier", label: "Intake Clarifier", description: "User intake processing and profile structuring", icon: MessageSquareText, overviewPath: "/intake",
    items: [
      { to: "/intake/submissions", label: "Intake Submissions" },
      { to: "/intake/profiles", label: "Structured Profiles" },
      { to: "/intake/questions", label: "Clarifying Questions" },
      { to: "/intake/validation", label: "Validation" },
    ],
  },
  {
    id: "content-strategy", label: "Content Strategy", description: "Strategy generation and content planning", icon: PenTool, overviewPath: "/strategy",
    items: [
      { to: "/strategy/runs", label: "Strategy Runs" },
      { to: "/strategy/insights", label: "Insights" },
      { to: "/strategy/pillars", label: "Content Pillars" },
      { to: "/strategy/calendar", label: "Content Calendar" },
    ],
  },
  {
    id: "campaign-assembly", label: "Campaign Assembly", description: "Campaign creation and asset generation", icon: Layers, overviewPath: "/campaigns",
    items: [
      { to: "/campaigns/active", label: "Active Campaigns" },
      { to: "/campaigns/assets", label: "Asset Library" },
      { to: "/campaigns/templates", label: "Templates" },
      { to: "/campaigns/delivery", label: "Delivery" },
    ],
  },
]

const systemItems: NavItem[] = [
  { to: "/tenants", label: "Tenants", icon: Building2 },
  { to: "/users", label: "Users", icon: Users },
]

const settingsItems: NavItem[] = [
  { to: "/settings", label: "Integrations", icon: Globe },
  { to: "/settings/keys", label: "API Keys", icon: Key },
  { to: "/settings/access", label: "Access Control", icon: Shield },
]

export function Sidebar() {
  const location = useLocation()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const group of agentGroups) {
      if (location.pathname === group.overviewPath || group.items.some(item => location.pathname.startsWith(item.to))) {
        initial.add(group.id)
      }
    }
    if (initial.size === 0) initial.add("core-intelligence")
    return initial
  })

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const isGroupActive = (group: AgentGroup) => location.pathname === group.overviewPath || group.items.some(item => location.pathname.startsWith(item.to))

  return (
    <aside className="w-72 bg-background flex flex-col border-r border-white/5">
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-royal rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <div>
            <h1 className="text-white font-semibold tracking-tight">K.O.R.A</h1>
            <p className="text-grey-500 text-xs">Mission Control</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-3 overflow-y-auto scrollbar-thin">
        <NavLink to="/" end className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1", isActive ? "bg-royal text-white" : "text-grey-400 hover:text-white hover:bg-white/5")}>
          <LayoutDashboard className="h-4.5 w-4.5" />
          Overview
        </NavLink>

        <div className="mt-4 mb-2">
          <p className="px-3 text-xs font-semibold text-grey-500 uppercase tracking-wider">Agents</p>
        </div>

        <div className="space-y-0.5">
          {agentGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id)
            const isActive = isGroupActive(group)
            const Icon = group.icon

            return (
              <div key={group.id}>
                <button onClick={() => toggleGroup(group.id)} className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all", isActive ? "text-white bg-white/5" : "text-grey-400 hover:text-white hover:bg-white/5")}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{group.label}</span>
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-grey-500" /> : <ChevronRight className="h-3.5 w-3.5 text-grey-500" />}
                </button>

                <div className={cn("overflow-hidden transition-all duration-200", isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0")}>
                  <div className="ml-4 pl-3 border-l border-white/10 py-1 space-y-0.5">
                    <NavLink to={group.overviewPath} end className={({ isActive }) => cn("flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors", isActive ? "bg-royal/80 text-white" : "text-grey-500 hover:text-grey-300 hover:bg-white/5")}>
                      <Home className="h-3.5 w-3.5" />
                      Overview
                    </NavLink>
                    {group.items.map((item) => (
                      <NavLink key={item.to} to={item.to} className={({ isActive }) => cn("flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors", isActive ? "bg-royal/80 text-white" : "text-grey-500 hover:text-grey-300 hover:bg-white/5")}>
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 mb-2">
          <p className="px-3 text-xs font-semibold text-grey-500 uppercase tracking-wider">Users and Tenants</p>
        </div>

        <div className="space-y-0.5">
          {systemItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors", isActive ? "bg-royal text-white" : "text-grey-400 hover:text-white hover:bg-white/5")}>
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </NavLink>
            )
          })}
        </div>

        <div className="mt-6 mb-2">
          <p className="px-3 text-xs font-semibold text-grey-500 uppercase tracking-wider">Settings</p>
        </div>

        <div className="space-y-0.5 mb-4">
          {settingsItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} end={item.to === "/settings"} className={({ isActive }) => cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors", isActive ? "bg-royal text-white" : "text-grey-400 hover:text-white hover:bg-white/5")}>
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </nav>
      
      <div className="p-4 border-t border-white/10">
        <p className="text-grey-500 text-xs">VaughnX Technology LLC</p>
      </div>
    </aside>
  )
}
