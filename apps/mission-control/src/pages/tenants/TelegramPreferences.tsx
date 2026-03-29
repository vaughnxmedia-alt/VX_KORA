import { useState } from "react"
import { 
  Send, CheckCircle2, XCircle, Clock, AlertCircle, Settings,
  Bell, Sparkles, Calendar, MoreHorizontal, RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

type DeliveryFrequency = "daily" | "weekly" | "none"

interface TelegramPref {
  id: string
  tenant: string
  user: string
  chatId: string
  isActive: boolean
  isVerified: boolean
  deliveryFrequency: DeliveryFrequency
  briefingTime: string
  timezone: string
  includeContentStrategy: boolean
  includeIndustryInsights: boolean
  includeEventAlerts: boolean
  allowMakeMeSmarter: boolean
  lastMessageSent: string | null
  nextScheduled: string | null
  consecutiveFailures: number
}

const mockPrefs: TelegramPref[] = []

const frequencyConfig: Record<DeliveryFrequency, { label: string; color: string }> = {
  daily: { label: "Daily", color: "text-emerald-400" },
  weekly: { label: "Weekly", color: "text-blue-400" },
  none: { label: "None", color: "text-gray-400" },
}

export default function TelegramPreferences() {
  const [prefs] = useState<TelegramPref[]>(mockPrefs)

  const activeCount = prefs.filter(p => p.isActive && p.isVerified).length
  const dailyCount = prefs.filter(p => p.deliveryFrequency === "daily" && p.isActive).length
  const weeklyCount = prefs.filter(p => p.deliveryFrequency === "weekly" && p.isActive).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Telegram Preferences</h1>
          <p className="text-gray-400 text-sm">Manage Telegram delivery settings for all users</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
          <RefreshCw className="h-4 w-4" />
          Sync All
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Configured</p>
          <p className="text-2xl font-bold text-white">{prefs.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Active and Verified</p>
          <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Daily Briefings</p>
          <p className="text-2xl font-bold text-blue-400">{dailyCount}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Weekly Briefings</p>
          <p className="text-2xl font-bold text-purple-400">{weeklyCount}</p>
        </div>
      </div>

      {/* Preferences Cards */}
      <div className="space-y-4">
        {prefs.map((pref) => (
          <div key={pref.id} className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-xl",
                    pref.isActive && pref.isVerified ? "bg-blue-600/20" : "bg-gray-700"
                  )}>
                    <Send className={cn(
                      "h-6 w-6",
                      pref.isActive && pref.isVerified ? "text-blue-400" : "text-gray-500"
                    )} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{pref.user}</h3>
                    <p className="text-gray-500 text-sm">{pref.tenant}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {pref.isVerified ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-400 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      Not Verified
                    </span>
                  )}
                  <span className={cn(
                    "text-sm font-medium px-2 py-0.5 rounded-full",
                    pref.isActive ? "bg-emerald-400/10 text-emerald-400" : "bg-gray-400/10 text-gray-400"
                  )}>
                    {pref.isActive ? "Active" : "Inactive"}
                  </span>
                  <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Frequency</p>
                  <p className={cn("font-medium", frequencyConfig[pref.deliveryFrequency].color)}>
                    {frequencyConfig[pref.deliveryFrequency].label}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Time</p>
                  <p className="text-white">{pref.briefingTime} ({pref.timezone.split("/")[1]})</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Last Sent</p>
                  <p className="text-gray-300">{pref.lastMessageSent || "Never"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Next Scheduled</p>
                  <p className="text-gray-300">{pref.nextScheduled || "-"}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Bell className={cn("h-4 w-4", pref.includeContentStrategy ? "text-blue-400" : "text-gray-600")} />
                  <span className={cn("text-sm", pref.includeContentStrategy ? "text-gray-300" : "text-gray-600")}>
                    Content Strategy
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Bell className={cn("h-4 w-4", pref.includeIndustryInsights ? "text-blue-400" : "text-gray-600")} />
                  <span className={cn("text-sm", pref.includeIndustryInsights ? "text-gray-300" : "text-gray-600")}>
                    Industry Insights
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className={cn("h-4 w-4", pref.includeEventAlerts ? "text-blue-400" : "text-gray-600")} />
                  <span className={cn("text-sm", pref.includeEventAlerts ? "text-gray-300" : "text-gray-600")}>
                    Event Alerts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className={cn("h-4 w-4", pref.allowMakeMeSmarter ? "text-purple-400" : "text-gray-600")} />
                  <span className={cn("text-sm", pref.allowMakeMeSmarter ? "text-gray-300" : "text-gray-600")}>
                    Make Me Smarter
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
