import { useState } from "react"
import { 
  Users as UsersIcon, Plus, MoreHorizontal, Shield, Building2,
  Mail, Clock, CheckCircle2, XCircle, Filter as FilterIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

type UserRole = "owner" | "admin" | "member" | "viewer"

interface User {
  id: string
  email: string
  fullName: string
  tenant: string
  role: UserRole
  isActive: boolean
  lastLogin: string | null
  createdAt: string
}

const mockUsers: User[] = []

const roleConfig: Record<UserRole, { label: string; color: string; bg: string }> = {
  owner: { label: "Owner", color: "text-purple-400", bg: "bg-purple-400/10" },
  admin: { label: "Admin", color: "text-blue-400", bg: "bg-blue-400/10" },
  member: { label: "Member", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  viewer: { label: "Viewer", color: "text-gray-400", bg: "bg-gray-400/10" },
}

export default function Users() {
  const [users] = useState<User[]>(mockUsers)
  const [filterTenant, setFilterTenant] = useState<string>("all")
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all")

  const tenants = [...new Set(users.map(u => u.tenant))]

  const filteredUsers = users.filter(u => {
    if (filterTenant !== "all" && u.tenant !== filterTenant) return false
    if (filterRole !== "all" && u.role !== filterRole) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 text-sm">Manage users across all tenants</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Invite User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Total Users</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{users.filter(u => u.isActive).length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Owners</p>
          <p className="text-2xl font-bold text-purple-400">{users.filter(u => u.role === "owner").length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5">
          <p className="text-gray-400 text-sm mb-1">Admins</p>
          <p className="text-2xl font-bold text-blue-400">{users.filter(u => u.role === "admin").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filter:</span>
        </div>
        <select 
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Tenants</option>
          {tenants.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select 
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as UserRole | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Roles</option>
          {Object.entries(roleConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Tenant</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Last Login</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map((user) => {
              const role = roleConfig[user.role]
              return (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.fullName}</p>
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-300 text-sm">{user.tenant}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-gray-500" />
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", role.bg, role.color)}>
                        {role.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.isActive ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-400 text-sm">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-500 text-sm">Inactive</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-400 text-sm">{user.lastLogin || "Never"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 text-sm">{user.createdAt}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
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
