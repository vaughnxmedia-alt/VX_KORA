import type {
  Tenant,
  TenantProfile,
  GlobalRssItem,
  GlobalIngestRun,
  TenantItemQueue,
  TenantRoutingRun,
  KoraEvent,
  ContentStrategy,
  AgentHealth,
  ActivityItem,
} from "./types"

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()

export const mockTenants: Tenant[] = [
  { id: "tenant-001", name: "TechFlow Solutions", slug: "techflow", industry: "SaaS", target_audience: "Enterprise IT decision makers", is_active: true, created_at: daysAgo(120), updated_at: hoursAgo(2) },
  { id: "tenant-002", name: "FinanceHub Inc", slug: "financehub", industry: "Fintech", target_audience: "CFOs and finance teams", is_active: true, created_at: daysAgo(90), updated_at: hoursAgo(6) },
  { id: "tenant-003", name: "Meridian Capital", slug: "meridian", industry: "Venture Capital", target_audience: "Startup founders and investors", is_active: true, created_at: daysAgo(60), updated_at: hoursAgo(1) },
  { id: "tenant-004", name: "HealthTech Partners", slug: "healthtech", industry: "Healthcare", target_audience: "Healthcare administrators", is_active: false, created_at: daysAgo(45), updated_at: daysAgo(30) },
  { id: "tenant-005", name: "DataViz Analytics", slug: "dataviz", industry: "Data Analytics", target_audience: "Data scientists and analysts", is_active: true, created_at: daysAgo(30), updated_at: hoursAgo(12) },
]

export const mockTenantProfiles: Record<string, TenantProfile> = {
  "tenant-001": {
    id: "profile-001", tenant_id: "tenant-001", company_description: "Enterprise SaaS platform for workflow automation",
    keywords: ["workflow", "automation", "enterprise", "SaaS", "productivity"],
    competitors: ["Zapier", "Monday.com", "Asana"],
    content_preferences: { tone: "professional", formats: ["blog", "whitepaper", "case-study"], frequency: "weekly" },
    created_at: daysAgo(120), updated_at: hoursAgo(24),
  },
  "tenant-002": {
    id: "profile-002", tenant_id: "tenant-002", company_description: "Modern payment infrastructure for businesses",
    keywords: ["payments", "fintech", "B2B", "API", "transactions"],
    competitors: ["Stripe", "Square", "Adyen"],
    content_preferences: { tone: "authoritative", formats: ["blog", "report", "newsletter"], frequency: "bi-weekly" },
    created_at: daysAgo(90), updated_at: hoursAgo(48),
  },
  "tenant-003": {
    id: "profile-003", tenant_id: "tenant-003", company_description: "Early-stage VC firm focused on deep tech",
    keywords: ["venture capital", "startups", "AI", "funding", "investment"],
    competitors: ["a16z", "Sequoia", "Accel"],
    content_preferences: { tone: "insightful", formats: ["newsletter", "podcast", "thought-leadership"], frequency: "weekly" },
    created_at: daysAgo(60), updated_at: hoursAgo(12),
  },
}

