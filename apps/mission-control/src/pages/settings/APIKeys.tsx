import { useState } from "react"
import { 
  Key, Plus, Copy, Eye, EyeOff, Trash2, MoreHorizontal,
  CheckCircle2, Clock, AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface APIKey {
  id: string
  name: string
  prefix: string
  lastUsed: string | null
  createdAt: string
  expiresAt: string | null
  status: "active" | "expired" | "revoked"
  permissions: string[]
  usageCount: number
}

const mockKeys: APIKey[] = []

const statusConfig = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  expired: { label: "Expired", color: "text-amber-400", bg: "bg-amber-400/10", icon: Clock },
  revoked: { label: "Revoked", color: "text-red-400", bg: "bg-red-400/10", icon: AlertTriangle },
}

export default function APIKeys() {
  const [keys] = useState<APIKey[]>(mockKeys)
  const [showKey, setShowKey] = useState<string | null>(null)

  const activeCount = keys.filter(k => k.status === "active").length
  const totalUsage = keys.reduce((sum, k) => sum + k.usageCount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">API Keys</h1>
          <p className="text-gray-400 text-sm">Manage API keys for programmatic access to KORA</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Keys</p>
          <p className="text-2xl font-bold text-white">{keys.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{activeCount}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total API Calls</p>
          <p className="text-2xl font-bold text-white">{totalUsage.toLocaleString()}</p>
        </div>
      </div>

      {/* Keys Table */}
      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Key</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Permissions</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Usage</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Last Used</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Expires</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {keys.map((key) => {
              const status = statusConfig[key.status]
              const StatusIcon = status.icon
              const isShowing = showKey === key.id
              
              return (
                <tr key={key.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-gray-500" />
                      <span className="text-white font-medium">{key.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-gray-400 text-sm font-mono">
                        {key.prefix}{isShowing ? "xxxxxxxxxxxx" : "************"}
                      </code>
                      <button 
                        onClick={() => setShowKey(isShowing ? null : key.id)}
                        className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                      >
                        {isShowing ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={cn("h-4 w-4", status.color)} />
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}>
                        {status.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {key.permissions.map((perm, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 capitalize">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300 text-sm">{key.usageCount.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 text-sm">{key.lastUsed || "Never"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-sm",
                      key.status === "expired" ? "text-amber-400" : "text-gray-400"
                    )}>
                      {key.expiresAt || "Never"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors">
                        <Trash2 className="h-4 w-4" />
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

      {/* Security Note */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium">Security Notice</p>
            <p className="text-gray-400 text-sm mt-1">
              API keys provide full access to KORA based on their permissions. Keep them secure and never share them publicly.
              Rotate keys regularly and revoke any that may have been compromised.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
