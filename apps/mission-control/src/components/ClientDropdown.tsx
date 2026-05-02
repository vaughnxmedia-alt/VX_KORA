import { OFFICIAL_CLIENT_ID, useClients } from "@/hooks/useClients"
import { Users, ChevronDown, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClientDropdownProps {
  selectedClientId: string | null
  onClientChange: (clientId: string | null) => void
  showAllOption?: boolean
  allOptionLabel?: string
  includeOfficialClient?: boolean
  officialClientLabel?: string
  className?: string
}

export function ClientDropdown({
  selectedClientId,
  onClientChange,
  showAllOption = true,
  allOptionLabel = "All KORA Clients",
  includeOfficialClient = false,
  officialClientLabel = "JahKnowsPR",
  className
}: ClientDropdownProps) {
  const { clients, loading, getDisplayName } = useClients()

  const selectedClient = selectedClientId
    ? clients.find(c => c.id === selectedClientId)
    : null

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-gray-700 rounded">
          {selectedClient ? (
            <Building2 className="h-4 w-4 text-blue-400" />
          ) : (
            <Users className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <select
          value={selectedClientId || "all"}
          onChange={(e) => onClientChange(e.target.value === "all" ? null : e.target.value)}
          disabled={loading}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-2 pr-8 text-sm text-white appearance-none cursor-pointer hover:border-white/20 transition-colors min-w-[200px]"
        >
          {showAllOption && (
            <option value="all">{allOptionLabel}</option>
          )}
          {includeOfficialClient && !clients.some((client) => client.id === OFFICIAL_CLIENT_ID) && (
            <option value={OFFICIAL_CLIENT_ID}>{officialClientLabel}</option>
          )}
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {getDisplayName(client)}
              {client.client_status === "inactive" && " (Inactive)"}
            </option>
          ))}
        </select>
        <ChevronDown className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  )
}
