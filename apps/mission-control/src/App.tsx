import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom"
import { Suspense, lazy } from "react"
import { Sidebar } from "@/components/Sidebar"
import { Overview } from "@/pages/Overview"
import { Placeholder } from "@/pages/Placeholder"

// Intake Agent Pages (lazy loaded)
const IntakeOverview = lazy(() => import("@/pages/intake/IntakeOverview"))
const IntakeClarifier = lazy(() => import("@/pages/intake/IntakeClarifier"))
const BrandIdentity = lazy(() => import("@/pages/intake/BrandIdentity"))
const StrategyArchitect = lazy(() => import("@/pages/intake/StrategyArchitect"))
const AudienceIntelligence = lazy(() => import("@/pages/intake/AudienceIntelligence"))

// Core Intelligence Pages (lazy loaded)
const CoreOverview = lazy(() => import("@/pages/core/CoreOverview"))
const Sources = lazy(() => import("@/pages/core/Sources"))
const IngestRuns = lazy(() => import("@/pages/core/IngestRuns"))
const IntelligencePool = lazy(() => import("@/pages/core/GlobalIntelligencePool"))
const TenantRAGRoute = lazy(() => import("@/pages/core/TenantRAGRoute"))
const Enrichment = lazy(() => import("@/pages/core/Enrichment"))
const EventsQueue = lazy(() => import("@/pages/core/EventsQueue"))
const HealthAndLogs = lazy(() => import("@/pages/core/HealthAndLogs"))

// Agent Detail Pages (lazy loaded)
const AgentDetail = lazy(() => import("@/pages/agents/AgentDetail"))
const AudienceQueue = lazy(() => import("@/pages/audience/AudienceQueue"))
const AudienceRunDetail = lazy(() => import("@/pages/audience/AudienceRunDetail"))

const Clients = lazy(() => import("@/pages/tenants/Clients"))
const TelegramPreferences = lazy(() => import("@/pages/tenants/TelegramPreferences"))
const ApprovalHistory = lazy(() => import("@/pages/tenants/ApprovalHistory"))
const IntelligenceFilters = lazy(() => import("@/pages/tenants/IntelligenceFilters"))

// Settings Pages (lazy loaded)
const Integrations = lazy(() => import("@/pages/settings/Integrations"))
const APIKeys = lazy(() => import("@/pages/settings/APIKeys"))
const LLMRouter = lazy(() => import("@/pages/settings/LLMRouter"))
const Notifications = lazy(() => import("@/pages/settings/Notifications"))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  )
}

function Layout() {
  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Main Overview */}
          <Route index element={<Overview />} />

          {/* Intake Agent Routes */}
          <Route path="intake" element={<IntakeOverview />} />
          <Route path="intake/users" element={<Clients />} />
          <Route path="intake/clarifier" element={<IntakeClarifier />} />
          <Route path="intake/brand-identity" element={<BrandIdentity />} />
          <Route path="intake/strategy-architect" element={<StrategyArchitect />} />
          <Route path="intake/audience-intelligence" element={<AudienceIntelligence />} />

          {/* Core Intelligence Routes */}
          <Route path="core" element={<CoreOverview />} />
          <Route path="core/sources" element={<Sources />} />
          <Route path="core/ingest-runs" element={<IngestRuns />} />
          <Route path="core/intelligence-pool" element={<IntelligencePool />} />
          <Route path="core/tenant-rag" element={<TenantRAGRoute />} />
          <Route path="core/enrichment" element={<Enrichment />} />
          <Route path="core/events-queue" element={<EventsQueue />} />
          <Route path="core/health" element={<HealthAndLogs />} />

          {/* Agent Detail Routes */}
          <Route path="agents/source-discovery" element={<AgentDetail agentId="source-discovery" />} />
          <Route path="agents/source-processing" element={<AgentDetail agentId="source-processing" />} />
          <Route path="agents/content-strategy" element={<AgentDetail agentId="content-strategy" />} />
          <Route path="agents/campaign-assembly" element={<AgentDetail agentId="campaign-assembly" />} />
          <Route path="agents/telegram-delivery" element={<AgentDetail agentId="telegram-delivery" />} />
          <Route path="agents/rag-intelligence" element={<AgentDetail agentId="rag-intelligence" />} />
          <Route path="audience/queue" element={<AudienceQueue />} />
          <Route path="audience/runs/:runId" element={<AudienceRunDetail />} />

          <Route path="clients" element={<Navigate to="/intake/users" replace />} />
          <Route path="tenants" element={<Navigate to="/intake/users" replace />} />
          <Route path="users" element={<Navigate to="/intake/users" replace />} />
          <Route path="telegram-preferences" element={<TelegramPreferences />} />
          <Route path="approval-history" element={<ApprovalHistory />} />
          <Route path="intelligence-filters" element={<IntelligenceFilters />} />

          {/* Settings Routes */}
          <Route path="settings/integrations" element={<Integrations />} />
          <Route path="settings/api-keys" element={<APIKeys />} />
          <Route path="settings/llm-router" element={<LLMRouter />} />
          <Route path="settings/notifications" element={<Notifications />} />

          {/* Fallback */}
          <Route path="*" element={<Placeholder title="Coming Soon" description="This page is under construction." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
