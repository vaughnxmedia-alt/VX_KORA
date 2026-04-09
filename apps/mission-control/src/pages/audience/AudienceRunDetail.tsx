import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import type { AudienceAnalysisRunRecord } from "@kora/sdk"

export default function AudienceRunDetail() {
  const { runId } = useParams()
  const [run, setRun] = useState<AudienceAnalysisRunRecord | null>(null)

  useEffect(() => {
    const fetchRun = async () => {
      if (!runId) return
      const { data } = await (supabase as any).from("audience_analysis_runs").select("*").eq("id", runId).maybeSingle()
      setRun((data || null) as AudienceAnalysisRunRecord | null)
    }
    fetchRun()
  }, [runId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Audience Run Detail</h1>
        <p className="text-sm text-gray-400 mt-1">
          Run ID: {runId} | Status: {run?.status || "unknown"} | Shared lifecycle and approval workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
          <h2 className="text-white text-base font-medium mb-2">Source Input Inspector</h2>
          <div className="text-sm text-gray-300">
            Intake + strategy session + customer context from shared records.
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
          <h2 className="text-white text-base font-medium mb-2">Agent Output Review</h2>
          <div className="text-sm text-gray-300">
            Audience, messaging, psychology, and activation outputs linked to one version.
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
          <h2 className="text-white text-base font-medium mb-2">Approval Queue</h2>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span>Status:</span>
            <span className="rounded-md border border-white/20 px-2 py-1 text-xs text-gray-100">
              needs_review
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-gray-900 p-4">
          <h2 className="text-white text-base font-medium mb-2">Activation + Sync</h2>
          <div className="text-sm text-gray-300">
            Platform activation specs and sync logs for Meta, TikTok, LinkedIn.
          </div>
        </div>
      </div>
    </div>
  )
}
