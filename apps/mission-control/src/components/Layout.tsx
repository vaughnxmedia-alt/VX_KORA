import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { AgentSidebar } from "./agents"

export function Layout() {
  const [agentSidebarCollapsed, setAgentSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
      <AgentSidebar 
        collapsed={agentSidebarCollapsed} 
        onToggleCollapse={() => setAgentSidebarCollapsed(!agentSidebarCollapsed)} 
      />
    </div>
  )
}
