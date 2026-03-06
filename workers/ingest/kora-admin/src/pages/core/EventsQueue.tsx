import { useState } from "react"
import { Play, RotateCw, Trash2, AlertCircle, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/DataTable"
import { StatusPill } from "@/components/StatusPill"
import { EventTypeBadge } from "@/components/EventTypeBadge"
import { DetailDrawer } from "@/components/DetailDrawer"
import { mockKoraEvents, getTenantById } from "@/lib/mock-data"
import type { KoraEvent } from "@/lib/types"

function formatTimeAgo(timestamp: string): string {
  const diffMins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

type StatusFilter = "all" | "pending" | "processing" | "completed" | "failed"

export function EventsQueue() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<KoraEvent | null>(null)

  const filteredEvents = mockKoraEvents.filter((event) => {
    if (statusFilter !== "all" && event.status !== statusFilter) return false
    if (searchQuery) {
      const tenant = event.tenant_id ? getTenantById(event.tenant_id) : null
      const tenantName = tenant?.name.toLowerCase() || ""
      return event.event_type.toLowerCase().includes(searchQuery.toLowerCase()) || tenantName.includes(searchQuery.toLowerCase())
    }
    return true
  })

  const columns = [
    { key: "event_type" as const, header: "Event Type", render: (event: KoraEvent) => <EventTypeBadge type={event.event_type} /> },
    { key: "tenant_id" as const, header: "Tenant", render: (event: KoraEvent) => { const tenant = event.tenant_id ? getTenantById(event.tenant_id) : null; return <span className={tenant ? "text-grey-900" : "text-grey-400 italic"}>{tenant?.name || "Global"}</span> } },
    { key: "status" as const, header: "Status", render: (event: KoraEvent) => <StatusPill status={event.status as "pending" | "completed" | "failed"} /> },
    { key: "retry_count" as const, header: "Retries", render: (event: KoraEvent) => <span className={event.retry_count > 0 ? "text-orange font-medium" : "text-grey-400"}>{event.retry_count}/{event.max_retries}</span> },
    { key: "created_at" as const, header: "Created", render: (event: KoraEvent) => <span className="text-grey-500 text-sm">{formatTimeAgo(event.created_at)}</span> },
    { key: "processed_at" as const, header: "Processed", render: (event: KoraEvent) => <span className="text-grey-500 text-sm">{event.processed_at ? formatTimeAgo(event.processed_at) : "—"}</span> },
  ]

  const pendingCount = mockKoraEvents.filter((e) => e.status === "pending").length
  const failedCount = mockKoraEvents.filter((e) => e.status === "failed").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-grey-900">Events Queue</h1>
          <p className="text-grey-500 mt-1">Monitor and manage the K.O.R.A event processing queue.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-grey-500">Pending:</span>
            <span className="font-semibold text-yellow-600">{pendingCount}</span>
            <span className="text-grey-300">|</span>
            <span className="text-grey-500">Failed:</span>
            <span className="font-semibold text-red-600">{failedCount}</span>
          </div>
          <Button variant="outline"><RotateCw className="h-4 w-4 mr-2" />Process All Pending</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card">
        <div className="p-4 border-b border-grey-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-400" />
            <Input placeholder="Search by event type or tenant..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-grey-400" />
            {(["all", "pending", "processing", "completed", "failed"] as StatusFilter[]).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${statusFilter === status ? "bg-royal text-white" : "text-grey-600 hover:bg-grey-100"}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <DataTable data={filteredEvents} columns={columns} keyExtractor={(event) => event.id} onRowClick={setSelectedEvent} emptyMessage="No events found matching your filters" />
      </div>

      <DetailDrawer isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Event Details">
        {selectedEvent && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <EventTypeBadge type={selectedEvent.event_type} />
              <StatusPill status={selectedEvent.status as "pending" | "completed" | "failed"} />
            </div>
            {selectedEvent.tenant_id && (
              <div><p className="text-xs text-grey-500 uppercase tracking-wider mb-1">Tenant</p><p className="text-grey-900 font-medium">{getTenantById(selectedEvent.tenant_id)?.name}</p></div>
            )}
            <div><p className="text-xs text-grey-500 uppercase tracking-wider mb-1">Payload</p><pre className="bg-grey-50 rounded-lg p-3 text-sm text-grey-700 overflow-x-auto">{JSON.stringify(selectedEvent.payload, null, 2)}</pre></div>
            {selectedEvent.error_message && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-700 mb-1"><AlertCircle className="h-4 w-4" /><span className="font-medium">Error</span></div>
                <p className="text-sm text-red-600">{selectedEvent.error_message}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-grey-500">Created</p><p className="text-grey-900">{new Date(selectedEvent.created_at).toLocaleString()}</p></div>
              <div><p className="text-grey-500">Processed</p><p className="text-grey-900">{selectedEvent.processed_at ? new Date(selectedEvent.processed_at).toLocaleString() : "—"}</p></div>
              <div><p className="text-grey-500">Retries</p><p className="text-grey-900">{selectedEvent.retry_count}/{selectedEvent.max_retries}</p></div>
              <div><p className="text-grey-500">Locked By</p><p className="text-grey-900">{selectedEvent.locked_by || "—"}</p></div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-grey-100">
              {selectedEvent.status === "failed" && <Button variant="outline" size="sm"><RotateCw className="h-4 w-4 mr-2" />Retry</Button>}
              {selectedEvent.status === "pending" && <Button size="sm"><Play className="h-4 w-4 mr-2" />Process Now</Button>}
              <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  )
}