export const mockGlobalRssItems: GlobalRssItem[] = [
  { id: "item-001", title: "AI Startup Raises $50M Series B to Transform Enterprise Workflows", url: "https://techcrunch.com/ai-startup-series-b", source_name: "TechCrunch", source_id: "src-001", content: "A new AI startup has raised $50 million in Series B funding...", snippet: "A new AI startup has raised $50 million in Series B funding...", published_at: hoursAgo(2), categories: ["AI", "Funding", "Enterprise"], author: "Sarah Chen", image_url: null, is_distributed: true, created_at: hoursAgo(2) },
  { id: "item-002", title: "New Payment Regulations Set to Reshape Fintech Landscape", url: "https://finextra.com/payment-regulations", source_name: "Finextra", source_id: "src-004", content: "European regulators have announced new payment processing requirements...", snippet: "European regulators have announced new payment processing requirements...", published_at: hoursAgo(4), categories: ["Fintech", "Regulations", "Payments"], author: "Michael Torres", image_url: null, is_distributed: true, created_at: hoursAgo(4) },
  { id: "item-003", title: "The Future of Remote Work: Hybrid Models Dominate", url: "https://theverge.com/remote-work-hybrid", source_name: "The Verge", source_id: "src-003", content: "As companies settle into post-pandemic routines...", snippet: "As companies settle into post-pandemic routines, hybrid work models...", published_at: hoursAgo(6), categories: ["Work", "Technology", "Business"], author: "Emily Zhang", image_url: null, is_distributed: true, created_at: hoursAgo(6) },
  { id: "item-004", title: "VC Funding Rebounds in Q1 2026 with Focus on AI Infrastructure", url: "https://venturebeat.com/vc-funding-q1", source_name: "VentureBeat", source_id: "src-005", content: "Venture capital funding has shown strong recovery in Q1 2026...", snippet: "Venture capital funding has shown strong recovery in Q1 2026...", published_at: hoursAgo(8), categories: ["Venture Capital", "AI", "Funding"], author: "James Wilson", image_url: null, is_distributed: true, created_at: hoursAgo(8) },
  { id: "item-005", title: "Cloud Computing Costs Continue to Rise", url: "https://techcrunch.com/cloud-costs-optimization", source_name: "TechCrunch", source_id: "src-001", content: "As cloud computing costs continue their upward trend...", snippet: "As cloud computing costs continue their upward trend...", published_at: hoursAgo(10), categories: ["Cloud", "Enterprise", "Cost"], author: "David Park", image_url: null, is_distributed: false, created_at: hoursAgo(10) },
]

export const mockGlobalIngestRuns: GlobalIngestRun[] = [
  { id: "run-001", started_at: minutesAgo(15), finished_at: minutesAgo(12), status: "completed", sources_count: 5, items_seen: 47, items_inserted: 12, items_skipped: 35, errors_count: 0, errors: [], duration_ms: 180000 },
  { id: "run-002", started_at: hoursAgo(1), finished_at: hoursAgo(1), status: "completed", sources_count: 5, items_seen: 52, items_inserted: 8, items_skipped: 44, errors_count: 0, errors: [], duration_ms: 165000 },
  { id: "run-003", started_at: hoursAgo(2), finished_at: hoursAgo(2), status: "completed_with_errors", sources_count: 5, items_seen: 38, items_inserted: 6, items_skipped: 30, errors_count: 2, errors: [{ message: "Timeout fetching feed", source: "src-003" }, { message: "Invalid RSS format", source: "src-004" }], duration_ms: 210000 },
  { id: "run-004", started_at: hoursAgo(3), finished_at: hoursAgo(3), status: "completed", sources_count: 5, items_seen: 61, items_inserted: 15, items_skipped: 46, errors_count: 0, errors: [], duration_ms: 195000 },
]

export const mockTenantItemQueue: TenantItemQueue[] = [
  { id: "queue-001", tenant_id: "tenant-001", global_item_id: "item-001", relevance_score: 0.92, relevance_reasons: ["AI keyword match", "Enterprise focus", "Workflow automation topic"], is_processed: false, processed_at: null, created_at: hoursAgo(2) },
  { id: "queue-002", tenant_id: "tenant-001", global_item_id: "item-005", relevance_score: 0.78, relevance_reasons: ["Enterprise keyword", "SaaS relevance"], is_processed: false, processed_at: null, created_at: hoursAgo(10) },
  { id: "queue-003", tenant_id: "tenant-002", global_item_id: "item-002", relevance_score: 0.95, relevance_reasons: ["Fintech industry match", "Payment topic", "Regulatory relevance"], is_processed: true, processed_at: hoursAgo(3), created_at: hoursAgo(4) },
  { id: "queue-004", tenant_id: "tenant-003", global_item_id: "item-004", relevance_score: 0.89, relevance_reasons: ["VC industry match", "Funding topic", "AI investment focus"], is_processed: false, processed_at: null, created_at: hoursAgo(8) },
  { id: "queue-005", tenant_id: "tenant-003", global_item_id: "item-001", relevance_score: 0.72, relevance_reasons: ["Startup funding", "AI relevance"], is_processed: false, processed_at: null, created_at: hoursAgo(2) },
]

