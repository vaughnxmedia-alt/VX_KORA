import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { Overview } from "@/pages/Overview"
import { CoreOverview } from "@/pages/core/CoreOverview"
import { GlobalIngest } from "@/pages/core/GlobalIngest"
import { TenantRouting } from "@/pages/core/TenantRouting"
import { EventsQueue } from "@/pages/core/EventsQueue"
import { StrategyOverview } from "@/pages/strategy/StrategyOverview"
import { StrategyRuns } from "@/pages/strategy/StrategyRuns"
import { Tenants } from "@/pages/Tenants"
import { Settings } from "@/pages/Settings"
import { Placeholder } from "@/pages/Placeholder"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          
          {/* Core Intelligence Agent */}
          <Route path="core" element={<CoreOverview />} />
          <Route path="core/sources" element={<Placeholder title="RSS Sources" description="Manage RSS feed sources for global ingestion." />} />
          <Route path="core/global-ingest" element={<GlobalIngest />} />
          <Route path="core/global-items" element={<GlobalIngest />} />
          <Route path="core/tenant-routing" element={<TenantRouting />} />
          <Route path="core/events" element={<EventsQueue />} />
          <Route path="core/enrichment" element={<Placeholder title="Enrichment" description="Content enrichment pipeline status and configuration." />} />
          <Route path="core/rag-updates" element={<Placeholder title="RAG Updates" description="Knowledge base synchronization and vector embedding status." />} />
          <Route path="core/health" element={<Placeholder title="Health and Logs" description="System health monitoring and log viewer." />} />

          {/* Intake Clarifier Agent */}
          <Route path="intake" element={<Placeholder title="Intake Clarifier" description="User intake processing and profile structuring agent." />} />
          <Route path="intake/submissions" element={<Placeholder title="Intake Submissions" description="View and manage user intake form submissions." />} />
          <Route path="intake/profiles" element={<Placeholder title="Structured Profiles" description="AI-generated structured client profiles." />} />
          <Route path="intake/questions" element={<Placeholder title="Clarifying Questions" description="Manage clarifying question flows." />} />
          <Route path="intake/validation" element={<Placeholder title="Validation" description="Profile validation and quality checks." />} />

          {/* Content Strategy Agent */}
          <Route path="strategy" element={<StrategyOverview />} />
          <Route path="strategy/runs" element={<StrategyRuns />} />
          <Route path="strategy/insights" element={<Placeholder title="Insights" description="Market and content insights derived from ingested data." />} />
          <Route path="strategy/pillars" element={<Placeholder title="Content Pillars" description="Manage content pillar configurations per tenant." />} />
          <Route path="strategy/calendar" element={<Placeholder title="Content Calendar" description="Schedule and plan content publication." />} />

          {/* Campaign Assembly Agent */}
          <Route path="campaigns" element={<Placeholder title="Campaign Assembly" description="Campaign creation and asset generation agent." />} />
          <Route path="campaigns/active" element={<Placeholder title="Active Campaigns" description="View and manage active marketing campaigns." />} />
          <Route path="campaigns/assets" element={<Placeholder title="Asset Library" description="Browse and manage generated campaign assets." />} />
          <Route path="campaigns/templates" element={<Placeholder title="Templates" description="Campaign and content templates." />} />
          <Route path="campaigns/delivery" element={<Placeholder title="Delivery" description="Campaign delivery and scheduling." />} />

          {/* Users and Tenants */}
          <Route path="tenants" element={<Tenants />} />
          <Route path="users" element={<Placeholder title="Users" description="Manage user accounts and permissions." />} />

          {/* Settings */}
          <Route path="settings" element={<Settings />} />
          <Route path="settings/keys" element={<Settings />} />
          <Route path="settings/access" element={<Settings />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
