import { useState } from "react"
import { 
  Building2, Plus, MoreHorizontal, CheckCircle2, XCircle, Clock,
  Users, Database, Send, Filter as FilterIcon, Settings
} from "lucide-react"
import { cn } from "@/lib/utils"

type TenantStatus = "active" | "inactive" | "suspended" | "trial"

interface Tenant {
  id: string
  name: string
  slug: string
  industry: string
  status: TenantStatus
  isInternal: boolean
  usersCount: number
  ragDocuments: number
  sourcesCount: number
  telegramEnabled: boolean
  filterProfileName: string | null
  lastActivity: string
  createdAt: string
}

const mockTenants: Tenant[] = []

const statusConfig = {
  active: { color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Active" },
  inactive: { color: "text-gray-400", bg: "bg-gray-400/10", label: "Inactive" },
  suspended: { color: "text-red-400", bg: "bg-red-400/10", label: "Suspended" },
  trial: { color: "text-amber-400", bg: "bg-amber-400/10", label: "Trial" },
}

export default function Tenants() {
  const [tenants] = useState<Tenant[]>(mockTenants)
  const [filterStatus, setFilterStatus] = useState<TenantStatus | "all">("all")

  const filteredTenants = tenants.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenants</h1>
          <p className="text-gray-400 text-sm">Manage tenant organizations and their settings</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Add Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Tenants</p>
          <p className="text-2xl font-bold text-white">{tenants.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{tenants.filter(t => t.status === "active").length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Users</p>
          <p className="text-2xl font-bold text-white">{tenants.reduce((sum, t) => sum + t.usersCount, 0)}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total RAG Documents</p>
          <p className="text-2xl font-bold text-white">{tenants.reduce((sum, t) => sum + t.ragDocuments, 0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Status:</span>
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TenantStatus | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Status</option>
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Tenants Table */}
      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tenant</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Industry</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Users</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">RAG Docs</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Sources</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Telegram</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Filter Profile</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredTenants.map((tenant) => {
              const status = statusConfig[tenant.status]
              return (
                <tr key={tenant.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-700 rounded-lg">
                        <Building2 className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium flex items-center gap-2">
                          {tenant.name}
                          {tenant.isInternal && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Internal</span>
                          )}
                        </p>
                        <p className="text-gray-500 text-xs">@{tenant.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300 text-sm">{tenant.industry}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-white text-sm">{tenant.usersCount}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Database className="h-4 w-4 text-gray-500" />
                      <span className="text-white text-sm">{tenant.ragDocuments}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white text-sm">{tenant.sourcesCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    {tenant.telegramEnabled ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-500" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 text-sm">{tenant.filterProfileName || "-"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <Settings className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