export const mockTenantRoutingRuns: TenantRoutingRun[] = [
  { id: "routing-001", tenant_id: "tenant-001", started_at: hoursAgo(2), finished_at: hoursAgo(2), status: "completed", items_evaluated: 12, items_routed: 2, avg_relevance_score: 0.85, duration_ms: 4500 },
  { id: "routing-002", tenant_id: "tenant-002", started_at: hoursAgo(4), finished_at: hoursAgo(4), status: "completed", items_evaluated: 12, items_routed: 1, avg_relevance_score: 0.95, duration_ms: 3200 },
  { id: "routing-003", tenant_id: "tenant-003", started_at: hoursAgo(8), finished_at: hoursAgo(8), status: "completed", items_evaluated: 15, items_routed: 2, avg_relevance_score: 0.81, duration_ms: 5100 },
]

export const mockKoraEvents: KoraEvent[] = [
  { id: "evt-001", event_type: "global_ingest_completed", tenant_id: null, payload: { run_id: "run-001", items_inserted: 12 }, created_at: minutesAgo(12), processed_at: minutesAgo(11), locked_by: null, locked_at: null, error_message: null, retry_count: 0, max_retries: 3, status: "completed" },
  { id: "evt-002", event_type: "tenant_routing_requested", tenant_id: "tenant-001", payload: { trigger: "auto", items_to_evaluate: 12 }, created_at: minutesAgo(10), processed_at: null, locked_by: null, locked_at: null, error_message: null, retry_count: 0, max_retries: 3, status: "pending" },
  { id: "evt-003", event_type: "enrichment_requested", tenant_id: "tenant-002", payload: { item_ids: ["item-002"], enrichment_type: "full" }, created_at: hoursAgo(3), processed_at: hoursAgo(3), locked_by: "enrichment-worker-1", locked_at: hoursAgo(3), error_message: null, retry_count: 0, max_retries: 3, status: "completed" },
  { id: "evt-004", event_type: "rag_sync_requested", tenant_id: "tenant-003", payload: { sync_type: "incremental" }, created_at: hoursAgo(6), processed_at: null, locked_by: "rag-worker-1", locked_at: hoursAgo(6), error_message: "Embedding API rate limit exceeded", retry_count: 2, max_retries: 3, status: "failed" },
  { id: "evt-005", event_type: "strategy_generation_requested", tenant_id: "tenant-001", payload: { strategy_type: "weekly", include_insights: true }, created_at: hoursAgo(12), processed_at: hoursAgo(11), locked_by: null, locked_at: null, error_message: null, retry_count: 0, max_retries: 3, status: "completed" },
]

export const mockContentStrategies: ContentStrategy[] = [
  {
    id: "strategy-001", tenant_id: "tenant-001", title: "Q1 2026 Enterprise AI Content Strategy", status: "active",
    strategy_data: {
      executive_summary: "Focus on AI-driven workflow automation for enterprise buyers, emphasizing ROI and integration capabilities.",
      target_personas: ["IT Directors", "Operations Managers", "C-Suite"],
      content_pillars: [
        { name: "AI Automation ROI", description: "Demonstrate measurable business impact", topics: ["cost savings", "time efficiency", "error reduction"] },
        { name: "Integration Excellence", description: "Showcase seamless enterprise integration", topics: ["API capabilities", "security", "scalability"] },
      ],
      recommended_channels: ["LinkedIn", "Industry blogs", "Webinars"],
      content_calendar: { frequency: "2x weekly", themes: ["Case studies", "Product updates", "Industry insights"] },
      key_messages: ["Reduce manual work by 60% with AI automation", "Enterprise-grade security and compliance", "Seamless integration with existing tools"],
      competitive_positioning: "Most comprehensive AI automation platform for enterprise workflows",
    },
    insights_used: ["insight-001", "insight-002"], created_at: daysAgo(7), updated_at: hoursAgo(12),
  },
  {
    id: "strategy-002", tenant_id: "tenant-002", title: "Fintech Regulatory Content Strategy", status: "active",
    strategy_data: {
      executive_summary: "Position as the trusted payment infrastructure partner during regulatory changes.",
      target_personas: ["CFOs", "Compliance Officers", "Finance Directors"],
      content_pillars: [
        { name: "Regulatory Expertise", description: "Guide through compliance requirements", topics: ["PSD2", "KYC/AML", "data protection"] },
        { name: "Payment Innovation", description: "Showcase cutting-edge payment solutions", topics: ["real-time payments", "cross-border", "embedded finance"] },
      ],
      recommended_channels: ["Financial publications", "LinkedIn", "Webinars"],
      content_calendar: { frequency: "Weekly", themes: ["Regulatory updates", "Payment trends", "Customer success"] },
      key_messages: ["Stay compliant with evolving regulations", "Process payments faster and more securely", "Built for global scale"],
      competitive_positioning: "The compliance-first payment platform for modern businesses",
    },
    insights_used: ["insight-003"], created_at: daysAgo(14), updated_at: daysAgo(2),
  },
]

