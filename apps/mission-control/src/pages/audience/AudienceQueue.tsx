import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import type { AudienceAnalysisRunRecord } from "@kora/sdk"

export default function AudienceQueue() {
  const [runs, setRuns] = useState<AudienceAnalysisRunRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQueue = async () => {
      setLoading(true)
      const { data, error } = await (supabase as any)
        .from("audience_analysis_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (!error) {
        setRuns((data || []) as AudienceAnalysisRunRecord[])
      }
      setLoading(false)
    }

    fetchQueue()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Audiences queue</h1>
        <p className="text-sm text-gray-400 mt-1">
          Shared run queue from main site and Mission Control.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
        <h2 className="text-white text-base font-medium mb-3">Analysis Runs</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-gray-400">Loading queue...</div>
          ) : runs.length === 0 ? (
            <div className="text-sm text-gray-400">No analysis runs in queue yet.</div>
          ) : runs.map((run) => (
            <div key={run.id} className="rounded-lg border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">{run.id}</p>
                  <p className="text-xs text-gray-400">
                    Client: {run.client_id} | Trigger: {run.trigger_source} | Created:{" "}
                    {new Date(run.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-md border border-white/20 px-2 py-1 text-xs text-gray-200">
                  {run.status}
                </span>
              </div>
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/audience/runs/${run.id}`}>Open Run Detail</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
