import { useState, useRef, useEffect } from "react"
import { ChevronDown, User, Building2, X, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAgentStore } from "@/state/agentStore"

interface ClientSelectorProps {
  className?: string
}

export function ClientSelector({ className }: ClientSelectorProps) {
  const { clients, selectedClientId, setSelectedClient } = useAgentStore()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedClient = clients.find((c) => c.id === selectedClientId)
  
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.businessName?.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active_client": return "bg-green"
      case "meeting_scheduled": return "bg-yellow"
      case "lead_captured": return "bg-cyan"
      default: return "bg-grey-500"
    }
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all w-full min-w-[280px]",
          "bg-grey-900/50 hover:bg-grey-900/80",
          isOpen ? "border-royal ring-2 ring-royal/20" : "border-grey-800 hover:border-grey-700"
        )}
      >
        {selectedClient ? (
          <>
            <div className="w-8 h-8 bg-royal/20 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-royal" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {selectedClient.businessName || selectedClient.name}
              </p>
              <p className="text-xs text-grey-500 truncate">{selectedClient.email}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedClient(null)
              }}
              className="p-1 rounded hover:bg-white/10 text-grey-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 bg-grey-800 rounded-lg flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-grey-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-grey-400">All Clients</p>
              <p className="text-xs text-grey-600">Viewing all deliverables</p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-grey-500 transition-transform", isOpen && "rotate-180")} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-grey-900 border border-grey-800 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-grey-800">
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-grey-800 border border-grey-700 rounded-lg text-sm text-white placeholder:text-grey-500 focus:outline-none focus:border-royal"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto scrollbar-thin">
            <button
              onClick={() => {
                setSelectedClient(null)
                setIsOpen(false)
                setSearch("")
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors",
                selectedClientId === null && "bg-royal/10"
              )}
            >
              <div className="w-8 h-8 bg-grey-800 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-grey-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">All Clients</p>
                <p className="text-xs text-grey-500">View all deliverables</p>
              </div>
            </button>

            <div className="h-px bg-grey-800 mx-3" />

            {filteredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => {
                  setSelectedClient(client.id)
                  setIsOpen(false)
                  setSearch("")
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors",
                  selectedClientId === client.id && "bg-royal/10"
                )}
              >
                <div className="w-8 h-8 bg-royal/20 rounded-lg flex items-center justify-center relative">
                  <User className="h-4 w-4 text-royal" />
                  <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-grey-900", getStatusColor(client.status))} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {client.businessName || client.name}
                  </p>
                  <p className="text-xs text-grey-500 truncate">{client.name}</p>
                </div>
              </button>
            ))}

            {filteredClients.length === 0 && (
              <div className="px-3 py-6 text-center">
                <p className="text-sm text-grey-500">No clients found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
