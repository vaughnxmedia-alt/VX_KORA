import { useState, useEffect, useMemo } from "react"
import {
  MessageSquareText,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  ExternalLink,
  CalendarCheck,
  Building2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { getClientDisplayName } from "@/hooks/useClients"
import type { Client } from "@/hooks/useClients"
import {
  getStrategySessionBookingUrl,
  getBrandStrategySessionLandingUrl,
  getTelegramIntakeUrl,
} from "@/lib/intakePublicLinks"

type IntakeStatus = "intro" | "brand_identity" | "strategy" | "audience" | "completed" | "generating"

interface TelegramIntakeSession {
  id: string
  telegram_id: number
  telegram_username: string | null
  phase: IntakeStatus
  responses: Record<string, string>
  started_at: string
  last_activity: string
  client_id: string | null
}

interface PendingIntakeRow {
  customer: Client
  strategySessionPaid: boolean
  telegram: TelegramIntakeSession | null
}

const statusConfig: Record<
  IntakeStatus,
  { color: string; bg: string; icon: typeof Clock; label: string }
> = {
  intro: { color: "text-gray-400", bg: "bg-gray-400/10", icon: Clock, label: "Introduction" },
  brand_identity: {
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    icon: RefreshCw,
    label: "Brand Identity",
  },
  strategy: { color: "text-blue-400", bg: "bg-blue-400/10", icon: RefreshCw, label: "Strategy" },
  audience: { color: "text-cyan-400", bg: "bg-cyan-400/10", icon: RefreshCw, label: "Audience" },
  generating: { color: "text-amber-400", bg: "bg-amber-400/10", icon: RefreshCw, label: "Generating…" },
  completed: {
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    icon: CheckCircle2,
    label: "Completed",
  },
}

export default function IntakeClarifier() {
  const [rows, setRows] = useState<PendingIntakeRow[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchPending() {
    setLoading(true)
    const [customersRes, blueprintsRes, intakesRes] = await Promise.all([
      supabase
        .from("customers")
        .select("id, business_name, first_name, last_name, email, client_status, created_at, telegram_id")
        .order("created_at", { ascending: false }),
      supabase.from("brand_blueprints").select("client_id"),
      supabase.from("telegram_intake_sessions").select("*").order("last_activity", { ascending: false }),
    ])

    const customers = (customersRes.data || []) as Client[]
    const blueprintClientIds = new Set(
      (blueprintsRes.data || []).map((r: { client_id: string | null }) => r.client_id).filter(Boolean) as string[],
    )
    const intakes = (intakesRes.data || []) as TelegramIntakeSession[]

    const pendingCustomers = customers.filter((c) => !blueprintClientIds.has(c.id))
    const pendingIds = pendingCustomers.map((c) => c.id)

    let paidCustomerIds = new Set<string>()
    if (pendingIds.length > 0) {
      const { data: meetings } = await supabase
        .from("meetings")
        .select("customer_id,payment_status")
        .in("customer_id", pendingIds)
      ;(meetings || []).forEach((m: { customer_id?: string | null; payment_status?: string | null }) => {
        if (!m.customer_id) return
        if ((m.payment_status || "").toLowerCase() === "paid") paidCustomerIds.add(m.customer_id)
      })
    }

    const merged: PendingIntakeRow[] = pendingCustomers.map((customer) => {
      const telegram =
        intakes.find(
          (s) =>
            (s.client_id && s.client_id === customer.id) ||
            (customer.telegram_id != null && s.telegram_id === customer.telegram_id),
        ) || null
      return {
        customer,
        strategySessionPaid: paidCustomerIds.has(customer.id),
        telegram,
      }
    })

    setRows(merged)
    setLoading(false)
  }

  useEffect(() => {
    void fetchPending()
  }, [])

  const stats = useMemo(() => {
    const pending = rows.length
    const withPaidSession = rows.filter((r) => r.strategySessionPaid).length
    const withTelegram = rows.filter((r) => r.telegram != null).length
    const withBoth = rows.filter((r) => r.strategySessionPaid && r.telegram != null).length
    return { pending, withPaidSession, withTelegram, withBoth }
  }, [rows])

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

  const bookingUrl = getStrategySessionBookingUrl()
  const landingUrl = getBrandStrategySessionLandingUrl()
  const telegramUrl = getTelegramIntakeUrl()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MessageSquareText className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Intake Clarifier</h1>
          </div>
          <p className="text-gray-400 text-sm max-w-2xl">
            Intake is the agent that receives client data from every channel—Strategy Sessions (booking + notes
            from your team) and Telegram. This queue lists{" "}
            <span className="text-gray-300">clients who do not yet have a Brand Identity report</span> (i.e.
            intake is not finished). When Strategy Session and Telegram paths are complete and processing runs,
            they graduate to{" "}
            <span className="text-gray-300">Brand Identity</span> with strategy included in that report.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchPending()}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors self-start"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 border border-white/5 hover:border-blue-500/30 transition-colors"
        >
          <CalendarCheck className="h-8 w-8 text-blue-400 shrink-0" />
          <div>
            <p className="text-white font-medium text-sm">Book Strategy Session</p>
            <p className="text-gray-500 text-xs">Client booking & intake form</p>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-500 ml-auto shrink-0" />
        </a>
        <a
          href={landingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 border border-white/5 hover:border-blue-500/30 transition-colors"
        >
          <Building2 className="h-8 w-8 text-violet-400 shrink-0" />
          <div>
            <p className="text-white font-medium text-sm">Strategy Session landing</p>
            <p className="text-gray-500 text-xs">Share the offer page</p>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-500 ml-auto shrink-0" />
        </a>
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 border border-white/5 hover:border-cyan-500/30 transition-colors"
        >
          <MessageSquareText className="h-8 w-8 text-cyan-400 shrink-0" />
          <div>
            <p className="text-white font-medium text-sm">Telegram intake</p>
            <p className="text-gray-500 text-xs">Bot / guided flow link</p>
          </div>
          <ExternalLink className="h-4 w-4 text-gray-500 ml-auto shrink-0" />
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Pending intake</p>
          <p className="text-2xl font-bold text-white">{stats.pending}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Strategy session paid</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.withPaidSession}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Telegram session</p>
          <p className="text-2xl font-bold text-cyan-400">{stats.withTelegram}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Paid + Telegram</p>
          <p className="text-2xl font-bold text-white">{stats.withBoth}</p>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-semibold text-white">Clients awaiting intake completion</h2>
          <p className="text-sm text-gray-500 mt-1">
            Excludes anyone who already has a Brand Identity report. Data may arrive from your team (Strategy
            Session) or from Telegram.
          </p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 mb-2">No pending intake</p>
            <p className="text-sm text-gray-500">
              Everyone with a Brand Identity report has cleared this queue, or add clients in Supabase.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">
                    Strategy session
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Telegram</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Last activity</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map(({ customer: c, strategySessionPaid, telegram }) => {
                  const name = getClientDisplayName(c)
                  const tgLabel = telegram
                    ? telegram.telegram_username
                      ? `@${telegram.telegram_username}`
                      : `ID ${telegram.telegram_id}`
                    : c.telegram_id != null
                      ? `ID ${c.telegram_id} (no bot session)`
                      : "—"
                  const phase = telegram?.phase
                  const status = phase ? statusConfig[phase] : null
                  const StatusIcon = status?.icon ?? Clock

                  return (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{name}</span>
                        <p className="text-xs text-gray-500 font-mono">{c.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{c.email || "—"}</td>
                      <td className="px-4 py-3">
                        {strategySessionPaid ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                            Paid
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Not paid / no record</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-cyan-400/90 text-sm">{tgLabel}</span>
                          {telegram && status ? (
                            <div className="flex items-center gap-1.5">
                              <StatusIcon
                                className={cn(
                                  "h-3.5 w-3.5",
                                  status.color,
                                  telegram.phase === "generating" && "animate-spin",
                                )}
                              />
                              <span
                                className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}
                              >
                                {status.label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">No active bot session</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {telegram?.last_activity ? formatTime(telegram.last_activity) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                          title="Inspect (coming soon)"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
