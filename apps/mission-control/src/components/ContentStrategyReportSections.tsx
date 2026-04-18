import { CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"

/** Shape matches `content_strategies` JSON columns from Supabase. */
export interface ContentStrategyRecord {
  content_pillars?: { name: string; purpose: string; examples: string[]; percentage: number }[]
  posting_schedule?: { frequency: string; recommended_times: string[]; consistency_tips?: string[] }
  platform_strategy?: {
    platform: string
    priority: string
    content_style: string
    audience_behavior: string
    best_practices: string[]
  }[]
  /** Values are usually 0–100 shares; some legacy rows store free text (e.g. theme lists). */
  content_mix?: Record<string, number | string>
  example_week?: { day: string; content_type: string; topic_idea: string; pillar: string }[]
  hashtag_bank?: string[]
  growth_strategy?: string
  key_tips?: string[]
}

const CONTENT_MIX_LABELS: Record<string, string> = {
  educational: "Educational",
  relatable: "Relatable",
  commentary: "Commentary",
  promotional: "Promotional",
  themes: "Themes",
}

function formatContentMixLabel(key: string): string {
  if (CONTENT_MIX_LABELS[key]) return CONTENT_MIX_LABELS[key]
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function clampPercent(n: number) {
  return Math.min(100, Math.max(0, n))
}

function parseContentMixValue(value: unknown): { kind: "percent"; n: number } | { kind: "text"; text: string } {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { kind: "percent", n: clampPercent(value) }
  }
  if (typeof value === "string") {
    const t = value.trim()
    if (t === "") return { kind: "text", text: value }
    const asNum = Number(t)
    if (Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(t)) {
      return { kind: "percent", n: clampPercent(asNum) }
    }
    return { kind: "text", text: value }
  }
  return { kind: "text", text: String(value ?? "") }
}

function prettifyMixTextBlob(s: string) {
  return s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([.!?])([A-Z])/g, "$1 $2")
}

const GTM_SECTION_KEY_ORDER: string[] = [
  "positioning",
  "value_proposition",
  "target_audience",
  "icp",
  "messaging",
  "narrative",
  "channels",
  "distribution",
  "active_listening",
  "community_building",
  "engagement",
  "conversion",
  "retention",
  "measurement",
]

function sortGrowthStrategyEntries(entries: [string, string][]): [string, string][] {
  return [...entries].sort((a, b) => {
    const ia = GTM_SECTION_KEY_ORDER.indexOf(a[0])
    const ib = GTM_SECTION_KEY_ORDER.indexOf(b[0])
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a[0].localeCompare(b[0])
  })
}

function parseGrowthStrategySections(raw: string): { kind: "sections"; entries: [string, string][] } | { kind: "plain"; text: string } {
  const t = raw.trim()
  if (!t.startsWith("{")) return { kind: "plain", text: raw }
  try {
    const parsed: unknown = JSON.parse(t)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { kind: "plain", text: raw }
    }
    const entries: [string, string][] = []
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) entries.push([k, v.trim()])
      else if (typeof v === "number" || typeof v === "boolean") entries.push([k, String(v)])
    }
    if (entries.length === 0) return { kind: "plain", text: raw }
    return { kind: "sections", entries: sortGrowthStrategyEntries(entries) }
  } catch {
    return { kind: "plain", text: raw }
  }
}

function GrowthStrategyBody({ raw }: { raw: string }) {
  const parsed = parseGrowthStrategySections(raw)
  if (parsed.kind === "plain") {
    return <p className="whitespace-pre-wrap break-words text-gray-200">{parsed.text}</p>
  }
  return (
    <div className="space-y-5">
      {parsed.entries.map(([key, body], i) => (
        <div key={key} className="min-w-0 border-l-2 border-amber-400 pl-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{formatContentMixLabel(key)}</p>
          <p
            className={cn(
              "mt-2 leading-relaxed break-words",
              i === 0 ? "text-[15px] font-medium leading-snug text-white sm:text-base" : "text-sm text-gray-200 sm:text-[15px]",
            )}
          >
            {body}
          </p>
        </div>
      ))}
    </div>
  )
}

