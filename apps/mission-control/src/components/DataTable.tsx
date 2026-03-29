import { cn } from "@/lib/utils"

interface Column<T> {
  key: keyof T
  header: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  emptyMessage?: string
  className?: string
}

export function DataTable<T>({ data, columns, keyExtractor, onRowClick, emptyMessage = "No data found", className }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={cn("p-8 text-center", className)}>
        <p className="text-grey-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-grey-100">
            {columns.map((col) => (
              <th key={String(col.key)} className="px-4 py-3 text-left text-xs font-semibold text-grey-500 uppercase tracking-wider">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-50">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={cn("hover:bg-grey-50 transition-colors", onRowClick && "cursor-pointer")}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3">
                  {col.render ? col.render(item) : String(item[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
