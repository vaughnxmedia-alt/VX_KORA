import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  width?: "sm" | "md" | "lg"
}

const widthClasses = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" }

export function DetailDrawer({ isOpen, onClose, title, description, children, width = "md" }: DetailDrawerProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={onClose} />
      <div className={cn("fixed right-0 top-0 h-full bg-white shadow-xl z-50 flex flex-col transition-transform w-full", widthClasses[width])}>
        <div className="flex items-center justify-between p-5 border-b border-grey-100">
          <div>
            <h2 className="text-lg font-semibold text-grey-900">{title}</h2>
            {description && <p className="text-sm text-grey-500 mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-grey-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-grey-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">{children}</div>
      </div>
    </>
  )
}
