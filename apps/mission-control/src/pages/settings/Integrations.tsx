import { useState } from "react"
import { 
  Globe, CheckCircle2, XCircle, AlertCircle, Settings, RefreshCw,
  Database, Send, Search, Youtube, Twitter, Linkedin, MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"

type IntegrationStatus = "connected" | "disconnected" | "error"

interface Integration {
  id: string
  name: string
  description: string
  icon: typeof Globe
  status: IntegrationStatus
  lastSync: string | null
  configuredAt: string | null
  category: "data" | "social" | "messaging" | "ai"
}

const mockIntegrations: Integration[] = []

const statusConfig = {
  connected: { label: "Connected", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  disconnected: { label: "Disconnected", color: "text-gray-400", bg: "bg-gray-400/10", icon: XCircle },
  error: { label: "Error", color: "text-red-400", bg: "bg-red-400/10", icon: AlertCircle },
}

const categoryLabels = {
  data: "Data and Storage",
  social: "Social Media",
  messaging: "Messaging",
  ai: "AI and ML",
}

export default function Integrations() {
  const [integrations] = useState<Integration[]>(mockIntegrations)

  const connectedCount = integrations.filter(i => i.status === "connected").length
  const errorCount = integrations.filter(i => i.status === "error").length

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) acc[integration.category] = []
    acc[integration.category].push(integration)
    return acc
  }, {} as Record<string, Integration[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-gray-400 text-sm">Manage external service connections and API integrations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Integrations</p>
          <p className="text-2xl font-bold text-white">{integrations.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Connected</p>
          <p className="text-2xl font-bold text-emerald-400">{connectedCount}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Errors</p>
          <p className="text-2xl font-bold text-red-400">{errorCount}</p>
        </div>
      </div>

      {/* Integration Groups */}
      {Object.entries(groupedIntegrations).map(([category, items]) => (
        <div key={category}>
          <h2 className="text-lg font-semibold text-white mb-4">{categoryLabels[category as keyof typeof categoryLabels]}</h2>
          <div className="grid grid-cols-2 gap-4">
            {items.map((integration) => {
              const Icon = integration.icon
              const status = statusConfig[integration.status]
              const StatusIcon = status.icon
              
              return (
                <div key={integration.id} className="bg-gray-800/50 rounded-xl p-5 border border-white/5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2.5 rounded-xl",
                        integration.status === "connected" ? "bg-blue-600/20" : "bg-gray-700"
                      )}>
                        <Icon className={cn(
                          "h-6 w-6",
                          integration.status === "connected" ? "text-blue-400" : "text-gray-500"
                        )} />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{integration.name}</h3>
                        <p className="text-gray-500 text-xs">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={cn("h-4 w-4", status.color)} />
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    {integration.status === "connected" ? (
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Last sync: {integration.lastSync}</span>
                        <span>Configured: {integration.configuredAt}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs">Not configured</span>
                    )}
                    <div className="flex items-center gap-2">
                      {integration.status === "connected" && (
                        <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