export function ContentStrategyReportSections({ strategy }: { strategy: ContentStrategyRecord }) {
  const pillars = strategy.content_pillars || []
  const mix = strategy.content_mix || {}

  return (
    <div className="min-w-0 max-w-full space-y-4 border-t border-white/10 pt-6 mt-6 sm:space-y-5 sm:pt-8 sm:mt-8">
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-400" />
          <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">Brand strategy</h2>
        </div>
        <p className="max-w-prose text-sm leading-relaxed text-gray-400 sm:text-[15px]">
          Content strategy (pillars, cadence, and growth) merged into this report.
        </p>
      </div>

      {pillars.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-gray-800/50 p-3 sm:p-4 md:p-5">
          <h3 className="mb-3 font-semibold text-white sm:mb-4">Content pillars</h3>
          <div className="grid grid-cols-1 gap-3 min-[1100px]:grid-cols-2 min-[1400px]:grid-cols-3">
            {pillars.map((pillar, i) => (
              <div key={i} className="min-w-0 rounded-lg border border-white/5 bg-gray-700/30 p-3 sm:p-4">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium leading-snug text-white">{pillar.name}</p>
                  <span className="shrink-0 text-sm text-amber-400">{pillar.percentage}%</span>
                </div>
                <p className="mb-2 text-sm leading-relaxed text-gray-400">{pillar.purpose}</p>
                <div className="flex flex-wrap gap-1">
                  {(pillar.examples || []).slice(0, 3).map((ex, j) => (
                    <span key={j} className="rounded bg-gray-600/50 px-2 py-0.5 text-xs text-gray-300">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="min-w-0 rounded-xl border border-white/5 bg-gray-800/50 p-3 sm:p-4 md:p-5">
          <h3 className="mb-2 font-semibold text-white sm:mb-3">Posting schedule</h3>
          <p className="mb-2 font-medium text-amber-400">{strategy.posting_schedule?.frequency}</p>
          <p className="mb-1 text-sm text-gray-400">Recommended times</p>
          <div className="flex flex-wrap gap-2">
            {(strategy.posting_schedule?.recommended_times || []).map((time, i) => (
              <span key={i} className="rounded bg-gray-700/50 px-2 py-1 text-sm text-gray-300">
                {time}
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-white/5 bg-gray-800/50 p-3 sm:p-4 md:p-5">
          <h3 className="mb-3 font-semibold text-white">Content mix</h3>
          <div className="space-y-3">
            {Object.entries(mix).map(([key, raw]) => {
              const parsed = parseContentMixValue(raw)
              if (parsed.kind === "text") {
                return (
                  <div key={key} className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-gray-400">{formatContentMixLabel(key)}</p>
                    <p className="break-words text-sm leading-relaxed text-gray-200">{prettifyMixTextBlob(parsed.text)}</p>
                  </div>
                )
              }
              const { n } = parsed
              return (
                <div key={key} className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <span className="shrink-0 text-sm text-gray-400 sm:w-32">{formatContentMixLabel(key)}</span>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-700">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${n}%` }} />
                    </div>
                    <span className="min-w-[2.75rem] shrink-0 text-right text-sm tabular-nums text-gray-300">{n}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {(strategy.platform_strategy?.length ?? 0) > 0 && (
        <div className="min-w-0 rounded-xl border border-white/5 bg-gray-800/50 p-3 sm:p-4 md:p-5">
          <h3 className="mb-3 font-semibold text-white sm:mb-4">Platform strategy</h3>
          <div className="space-y-3 sm:space-y-4">
            {(strategy.platform_strategy || []).map((p, i) => (
              <div key={i} className="rounded-lg border border-white/5 bg-gray-700/20 p-3 sm:p-4">
                <p className="break-words font-medium leading-snug text-white">
                  {p.platform}{" "}
                  <span className="text-sm font-normal text-gray-500">({p.priority})</span>
                </p>
                <p className="mt-1 break-words text-sm leading-relaxed text-gray-400">{p.content_style}</p>
                <p className="mt-2 break-words text-xs leading-relaxed text-gray-500 sm:text-sm">{p.audience_behavior}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(strategy.example_week?.length ?? 0) > 0 && (
        <div className="min-w-0 rounded-xl border border-white/5 bg-gray-800/50 p-3 sm:p-4 md:p-5">
          <h3 className="mb-3 font-semibold text-white sm:mb-4">Example week</h3>
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-min gap-2 px-1 sm:grid sm:min-w-0 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 lg:gap-2">
              {(strategy.example_week || []).map((day, i) => (
                <div
                  key={i}
                  className="w-[140px] shrink-0 rounded-lg border border-white/5 bg-gray-700/30 p-3 sm:w-auto sm:min-w-0 sm:shrink"
                >
                  <p className="mb-1 text-sm font-medium text-amber-400">{day.day}</p>
                  <p className="text-sm font-medium leading-snug text-white">{day.content_type}</p>
                  <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-gray-400 sm:line-clamp-none">
                    {day.topic_idea}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        {strategy.growth_strategy && (
          <div className="min-w-0 rounded-xl border border-white/5 bg-gray-800/50 p-3 sm:p-4 md:p-5">
            <h3 className="font-semibold text-white">Growth strategy</h3>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">Go-to-market motion — short beats you can pitch in one breath.</p>
            <div className="mt-4 max-h-[min(50vh,28rem)] overflow-y-auto pr-1">
              <GrowthStrategyBody raw={strategy.growth_strategy} />
            </div>
          </div>
        )}
        {(strategy.key_tips?.length ?? 0) > 0 && (
          <div className="min-w-0 rounded-xl border border-white/5 bg-gray-800/50 p-3 sm:p-4 md:p-5">
            <h3 className="mb-3 font-semibold text-white">Key tips</h3>
            <ul className="max-h-[min(50vh,22rem)] space-y-2 overflow-y-auto pr-1 text-sm leading-relaxed text-gray-300 sm:text-[15px]">
              {(strategy.key_tips || []).map((tip, i) => (
                <li key={i} className="flex gap-2 break-words">
                  <span className="shrink-0 text-amber-400">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(strategy.hashtag_bank?.length ?? 0) > 0 && (
        <div className="min-w-0 rounded-xl border border-white/5 bg-gray-800/50 p-3 sm:p-4 md:p-5">
          <h3 className="mb-3 font-semibold text-white">Hashtag bank</h3>
          <div className="flex flex-wrap gap-2">
            {(strategy.hashtag_bank || []).map((tag, i) => (
              <span
                key={i}
                className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs text-blue-400 sm:px-3 sm:text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
