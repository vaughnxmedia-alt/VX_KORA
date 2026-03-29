import { useState } from "react"
import { 
  Bell, Mail, Send, Slack, CheckCircle2, AlertTriangle, XCircle,
  Info, Settings, Volume2, VolumeX
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationChannel {
  id: string
  type: "email" | "telegram" | "slack"
  name: string
  destination: string
  isEnabled: boolean
  isVerified: boolean
}

interface NotificationRule {
  id: string
  name: string
  description: string
  event: string
  channels: string[]
  isEnabled: boolean
  severity: "info" | "warning" | "critical"
}

const mockChannels: NotificationChannel[] = []
const mockRules: NotificationRule[] = []

const channelIcons = {
  email: Mail,
  telegram: Send,
  slack: Slack,
}

const severityConfig = {
  info: { color: "text-blue-400", bg: "bg-blue-400/10", icon: Info },
  warning: { color: "text-amber-400", bg: "bg-amber-400/10", icon: AlertTriangle },
  critical: { color: "text-red-400", bg: "bg-red-400/10", icon: XCircle },
}

export default function Notifications() {
  const [channels] = useState<NotificationChannel[]>(mockChannels)
  const [rules, setRules] = useState<NotificationRule[]>(mockRules)

  const enabledRules = rules.filter(r => r.isEnabled).length
  const activeChannels = channels.filter(c => c.isEnabled && c.isVerified).length

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, isEnabled: !r.isEnabled } : r
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-gray-400 text-sm">Configure alert channels and notification rules</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Active Channels</p>
          <p className="text-2xl font-bold text-emerald-400">{activeChannels}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Enabled Rules</p>
          <p className="text-2xl font-bold text-blue-400">{enabledRules}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Critical Alerts</p>
          <p className="text-2xl font-bold text-red-400">{rules.filter(r => r.severity === "critical" && r.isEnabled).length}</p>
        </div>
      </div>

      {/* Channels */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Notification Channels</h2>
          <button className="text-blue-400 text-sm hover:text-blue-300">Add Channel</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {channels.map((channel) => {
            const Icon = channelIcons[channel.type]
            return (
              <div key={channel.id} className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      channel.isEnabled ? "bg-blue-600/20" : "bg-gray-700"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        channel.isEnabled ? "text-blue-400" : "text-gray-500"
                      )} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{channel.name}</p>
                      <p className="text-gray-500 text-xs capitalize">{channel.type}</p>
                    </div>
                  </div>
                  <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm mb-3">{channel.destination}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {channel.isVerified ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-400 text-xs">Verified</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <span className="text-amber-400 text-xs">Not Verified</span>
                      </>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    channel.isEnabled ? "bg-emerald-400/10 text-emerald-400" : "bg-gray-400/10 text-gray-400"
                  )}>
                    {channel.isEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rules */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Notification Rules</h2>
          <button className="text-blue-400 text-sm hover:text-blue-300">Add Rule</button>
        </div>
        <div className="space-y-3">
          {rules.map((rule) => {
            const severity = severityConfig[rule.severity]
            const SeverityIcon = severity.icon
            const ruleChannels = channels.filter(c => rule.channels.includes(c.id))
            
            return (
              <div key={rule.id} className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        rule.isEnabled ? "bg-blue-600/20" : "bg-gray-700"
                      )}
                    >
                      {rule.isEnabled ? (
                        <Volume2 className="h-5 w-5 text-blue-400" />
                      ) : (
                        <VolumeX className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium">{rule.name}</p>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", severity.bg, severity.color)}>
                          {rule.severity}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {ruleChannels.length > 0 ? (
                        ruleChannels.map((channel) => {
                          const ChannelIcon = channelIcons[channel.type]
                          return (
                            <div 
                              key={channel.id}
                              className="p-1.5 bg-gray-700 rounded"
                              title={channel.name}
                            >
                              <ChannelIcon className="h-4 w-4 text-gray-400" />
                            </div>
                          )
                        })
                      ) : (
                        <span className="text-gray-500 text-sm">No channels</span>
                      )}
                    </div>
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
    </div>
  )
}
