import { useState } from "react"
import { Play, RefreshCw, AlertCircle, Clock, FileText, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/DataTable"
import { StatusPill } from "@/components/StatusPill"
import { DetailDrawer } from "@/components/DetailDrawer"
import { mockGlobalIngestRuns, mockGlobalRssItems } from "@/lib/mock-data"
import type { GlobalIngestRun, GlobalRssItem } from "@/lib/types"

function formatTimeAgo(timestamp: string): string {
  const diffMins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

function formatDuration(ms: number | null): string {
  if (!ms) return "N/A"
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
}

export function GlobalIngest() {
  const [activeTab, setActiveTab] = useState<"runs" | "items">("runs")
  const [selectedRun, setSelectedRun] = useState<GlobalIngestRun | null>(null)
  const [selectedItem, setSelectedItem] = useState<GlobalRssItem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const runColumns = [
    { key: "started_at" as const, header: "Started", render: (run: GlobalIngestRun) => <span className="text-grey-600 text-sm">{formatTimeAgo(run.started_at)}</span> },
    { key: "status" as const, header: "Status", render: (run: GlobalIngestRun) => <StatusPill status={run.status === "completed" ? "completed" : run.status === "running" ? "running" : run.status === "completed_with_errors" ? "warning" : "failed"} label={run.status.replace(/_/g, " ")} /> },
    { key: "sources_count" as const, header: "Sources", render: (run: GlobalIngestRun) => <span className="text-grey-900 font-medium">{run.sources_count}</span> },
    { key: "items_seen" as const, header: "Seen", render: (run: GlobalIngestRun) => <span className="text-grey-600">{run.items_seen}</span> },
    { key: "items_inserted" as const, header: "Inserted", render: (run: GlobalIngestRun) => <span className="text-green-600 font-medium">{run.items_inserted}</span> },
    { key: "errors_count" as const, header: "Errors", render: (run: GlobalIngestRun) => <span className={run.errors_count > 0 ? "text-orange font-medium" : "text-grey-400"}>{run.errors_count}</span> },
    { key: "duration_ms" as const, header: "Duration", render: (run: GlobalIngestRun) => <span className="text-grey-500 text-sm">{formatDuration(run.duration_ms)}</span> },
  ]

  const itemColumns = [
    { key: "title" as const, header: "Title", render: (item: GlobalRssItem) => <div className="max-w-md"><p className="font-medium text-grey-900 truncate">{item.title}</p><p className="text-xs text-grey-500 truncate mt-0.5">{item.url}</p></div> },
    { key: "source_name" as const, header: "Source", render: (item: GlobalRssItem) => <span className="text-grey-600 text-sm">{item.source_name}</span> },
    { key: "published_at" as const, header: "Published", render: (item: GlobalRssItem) => <span className="text-grey-500 text-sm">{formatTimeAgo(item.published_at)}</span> },
    { key: "categories" as const, header: "Categories", render: (item: GlobalRssItem) => <div className="flex flex-wrap gap-1">{item.categories.slice(0, 2).map((cat) => <span key={cat} className="text-xs bg-grey-100 text-grey-600 px-1.5 py-0.5 rounded">{cat}</span>)}{item.categories.length > 2 && <span className="text-xs text-grey-400">+{item.categories.length - 2}</span>}</div> },
    { key: "is_distributed" as const, header: "Distributed", render: (item: GlobalRssItem) => <StatusPill status={item.is_distributed ? "completed" : "pending"} label={item.is_distributed ? "Yes" : "No"} /> },
  ]

  const filteredItems = mockGlobalRssItems.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.source_name.toLowerCase().includes(searchQuery.toLowerCase()) || item.categories.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-grey-900">Global Ingest</h1>
          <p className="text-grey-500 mt-1">Monitor global RSS ingestion runs and browse all ingested items.</p>
        </div>
        <Button><Play className="h-4 w-4 mr-2" />Run Ingest Now</Button>
      </div>

      <div className="bg-white rounded-xl shadow-card">
        <div className="border-b border-grey-100">
          <div className="flex">
            <button onClick={() => setActiveTab("runs")} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "runs" ? "border-royal text-royal" : "border-transparent text-grey-500 hover:text-grey-700"}`}>
              <div className="flex items-center gap-2"><RefreshCw className="h-4 w-4" />Ingest Runs</div>
            </button>
            <button onClick={() => setActiveTab("items")} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "items" ? "border-royal text-royal" : "border-transparent text-grey-500 hover:text-grey-700"}`}>
              <div className="flex items-center gap-2"><FileText className="h-4 w-4" />Global Items</div>
            </button>
          </div>
        </div>

        {activeTab === "runs" && <DataTable data={mockGlobalIngestRuns} columns={runColumns} keyExtractor={(run) => run.id} onRowClick={setSelectedRun} emptyMessage="No ingest runs found" />}

        {activeTab === "items" && (
          <>
            <div className="p-4 border-b border-grey-100">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-400" />
                <Input placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
            <DataTable data={filteredItems} columns={itemColumns} keyExtractor={(item) => item.id} onRowClick={setSelectedItem} emptyMessage="No items found" />
          </>
        )}
      </div>

      <DetailDrawer isOpen={!!selectedRun} onClose={() => setSelectedRun(null)} title="Ingest Run Details">
        {selectedRun && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <StatusPill status={selectedRun.status === "completed" ? "completed" : selectedRun.status === "running" ? "running" : selectedRun.status === "completed_with_errors" ? "warning" : "failed"} />
              <span className="text-sm text-grey-500">{formatTimeAgo(selectedRun.started_at)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-grey-50 rounded-lg p-3"><p className="text-xs text-grey-500">Sources</p><p className="text-lg font-semibold text-grey-900">{selectedRun.sources_count}</p></div>
              <div className="bg-grey-50 rounded-lg p-3"><p className="text-xs text-grey-500">Duration</p><p className="text-lg font-semibold text-grey-900">{formatDuration(selectedRun.duration_ms)}</p></div>
              <div className="bg-grey-50 rounded-lg p-3"><p className="text-xs text-grey-500">Items Seen</p><p className="text-lg font-semibold text-grey-900">{selectedRun.items_seen}</p></div>
              <div className="bg-grey-50 rounded-lg p-3"><p className="text-xs text-grey-500">Items Inserted</p><p className="text-lg font-semibold text-green-600">{selectedRun.items_inserted}</p></div>
            </div>
            {selectedRun.errors.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-grey-700 mb-2 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-orange" />Errors</h3>
                <div className="space-y-2">
                  {selectedRun.errors.map((error, idx) => (
                    <div key={idx} className="bg-red-50 border border-red-100 rounded-lg p-3">
                      <p className="text-sm text-red-700">{error.message}</p>
                      {error.source && <p className="text-xs text-red-500 mt-1">Source: {error.source}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-grey-700 mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-grey-500" />Timeline</h3>
              <div className="text-sm text-grey-600 space-y-1">
                <p>Started: {new Date(selectedRun.started_at).toLocaleString()}</p>
                {selectedRun.finished_at && <p>Finished: {new Date(selectedRun.finished_at).toLocaleString()}</p>}
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      <DetailDrawer isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="Item Details">
        {selectedItem && (
          <div className="space-y-6">
            <div><h3 className="font-semibold text-grey-900">{selectedItem.title}</h3><a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="text-sm text-royal hover:underline mt-1 block">{selectedItem.url}</a></div>
            <div className="flex items-center gap-4 text-sm"><span className="text-grey-500">Source: <span className="text-grey-900">{selectedItem.source_name}</span></span><span className="text-grey-500">Published: <span className="text-grey-900">{formatTimeAgo(selectedItem.published_at)}</span></span></div>
            <div><h4 className="text-sm font-medium text-grey-700 mb-2">Categories</h4><div className="flex flex-wrap gap-2">{selectedItem.categories.map((cat) => <span key={cat} className="text-sm bg-grey-100 text-grey-700 px-2 py-1 rounded">{cat}</span>)}</div></div>
            <div><h4 className="text-sm font-medium text-grey-700 mb-2">Snippet</h4><p className="text-sm text-grey-600">{selectedItem.snippet}</p></div>
            <div className="flex items-center gap-2"><span className="text-sm text-grey-500">Distribution Status:</span><StatusPill status={selectedItem.is_distributed ? "completed" : "pending"} label={selectedItem.is_distributed ? "Distributed" : "Pending"} /></div>
          </div>
        )}
      </DetailDrawer>
    </div>
  )
}