export const mockAgentHealth: AgentHealth[] = [
  { agent_name: "Ingest Agent", status: "healthy", last_run_at: minutesAgo(15), last_run_status: "completed", error_rate_24h: 0.02, avg_duration_ms: 180000 },
  { agent_name: "Distributor", status: "healthy", last_run_at: minutesAgo(12), last_run_status: "completed", error_rate_24h: 0.01, avg_duration_ms: 4500 },
  { agent_name: "Enrichment Agent", status: "healthy", last_run_at: hoursAgo(3), last_run_status: "completed", error_rate_24h: 0.03, avg_duration_ms: 12000 },
  { agent_name: "RAG Builder", status: "warning", last_run_at: hoursAgo(6), last_run_status: "failed", error_rate_24h: 0.15, avg_duration_ms: 45000 },
  { agent_name: "Strategy Builder", status: "healthy", last_run_at: hoursAgo(12), last_run_status: "completed", error_rate_24h: 0.0, avg_duration_ms: 30000 },
]

export const mockActivityFeed: ActivityItem[] = [
  { id: "activity-001", type: "ingest", title: "Global ingest completed", description: "Inserted 12 new items from 5 sources", tenant_id: null, tenant_name: null, timestamp: minutesAgo(12) },
  { id: "activity-002", type: "routing", title: "Tenant routing completed", description: "Routed 2 items with avg relevance 0.85", tenant_id: "tenant-001", tenant_name: "TechFlow Solutions", timestamp: hoursAgo(2) },
  { id: "activity-003", type: "enrichment", title: "Content enriched", description: "Enriched 1 item with topics and entities", tenant_id: "tenant-002", tenant_name: "FinanceHub Inc", timestamp: hoursAgo(3) },
  { id: "activity-004", type: "error", title: "RAG sync failed", description: "Embedding API rate limit exceeded", tenant_id: "tenant-003", tenant_name: "Meridian Capital", timestamp: hoursAgo(6) },
  { id: "activity-005", type: "strategy", title: "Strategy generated", description: "Q1 2026 content strategy created", tenant_id: "tenant-001", tenant_name: "TechFlow Solutions", timestamp: hoursAgo(11) },
]

export function getTenantById(id: string): Tenant | undefined {
  return mockTenants.find((t) => t.id === id)
}

export function getTenantProfile(tenantId: string): TenantProfile | undefined {
  return mockTenantProfiles[tenantId]
}

export function getTenantQueue(tenantId: string): TenantItemQueue[] {
  return mockTenantItemQueue.filter((q) => q.tenant_id === tenantId).map((q) => ({ ...q, item: mockGlobalRssItems.find((i) => i.id === q.global_item_id) }))
}

export function getLatestRoutingRun(tenantId: string): TenantRoutingRun | undefined {
  return mockTenantRoutingRuns.filter((r) => r.tenant_id === tenantId).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
}
