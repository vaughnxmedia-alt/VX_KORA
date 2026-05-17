import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type TabId =
  | "overview"
  | "audience"
  | "buyer"
  | "leadMagnets"
  | "offers"
  | "campaigns"
  | "revenue"
  | "lls"
  | "audit"

type CountMap = Record<string, number | null>
type ErrorMap = Record<string, string | null>

type TableRow = Record<string, unknown>

type DashboardState = {
  counts: CountMap
  errors: ErrorMap
  leadMagnets: TableRow[]
  buyerJourneys: TableRow[]
  leadMagnetInteractions: TableRow[]
  offerPresentations: TableRow[]
  campaignEvents: TableRow[]
  revenueRows: TableRow[]
  purchaseRows: TableRow[]
  contractRows: TableRow[]
  llsRows: TableRow[]
  auditRows: TableRow[]
  auditOriginalRows: TableRow[]
  auditAnalysisRows: TableRow[]
  auditPdfRows: TableRow[]
  auditAudioRows: TableRow[]
  refreshedAt: string | null
}

const COUNT_TABLES = [
  "industry_audience_clusters",
  "analytics_events",
  "buyer_identity_links",
  "buyer_journeys",
  "lead_magnets",
  "lead_magnet_interactions",
  "offer_presentations",
  "client_offer_catalog",
  "revenue_attribution",
  "buyer_purchase_attribution",
  "contract_attribution",
  "lls_outcome_events",
  "lls_funnel_attribution",
  "audit_intakes",
  "audit_intake_original_answers",
  "audit_intake_analysis",
  "audit_pdf_deliverables",
  "audit_audio_deliverables",
  "free_audits",
] as const

const EMPTY_STATE: DashboardState = {
  counts: {},
  errors: {},
  leadMagnets: [],
  buyerJourneys: [],
  leadMagnetInteractions: [],
  offerPresentations: [],
  campaignEvents: [],
  revenueRows: [],
  purchaseRows: [],
  contractRows: [],
  llsRows: [],
  auditRows: [],
  auditOriginalRows: [],
  auditAnalysisRows: [],
  auditPdfRows: [],
  auditAudioRows: [],
  refreshedAt: null,
}

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "audience", label: "Audience" },
  { id: "buyer", label: "Buyer" },
  { id: "leadMagnets", label: "Lead Magnet" },
  { id: "offers", label: "Offer" },
  { id: "campaigns", label: "Campaign" },
  { id: "revenue", label: "Revenue" },
  { id: "lls", label: "Learning Log" },
  { id: "audit", label: "Audit Separation" },
]

function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatMetric(value: number | null | undefined): string {
  if (value == null) return "-"
  return new Intl.NumberFormat().format(value)
}

async function fetchCount(table: string): Promise<{ count: number | null; error: string | null }> {
  const { count, error } = await supabase.from(table).select("*", { head: true, count: "exact" })
  return { count: count ?? null, error: error?.message ?? null }
}

async function fetchLatest(
  table: string,
  columns: string,
  orderColumn: string,
  limit = 10,
): Promise<{ data: TableRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order(orderColumn, { ascending: false })
    .limit(limit)

  return { data: (data as TableRow[]) ?? [], error: error?.message ?? null }
}

function KpiCard({
  label,
  value,
  hint,
  error,
}: {
  label: string
  value: string
  hint?: string
  error?: string | null
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      {error ? <p className="mt-2 text-xs text-red-600">Error: {error}</p> : null}
    </div>
  )
}

