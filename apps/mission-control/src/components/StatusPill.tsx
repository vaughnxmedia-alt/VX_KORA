import { cn } from "@/lib/utils"

export type Status = "healthy" | "warning" | "down" | "running" | "completed" | "failed" | "pending" | "active" | "draft"

interface StatusPillProps {
  status: Status
  label?: string
  className?: string
}

const statusConfig: Record<Status, { bg: string; dot: string; text: string; label: string }> = {
  healthy: { bg: "bg-green/10", dot: "bg-green", text: "text-green", label: "Healthy" },
  warning: { bg: "bg-yellow/10", dot: "bg-yellow", text: "text-yellow", label: "Warning" },
  down: { bg: "bg-red/10", dot: "bg-red", text: "text-red", label: "Down" },
  running: { bg: "bg-royal/10", dot: "bg-royal", text: "text-royal", label: "Running" },
  completed: { bg: "bg-green/10", dot: "bg-green", text: "text-green", label: "Completed" },
  failed: { bg: "bg-red/10", dot: "bg-red", text: "text-red", label: "Failed" },
  pending: { bg: "bg-yellow/10", dot: "bg-yellow", text: "text-yellow", label: "Pending" },
  active: { bg: "bg-green/10", dot: "bg-green", text: "text-green", label: "Active" },
  draft: { bg: "bg-grey-100", dot: "bg-grey-400", text: "text-grey-600", label: "Draft" },
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  const config = statusConfig[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", config.bg, config.text, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {label || config.label}
    </span>
  )
}
