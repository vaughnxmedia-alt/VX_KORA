import { useState, useMemo, useCallback, useEffect } from "react"
import {
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Filter,
  Cpu,
  Database,
  Send,
  FileText,
  User,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { ClientDropdown } from "@/components/ClientDropdown"
import { OFFICIAL_CLIENT_ID, useClients } from "@/hooks/useClients"

type RunStatus = "pending" | "running" | "completed" | "failed"
type TriggerSource = "scheduled" | "manual" | "webhook" | "event"

interface IngestRun {
  id: string
  agent_id: string
  tenant: string | null
  tenant_id: string | null
  trigger_source: TriggerSource
  status: RunStatus
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  sources_processed: number
  items_discovered: number
  items_processed: number
  items_embedded: number
  items_routed: number
  telegram_sends: number
  llm_tokens_used: number
  llm_cost_estimate: number
  model_usage: {
    openai_tokens: number
    openai_cost: number
    gemini_tokens: number
    gemini_cost: number
  }
  error_message: string | null
  metadata: Record<string, unknown> | null
}

type ReportSummary = {
  name: string
  telegramId: number
  customerId?: string
  search_queries_used?: string[]
  news_items_fetched?: number
  top_story_headlines?: string[]
  trending_topics?: string[]
  strategic_takeaways?: string[]
  content_opportunities?: { idea: string; platform: string }[]
  learned_signal_count?: number
}

type RunMetadata = {
  recipients?: { name: string; telegramId: number; customerId?: string }[]
  failures?: { name: string; error: string }[]
  reports?: ReportSummary[]
}

const statusConfig = {
  pending: { color: "text-gray-400", bg: "bg-gray-400/10", icon: Clock, label: "Pending" },
  running: { color: "text-blue-400", bg: "bg-blue-400/10", icon: RefreshCw, label: "Running" },
  completed: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2, label: "Completed" },
  failed: { color: "text-red-400", bg: "bg-red-400/10", icon: XCircle, label: "Failed" },
}

