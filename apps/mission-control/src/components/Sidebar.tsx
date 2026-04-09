import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { 
  LayoutDashboard, Rss, PlayCircle, FileText, ListTodo, Sparkles, Database, Users, 
  ChevronDown, ChevronRight, Brain, MessageSquareText, PenTool, Layers, Activity, 
  Key, Shield, Globe, Home, GitBranch, Building2, Bot, Search, Send, BookOpen,
  Filter, History, Bell, Settings, Cpu, type LucideIcon 
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem { 
  to: string
  label: string
  icon?: LucideIcon 
}

interface AgentGroup { 
  id: string
  label: string
  description: string
  icon: LucideIcon
  overviewPath: string
  items: NavItem[] 
}

// System Agents with drill-down pages
const systemAgentGroups: AgentGroup[] = [
  {
    id: "intake-agent",
    label: "Intake Agent",
    description: "User onboarding, brand building, and strategy creation",
    icon: MessageSquareText,
    overviewPath: "/intake",
    items: [
      { to: "/intake/clarifier", label: "Intake Clarifier", icon: MessageSquareText },
      { to: "/intake/brand-identity", label: "Brand Identity", icon: Shield },
      { to: "/intake/strategy-architect", label: "Strategy Architect", icon: PenTool },
      { to: "/intake/audience-intelligence", label: "Audience Intelligence", icon: Users },
    ],
  },
  {
    id: "core-intelligence",
    label: "Core Intelligence",
    description: "Ingestion, distribution, enrichment, and RAG",
    icon: Brain,
    overviewPath: "/core",
    items: [
      { to: "/core/sources", label: "Sources", icon: Rss },
      { to: "/core/ingest-runs", label: "Ingest Runs", icon: PlayCircle },
      { to: "/core/intelligence-pool", label: "Intelligence Pool", icon: Database },
      { to: "/core/tenant-rag", label: "Tenant RAG Route", icon: GitBranch },
      { to: "/core/enrichment", label: "Enrichment", icon: Sparkles },
      { to: "/core/events-queue", label: "Events Queue", icon: ListTodo },
      { to: "/core/health", label: "Health and Logs", icon: Activity },
    ],
  },
  {
    id: "source-discovery",
    label: "Source Discovery",
    description: "Discover relevant sources from RSS, YouTube, social, and search",
    icon: Search,
    overviewPath: "/agents/source-discovery",
    items: [],
  },
  {
    id: "source-processing",
    label: "Source Processing",
    description: "Scrape, transcribe, translate, normalize, and parse content",
    icon: Cpu,
    overviewPath: "/agents/source-processing",
    items: [],
  },
  {
    id: "content-strategy",
    label: "Content Strategy",
    description: "Generate content strategies from intelligence",
    icon: PenTool,
    overviewPath: "/agents/content-strategy",
    items: [],
  },
  {
    id: "campaign-assembly",
    label: "Campaign Assembly",
    description: "Convert strategies into campaign options",
    icon: Layers,
    overviewPath: "/agents/campaign-assembly",
    items: [],
  },
  {
    id: "telegram-delivery",
    label: "Telegram Delivery",
    description: "Send briefings and handle approvals via Telegram",
    icon: Send,
    overviewPath: "/agents/telegram-delivery",
    items: [],
  },
  {
    id: "rag-intelligence",
    label: "RAG Intelligence",
    description: "Maintain tenant-specific RAG and embeddings",
    icon: BookOpen,
    overviewPath: "/agents/rag-intelligence",
    items: [],
  },
]

const usersAndTenantsItems: NavItem[] = [
  { to: "/audience/queue", label: "Audience Queue", icon: Users },
  { to: "/clients", label: "Clients", icon: Building2 },
  { to: "/telegram-preferences", label: "Telegram Preferences", icon: Send },
  { to: "/approval-history", label: "Approval History", icon: History },
  { to: "/intelligence-filters", label: "Intelligence Filters", icon: Filter },
]

// Settings section
const settingsItems: NavItem[] = [
  { to: "/settings/integrations", label: "Integrations", icon: Globe },
  { to: "/settings/api-keys", label: "API Keys", icon: Key },
  { to: "/settings/llm-router", label: "LLM Router", icon: Bot },
  { to: "/settings/notifications", label: "Notifications", icon: Bell },
]

export function Sidebar() {
  const location = useLocation()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const group of systemAgentGroups) {
      if (location.pathname === group.overviewPath || 
          location.pathname.startsWith(group.overviewPath + "/") ||
          group.items.some(item => location.pathname.startsWith(item.to))) {
        initial.add(group.id)
      }
    }
    if (initial.size === 0) initial.add("intake-agent")
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

  const isGroupActive = (group: AgentGroup) => 
    location.pathname === group.overviewPath || 
    location.pathname.startsWith(group.overviewPath + "/") ||
    group.items.some(item => location.pathname.startsWith(item.to))

  return (
    <aside className="w-72 bg-gray-900 flex flex-col border-r border-white/5 h-full">
      {/* Header */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <div>
            <h1 className="text-white font-semibold tracking-tight">K.O.R.A</h1>
            <p className="text-gray-500 text-xs">Mission Control</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {/* Overview */}
        <NavLink 
          to="/" 
          end 
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-4",
            isActive ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Overview
        </NavLink>

        {/* System Agents Section */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            System Agents
          </p>

          <div className="space-y-0.5">
            {systemAgentGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id)
              const isActive = isGroupActive(group)
              const Icon = group.icon
              const hasSubItems = group.items.length > 0

              return (
                <div key={group.id}>
                  {hasSubItems ? (
                    <button 
                      onClick={() => toggleGroup(group.id)} 
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        isActive ? "text-white bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{group.label}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                      )}
                    </button>
                  ) : (
                    <NavLink
                      to={group.overviewPath}
                      className={({ isActive }) => cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        isActive ? "text-white bg-blue-600/80" : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{group.label}</span>
                    </NavLink>
                  )}

                  {hasSubItems && (
                    <div className={cn(
                      "overflow-hidden transition-all duration-200",
                      isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    )}>
                      <div className="ml-4 pl-3 border-l border-white/10 py-1 space-y-0.5">
                        <NavLink 
                          to={group.overviewPath} 
                          end 
                          className={({ isActive }) => cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                            isActive ? "bg-blue-600/80 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                          )}
                        >
                          <Home className="h-3.5 w-3.5" />
                          Overview
                        </NavLink>
                        {group.items.map((item) => {
                          const ItemIcon = item.icon
                          return (
                            <NavLink 
                              key={item.to} 
                              to={item.to} 
                              className={({ isActive }) => cn(
                                "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                                isActive ? "bg-blue-600/80 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                              )}
                            >
                              {ItemIcon && <ItemIcon className="h-3.5 w-3.5" />}
                              {item.label}
                            </NavLink>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Clients & delivery */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Clients and delivery
          </p>

          <div className="space-y-0.5">
            {usersAndTenantsItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  className={({ isActive }) => cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </div>

        {/* Settings Section */}
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Settings
          </p>

          <div className="space-y-0.5">
            {settingsItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  className={({ isActive }) => cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </div>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <p className="text-gray-500 text-xs">VaughnX Technology LLC</p>
      </div>
    </aside>
  )
}
