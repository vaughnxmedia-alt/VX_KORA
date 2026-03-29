import { Link } from "react-router-dom"
import { PenTool, ArrowRight, FileText, Lightbulb, Layers, Calendar } from "lucide-react"
import { mockContentStrategies, mockTenants } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export function StrategyOverview() {
  const activeStrategies = mockContentStrategies.filter((s) => s.status === "active")
  const sections = [
    { to: "/strategy/runs", label: "Strategy Runs", description: "View generated strategies", icon: FileText, stat: `${mockContentStrategies.length} strategies` },
    { to: "/strategy/insights", label: "Insights", description: "Market and content insights", icon: Lightbulb, stat: "Coming soon" },
    { to: "/strategy/pillars", label: "Content Pillars", description: "Manage content pillars", icon: Layers, stat: "Coming soon" },
    { to: "/strategy/calendar", label: "Content Calendar", description: "Schedule and plan content", icon: Calendar, stat: "Coming soon" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
          <PenTool className="h-6 w-6 text-pink-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-grey-900">Content Strategy Agent</h1>
          <p className="text-grey-500">AI-powered strategy generation and content planning for each tenant.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-5">
        <h2 className="font-semibold text-grey-900 mb-4">Active Strategies</h2>
        {activeStrategies.length === 0 ? (
          <p className="text-sm text-grey-500 py-4">No strategies yet. Real runs will appear here after generation.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {activeStrategies.map((strategy) => {
              const tenant = mockTenants.find((t) => t.id === strategy.tenant_id)
              return (
                <Link key={strategy.id} to="/strategy/runs" className="bg-grey-50 rounded-lg p-4 hover:bg-grey-100 transition-colors">
                  <h3 className="font-medium text-grey-900">{strategy.title}</h3>
                  <p className="text-sm text-grey-500 mt-1">{tenant?.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Active</span>
                    <span className="text-xs text-grey-400">{strategy.strategy_data.content_pillars.length} pillars</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.to} to={section.to} className="bg-white rounded-xl shadow-card p-5 hover:shadow-card-hover transition-shadow group">
              <div className="flex items-start justify-between">
                <div className={cn("p-2.5 rounded-lg bg-grey-50 group-hover:bg-pink-50 transition-colors")}>
                  <Icon className="h-5 w-5 text-grey-500 group-hover:text-pink-600 transition-colors" />
                </div>
                <ArrowRight className="h-4 w-4 text-grey-300 group-hover:text-pink-600 transition-colors" />
              </div>
              <h3 className="font-semibold text-grey-900 mt-3">{section.label}</h3>
              <p className="text-sm text-grey-500 mt-1">{section.description}</p>
              <p className="text-sm font-medium text-pink-600 mt-2">{section.stat}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
