import { Construction } from "lucide-react"

interface PlaceholderProps {
  title: string
  description?: string
}

export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 bg-grey-100 rounded-2xl flex items-center justify-center mb-4">
        <Construction className="h-8 w-8 text-grey-400" />
      </div>
      <h1 className="text-2xl font-semibold text-grey-900">{title}</h1>
      <p className="text-grey-500 mt-2 max-w-md">{description || "This page is under construction. Check back soon!"}</p>
    </div>
  )
}
