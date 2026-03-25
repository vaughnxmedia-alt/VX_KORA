import { useState, useEffect, useMemo } from "react"
import { PenTool, CheckCircle2, Eye, FileText, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClientDropdown } from "@/components/ClientDropdown"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://cjgqicpuwbflypcnhuak.supabase.co",
  import.meta.env.VITE_SUPABASE_ANON_KEY || ""
)

interface ContentStrategy {
  id: string
  client_id: string
  telegram_id: number
  content_pillars: { name: string; purpose: string; examples: string[]; percentage: number }[]
  posting_schedule: { frequency: string; recommended_times: string[]; consistency_tips: string[] }
  platform_strategy: { platform: string; priority: string; content_style: string; audience_behavior: string; best_practices: string[] }[]
  content_mix: { educational: number; relatable: number; commentary: number; promotional: number }
  example_week: { day: string; content_type: string; topic_idea: string; pillar: string }[]
  hashtag_bank: string[]
  growth_strategy: string
  key_tips: string[]
  generated_at: string
  created_at: string
}

export default function StrategyArchitect() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [strategies, setStrategies] = useState<ContentStrategy[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStrategy, setSelectedStrategy] = useState<ContentStrategy | null>(null)

  useEffect(() => {
    fetchStrategies()
  }, [])

  async function fetchStrategies() {
    setLoading(true)
    const { data, error } = await supabase
      .from("content_strategies")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching strategies:", error)
    } else {
      setStrategies(data || [])
    }
    setLoading(false)
  }

  const filteredStrategies = useMemo(() => {
    if (!selectedClientId) return strategies
    return strategies.filter(s => s.client_id === selectedClientId)
  }, [strategies, selectedClientId])

  const stats = useMemo(() => ({
    total: filteredStrategies.length,
    avgPillars: filteredStrategies.length > 0 
      ? (filteredStrategies.reduce((sum, s) => sum + (s.content_pillars?.length || 0), 0) / filteredStrategies.length).toFixed(1)
      : "0"
  }), [filteredStrategies])

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

  if (selectedStrategy) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button 
              onClick={() => setSelectedStrategy(null)}
              className="text-gray-400 hover:text-white text-sm mb-2"
            >
              ← Back to Strategies
            </button>
            <h1 className="text-2xl font-bold text-white">Content Strategy</h1>
            <p className="text-gray-400 text-sm">Generated {formatTime(selectedStrategy.created_at)}</p>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-4">Content Pillars</h3>
          <div className="grid grid-cols-3 gap-4">
            {(selectedStrategy.content_pillars || []).map((pillar, i) => (
              <div key={i} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-medium">{pillar.name}</p>
                  <span className="text-amber-400 text-sm">{pillar.percentage}%</span>
                </div>
                <p className="text-gray-400 text-sm mb-2">{pillar.purpose}</p>
                <div className="flex flex-wrap gap-1">
                  {(pillar.examples || []).slice(0, 3).map((ex, j) => (
                    <span key={j} className="px-2 py-0.5 bg-gray-600/50 rounded text-xs text-gray-300">{ex}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
            <h3 className="font-semibold text-white mb-3">Posting Schedule</h3>
            <p className="text-amber-400 font-medium mb-2">{selectedStrategy.posting_schedule?.frequency}</p>
            <div className="mb-3">
              <p className="text-gray-400 text-sm mb-1">Recommended Times:</p>
              <div className="flex flex-wrap gap-2">
                {(selectedStrategy.posting_schedule?.recommended_times || []).map((time, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-700/50 rounded text-sm text-gray-300">{time}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
            <h3 className="font-semibold text-white mb-3">Content Mix</h3>
            <div className="space-y-2">
              {Object.entries(selectedStrategy.content_mix || {}).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm capitalize w-24">{key}</span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${value}%` }} />
                  </div>
                  <span className="text-gray-300 text-sm w-10">{value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-4">Example Week</h3>
          <div className="grid grid-cols-7 gap-2">
            {(selectedStrategy.example_week || []).map((day, i) => (
              <div key={i} className="bg-gray-700/30 rounded-lg p-3">
                <p className="text-amber-400 font-medium text-sm mb-1">{day.day}</p>
                <p className="text-white text-sm">{day.content_type}</p>
                <p className="text-gray-400 text-xs mt-1">{day.topic_idea}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
            <h3 className="font-semibold text-white mb-3">Growth Strategy</h3>
            <p className="text-gray-300">{selectedStrategy.growth_strategy}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
            <h3 className="font-semibold text-white mb-3">Key Tips</h3>
            <ul className="space-y-2">
              {(selectedStrategy.key_tips || []).map((tip, i) => (
                <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-3">Hashtag Bank</h3>
          <div className="flex flex-wrap gap-2">
            {(selectedStrategy.hashtag_bank || []).map((tag, i) => (
              <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <PenTool className="h-6 w-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Strategy Architect</h1>
          </div>
          <p className="text-gray-400 text-sm">Content strategies generated from Telegram intake</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStrategies}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
          <ClientDropdown
            selectedClientId={selectedClientId}
            onClientChange={setSelectedClientId}
            allOptionLabel="All Clients"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Strategies</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Completed</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.total}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Avg Build Time</p>
          <p className="text-2xl font-bold text-white">1m 30s</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Avg Pillars</p>
          <p className="text-2xl font-bold text-white">{stats.avgPillars}</p>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-semibold text-white">Content Strategies</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filteredStrategies.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 mb-2">No content strategies yet</p>
            <p className="text-sm text-gray-500">Complete a Telegram intake to generate strategies</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Pillars</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Platforms</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStrategies.map((strategy) => (
                <tr key={strategy.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">Strategy #{strategy.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 text-sm">{formatTime(strategy.created_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">
                        Completed
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(strategy.content_pillars || []).slice(0, 2).map((pillar, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-300">
                          {pillar.name}
                        </span>
                      ))}
                      {(strategy.content_pillars?.length || 0) > 2 && (
                        <span className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-400">
                          +{strategy.content_pillars.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300">{strategy.platform_strategy?.length || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => setSelectedStrategy(strategy)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