function DataTable({
  title,
  rows,
  columns,
  emptyLabel,
}: {
  title: string
  rows: TableRow[]
  columns: { key: string; label: string; formatter?: (value: unknown) => string }[]
  emptyLabel: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="whitespace-nowrap px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {columns.map((column) => {
                    const rawValue = row[column.key]
                    const text = column.formatter
                      ? column.formatter(rawValue)
                      : rawValue == null
                        ? "-"
                        : String(rawValue)

                    return (
                      <td key={column.key} className="whitespace-nowrap px-4 py-2 text-gray-700">
                        {text}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [state, setState] = useState<DashboardState>(EMPTY_STATE)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setGlobalError(null)

    try {
      const countEntries = await Promise.all(
        COUNT_TABLES.map(async (table) => {
          const result = await fetchCount(table)
          return { table, ...result }
        }),
      )

      const counts: CountMap = {}
      const errors: ErrorMap = {}
      countEntries.forEach((entry) => {
        counts[entry.table] = entry.count
        errors[entry.table] = entry.error
      })

      const [
        leadMagnets,
        buyerJourneys,
        leadMagnetInteractions,
        offerPresentations,
        campaignEvents,
        revenueRows,
        purchaseRows,
        contractRows,
        llsRows,
        auditRows,
        auditOriginalRows,
        auditAnalysisRows,
        auditPdfRows,
        auditAudioRows,
      ] = await Promise.all([
        fetchLatest("lead_magnets", "id,label,kind,is_paid,is_active,updated_at", "updated_at", 20),
        fetchLatest(
          "buyer_journeys",
          "id,journey_status,canonical_buyer_key,buyer_key,lead_key,purchase_count,total_revenue,last_event_at",
          "last_event_at",
          20,
        ),
        fetchLatest(
          "lead_magnet_interactions",
          "id,lead_magnet_id,interaction_kind,interaction_status,offer_stage,buyer_journey_id,occurred_at",
          "occurred_at",
          20,
        ),
        fetchLatest(
          "offer_presentations",
          "id,offer_id,offer_stage,presentation_status,lead_magnet_id,buyer_journey_id,presented_at",
          "presented_at",
          20,
        ),
        fetchLatest(
          "analytics_events",
          "id,event_name,platform,campaign_id,adset_id,creative_id,lead_magnet_id,offer_stage,created_at",
          "created_at",
          20,
        ),
        fetchLatest(
          "revenue_attribution",
          "id,offer_id,offer_stage,lead_magnet_id,buyer_key,buyer_journey_id,amount,currency,payment_provider,created_at",
          "created_at",
          20,
        ),
        fetchLatest(
          "buyer_purchase_attribution",
          "id,offer_id,offer_stage,lead_magnet_id,buyer_key,buyer_journey_id,amount,currency,created_at",
          "created_at",
          20,
        ),
        fetchLatest(
          "contract_attribution",
          "id,offer_id,offer_stage,lead_magnet_id,buyer_key,buyer_journey_id,contract_value,currency,status,signed_at,created_at",
          "created_at",
          20,
        ),
        fetchLatest(
          "lls_outcome_events",
          "id,action,business_goal,buyer_key,buyer_journey_id,lead_magnet_id,offer_id,offer_stage,revenue_attribution_id,occurred_at",
          "occurred_at",
          20,
        ),
        fetchLatest(
          "audit_intakes",
          "id,status,free_audit_id,lead_key,lead_email_lower,utm_source,utm_campaign,created_at,updated_at",
          "updated_at",
          20,
        ),
        fetchLatest(
          "audit_intake_original_answers",
          "id,audit_intake_id,growth_goal,primary_blocker,target_audience,positioning_readiness,updated_at",
          "updated_at",
          20,
        ),
        fetchLatest(
          "audit_intake_analysis",
          "id,audit_intake_id,interpreted_growth_goal,interpreted_blocker,diagnosis_summary,completion_status,updated_at",
          "updated_at",
          20,
        ),
        fetchLatest(
          "audit_pdf_deliverables",
          "id,audit_intake_id,delivery_status,report_filename,sent_at,updated_at",
          "updated_at",
          20,
        ),
        fetchLatest(
          "audit_audio_deliverables",
          "id,audit_intake_id,delivery_status,voice_selected,audio_public_url,updated_at",
          "updated_at",
          20,
        ),
      ])

      const queryErrors: ErrorMap = {
        ...errors,
        lead_magnets_query: leadMagnets.error,
        buyer_journeys_query: buyerJourneys.error,
        lead_magnet_interactions_query: leadMagnetInteractions.error,
        offer_presentations_query: offerPresentations.error,
        analytics_events_query: campaignEvents.error,
        revenue_attribution_query: revenueRows.error,
        buyer_purchase_attribution_query: purchaseRows.error,
        contract_attribution_query: contractRows.error,
        lls_outcome_events_query: llsRows.error,
        audit_intakes_query: auditRows.error,
        audit_intake_original_answers_query: auditOriginalRows.error,
        audit_intake_analysis_query: auditAnalysisRows.error,
        audit_pdf_deliverables_query: auditPdfRows.error,
        audit_audio_deliverables_query: auditAudioRows.error,
      }

      setState({
        counts,
        errors: queryErrors,
        leadMagnets: leadMagnets.data,
        buyerJourneys: buyerJourneys.data,
        leadMagnetInteractions: leadMagnetInteractions.data,
        offerPresentations: offerPresentations.data,
        campaignEvents: campaignEvents.data,
        revenueRows: revenueRows.data,
        purchaseRows: purchaseRows.data,
        contractRows: contractRows.data,
        llsRows: llsRows.data,
        auditRows: auditRows.data,
        auditOriginalRows: auditOriginalRows.data,
        auditAnalysisRows: auditAnalysisRows.data,
        auditPdfRows: auditPdfRows.data,
        auditAudioRows: auditAudioRows.data,
        refreshedAt: new Date().toISOString(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown dashboard error"
      setGlobalError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const summaryChecks = useMemo(() => {
    const requiredLeadMagnets = ["free_audit", "strategy_session", "the_brief", "download", "webinar", "other"]
    const presentLeadMagnets = new Set(state.leadMagnets.map((row) => String(row.id)))

    return [
      {
        label: "Audit intake separation sync",
        pass:
          state.counts.free_audits != null &&
          state.counts.audit_intakes != null &&
          state.counts.audit_intake_original_answers != null &&
          state.counts.audit_intake_analysis != null &&
          state.counts.free_audits === state.counts.audit_intakes &&
          state.counts.audit_intakes === state.counts.audit_intake_original_answers &&
          state.counts.audit_intake_original_answers === state.counts.audit_intake_analysis,
      },
      {
        label: "Lead magnet seeds present",
        pass: requiredLeadMagnets.every((id) => presentLeadMagnets.has(id)),
      },
      {
        label: "Buyer identity + journey data readable",
        pass:
          !state.errors.buyer_identity_links &&
          !state.errors.buyer_journeys &&
          state.counts.buyer_identity_links != null &&
          state.counts.buyer_journeys != null,
      },
      {
        label: "Offer + revenue tables readable",
        pass:
          !state.errors.offer_presentations &&
          !state.errors.revenue_attribution &&
          !state.errors.buyer_purchase_attribution &&
          !state.errors.contract_attribution,
      },
      {
        label: "LLS dimensions table readable",
        pass: !state.errors.lls_outcome_events && !state.errors.lls_funnel_attribution,
      },
    ]
  }, [state])

  const headerNote = state.refreshedAt
    ? `Last refreshed: ${formatDate(state.refreshedAt)}`
    : "Not loaded yet"

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">KORA Closed-Loop Mission Control</h1>
            <p className="mt-1 text-sm text-gray-600">
              Test the full intelligence loop in one UI: Audience, Buyer, Offer, Campaign, Lead Magnet, Revenue, and
              Learning Log.
            </p>
            <p className="mt-1 text-xs text-gray-500">{headerNote}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Refreshing..." : "Refresh data"}
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        {globalError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load dashboard: {globalError}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Audience intelligence"
            value={formatMetric(state.counts.industry_audience_clusters)}
            hint="Industry audience clusters"
            error={state.errors.industry_audience_clusters}
          />
          <KpiCard
            label="Buyer journeys"
            value={formatMetric(state.counts.buyer_journeys)}
            hint="Stitched cross-touch journeys"
            error={state.errors.buyer_journeys}
          />
          <KpiCard
            label="Lead interactions"
            value={formatMetric(state.counts.lead_magnet_interactions)}
            hint="Lead magnet actions tracked"
            error={state.errors.lead_magnet_interactions}
          />
          <KpiCard
            label="Revenue events"
            value={formatMetric(state.counts.revenue_attribution)}
            hint="Attributed purchases"
            error={state.errors.revenue_attribution}
          />
          <KpiCard
            label="LLS outcomes"
            value={formatMetric(state.counts.lls_outcome_events)}
            hint="Learning outcomes recorded"
            error={state.errors.lls_outcome_events}
          />
          <KpiCard
            label="Audit intakes"
            value={formatMetric(state.counts.audit_intakes)}
            hint="Parent records"
            error={state.errors.audit_intakes}
          />
          <KpiCard
            label="PDF deliverables"
            value={formatMetric(state.counts.audit_pdf_deliverables)}
            hint="Generated audit reports"
            error={state.errors.audit_pdf_deliverables}
          />
          <KpiCard
            label="Audio deliverables"
            value={formatMetric(state.counts.audit_audio_deliverables)}
            hint="Generated audit audio"
            error={state.errors.audit_audio_deliverables}
          />
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Smoke checks</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {summaryChecks.map((check) => (
              <div
                key={check.label}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  check.pass
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <span className="font-semibold">{check.pass ? "PASS" : "CHECK"}</span> - {check.label}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          {TAB_LABELS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                activeTab === tab.id ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {activeTab === "overview" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <DataTable
              title="Latest buyer journeys"
              rows={state.buyerJourneys}
              emptyLabel="No buyer journey rows available."
              columns={[
                { key: "journey_status", label: "Status" },
                { key: "canonical_buyer_key", label: "Canonical buyer" },
                { key: "purchase_count", label: "Purchases" },
                {
                  key: "total_revenue",
                  label: "Revenue",
                  formatter: (value) => (value == null ? "-" : `$${value}`),
                },
                { key: "last_event_at", label: "Last event", formatter: formatDate },
              ]}
            />
            <DataTable
              title="Latest audit intakes"
              rows={state.auditRows}
              emptyLabel="No audit intake rows available."
              columns={[
                { key: "status", label: "Status" },
                { key: "lead_email_lower", label: "Lead email" },
                { key: "utm_source", label: "UTM source" },
                { key: "utm_campaign", label: "UTM campaign" },
                { key: "updated_at", label: "Updated", formatter: formatDate },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "audience" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <KpiCard
              label="Audience clusters"
              value={formatMetric(state.counts.industry_audience_clusters)}
              hint="From industry_audience_clusters"
              error={state.errors.industry_audience_clusters}
            />
            <DataTable
              title="Campaign events (audience context)"
              rows={state.campaignEvents}
              emptyLabel="No analytics events available."
              columns={[
                { key: "event_name", label: "Event" },
                { key: "campaign_id", label: "Campaign" },
                { key: "adset_id", label: "Adset" },
                { key: "creative_id", label: "Creative" },
                { key: "created_at", label: "Created", formatter: formatDate },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "buyer" ? (
          <section className="grid gap-4">
            <DataTable
              title="Buyer journeys"
              rows={state.buyerJourneys}
              emptyLabel="No buyer journeys available."
              columns={[
                { key: "journey_status", label: "Status" },
                { key: "canonical_buyer_key", label: "Canonical key" },
                { key: "buyer_key", label: "Buyer key" },
                { key: "lead_key", label: "Lead key" },
                { key: "purchase_count", label: "Purchases" },
                { key: "last_event_at", label: "Last event", formatter: formatDate },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "leadMagnets" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <DataTable
              title="Lead magnet registry"
              rows={state.leadMagnets}
              emptyLabel="No lead magnet seeds found."
              columns={[
                { key: "id", label: "ID" },
                { key: "label", label: "Label" },
                { key: "kind", label: "Kind" },
                { key: "is_paid", label: "Paid" },
                { key: "is_active", label: "Active" },
              ]}
            />
            <DataTable
              title="Lead magnet interactions"
              rows={state.leadMagnetInteractions}
              emptyLabel="No lead magnet interactions yet."
              columns={[
                { key: "lead_magnet_id", label: "Lead magnet" },
                { key: "interaction_kind", label: "Kind" },
                { key: "interaction_status", label: "Status" },
                { key: "offer_stage", label: "Offer stage" },
                { key: "occurred_at", label: "Occurred", formatter: formatDate },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "offers" ? (
          <section className="grid gap-4">
            <DataTable
              title="Offer presentations"
              rows={state.offerPresentations}
              emptyLabel="No offer presentations yet."
              columns={[
                { key: "offer_id", label: "Offer ID" },
                { key: "offer_stage", label: "Stage" },
                { key: "presentation_status", label: "Status" },
                { key: "lead_magnet_id", label: "Lead magnet" },
                { key: "presented_at", label: "Presented", formatter: formatDate },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "campaigns" ? (
          <section className="grid gap-4">
            <DataTable
              title="Campaign intelligence events"
              rows={state.campaignEvents}
              emptyLabel="No campaign analytics events yet."
              columns={[
                { key: "event_name", label: "Event" },
                { key: "platform", label: "Platform" },
                { key: "campaign_id", label: "Campaign" },
                { key: "adset_id", label: "Adset" },
                { key: "creative_id", label: "Creative" },
                { key: "lead_magnet_id", label: "Lead magnet" },
                { key: "created_at", label: "Created", formatter: formatDate },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "revenue" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <DataTable
              title="Revenue attribution"
              rows={state.revenueRows}
              emptyLabel="No revenue attribution rows yet."
              columns={[
                { key: "offer_id", label: "Offer" },
                { key: "offer_stage", label: "Stage" },
                { key: "lead_magnet_id", label: "Lead magnet" },
                { key: "buyer_key", label: "Buyer key" },
                { key: "amount", label: "Amount" },
                { key: "currency", label: "Currency" },
                { key: "created_at", label: "Created", formatter: formatDate },
              ]}
            />
            <DataTable
              title="Contract attribution"
              rows={state.contractRows}
              emptyLabel="No contract attribution rows yet."
              columns={[
                { key: "offer_id", label: "Offer" },
                { key: "status", label: "Status" },
                { key: "contract_value", label: "Value" },
                { key: "currency", label: "Currency" },
                { key: "signed_at", label: "Signed", formatter: formatDate },
              ]}
            />
            <DataTable
              title="Buyer purchase attribution"
              rows={state.purchaseRows}
              emptyLabel="No buyer purchase attribution rows yet."
              columns={[
                { key: "offer_id", label: "Offer" },
                { key: "offer_stage", label: "Stage" },
                { key: "lead_magnet_id", label: "Lead magnet" },
                { key: "amount", label: "Amount" },
                { key: "currency", label: "Currency" },
                { key: "created_at", label: "Created", formatter: formatDate },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "lls" ? (
          <section className="grid gap-4">
            <DataTable
              title="Learning Log outcomes"
              rows={state.llsRows}
              emptyLabel="No LLS outcomes yet."
              columns={[
                { key: "action", label: "Action" },
                { key: "business_goal", label: "Goal" },
                { key: "buyer_key", label: "Buyer key" },
                { key: "lead_magnet_id", label: "Lead magnet" },
                { key: "offer_id", label: "Offer ID" },
                { key: "offer_stage", label: "Offer stage" },
                { key: "occurred_at", label: "Occurred", formatter: formatDate },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "audit" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <DataTable
              title="Audit intakes"
              rows={state.auditRows}
              emptyLabel="No audit intakes found."
              columns={[
                { key: "status", label: "Status" },
                { key: "lead_email_lower", label: "Lead email" },
                { key: "lead_key", label: "Lead key" },
                { key: "utm_source", label: "UTM source" },
                { key: "created_at", label: "Created", formatter: formatDate },
              ]}
            />
            <DataTable
              title="Original answers (immutable)"
              rows={state.auditOriginalRows}
              emptyLabel="No original answer records."
              columns={[
                { key: "audit_intake_id", label: "Audit intake ID" },
                { key: "growth_goal", label: "Growth goal" },
                { key: "primary_blocker", label: "Blocker" },
                { key: "target_audience", label: "Target audience" },
                { key: "updated_at", label: "Updated", formatter: formatDate },
              ]}
            />
            <DataTable
              title="Analysis records"
              rows={state.auditAnalysisRows}
              emptyLabel="No audit analysis records."
              columns={[
                { key: "audit_intake_id", label: "Audit intake ID" },
                { key: "interpreted_growth_goal", label: "Interpreted goal" },
                { key: "interpreted_blocker", label: "Interpreted blocker" },
                { key: "completion_status", label: "Completion status" },
                { key: "updated_at", label: "Updated", formatter: formatDate },
              ]}
            />
            <DataTable
              title="PDF deliverables"
              rows={state.auditPdfRows}
              emptyLabel="No PDF deliverable records."
              columns={[
                { key: "audit_intake_id", label: "Audit intake ID" },
                { key: "delivery_status", label: "Status" },
                { key: "report_filename", label: "File" },
                { key: "sent_at", label: "Sent at", formatter: formatDate },
              ]}
            />
            <DataTable
              title="Audio deliverables"
              rows={state.auditAudioRows}
              emptyLabel="No audio deliverable records."
              columns={[
                { key: "audit_intake_id", label: "Audit intake ID" },
                { key: "delivery_status", label: "Status" },
                { key: "voice_selected", label: "Voice" },
                { key: "audio_public_url", label: "Audio URL" },
              ]}
            />
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
