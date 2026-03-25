import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPIStatCardProps {
  title: string
  value: number
  icon?: LucideIcon
  change?: number
  format?: "number" | "percent" | "currency"
  className?: string
}

export function KPIStatCard({ title, value, icon: Icon, change, format = "number", className }: KPIStatCardProps) {
  const formattedValue = format === "percent" ? `${value}%` : format === "currency" ? `$${value.toLocaleString()}` : value.toLocaleString()

  return (
    <div className={cn("bg-white rounded-xl p-4 shadow-card", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-grey-500">{title}</p>
        {Icon && <Icon className="h-5 w-5 text-grey-400" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-grey-900">{formattedValue}</p>
        {change !== undefined && (
          <span className={cn("text-sm font-medium", change >= 0 ? "text-green" : "text-red")}>
            {change >= 0 ? "+" : ""}{change}%
          </span>
        )}
      </div>
    </div>
  )
}
