import { useState } from "react"
import { Check, ChevronDown, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tenant } from "@/lib/types"

interface TenantSelectorProps {
  tenants: Tenant[]
  selectedTenant: Tenant | null
  onSelect: (tenant: Tenant) => void
  className?: string
}

export function TenantSelector({ tenants, selectedTenant, onSelect, className }: TenantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-grey-200 rounded-lg text-sm font-medium text-grey-700 hover:border-grey-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-grey-400" />
          {selectedTenant ? <span>{selectedTenant.name}</span> : <span className="text-grey-400">Select a tenant</span>}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-grey-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-grey-200 rounded-lg shadow-lg z-20 py-1 max-h-64 overflow-y-auto">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => { onSelect(tenant); setIsOpen(false) }}
                className={cn("w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-grey-50 transition-colors", selectedTenant?.id === tenant.id && "bg-royal/5")}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium text-grey-900">{tenant.name}</span>
                  <span className="text-xs text-grey-500">{tenant.industry}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!tenant.is_active && <span className="text-xs bg-grey-100 text-grey-500 px-1.5 py-0.5 rounded">Inactive</span>}
                  {selectedTenant?.id === tenant.id && <Check className="h-4 w-4 text-royal" />}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
