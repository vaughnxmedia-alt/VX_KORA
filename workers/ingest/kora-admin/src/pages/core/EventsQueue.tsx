import { useState } from "react"
import { 
  Calendar, MapPin, ExternalLink, Send, Lightbulb, Clock, Globe,
  Filter, MoreHorizontal, Users, Ticket
} from "lucide-react"
import { cn } from "@/lib/utils"

type EventStatus = "discovered" | "reviewed" | "pushed_to_strategy" | "pushed_to_telegram" | "archived"

interface EventItem {
  id: string
  title: string
  event_date: string
  event_end_date: string | null
  location: string | null
  is_virtual: boolean
  source: string
  source_url: string
  registration_url: string | null
  price: string | null
  organizer: string | null
  description: string
  tenant_relevance: { tenant_name: string; reason: string; score: number }[]
  status: EventStatus
}

const mockEvents: EventItem[] = []

const statusConfig: Record<EventStatus, { label: string; color: string; bg: string }> = {
  discovered: { label: "Discovered", color: "text-gray-400", bg: "bg-gray-400/10" },
  reviewed: { label: "Reviewed", color: "text-blue-400", bg: "bg-blue-400/10" },
  pushed_to_strategy: { label: "In Strategy", color: "text-purple-400", bg: "bg-purple-400/10" },
  pushed_to_telegram: { label: "Sent to Telegram", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  archived: { label: "Archived", color: "text-gray-500", bg: "bg-gray-500/10" },
}

export default function EventsQueue() {
  const [events] = useState<EventItem[]>(mockEvents)
  const [filterStatus, setFilterStatus] = useState<EventStatus | "all">("all")
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")

  const filteredEvents = events.filter(event => {
    if (filterStatus !== "all" && event.status !== filterStatus) return false
    return true
  })

  const upcomingCount = events.filter(e => new Date(e.event_date) > new Date()).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Events Queue</h1>
          <p className="text-gray-400 text-sm">Event marketplace with tenant relevance and push options</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">{upcomingCount} upcoming events</span>
          <div className="flex items-center bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={cn(
                "px-3 py-1.5 rounded text-sm transition-colors",
                viewMode === "cards" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              )}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "px-3 py-1.5 rounded text-sm transition-colors",
                viewMode === "table" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              )}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Status:</span>
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as EventStatus | "all")}
          className="bg-gray-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="all">All Status</option>
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-2 gap-4">
          {filteredEvents.map((event) => {
            const status = statusConfig[event.status]
            const eventDate = new Date(event.event_date)
            const isPast = eventDate < new Date()
            
            return (
              <div 
                key={event.id}
                className={cn(
                  "bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden",
                  isPast && "opacity-60"
                )}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", status.bg, status.color)}>
                        {status.label}
                      </span>
                      {event.is_virtual && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400">
                          Virtual
                        </span>
                      )}
                    </div>
                    {event.price && (
                      <span className="text-white font-medium text-sm">{event.price}</span>
                    )}
                  </div>

                  <h3 className="text-white font-semibold text-lg mb-2">{event.title}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-300">
                        {eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {event.event_end_date && ` - ${new Date(event.event_end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {event.is_virtual ? (
                        <>
                          <Globe className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-300">Online Event</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-300">{event.location}</span>
                        </>
                      )}
                    </div>
                    {event.organizer && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-400">by {event.organizer}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{event.description}</p>

                  {/* Tenant Relevance */}
                  {event.tenant_relevance.length > 0 && (
                    <div className="mb-4">
                      <p className="text-gray-500 text-xs mb-2">Tenant Relevance:</p>
                      <div className="space-y-1">
                        {event.tenant_relevance.map((rel, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-blue-400">{rel.tenant_name}</span>
                            <span className="text-gray-500 text-xs">{(rel.score * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    {event.registration_url && (
                      <a 
                        href={event.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <Ticket className="h-4 w-4" />
                        Register
                      </a>
                    )}
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                      <Lightbulb className="h-4 w-4" />
                      Add to Strategy
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                      <Send className="h-4 w-4" />
                      Telegram
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors ml-auto">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Event</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Relevance</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEvents.map((event) => {
                const status = statusConfig[event.status]
                return (
                  <tr key={event.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{event.title}</p>
                      <p className="text-gray-500 text-xs">{event.organizer}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300 text-sm">
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300 text-sm">
                        {event.is_virtual ? "Virtual" : event.location}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {event.tenant_relevance.slice(0, 2).map((rel, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400">
                            {rel.tenant_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", status.bg, status.color)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                          <ExternalLink className="h-4 w-4" />
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
      )}

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No events match your filters</p>
        </div>
      )}
    </div>
  )
}
