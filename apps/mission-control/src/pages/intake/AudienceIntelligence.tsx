import { useState, useEffect, useMemo } from "react"
import { Users, CheckCircle2, Eye, FileText, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClientDropdown } from "@/components/ClientDropdown"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://cjgqicpuwbflypcnhuak.supabase.co",
  import.meta.env.VITE_SUPABASE_ANON_KEY || ""
)

interface AudienceAnalysis {
  id: string
  client_id: string
  telegram_id: number
  overview: string
  primary_platforms: string[]
  core_positioning: string
  audience_psychology: string
  audience_segments: { name: string; age_range: string; examples: string[]; pain_point: string; why_they_follow: string }[]
  platform_breakdown: { platform: string; age_range: string; audience_description: string; what_they_want: string; content_style: string }[]
  audience_motivations: string[]
  content_types_that_attract: { type: string; examples: string[] }[]
  personality_types: { name: string; age_range: string; platforms: string[]; what_they_want: string }[]
  audience_flywheel: string
  generated_at: string
  created_at: string
}

export default function AudienceIntelligence() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<AudienceAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<AudienceAnalysis | null>(null)

  useEffect(() => {
    fetchAnalyses()
  }, [])

  async function fetchAnalyses() {
    setLoading(true)
    const { data, error } = await supabase
      .from("audience_analyses")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching analyses:", error)
    } else {
      setAnalyses(data || [])
    }
    setLoading(false)
  }

  const filteredAnalyses = useMemo(() => {
    if (!selectedClientId) return analyses
    return analyses.filter(a => a.client_id === selectedClientId)
  }, [analyses, selectedClientId])

  const stats = useMemo(() => ({
    total: filteredAnalyses.length,
    totalPersonas: filteredAnalyses.reduce((sum, a) => sum + (a.personality_types?.length || 0), 0),
    totalSegments: filteredAnalyses.reduce((sum, a) => sum + (a.audience_segments?.length || 0), 0)
  }), [filteredAnalyses])

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

  if (selectedAnalysis) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button 
              onClick={() => setSelectedAnalysis(null)}
              className="text-gray-400 hover:text-white text-sm mb-2"
            >
              ← Back to Analyses
            </button>
            <h1 className="text-2xl font-bold text-white">Audience Analysis</h1>
            <p className="text-gray-400 text-sm">Generated {formatTime(selectedAnalysis.created_at)}</p>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-3">Overview</h3>
          <p className="text-gray-300">{selectedAnalysis.overview}</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
            <h3 className="font-semibold text-white mb-3">Core Positioning</h3>
            <p className="text-gray-300">{selectedAnalysis.core_positioning}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
            <h3 className="font-semibold text-white mb-3">Primary Platforms</h3>
            <div className="flex flex-wrap gap-2">
              {(selectedAnalysis.primary_platforms || []).map((platform, i) => (
                <span key={i} className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm">{platform}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-3">Audience Psychology</h3>
          <p className="text-gray-300">{selectedAnalysis.audience_psychology}</p>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-4">Audience Segments</h3>
          <div className="grid grid-cols-3 gap-4">
            {(selectedAnalysis.audience_segments || []).map((segment, i) => (
              <div key={i} className="bg-gray-700/30 rounded-lg p-4">
                <p className="text-white font-medium">{segment.name}</p>
                <p className="text-cyan-400 text-sm mb-2">{segment.age_range}</p>
                <p className="text-gray-400 text-sm mb-2">{segment.pain_point}</p>
                <div className="flex flex-wrap gap-1">
                  {(segment.examples || []).slice(0, 3).map((ex, j) => (
                    <span key={j} className="px-2 py-0.5 bg-gray-600/50 rounded text-xs text-gray-300">{ex}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-4">Personality Types</h3>
          <div className="grid grid-cols-2 gap-4">
            {(selectedAnalysis.personality_types || []).map((persona, i) => (
              <div key={i} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-medium">{persona.name}</p>
                  <span className="text-cyan-400 text-sm">{persona.age_range}</span>
                </div>
                <p className="text-gray-400 text-sm mb-2">{persona.what_they_want}</p>
                <div className="flex flex-wrap gap-1">
                  {(persona.platforms || []).map((p, j) => (
                    <span key={j} className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-3">Audience Motivations</h3>
          <ul className="space-y-2">
            {(selectedAnalysis.audience_motivations || []).map((motivation, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-cyan-400">•</span>
                {motivation}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-white/5">
          <h3 className="font-semibold text-white mb-3">Audience Flywheel</h3>
          <p className="text-gray-300">{selectedAnalysis.audience_flywheel}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Users className="h-6 w-6 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Audience Intelligence</h1>
          </div>
          <p className="text-gray-400 text-sm">Target audience analyses from Telegram intake</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalyses}
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
          <p className="text-gray-400 text-sm mb-1">Total Analyses</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Personas</p>
          <p className="text-2xl font-bold text-white">{stats.totalPersonas}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Segments</p>
          <p className="text-2xl font-bold text-white">{stats.totalSegments}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Avg Analysis Time</p>
          <p className="text-2xl font-bold text-white">2m 15s</p>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-semibold text-white">Audience Analyses</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filteredAnalyses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 mb-2">No audience analyses yet</p>
            <p className="text-sm text-gray-500">Complete a Telegram intake to generate analyses</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Analysis</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Segments</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Personas</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Platforms</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAnalyses.map((analysis) => (
                <tr key={analysis.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">Analysis #{analysis.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 text-sm">{formatTime(analysis.created_at)}</span>
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
                    <span className="text-gray-300">{analysis.audience_segments?.length || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300">{analysis.personality_types?.length || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(analysis.primary_platforms || []).slice(0, 2).map((platform, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-300">
                          {platform}
                        </span>
                      ))}
                      {(analysis.primary_platforms?.length || 0) > 2 && (
                        <span className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-400">
                          +{analysis.primary_platforms.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => setSelectedAnalysis(analysis)}
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
