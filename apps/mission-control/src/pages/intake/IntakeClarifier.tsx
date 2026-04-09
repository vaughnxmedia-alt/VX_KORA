import { useState, useEffect, useMemo } from "react"
import { MessageSquareText, CheckCircle2, Clock, RefreshCw, Eye, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClientDropdown } from "@/components/ClientDropdown"
import { supabase } from "@/lib/supabase"

type IntakeStatus = "intro" | "brand_identity" | "strategy" | "audience" | "completed" | "generating"

interface IntakeSession {
  id: string
  telegram_id: number
  telegram_username: string | null
  phase: IntakeStatus
  responses: Record<string, string>
  started_at: string
  last_activity: string
  client_id: string | null
}

const TOTAL_QUESTIONS = 33

const statusConfig: Record<IntakeStatus, { color: string; bg: string; icon: typeof Clock; label: string }> = {
  intro: { color: "text-gray-400", bg: "bg-gray-400/10", icon: Clock, label: "Introduction" },
  brand_identity: { color: "text-purple-400", bg: "bg-purple-400/10", icon: RefreshCw, label: "Brand Identity" },
  strategy: { color: "text-blue-400", bg: "bg-blue-400/10", icon: RefreshCw, label: "Strategy" },
  audience: { color: "text-cyan-400", bg: "bg-cyan-400/10", icon: RefreshCw, label: "Audience" },
  generating: { color: "text-amber-400", bg: "bg-amber-400/10", icon: RefreshCw, label: "Generating..." },
  completed: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2, label: "Completed" },
}

export default function IntakeClarifier() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [intakes, setIntakes] = useState<IntakeSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIntakes()
  }, [])

  async function fetchIntakes() {
    setLoading(true)
    const { data, error } = await supabase
      .from("telegram_intake_sessions")
      .select("*")
      .order("last_activity", { ascending: false })

    if (error) {
      console.error("Error fetching intakes:", error)
    } else {
      setIntakes(data || [])
    }
    setLoading(false)
  }

  const filteredIntakes = useMemo(() => {
    if (!selectedClientId) return intakes
    return intakes.filter(i => i.client_id === selectedClientId)
  }, [intakes, selectedClientId])

  const stats = useMemo(() => {
    const completed = filteredIntakes.filter(i => i.phase === "completed").length
    const inProgress = filteredIntakes.filter(i => !["completed", "generating"].includes(i.phase)).length
    const generating = filteredIntakes.filter(i => i.phase === "generating").length
    return { completed, inProgress, generating, total: filteredIntakes.length }
  }, [filteredIntakes])

  function formatTime(timestamp: string) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
    return `${days} day${days > 1 ? "s" : ""} ago`
  }

  function getQuestionsAnswered(responses: Record<string, string>) {
    return Object.keys(responses).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MessageSquareText className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Intake Clarifier</h1>
          </div>
          <p className="text-gray-400 text-sm">Telegram @koranewstrategy intake sessions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchIntakes}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <Send className="h-4 w-4 text-cyan-400" />
            <span className="text-sm text-cyan-400">@koranewstrategy</span>
          </div>
          <ClientDropdown
            selectedClientId={selectedClientId}
            onClientChange={setSelectedClientId}
            allOptionLabel="All Clients"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Sessions</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Completed</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">In Progress</p>
          <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Generating</p>
          <p className="text-2xl font-bold text-amber-400">{stats.generating}</p>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-semibold text-white">Telegram Intake Sessions</h2>
          <p className="text-sm text-gray-500 mt-1">Users who started @koranewstrategy command</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filteredIntakes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 mb-2">No intake sessions yet</p>
            <p className="text-sm text-gray-500">Have users type @koranewstrategy in Telegram to start</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Telegram</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Phase</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Last Activity</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredIntakes.map((intake) => {
                const status = statusConfig[intake.phase]
                const StatusIcon = status.icon
                const questionsAnswered = getQuestionsAnswered(intake.responses)
                const progress = (questionsAnswered / TOTAL_QUESTIONS) * 100
                
                return (
                  <tr key={intake.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">
                        {intake.responses?.business_name || intake.responses?.welcome || `User ${intake.telegram_id}`}
                      </span>
                      <p className="text-xs text-gray-500">Started {formatTime(intake.started_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {intake.telegram_username ? (
                        <span className="text-cyan-400 text-sm">@{intake.telegram_username}</span>
                      ) : (
                        <span className="text-gray-500 text-sm">ID: {intake.telegram_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={cn("h-4 w-4", status.color, intake.phase === "generating" && "animate-spin")} />
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}>
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              intake.phase === "completed" ? "bg-emerald-500" : "bg-blue-500"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{questionsAnswered}/{TOTAL_QUESTIONS}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-sm">{formatTime(intake.last_activity)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl p-6 border border-cyan-500/20">
        <h3 className="font-semibold text-white mb-2">How @koranewstrategy Works</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 text-xs font-bold">1</div>
            <div>
              <p className="text-white font-medium">User Types Command</p>
              <p className="text-gray-400">@koranewstrategy in Telegram</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 text-xs font-bold">2</div>
            <div>
              <p className="text-white font-medium">Guided Intake</p>
              <p className="text-gray-400">33 strategic questions</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 text-xs font-bold">3</div>
            <div>
              <p className="text-white font-medium">AI Generation</p>
              <p className="text-gray-400">OpenAI builds strategy</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 text-xs font-bold">4</div>
            <div>
              <p className="text-white font-medium">Delivery</p>
              <p className="text-gray-400">3 documents sent via Telegram</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
