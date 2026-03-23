import { useState } from "react"
import { 
  GitBranch, Database, TrendingUp, CheckCircle2, Clock, AlertCircle,
  ChevronRight, BarChart3, FileText, Zap, Users
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TenantRAG {
  id: string
  tenant_name: string
  tenant_id: string
  total_documents: number
  documents_this_week: number
  approval_sources: { auto: number; manual: number; telegram: number }
  strategy_linkage_rate: number
  usage_frequency: number
  deliverable_usage_rate: number
  rag_health_score: number
  smarter_opt_in: boolean
  last_updated: string
}

const mockTenants: TenantRAG[] = []

interface DocumentEntry {
  id: string
  title: string
  source: string
  approval_source: "auto" | "manual" | "telegram"
  approved_at: string
  usage_count: number
  strategy_links: number
}

const mockDocuments: DocumentEntry[] = []

export default function TenantRAGRoute() {
  const [tenants] = useState<TenantRAG[]>(mockTenants)
  const [selectedTenant, setSelectedTenant] = useState<TenantRAG | null>(null)
  const [documents] = useState<DocumentEntry[]>(mockDocuments)

  const totalDocuments = tenants.reduce((sum, t) => sum + t.total_documents, 0)
  const avgHealthScore = tenants.length > 0 ? tenants.reduce((sum, t) => sum + t.rag_health_score, 0) / tenants.length : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Tenant RAG Route</h1>
        <p className="text-gray-400 text-sm">RAG intelligence portal for per-tenant document management</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Users className="h-4 w-4" />
            <span>Active Tenants</span>
          </div>
          <p className="text-2xl font-bold text-white">{tenants.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Database className="h-4 w-4" />
            <span>Total Documents</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalDocuments.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <BarChart3 className="h-4 w-4" />
            <span>Avg Health Score</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{(avgHealthScore * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Zap className="h-4 w-4" />
            <span>Make Me Smarter</span>
          </div>
          <p className="text-2xl font-bold text-white">{tenants.filter(t => t.smarter_opt_in).length}/{tenants.length}</p>
        </div>
      </div>

      {/* Tenant Cards */}
      <div className="grid grid-cols-2 gap-4">
        {tenants.map((tenant) => (
          <div 
            key={tenant.id}
            onClick={() => setSelectedTenant(tenant)}
            className={cn(
              "bg-gray-800/50 rounded-xl p-5 border cursor-pointer transition-all",
              selectedTenant?.id === tenant.id 
                ? "border-blue-500 bg-blue-500/5" 
                : "border-white/5 hover:border-white/20"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">{tenant.tenant_name}</h3>
                <p className="text-gray-500 text-xs">Last updated: {tenant.last_updated}</p>
              </div>
              <div className="flex items-center gap-2">
                {tenant.smarter_opt_in && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400">
                    Make Me Smarter
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
                <p className="text-gray-500 text-xs">Usage</p>
                <p className="text-white font-semibold">{tenant.usage_frequency}</p>
                <p className="text-gray-500 text-xs">queries/week</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Strategy Link</p>
                <p className="text-white font-semibold">{(tenant.strategy_linkage_rate * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Health</p>
                <p className={cn(
                  "font-semibold",
                  tenant.rag_health_score >= 0.9 ? "text-emerald-400" :
                  tenant.rag_health_score >= 0.7 ? "text-amber-400" : "text-red-400"
                )}>
                  {(tenant.rag_health_score * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500">Approval Sources:</span>
              <span className="text-emerald-400">Auto: {tenant.approval_sources.auto}</span>
              <span className="text-blue-400">Manual: {tenant.approval_sources.manual}</span>
              <span className="text-purple-400">Telegram: {tenant.approval_sources.telegram}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Tenant Documents */}
      {selectedTenant && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {selectedTenant.tenant_name} - Recent Documents
            </h2>
            <button className="text-blue-400 text-sm hover:text-blue-300">View All</button>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Document</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Approval</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Added</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Usage</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Strategy Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {documents.map((doc) => (
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
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        doc.approval_source === "auto" ? "bg-emerald-400/10 text-emerald-400" :
                        doc.approval_source === "telegram" ? "bg-purple-400/10 text-purple-400" :
                        "bg-blue-400/10 text-blue-400"
                      )}>
                        {doc.approval_source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-sm">{doc.approved_at}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white text-sm">{doc.usage_count} queries</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white text-sm">{doc.strategy_links} strategies</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
