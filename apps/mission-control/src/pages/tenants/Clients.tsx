import { useMemo, useState } from "react"
import { Users, RefreshCw, Send, Building2 } from "lucide-react"
import { useClients, getClientDisplayName, type Client } from "@/hooks/useClients"
import { cn } from "@/lib/utils"

export default function Clients() {
  const { clients, loading, error, refetch } = useClients()
  const [q, setQ] = useState("")

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-400" />
            Clients
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
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500 text-sm">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500 text-sm">
                  No clients yet. Run the seed SQL in{" "}
                  <code className="text-gray-400">docs/TELEGRAM_CLIENTS_SEED.md</code> for Juss &amp; Jocelyn,
                  or complete intake so rows appear in <code className="text-gray-400">customers</code>.
                </td>
              </tr>
            ) : (
              filtered.map((c) => <ClientRow key={c.id} client={c} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ClientRow({ client: c }: { client: Client }) {
  const name = getClientDisplayName(c)
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
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-300">
          {c.client_status || "—"}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
      </td>
    </tr>
  )
}
