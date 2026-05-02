import { useState, useEffect, useMemo } from "react"
import { Shield, CheckCircle2, Clock, Eye, FileText, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClientDropdown } from "@/components/ClientDropdown"
import { ContentStrategyReportSections } from "@/components/ContentStrategyReportSections"
import type { ContentStrategyRecord } from "@/components/ContentStrategyReportSections"
import { OFFICIAL_CLIENT_ID } from "@/hooks/useClients"
import { supabase } from "@/lib/supabase"

interface BrandBlueprint {
  id: string
  client_id: string
  telegram_id: number
  business_name: string
  business_type: string
  mission: string
  vision: string
  core_values: { value: string; explanation: string }[]
  unique_value_proposition: string
  brand_personality: string[]
  brand_voice: string
  avoid_perceptions: string[]
  brand_story: string
  positioning_statement: string
  generated_at: string
  created_at: string
}

export default function BrandIdentity() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(OFFICIAL_CLIENT_ID)
  const [blueprints, setBlueprints] = useState<BrandBlueprint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBlueprint, setSelectedBlueprint] = useState<BrandBlueprint | null>(null)
  const [brandStrategy, setBrandStrategy] = useState<ContentStrategyRecord | null>(null)
  const [strategyLoading, setStrategyLoading] = useState(false)

  useEffect(() => {
    fetchBlueprints()
  }, [])

  async function fetchBlueprints() {
    setLoading(true)
    const { data, error } = await supabase
      .from("brand_blueprints")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching blueprints:", error)
    } else {
      setBlueprints(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!selectedBlueprint?.client_id) {
      setBrandStrategy(null)
      return
    }
    let cancelled = false
    async function loadStrategy() {
      setStrategyLoading(true)
      const { data, error } = await supabase
        .from("content_strategies")
        .select("*")
        .eq("client_id", selectedBlueprint.client_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled) {
        if (error) {
          console.error("Error fetching content strategy:", error)
          setBrandStrategy(null)
        } else {
          setBrandStrategy((data as ContentStrategyRecord) ?? null)
        }
        setStrategyLoading(false)
      }
    }
    void loadStrategy()
    return () => {
      cancelled = true
    }
  }, [selectedBlueprint?.client_id])

  const filteredBlueprints = useMemo(() => {
    if (!selectedClientId) return blueprints
    return blueprints.filter(b => b.client_id === selectedClientId)
  }, [blueprints, selectedClientId])

  const stats = useMemo(() => ({
    total: filteredBlueprints.length,
    completed: filteredBlueprints.length,
    avgBuildTime: "45s",
    completionRate: "100%"
  }), [filteredBlueprints])

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

  function getCompleteness(bp: BrandBlueprint) {
    let complete = 0
    if (bp.mission) complete++
    if (bp.vision) complete++
    if (bp.core_values?.length) complete++
    if (bp.brand_voice) complete++
    if (bp.positioning_statement) complete++
    return (complete / 5) * 100
  }

  if (selectedBlueprint) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button 
              onClick={() => setSelectedBlueprint(null)}
              className="text-gray-400 hover:text-white text-sm mb-2"
            >
              ← Back to identities
            </button>
            <h1 className="text-2xl font-bold text-white">{selectedBlueprint.business_name}</h1>
            <p className="text-gray-400 text-sm">{selectedBlueprint.business_type}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
            <h3 className="font-semibold text-white mb-3">Mission</h3>
            <p className="text-gray-300">{selectedBlueprint.mission}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
            <h3 className="font-semibold text-white mb-3">Vision</h3>
            <p className="text-gray-300">{selectedBlueprint.vision}</p>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-3">Core Values</h3>
          <div className="grid grid-cols-2 gap-4">
            {(selectedBlueprint.core_values || []).map((cv, i) => (
              <div key={i} className="bg-gray-700/30 rounded-lg p-4">
                <p className="text-white font-medium">{cv.value}</p>
                <p className="text-gray-400 text-sm mt-1">{cv.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-3">Brand Voice</h3>
          <p className="text-gray-300">{selectedBlueprint.brand_voice}</p>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-3">Positioning Statement</h3>
          <p className="text-gray-300">{selectedBlueprint.positioning_statement}</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
            <h3 className="font-semibold text-white mb-3">Brand Personality</h3>
            <div className="flex flex-wrap gap-2">
              {(selectedBlueprint.brand_personality || []).map((trait, i) => (
                <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                  {trait}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
            <h3 className="font-semibold text-white mb-3">Avoid Perceptions</h3>
            <div className="flex flex-wrap gap-2">
              {(selectedBlueprint.avoid_perceptions || []).map((item, i) => (
                <span key={i} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-3">Brand Story</h3>
          <p className="text-gray-300 whitespace-pre-wrap">{selectedBlueprint.brand_story}</p>
        </div>

        {strategyLoading ? (
          <div className="text-gray-500 text-sm py-6">Loading brand strategy…</div>
        ) : brandStrategy ? (
          <ContentStrategyReportSections strategy={brandStrategy} />
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-gray-500 text-sm">
            No content strategy document yet for this client. It is generated after intake completes and
            processing runs.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Shield className="h-6 w-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Brand Identity</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Full report: brand identity plus content strategy once Strategy Session and Telegram intake data are
            processed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBlueprints}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
          <ClientDropdown
            selectedClientId={selectedClientId}
            onClientChange={setSelectedClientId}
            allOptionLabel="All KORA Clients"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total identities</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Completed</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Avg Build Time</p>
          <p className="text-2xl font-bold text-white">{stats.avgBuildTime}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Completion Rate</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.completionRate}</p>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-semibold text-white">Brand identities</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filteredBlueprints.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 mb-2">No brand identities yet</p>
            <p className="text-sm text-gray-500">Complete intake processing to generate reports</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Components</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Completeness</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBlueprints.map((bp) => {
                const completeness = getCompleteness(bp)
                
                return (
                  <tr key={bp.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{bp.business_name}</span>
                      <p className="text-xs text-gray-500">{bp.business_type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-sm">{formatTime(bp.created_at)}</span>
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
                      <div className="flex items-center gap-1">
                        {["M", "Vi", "Va", "Vo", "P"].map((label, i) => {
                          const checks = [!!bp.mission, !!bp.vision, !!bp.core_values?.length, !!bp.brand_voice, !!bp.positioning_statement]
                          const isComplete = checks[i]
                          return (
                            <span 
                              key={label}
                              className={cn(
                                "w-6 h-6 rounded text-xs flex items-center justify-center font-medium",
                                isComplete ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-700 text-gray-500"
                              )}
                            >
                              {label}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${completeness}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{completeness}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => setSelectedBlueprint(bp)}
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
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
