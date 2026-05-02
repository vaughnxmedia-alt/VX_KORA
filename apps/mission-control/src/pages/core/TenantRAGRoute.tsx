import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Database,
  BarChart3,
  FileText,
  Zap,
  Users,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { OFFICIAL_CLIENT_ID, useClients, getClientDisplayName } from "@/hooks/useClients"

type ApprovalSource = "auto" | "manual" | "telegram"

interface TenantRAG {
  id: string
  tenant_name: string
  tenant_id: string
  total_documents: number
  documents_this_week: number
  approval_sources: { auto: number; manual: number; telegram: number }
  strategy_linkage_rate: number
  total_usage: number
  rag_health_score: number
  smarter_opt_in: boolean
  last_updated: string | null
}

interface RagDocRow {
  id: string
  tenant_id: string
  title: string
  approval_source: ApprovalSource
  usage_count: number | null
  strategy_linkage: string[] | null
  is_active: boolean | null
  updated_at: string | null
  created_at: string | null
  source_id: string | null
}

interface DocumentEntry {
  id: string
  title: string
  source: string
  approval_source: ApprovalSource
  approved_at: string
  usage_count: number
  strategy_links: number
}

function startOfWeekIso(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function normalizeApproval(s: string | null): ApprovalSource {
  if (s === "auto" || s === "manual" || s === "telegram") return s
  return "manual"
}

export default function TenantRAGRoute() {
  const { clients, loading: clientsLoading } = useClients()
  const [searchParams, setSearchParams] = useSearchParams()
  const customerIdParam = searchParams.get("customerId")

  const [ragRows, setRagRows] = useState<RagDocRow[]>([])
  const [smarterByTenant, setSmarterByTenant] = useState<Record<string, boolean>>({})
  const [loadingRag, setLoadingRag] = useState(true)
  const [ragError, setRagError] = useState<string | null>(null)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(OFFICIAL_CLIENT_ID)

  const fetchRagData = useCallback(async () => {
    setLoadingRag(true)
    setRagError(null)
    const [docsRes, filtersRes] = await Promise.all([
      supabase
        .from("kora_tenant_rag_documents")
        .select(
          "id, tenant_id, title, approval_source, usage_count, strategy_linkage, is_active, updated_at, created_at, source_id",
        ),
      supabase
        .from("kora_intelligence_filters")
        .select("tenant_id, allow_make_me_smarter, is_default"),
    ])

    if (docsRes.error) {
      setRagError(docsRes.error.message)
      setRagRows([])
    } else {
      setRagRows((docsRes.data || []) as RagDocRow[])
    }

    const smarter: Record<string, boolean> = {}
    if (!filtersRes.error && filtersRes.data) {
      type FilterRow = {
        tenant_id: string
        allow_make_me_smarter: boolean | null
        is_default: boolean | null
      }
      const byTenant = new Map<string, FilterRow[]>()
      for (const row of filtersRes.data as FilterRow[]) {
        const list = byTenant.get(row.tenant_id) || []
        list.push(row)
        byTenant.set(row.tenant_id, list)
      }
      for (const [tid, rows] of byTenant) {
        const def = rows.find((r) => r.is_default)
        const pick = def ?? rows[0]
        smarter[tid] = (pick?.allow_make_me_smarter ?? true) !== false
      }
    }
    setSmarterByTenant(smarter)
    setLoadingRag(false)
  }, [])

  useEffect(() => {
    void fetchRagData()
  }, [fetchRagData])

  const tenants = useMemo((): TenantRAG[] => {
    const weekStart = startOfWeekIso(new Date()).getTime()
    const byTenant = new Map<string, RagDocRow[]>()
    for (const row of ragRows) {
      const list = byTenant.get(row.tenant_id) || []
      list.push(row)
      byTenant.set(row.tenant_id, list)
    }

    return clients.map((c) => {
      const docs = byTenant.get(c.id) || []
      const total = docs.length
      let auto = 0
      let manual = 0
      let telegram = 0
      let week = 0
      let withStrategy = 0
      let usageSum = 0
      let last: string | null = null

      for (const d of docs) {
        const ap = normalizeApproval(d.approval_source)
        if (ap === "auto") auto++
        else if (ap === "telegram") telegram++
        else manual++

        const created = d.created_at ? new Date(d.created_at).getTime() : 0
        if (created >= weekStart) week++

        const sl = d.strategy_linkage?.length ?? 0
        if (sl > 0) withStrategy++

        usageSum += d.usage_count ?? 0

        const cand = d.updated_at || d.created_at
        if (cand && (!last || cand > last)) last = cand
      }

      const stratRate = total > 0 ? withStrategy / total : 0
      const active = docs.filter((d) => d.is_active !== false).length
      const activeRate = total > 0 ? active / total : 0
      const health =
        total === 0 ? 0 : Math.min(1, activeRate * 0.65 + stratRate * 0.35)

      return {
        id: c.id,
        tenant_id: c.id,
        tenant_name: getClientDisplayName(c),
        total_documents: total,
        documents_this_week: week,
        approval_sources: { auto, manual, telegram },
        strategy_linkage_rate: stratRate,
        total_usage: usageSum,
        rag_health_score: health,
        smarter_opt_in: smarterByTenant[c.id] ?? false,
        last_updated: last,
      }
    }).sort((a, b) => b.total_documents - a.total_documents)
  }, [clients, ragRows, smarterByTenant])

  useEffect(() => {
    if (!customerIdParam || tenants.length === 0) return
    const match = tenants.find((t) => t.tenant_id === customerIdParam)
    if (match) setSelectedTenantId(match.tenant_id)
  }, [customerIdParam, tenants])

  const selectTenant = (t: TenantRAG) => {
    setSelectedTenantId(t.tenant_id)
    setSearchParams({ customerId: t.tenant_id })
  }

  const selectedTenant = tenants.find((t) => t.tenant_id === selectedTenantId) ?? null

  const documents: DocumentEntry[] = useMemo(() => {
    if (!selectedTenant) return []
    return ragRows
      .filter((r) => r.tenant_id === selectedTenant.tenant_id)
      .sort((a, b) => {
        const ta = new Date(a.updated_at || a.created_at || 0).getTime()
        const tb = new Date(b.updated_at || b.created_at || 0).getTime()
        return tb - ta
      })
      .slice(0, 50)
      .map((d) => ({
        id: d.id,
        title: d.title,
        source: d.source_id ? `source:${String(d.source_id).slice(0, 8)}…` : "—",
        approval_source: normalizeApproval(d.approval_source),
        approved_at: new Date(d.updated_at || d.created_at || Date.now()).toLocaleString(),
        usage_count: d.usage_count ?? 0,
        strategy_links: d.strategy_linkage?.length ?? 0,
      }))
  }, [ragRows, selectedTenant])

  const totalDocuments = tenants.reduce((sum, t) => sum + t.total_documents, 0)
  const tenantsWithDocs = tenants.filter((t) => t.total_documents > 0).length
  const avgHealthScore =
    tenants.length > 0
      ? tenants.reduce((sum, t) => sum + t.rag_health_score, 0) / tenants.length
      : 0
  const smarterCount = tenants.filter((t) => t.smarter_opt_in).length

  const loading = clientsLoading || loadingRag

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">RAG / Copy Support</h1>
        <p className="text-gray-400 text-sm">
          Client-specific knowledge for content ideas, ad copy, audience-informed hooks, and KORA answers.
          Audience pool notes and approved documents should become the grounding layer for each client.
        </p>
      </div>

      {ragError && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {ragError}
          {ragError.toLowerCase().includes("permission") || ragError.toLowerCase().includes("policy") ? (
            <span className="block mt-1 text-amber-200/90">
              Sign in with a dashboard role that can read RAG (admin or author). Apply the latest Supabase
              migration if authors still cannot load documents.
            </span>
          ) : null}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading tenant RAG data…
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Users className="h-4 w-4" />
            <span>KORA clients</span>
          </div>
          <p className="text-2xl font-bold text-white">{tenants.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Database className="h-4 w-4" />
            <span>Copy support docs</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalDocuments.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <BarChart3 className="h-4 w-4" />
            <span>Avg support health</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{(avgHealthScore * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Zap className="h-4 w-4" />
            <span>Make me smarter</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {smarterCount}/{tenants.length}
          </p>
          <p className="text-gray-500 text-xs mt-1">{tenantsWithDocs} tenants with ≥1 doc</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {tenants.map((tenant) => (
          <div
            key={tenant.id}
            onClick={() => selectTenant(tenant)}
            className={cn(
              "bg-gray-800/50 rounded-xl p-5 border cursor-pointer transition-all",
              selectedTenantId === tenant.tenant_id
                ? "border-blue-500 bg-blue-500/5"
                : "border-white/5 hover:border-white/20",
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">{tenant.tenant_name}</h3>
                <p className="text-gray-500 text-xs">
                  Last updated:{" "}
                  {tenant.last_updated
                    ? new Date(tenant.last_updated).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {tenant.smarter_opt_in && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400">
                    Make me smarter
                  </span>
                )}
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              <div>
                <p className="text-gray-500 text-xs">Documents</p>
                <p className="text-white font-semibold">{tenant.total_documents}</p>
                <p className="text-emerald-400 text-xs">+{tenant.documents_this_week} this week</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Usage (sum)</p>
                <p className="text-white font-semibold">{tenant.total_usage}</p>
                <p className="text-gray-500 text-xs">from usage_count</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Strategy link</p>
                <p className="text-white font-semibold">
                  {(tenant.strategy_linkage_rate * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Health</p>
                <p
                  className={cn(
                    "font-semibold",
                    tenant.total_documents === 0
                      ? "text-gray-500"
                      : tenant.rag_health_score >= 0.9
                        ? "text-emerald-400"
                        : tenant.rag_health_score >= 0.7
                          ? "text-amber-400"
                          : "text-red-400",
                  )}
                >
                  {tenant.total_documents === 0 ? "—" : `${(tenant.rag_health_score * 100).toFixed(0)}%`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className="text-gray-500">Approval sources:</span>
              <span className="text-emerald-400">Auto: {tenant.approval_sources.auto}</span>
              <span className="text-blue-400">Manual: {tenant.approval_sources.manual}</span>
              <span className="text-purple-400">Telegram: {tenant.approval_sources.telegram}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedTenant && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {selectedTenant.tenant_name} — copy support inputs
            </h2>
            <span className="text-gray-500 text-xs font-mono">{selectedTenant.tenant_id}</span>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Approval
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Strategy links
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                      No copy support documents for this client yet.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-white text-sm">{doc.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm">{doc.source}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            doc.approval_source === "auto"
                              ? "bg-emerald-400/10 text-emerald-400"
                              : doc.approval_source === "telegram"
                                ? "bg-purple-400/10 text-purple-400"
                                : "bg-blue-400/10 text-blue-400",
                          )}
                        >
                          {doc.approval_source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm">{doc.approved_at}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white text-sm">{doc.usage_count}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white text-sm">{doc.strategy_links}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
