import { useEffect, useMemo, useState } from "react"
import { Users, RefreshCw, Send, Building2, CheckCircle2, Circle } from "lucide-react"
import { useClients, getClientDisplayName, type Client } from "@/hooks/useClients"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type ReportFlags = {
  intake: boolean
  brand: boolean
  strategy: boolean
  audience: boolean
  strategySessionPaid: boolean
  telegramSubscribed: boolean
}

export default function Clients() {
  const { clients, loading, error, refetch } = useClients()
  const [q, setQ] = useState("")
  const [reportFlagsByClientId, setReportFlagsByClientId] = useState<Record<string, ReportFlags>>({})
  const [loadingReports, setLoadingReports] = useState(false)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return clients
    return clients.filter((c) => {
      const name = getClientDisplayName(c).toLowerCase()
      const email = (c.email || "").toLowerCase()
      const tg = c.telegram_id != null ? String(c.telegram_id) : ""
      return name.includes(s) || email.includes(s) || tg.includes(s)
    })
  }, [clients, q])

  useEffect(() => {
    async function fetchReportFlags() {
      if (clients.length === 0) {
        setReportFlagsByClientId({})
        return
      }
      setLoadingReports(true)
      const clientIds = clients.map((c) => c.id)
      const telegramIds = clients
        .map((c) => c.telegram_id)
        .filter((v): v is number => v != null)

      const [intakeRes, brandRes, strategyRes, audienceRes, meetingsRes, subsRes] = await Promise.all([
        supabase.from("telegram_intake_sessions").select("client_id, telegram_id, phase"),
        supabase.from("brand_blueprints").select("client_id"),
        supabase.from("content_strategies").select("client_id"),
        supabase.from("audience_analyses").select("client_id"),
        supabase
          .from("meetings")
          .select("customer_id,payment_status")
          .in("customer_id", clientIds),
        supabase.from("telegram_subscriptions").select("email,access_status"),
      ])

      const flags: Record<string, ReportFlags> = {}
      clients.forEach((c) => {
        flags[c.id] = {
          intake: false,
          brand: false,
          strategy: false,
          audience: false,
          strategySessionPaid: false,
          telegramSubscribed: false,
        }
      })

      ;(intakeRes.data || []).forEach((row: { client_id?: string | null; telegram_id?: number | null; phase?: string }) => {
        const byClientId = row.client_id && flags[row.client_id] ? row.client_id : null
        const byTelegram =
          row.telegram_id != null
            ? clients.find((c) => c.telegram_id === row.telegram_id)?.id || null
            : null
        const key = byClientId || byTelegram
        if (!key || !flags[key]) return
        if (row.phase && row.phase !== "intro") flags[key].intake = true
      })

      ;(brandRes.data || []).forEach((row: { client_id?: string | null }) => {
        if (row.client_id && flags[row.client_id]) flags[row.client_id].brand = true
      })
      ;(strategyRes.data || []).forEach((row: { client_id?: string | null }) => {
        if (row.client_id && flags[row.client_id]) flags[row.client_id].strategy = true
      })
      ;(audienceRes.data || []).forEach((row: { client_id?: string | null }) => {
        if (row.client_id && flags[row.client_id]) flags[row.client_id].audience = true
      })

      ;(meetingsRes.data || []).forEach((row: { customer_id?: string | null; payment_status?: string | null }) => {
        if (!row.customer_id || !flags[row.customer_id]) return
        if ((row.payment_status || "").toLowerCase() === "paid") {
          // Strategy Session paid users are treated as intake/brand/strategy/audience complete.
          flags[row.customer_id].strategySessionPaid = true
          flags[row.customer_id].intake = true
          flags[row.customer_id].brand = true
          flags[row.customer_id].strategy = true
          flags[row.customer_id].audience = true
        }
      })

      const activeSubEmails = new Set(
        (subsRes.data || [])
          .filter((s: { email?: string | null; access_status?: string | null }) => (s.access_status || "") === "active")
          .map((s: { email?: string | null }) => String(s.email || "").trim().toLowerCase())
          .filter(Boolean),
      )
      clients.forEach((c) => {
        const email = String(c.email || "").trim().toLowerCase()
        if (email && activeSubEmails.has(email)) {
          flags[c.id].telegramSubscribed = true
        }
      })

      setReportFlagsByClientId(flags)
      setLoadingReports(false)
    }

    void fetchReportFlags()
  }, [clients])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-400" />
            Users
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Telegram recipients and portal accounts (<code className="text-gray-500">customers</code> in
            Supabase). Deep insights runs link here by Telegram ID.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white text-sm hover:bg-gray-700 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          {error.includes("permission") && (
            <span className="block mt-1 text-red-300/80">
              Sign in as an admin to list clients.
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total clients</p>
          <p className="text-2xl font-bold text-white">{clients.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">With Telegram</p>
          <p className="text-2xl font-bold text-emerald-400">
            {clients.filter((c) => c.telegram_id != null).length}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5 sm:col-span-1">
          <input
            type="search"
            placeholder="Search name, email, Telegram ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Client</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Telegram</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Reports</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500 text-sm">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500 text-sm">
                  No clients yet. Run the seed SQL in{" "}
                  <code className="text-gray-400">docs/TELEGRAM_CLIENTS_SEED.md</code> for Juss &amp; Jocelyn,
                  or complete intake so rows appear in <code className="text-gray-400">customers</code>.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <ClientRow
                  key={c.id}
                  client={c}
                  reportFlags={reportFlagsByClientId[c.id]}
                  loadingReports={loadingReports}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ReportDot({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
        ok ? "bg-emerald-500/10 text-emerald-300" : "bg-gray-700/50 text-gray-400",
      )}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      {label}
    </span>
  )
}

function ClientRow({
  client: c,
  reportFlags,
  loadingReports,
}: {
  client: Client
  reportFlags?: ReportFlags
  loadingReports: boolean
}) {
  const name = getClientDisplayName(c)
  const flags: ReportFlags = reportFlags || {
    intake: false,
    brand: false,
    strategy: false,
    audience: false,
    strategySessionPaid: false,
    telegramSubscribed: false,
  }

  return (
    <tr className="hover:bg-white/5">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500 shrink-0" />
          <div>
            <p className="text-white text-sm font-medium">{name}</p>
            <p className="text-xs text-gray-500 font-mono">{c.id.slice(0, 8)}…</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">{c.email || "—"}</td>
      <td className="px-4 py-3">
        {c.telegram_id != null ? (
          <span className="inline-flex items-center gap-1 text-sm text-cyan-400">
            <Send className="h-3 w-3" />
            {c.telegram_id}
          </span>
        ) : (
          <div className="space-y-1">
            <span className="text-gray-500 text-sm block">—</span>
            <span className="inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
              Send Telegram access link
            </span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {loadingReports ? (
          <span className="text-xs text-gray-500">Loading…</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <ReportDot label="Intake" ok={flags.intake} />
            <ReportDot label="Brand" ok={flags.brand} />
            <ReportDot label="Strategy" ok={flags.strategy} />
            <ReportDot label="Audience" ok={flags.audience} />
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-300 w-fit">
            {c.client_status || "—"}
          </span>
          {flags.strategySessionPaid && (
            <span className="text-[11px] text-blue-300">Strategy Session complete</span>
          )}
          {flags.telegramSubscribed && (
            <span className="text-[11px] text-purple-300">Telegram subscription active</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
      </td>
    </tr>
  )
}