const triggerConfig = {
  scheduled: { label: "Scheduled", color: "text-blue-400" },
  manual: { label: "Manual", color: "text-purple-400" },
  webhook: { label: "Webhook", color: "text-amber-400" },
  event: { label: "Event", color: "text-cyan-400" },
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return "-"
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${seconds}s`
}

function clientLabel(
  run: IngestRun,
  customerNames: Map<string, string>
): string {
  if (run.tenant_id && customerNames.has(run.tenant_id)) {
    return customerNames.get(run.tenant_id)!
  }
  const m = run.metadata as RunMetadata | null
  if (m?.recipients?.length) {
    return m.recipients.map((r) => r.name).join(", ")
  }
  return run.tenant_id ? "—" : "Multi-client"
}

const DEFAULT_TRIGGER_URL = "http://127.0.0.1:3847/run"

function RunReportDetail({ meta }: { meta: RunMetadata }) {
  const reports = meta.reports || []
  const recipients = meta.recipients || []
  const failures = meta.failures || []

  if (reports.length === 0 && recipients.length === 0 && failures.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-2">
        No report payload stored for this run (older runs or non-insights job). Recipients:{" "}
        {recipients.length || "—"}
      </p>
    )
  }

  return (
    <div className="space-y-6 py-4">
      {recipients.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            Sent to
          </h4>
          <ul className="space-y-1 text-sm text-gray-300">
            {recipients.map((r) => (
              <li key={`${r.telegramId}-${r.name}`}>
                <span className="text-white font-medium">{r.name}</span>
                <span className="text-gray-500"> · Telegram </span>
                <code className="text-cyan-400/90 text-xs">{r.telegramId}</code>
                {r.customerId && (
                  <>
                    <span className="text-gray-500"> · Client </span>
                    <code className="text-gray-400 text-xs">{r.customerId.slice(0, 8)}…</code>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {failures.length > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <h4 className="text-xs font-semibold text-red-400 uppercase mb-2">Failures</h4>
          <ul className="text-sm text-red-200/90 space-y-1">
            {failures.map((f, i) => (
              <li key={i}>
                {f.name}: {f.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {reports.map((rep, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-white/10 bg-gray-900/60 p-4 space-y-3"
        >
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            Report for {rep.name}
          </h4>
          <p className="text-xs text-gray-500">
            Data the agent used / produced (for learning &amp; audit). Learned signals in context:{" "}
            <span className="text-gray-400">{rep.learned_signal_count ?? 0}</span> · News items
            fetched: <span className="text-gray-400">{rep.news_items_fetched ?? "—"}</span>
          </p>
          {rep.search_queries_used && rep.search_queries_used.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1">Search queries used</p>
              <ul className="text-xs text-gray-300 list-disc list-inside space-y-0.5 max-h-28 overflow-y-auto">
                {rep.search_queries_used.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {rep.top_story_headlines && rep.top_story_headlines.filter(Boolean).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1">Top story headlines</p>
              <ul className="text-xs text-gray-300 space-y-1">
                {rep.top_story_headlines.filter(Boolean).map((h, i) => (
                  <li key={i} className="border-l-2 border-blue-500/40 pl-2">
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {rep.trending_topics && rep.trending_topics.filter(Boolean).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1">Trending topics</p>
              <div className="flex flex-wrap gap-1.5">
                {rep.trending_topics.filter(Boolean).map((t, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-purple-500/15 text-purple-200">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {rep.strategic_takeaways && rep.strategic_takeaways.filter(Boolean).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1">Strategic takeaways</p>
              <ul className="text-xs text-gray-300 space-y-1">
                {rep.strategic_takeaways.filter(Boolean).map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </div>
          )}
          {rep.content_opportunities && rep.content_opportunities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1">Content opportunities</p>
              <ul className="text-xs text-gray-300 space-y-1">
                {rep.content_opportunities.map((o, i) => (
                  <li key={i}>
                    <span className="text-white">{o.idea}</span>
                    <span className="text-gray-500"> ({o.platform})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function IngestRuns() {
  const [runs, setRuns] = useState<IngestRun[]>([])
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null)
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [filterAgent, setFilterAgent] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<RunStatus | "all">("all")
  const [selectedClientId, setSelectedClientId] = useState<string | null>(OFFICIAL_CLIENT_ID)
  const { clients, getDisplayName } = useClients()

  const customerNames = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of clients) {
      m.set(c.id, getDisplayName(c))
    }
    return m
  }, [clients, getDisplayName])

  const fetchRuns = useCallback(async () => {
    setLoadingRuns(true)
    const { data, error } = await supabase
      .from("kora_ingest_runs")
      .select("*")
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(100)

    if (error) {
      console.error("[IngestRuns] kora_ingest_runs:", error.code, error.message)
      setRuns([])
      setLoadingRuns(false)
      return
    }

    const mapped: IngestRun[] = (data || []).map((row) => {
      const started = row.started_at ? new Date(row.started_at).getTime() : 0
      const completed = row.completed_at ? new Date(row.completed_at).getTime() : null
      const mu = (row.model_usage || {}) as Record<string, number>
      const openaiT = Number(mu.openai_tokens ?? mu.openai ?? 0)
      const geminiT = Number(mu.gemini_tokens ?? mu.gemini ?? 0)
      return {
        id: row.id,
        agent_id: row.agent_id,
        tenant: null,
        tenant_id: row.tenant_id,
        trigger_source: row.trigger_source as TriggerSource,
        status: row.status as RunStatus,
        started_at: row.started_at || "",
        completed_at: row.completed_at,
        duration_ms: completed && started ? completed - started : null,
        sources_processed: row.sources_processed ?? 0,
        items_discovered: row.items_discovered ?? 0,
        items_processed: row.items_processed ?? 0,
        items_embedded: row.items_embedded ?? 0,
        items_routed: row.items_routed ?? 0,
        telegram_sends: row.telegram_sends ?? 0,
        llm_tokens_used: row.llm_tokens_used ?? 0,
        llm_cost_estimate: Number(row.llm_cost_estimate ?? 0),
        model_usage: {
          openai_tokens: openaiT,
          openai_cost: Number(mu.openai_cost ?? 0),
          gemini_tokens: geminiT,
          gemini_cost: Number(mu.gemini_cost ?? 0),
        },
        error_message: row.error_message,
        metadata: row.metadata as Record<string, unknown> | null,
      }
    })
    setRuns(mapped)
    setLoadingRuns(false)
  }, [])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      if (filterAgent !== "all" && r.agent_id !== filterAgent) return false
      if (filterStatus !== "all" && r.status !== filterStatus) return false

      if (selectedClientId) {
        if (r.tenant_id === selectedClientId) return true
        const m = r.metadata as RunMetadata | null
        const matchRecipient = m?.recipients?.some((rec) => rec.customerId === selectedClientId)
        if (matchRecipient) return true
        return false
      }

      return true
    })
  }, [runs, filterAgent, filterStatus, selectedClientId])

  const agents = [...new Set(runs.map((r) => r.agent_id))]

  const totalRuns = filteredRuns.length
  const totalItems = filteredRuns.reduce((sum, r) => sum + r.items_processed, 0)
  const totalTelegram = filteredRuns.reduce((sum, r) => sum + r.telegram_sends, 0)
  const totalCost = filteredRuns.reduce((sum, r) => sum + r.llm_cost_estimate, 0)

  const handleTriggerRun = useCallback(async () => {
    const url = import.meta.env.VITE_INSIGHTS_TRIGGER_URL || DEFAULT_TRIGGER_URL
    setTriggerLoading(true)
    setTriggerMsg(null)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      const secret = import.meta.env.VITE_TRIGGER_RUN_SECRET
      if (secret) headers["x-trigger-secret"] = secret
      const r = await fetch(url, { method: "POST", headers })
      const text = await r.text()
      let body: { ok?: boolean; message?: string; error?: string }
      try {
        body = JSON.parse(text) as typeof body
      } catch {
        body = {}
      }
      if (r.status === 202 && body.ok) {
        setTriggerMsg(body.message || "Run started — check Telegram, terminal, then Refresh.")
        setTimeout(() => fetchRuns(), 8000)
        setTimeout(() => fetchRuns(), 45000)
      } else if (r.status === 429) {
        setTriggerMsg("Already running. Wait for the current job to finish.")
      } else {
        setTriggerMsg(
          body.error ||
            `Could not start (${r.status}). Run in a terminal: npm run insights:trigger-server`
        )
      }
    } catch {
      setTriggerMsg(
        `Trigger server not reachable. In VX_KORA run: npm run insights:trigger-server — then click again.`
      )
    } finally {
      setTriggerLoading(false)
    }
  }, [fetchRuns])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Ingest Runs</h1>
          <p className="text-gray-400 text-sm">Jobs from Trigger Run and pipelines (Supabase)</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchRuns()}
              disabled={loadingRuns}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm"
            >
              <RefreshCw className={cn("h-4 w-4", loadingRuns && "animate-spin")} />
              Refresh
            </button>
            <button
              type="button"
              disabled={triggerLoading}
              onClick={handleTriggerRun}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <PlayCircle className={`h-4 w-4 ${triggerLoading ? "animate-pulse" : ""}`} />
              {triggerLoading ? "Starting…" : "Trigger Run"}
            </button>
          </div>
          {triggerMsg && (
            <p className="text-xs text-gray-400 max-w-md text-right">{triggerMsg}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Runs (filtered)</p>
          <p className="text-2xl font-bold text-white">{totalRuns}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Items Processed</p>
          <p className="text-2xl font-bold text-white">{totalItems}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Telegram Sends</p>
          <p className="text-2xl font-bold text-white">{totalTelegram}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">LLM Cost (filtered)</p>
          <p className="text-2xl font-bold text-white">${totalCost.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <ClientDropdown
          selectedClientId={selectedClientId}
          onClientChange={setSelectedClientId}
          allOptionLabel="All KORA Clients"
        />
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filter:</span>
        </div>
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as RunStatus | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Run
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Agent
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Client
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Trigger
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Items
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Model Usage
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Cost
              </th>
              <th className="text-left px-2 py-3 text-xs font-medium text-gray-400 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loadingRuns && runs.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500 text-sm">
                  Loading runs…
                </td>
              </tr>
            ) : filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500 text-sm">
                  No runs yet. Trigger Run or run{" "}
                  <code className="text-gray-400">npm run send-insights</code> from VX_KORA.
                </td>
              </tr>
            ) : (
              filteredRuns.flatMap((run) => {
                const status = statusConfig[run.status]
                const StatusIcon = status.icon
                const trigger = triggerConfig[run.trigger_source] || triggerConfig.manual
                const shortId = run.id.slice(0, 8)
                const expanded = expandedRunId === run.id
                const meta = (run.metadata || {}) as RunMetadata
                const hasDetail =
                  (meta.reports?.length ?? 0) > 0 ||
                  (meta.recipients?.length ?? 0) > 0 ||
                  (meta.failures?.length ?? 0) > 0

                const mainRow = (
                  <tr
                    key={run.id}
                    className={cn(
                      "hover:bg-white/5 transition-colors cursor-pointer",
                      expanded && "bg-white/[0.03]"
                    )}
                    onClick={() =>
                      setExpandedRunId((id) => (id === run.id ? null : run.id))
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-mono" title={run.id}>
                          {shortId}…
                        </span>
                        {hasDetail ? (
                          expanded ? (
                            <ChevronDown className="h-4 w-4 text-blue-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          )
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-700" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300">{run.agent_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300 max-w-[200px] truncate block">
                        {clientLabel(run, customerNames)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-sm", trigger.color)}>{trigger.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon
                          className={cn(
                            "h-4 w-4",
                            status.color,
                            run.status === "running" && "animate-spin"
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            status.bg,
                            status.color
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-400">{formatDuration(run.duration_ms)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-400" title="Sources">
                          <Cpu className="h-3 w-3 inline mr-1" />
                          {run.sources_processed}
                        </span>
                        <span className="text-gray-400" title="Processed">
                          <Database className="h-3 w-3 inline mr-1" />
                          {run.items_processed}
                        </span>
                        <span className="text-gray-400" title="Telegram">
                          <Send className="h-3 w-3 inline mr-1" />
                          {run.telegram_sends}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-400">
                          OpenAI: {(run.model_usage.openai_tokens / 1000).toFixed(1)}k
                        </span>
                        <span className="text-blue-400">
                          Gemini: {(run.model_usage.gemini_tokens / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-white text-sm font-medium">
                        ${run.llm_cost_estimate.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-gray-500 text-xs">
                      {hasDetail ? (expanded ? "Hide" : "Report") : "—"}
                    </td>
                  </tr>
                )

                if (!expanded || !hasDetail) return [mainRow]

                return [
                  mainRow,
                  <tr key={`${run.id}-detail`} className="bg-gray-950/80">
                    <td colSpan={10} className="px-6 py-0 border-t border-white/5">
                      <RunReportDetail meta={meta} />
                    </td>
                  </tr>,
                ]
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
