import { cn } from "@/lib/utils"
import type { KoraEventType } from "@/lib/types"

interface EventTypeBadgeProps {
  type: KoraEventType
  className?: string
}

const eventTypeConfig: Record<KoraEventType, { label: string; color: string }> = {
  global_ingest_requested: { label: "Ingest Requested", color: "bg-blue-100 text-blue-700" },
  global_ingest_completed: { label: "Ingest Completed", color: "bg-green-100 text-green-700" },
  tenant_routing_requested: { label: "Routing Requested", color: "bg-purple-100 text-purple-700" },
  tenant_routing_completed: { label: "Routing Completed", color: "bg-purple-100 text-purple-700" },
  enrichment_requested: { label: "Enrichment Requested", color: "bg-yellow-100 text-yellow-700" },
  enrichment_completed: { label: "Enrichment Completed", color: "bg-yellow-100 text-yellow-700" },
  rag_sync_requested: { label: "RAG Sync Requested", color: "bg-cyan-100 text-cyan-700" },
  rag_sync_completed: { label: "RAG Sync Completed", color: "bg-cyan-100 text-cyan-700" },
  strategy_generation_requested: { label: "Strategy Requested", color: "bg-pink-100 text-pink-700" },
  strategy_generation_completed: { label: "Strategy Completed", color: "bg-pink-100 text-pink-700" },
}

export function EventTypeBadge({ type, className }: EventTypeBadgeProps) {
  const config = eventTypeConfig[type] || { label: type, color: "bg-grey-100 text-grey-700" }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", config.color, className)}>
      {config.label}
    </span>
  )
}
