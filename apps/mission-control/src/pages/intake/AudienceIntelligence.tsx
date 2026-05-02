import { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { BarChart3, CheckCircle2, Layers, RefreshCw, Star, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { ClientDropdown } from "@/components/ClientDropdown"
import { OFFICIAL_CLIENT_ID } from "@/hooks/useClients"
import { supabase } from "@/lib/supabase"

const AD_PLATFORMS = ["Google", "Facebook", "Instagram", "TikTok", "LinkedIn", "YouTube"]
const TEST_STATUSES = ["draft", "ready", "testing", "winner", "paused", "retired"] as const
const RATING_FIELDS = ["quality", "buyingIntent", "size", "messageFit", "creativeFit"] as const

type TestStatus = (typeof TEST_STATUSES)[number]
type RatingField = (typeof RATING_FIELDS)[number]

interface AudienceAnalysis {
  id: string
  client_id: string
  overview: string | null
  primary_platforms: string[] | null
  core_positioning: string | null
  audience_psychology: string | null
  audience_segments:
    | { name: string; age_range?: string; examples?: string[]; pain_point?: string; why_they_follow?: string }[]
    | null
  personality_types: { name: string; age_range?: string; platforms?: string[]; what_they_want?: string }[] | null
  audience_motivations: string[] | null
  created_at: string
}

interface AudiencePool {
  id: string
  clientId: string
  sourceAnalysisId: string
  name: string
  ageRange: string
  painPoint: string
  motivation: string
  platformFit: string[]
  examples: string[]
  ragNotes: string
  createdAt: string
}

type PoolState = {
  status: TestStatus
  ratings: Record<RatingField, number>
  notes: string
}

const DEFAULT_POOL_STATE: PoolState = {
  status: "draft",
  ratings: {
    quality: 3,
    buyingIntent: 3,
    size: 3,
    messageFit: 3,
    creativeFit: 3,
  },
  notes: "",
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (hours < 1) return "Today"
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function toPools(analysis: AudienceAnalysis): AudiencePool[] {
  const segments = analysis.audience_segments?.length
    ? analysis.audience_segments
    : [{ name: "Core Audience", pain_point: analysis.core_positioning ?? "Needs clearer audience signal" }]

  return segments.map((segment, index) => {
    const persona = analysis.personality_types?.[index]
    const platformFit = Array.from(
      new Set([...(analysis.primary_platforms ?? []), ...(persona?.platforms ?? [])]),
    ).filter(Boolean)
    const finalPlatforms = platformFit.length > 0 ? platformFit : AD_PLATFORMS.slice(0, 3)

    return {
      id: `${analysis.id}:${index}`,
      clientId: analysis.client_id,
      sourceAnalysisId: analysis.id,
      name: segment.name || persona?.name || `Audience Pool ${index + 1}`,
      ageRange: segment.age_range || persona?.age_range || "Unknown range",
      painPoint: segment.pain_point || analysis.core_positioning || "Positioning and conversion gap",
      motivation:
        segment.why_they_follow ||
        persona?.what_they_want ||
        analysis.audience_motivations?.[0] ||
        "Needs messaging that feels specific and useful.",
      platformFit: finalPlatforms,
      examples: segment.examples ?? [],
      ragNotes: [analysis.audience_psychology, analysis.core_positioning].filter(Boolean).join(" "),
      createdAt: analysis.created_at,
    }
  })
}

export default function AudienceIntelligence() {
  const location = useLocation()
  const isPoolsRoute = location.pathname.startsWith("/audience-pools")
  const [selectedClientId, setSelectedClientId] = useState<string | null>(OFFICIAL_CLIENT_ID)
  const [analyses, setAnalyses] = useState<AudienceAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null)
  const [poolState, setPoolState] = useState<Record<string, PoolState>>({})

  useEffect(() => {
    void fetchAnalyses()
  }, [])

  async function fetchAnalyses() {
    setLoading(true)
    const { data, error } = await supabase
      .from("audience_analyses")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching audience analyses:", error)
      setAnalyses([])
    } else {
      setAnalyses((data || []) as AudienceAnalysis[])
    }
    setLoading(false)
  }

  const pools = useMemo(() => analyses.flatMap(toPools), [analyses])
  const filteredPools = useMemo(() => {
    if (!selectedClientId) return pools
    return pools.filter((pool) => pool.clientId === selectedClientId)
  }, [pools, selectedClientId])

  const selectedPool = filteredPools.find((pool) => pool.id === selectedPoolId) ?? null

  const stats = useMemo(() => {
    const states = filteredPools.map((pool) => poolState[pool.id] ?? DEFAULT_POOL_STATE)
    return {
      total: filteredPools.length,
      ready: states.filter((state) => state.status === "ready").length,
      testing: states.filter((state) => state.status === "testing").length,
      winners: states.filter((state) => state.status === "winner").length,
    }
  }, [filteredPools, poolState])

  function getState(poolId: string): PoolState {
    return poolState[poolId] ?? DEFAULT_POOL_STATE
  }

  function updatePoolState(poolId: string, patch: Partial<PoolState>) {
    setPoolState((current) => ({
      ...current,
      [poolId]: { ...getState(poolId), ...patch },
    }))
  }

  function updateRating(poolId: string, field: RatingField, value: number) {
    const current = getState(poolId)
    updatePoolState(poolId, {
      ratings: { ...current.ratings, [field]: value },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Users className="h-6 w-6 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {isPoolsRoute ? "Audience Pools" : "Audience Intelligence"}
            </h1>
          </div>
          <p className="text-gray-400 text-sm max-w-3xl">
            {isPoolsRoute
              ? "Build audience pools from client research, rate their quality, and prepare the best pools for paid ads and RAG copy support."
              : "Review audience intelligence from client research and turn the strongest segments into pools for testing."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalyses}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
          <ClientDropdown selectedClientId={selectedClientId} onClientChange={setSelectedClientId} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          ["Total pools", stats.total],
          ["Ready", stats.ready],
          ["Testing", stats.testing],
          ["Winners", stats.winners],
        ].map(([label, value]) => (
          <div key={label} className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
            <p className="text-gray-400 text-sm mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
        <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-semibold text-white">Audience Pools</h2>
            <span className="text-xs text-gray-500">Platforms: {AD_PLATFORMS.join(", ")}</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading pools...</div>
          ) : filteredPools.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 mb-2">No audience pools yet</p>
              <p className="text-sm text-gray-500">Generate audience analyses or select another client.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredPools.map((pool) => {
                const state = getState(pool.id)
                const avgRating =
                  RATING_FIELDS.reduce((sum, field) => sum + state.ratings[field], 0) / RATING_FIELDS.length
                return (
                  <button
                    key={pool.id}
                    type="button"
                    onClick={() => setSelectedPoolId(pool.id)}
                    className={cn(
                      "w-full text-left p-4 transition-colors hover:bg-white/5",
                      selectedPoolId === pool.id && "bg-blue-500/10",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-white font-semibold">{pool.name}</h3>
                        <p className="text-xs text-gray-500">{pool.ageRange} · Source {pool.sourceAnalysisId.slice(0, 8)}</p>
                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">{pool.painPoint}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300">
                          {state.status}
                        </span>
                        <div className="flex items-center justify-end gap-1 mt-2 text-amber-300">
                          <Star className="h-3.5 w-3.5" />
                          <span className="text-xs">{avgRating.toFixed(1)}/5</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {pool.platformFit.map((platform) => (
                        <span key={platform} className="px-2 py-0.5 bg-gray-700/60 rounded text-xs text-gray-300">
                          {platform}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-gray-800/50 rounded-xl border border-white/5 p-5">
          {selectedPool ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedPool.name}</h2>
                <p className="text-xs text-gray-500">Created {formatTime(selectedPool.createdAt)}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Test status</p>
                <select
                  value={getState(selectedPool.id).status}
                  onChange={(event) => updatePoolState(selectedPool.id, { status: event.target.value as TestStatus })}
                  className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {TEST_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pool ratings</p>
                {RATING_FIELDS.map((field) => (
                  <label key={field} className="grid grid-cols-[130px_1fr_32px] items-center gap-3 text-sm">
                    <span className="text-gray-300 capitalize">{field.replace(/([A-Z])/g, " $1")}</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={getState(selectedPool.id).ratings[field]}
                      onChange={(event) => updateRating(selectedPool.id, field, Number(event.target.value))}
                    />
                    <span className="text-gray-400 text-right">{getState(selectedPool.id).ratings[field]}</span>
                  </label>
                ))}
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">RAG / copy notes</p>
                <textarea
                  value={getState(selectedPool.id).notes || selectedPool.ragNotes}
                  onChange={(event) => updatePoolState(selectedPool.id, { notes: event.target.value })}
                  className="w-full min-h-28 bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                />
              </div>

              <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                <Layers className="h-4 w-4" />
                Use in Ads Campaign
              </button>
            </div>
          ) : (
            <div className="h-full min-h-80 flex flex-col items-center justify-center text-center">
              <BarChart3 className="h-10 w-10 text-gray-600 mb-3" />
              <p className="text-white font-medium">Select a pool</p>
              <p className="text-sm text-gray-500 mt-1">Rate quality, set status, and prep it for ads.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
