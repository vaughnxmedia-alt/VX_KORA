import { useEffect, useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Key,
  Bot,
  Bell,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  pipelineAgentGroups,
  pathnameMatchesGroup,
  type SidebarAgentGroup,
} from "@/components/SidebarNavConfig"

const settingsItems: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/settings/api-keys", label: "API Keys", icon: Key },
  { to: "/settings/llm-router", label: "LLM Router", icon: Bot },
  { to: "/settings/notifications", label: "Notifications", icon: Bell },
]

export function Sidebar() {
  const location = useLocation()

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const group of pipelineAgentGroups) {
      if (pathnameMatchesGroup(location.pathname, group)) initial.add(group.id)
    }
    if (initial.size === 0) initial.add("intake-clarifier")
    return initial
  })

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      for (const group of pipelineAgentGroups) {
        if (pathnameMatchesGroup(location.pathname, group)) next.add(group.id)
      }
      return next
    })
  }, [location.pathname])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const n = new Set(prev)
      if (n.has(groupId)) n.delete(groupId)
      else n.add(groupId)
      return n
    })
  }

  const isGroupActive = (group: SidebarAgentGroup) =>
    pathnameMatchesGroup(location.pathname, group)

  return (
    <aside className="w-72 bg-gray-900 flex flex-col border-r border-white/5 h-full">
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

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-4",
              isActive ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5",
            )
          }
        >
          <LayoutDashboard className="h-4 w-4" />
          Overview
        </NavLink>

        <div className="mb-2">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Navigation
          </p>

          <div className="space-y-0.5">
            {pipelineAgentGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id)
              const active = isGroupActive(group)
              const Icon = group.icon
              const isDirectLink = group.items.length === 0

              if (isDirectLink) {
                return (
                  <NavLink
                    key={group.id}
                    to={group.overviewPath}
                    title={group.caption}
                    className={({ isActive }) =>
                      cn(
                        "flex flex-col items-stretch gap-0.5 px-3 py-2 rounded-lg text-left transition-all",
                        isActive || active ? "text-white bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5",
                      )
                    }
                  >
                    <div className="flex items-center gap-2.5 w-full">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-sm font-medium truncate">{group.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-snug pl-7 pr-1">{group.caption}</p>
                  </NavLink>
                )
              }

              return (
                <div key={group.id}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "w-full flex flex-col items-stretch gap-0.5 px-3 py-2 rounded-lg text-left transition-all",
                      active ? "text-white bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-center gap-2.5 w-full">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-sm font-medium truncate">{group.label}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 leading-snug pl-7 pr-1">{group.caption}</p>
                  </button>

                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      isExpanded ? "max-h-[560px] opacity-100" : "max-h-0 opacity-0",
                    )}
                  >
                    <div className="ml-4 pl-3 border-l border-white/10 py-1 space-y-0.5">
                      <NavLink
                        to={group.overviewPath}
                        end
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                            isActive
                              ? "bg-blue-600/80 text-white"
                              : "text-gray-500 hover:text-gray-300 hover:bg-white/5",
                          )
                        }
                        title={group.caption}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {group.overviewLabel ?? "Overview"}
                      </NavLink>

                      {group.items.length > 0 && (
                        <>
                          {group.items.map((item) => {
                            const ItemIcon = item.icon
                            return (
                              <NavLink
                                key={item.to}
                                to={item.to}
                                title={item.hint}
                                className={({ isActive }) =>
                                  cn(
                                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                                    isActive
                                      ? "bg-blue-600/80 text-white"
                                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5",
                                  )
                                }
                              >
                                <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </NavLink>
                            )
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

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
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-white/5">
        <p className="text-gray-500 text-xs">VaughnX Technology LLC</p>
      </div>
    </aside>
  )
}
