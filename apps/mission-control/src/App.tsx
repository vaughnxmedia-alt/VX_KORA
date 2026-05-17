import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type TabId =
  | "command"
  | "audience"
  | "leads"
  | "buyerJourney"
  | "offers"
  | "campaigns"
  | "revenue"
  | "learning"
  | "workflows"
  | "systemHealth"

type CompanyId =
  | "jahknowspr"
  | "mont_city_media_group"
  | "mont_city_network"
  | "vaughnx_technology"
  | "external_client"

type ModeId = "live" | "test"
type DateRangeId = "24h" | "7d" | "30d" | "90d"

type PriorityType =
  | "workflow_needs_review"
  | "lead_needs_follow_up"
  | "campaign_has_traffic_no_conversion"
  | "deliverable_missing"
  | "payment_or_attribution_issue"
  | "learning_needs_approval"
  | "client_approval_needed"
  | "subscription_risk"
  | "production_deadline_risk"

type UniversalHealthKey =
  | "new_leads"
  | "active_workflows"
  | "follow_up_needed"
  | "revenue_tracked"
  | "audience_signals"
  | "campaign_alerts"
  | "learning_approvals"
  | "action_needed"

type CompanyMetricId =
  | "audit_requests"
  | "strategy_session_leads"
  | "pdf_reports"
  | "audio_briefs"
  | "brief_subscribers"
  | "production_leads"
  | "active_video_projects"
  | "event_coverage_requests"
  | "client_approvals"
  | "sponsor_leads"
  | "published_recaps"
  | "published_stories"
  | "interview_requests"
  | "subscribers"
  | "ad_revenue"
  | "distribution_performance"
  | "demo_requests"
  | "product_users"
  | "subscriptions"
  | "agent_runs"
  | "support_requests"
  | "client_onboarding"

type TableRow = Record<string, unknown>
type CountMap = Record<string, number | null>
type ErrorMap = Record<string, string | null>

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

type WorkflowDefinition = {
  id: string
  label: string
  description: string
  matchTerms: string[]
}

type DeliverableDefinition = {
  id: string
  label: string
  matchTerms: string[]
}

type CompanyProfile = {
  id: CompanyId
  label: string
  businessModel: string
  matchTokens: string[]
  offerCatalog: string[]
  leadMagnetCatalog: string[]
  workflowCatalog: WorkflowDefinition[]
  deliverableCatalog: DeliverableDefinition[]
  companyMetricCards: { id: CompanyMetricId; label: string }[]
  priorityRuleSummary: string[]
  priorityOrder: PriorityType[]
  emptyStates: Record<TabId, string>
}

type PrioritySignal = {
  type: PriorityType
  count: number
  text: string
}

type WorkflowStatus = {
  workflowId: string
  label: string
  active: number
  waiting: number
  completed: number
}

type DeliverableStatus = {
  deliverableId: string
  label: string
  completed: number
  pending: number
}

type CompanyTestFixture = {
  universalMetrics: Record<UniversalHealthKey, number>
  companyMetrics: Record<CompanyMetricId, number>
  priorities: { type: PriorityType; count: number }[]
  leads: TableRow[]
  journeys: TableRow[]
  offers: TableRow[]
  campaigns: TableRow[]
  revenue: TableRow[]
  learning: TableRow[]
  workflows: WorkflowStatus[]
  deliverables: DeliverableStatus[]
}

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: "command", label: "Command" },
  { id: "audience", label: "Audience" },
  { id: "leads", label: "Leads" },
  { id: "buyerJourney", label: "Buyer Journey" },
  { id: "offers", label: "Offers" },
  { id: "campaigns", label: "Campaigns" },
  { id: "revenue", label: "Revenue" },
  { id: "learning", label: "Learning" },
  { id: "workflows", label: "Workflows" },
  { id: "systemHealth", label: "System Health" },
]

const DATE_RANGE_OPTIONS: { id: DateRangeId; label: string; days: number }[] = [
  { id: "24h", label: "Last 24 hours", days: 1 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
]

const UNIVERSAL_CARDS: { id: UniversalHealthKey; label: string }[] = [
  { id: "new_leads", label: "New Leads" },
  { id: "active_workflows", label: "Active Workflows" },
  { id: "follow_up_needed", label: "Follow-Up Needed" },
  { id: "revenue_tracked", label: "Revenue Tracked" },
  { id: "audience_signals", label: "Audience Signals" },
  { id: "campaign_alerts", label: "Campaign Alerts" },
  { id: "learning_approvals", label: "Learning Approvals" },
  { id: "action_needed", label: "Action Needed" },
]

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

const COMPANY_PROFILES: Record<CompanyId, CompanyProfile> = {
  jahknowspr: {
    id: "jahknowspr",
    label: "JahKnowsPR",
    businessModel: "Brand growth + audience diagnostics + trust-building strategy sessions.",
    matchTokens: ["jahknowspr", "jah", "brief", "free_audit", "strategy_session"],
    offerCatalog: ["Free Audit", "Strategy Session", "Brand Blueprint", "PR Campaign", "The Brief", "Telegram Add-On"],
    leadMagnetCatalog: ["Free Audit", "The Brief", "Strategy Session"],
    workflowCatalog: [
      { id: "free_audit", label: "Free Audit", description: "Capture and diagnose positioning gaps.", matchTerms: ["audit"] },
      {
        id: "strategy_session",
        label: "Strategy Session",
        description: "Paid trust builder and qualification step.",
        matchTerms: ["strategy_session", "booking"],
      },
      {
        id: "brand_blueprint",
        label: "Brand Blueprint",
        description: "Positioning and messaging strategy package.",
        matchTerms: ["brand_blueprint"],
      },
      { id: "pr_campaign", label: "PR Campaign", description: "Campaign execution workflow.", matchTerms: ["pr_campaign", "campaign"] },
      { id: "the_brief", label: "The Brief", description: "Subscription publishing workflow.", matchTerms: ["brief", "newsletter"] },
      { id: "telegram_addon", label: "Telegram Add-On", description: "Audience delivery channel workflow.", matchTerms: ["telegram"] },
    ],
    deliverableCatalog: [
      { id: "pdf_report", label: "PDF Reports", matchTerms: ["pdf", "report"] },
      { id: "audio_brief", label: "Audio Briefs", matchTerms: ["audio"] },
      { id: "strategy_summary", label: "Strategy Summaries", matchTerms: ["strategy", "summary"] },
    ],
    companyMetricCards: [
      { id: "audit_requests", label: "Audit Requests" },
      { id: "strategy_session_leads", label: "Strategy Session Leads" },
      { id: "pdf_reports", label: "PDF Reports" },
      { id: "audio_briefs", label: "Audio Briefs" },
      { id: "brief_subscribers", label: "The Brief Subscribers" },
    ],
    priorityRuleSummary: [
      "Prioritize lead-to-booking velocity.",
      "Block deliverable drift: every completed audit needs report + audio coverage.",
      "Escalate campaigns with traffic but no booked strategy sessions.",
    ],
    priorityOrder: [
      "workflow_needs_review",
      "lead_needs_follow_up",
      "campaign_has_traffic_no_conversion",
      "deliverable_missing",
      "learning_needs_approval",
      "payment_or_attribution_issue",
    ],
    emptyStates: {
      command: "No command updates for JahKnowsPR in this range.",
      audience: "No audience signals for JahKnowsPR in this date range.",
      leads: "No new JahKnowsPR leads in this date range.",
      buyerJourney: "No JahKnowsPR buyer journeys in this date range.",
      offers: "No JahKnowsPR offer activity in this date range.",
      campaigns: "No JahKnowsPR campaign events in this date range.",
      revenue: "No JahKnowsPR revenue activity in this date range.",
      learning: "No JahKnowsPR learning outcomes in this date range.",
      workflows: "No JahKnowsPR workflow activity in this date range.",
      systemHealth: "System health data is unavailable.",
    },
  },
  mont_city_media_group: {
    id: "mont_city_media_group",
    label: "Mont City Media Group",
    businessModel: "Production services with sponsor, event, and client approval workflows.",
    matchTokens: ["montcitymediagroup", "mont_city_media_group", "montcitymedia", "video", "event_coverage"],
    offerCatalog: ["Video Production", "Event Coverage", "Interview Package", "Documentary Project", "Live Stream", "Recap Video"],
    leadMagnetCatalog: ["Production Inquiry", "Event Coverage Inquiry", "Sponsor Inquiry"],
    workflowCatalog: [
      { id: "video_production", label: "Video Production", description: "End-to-end production workflow.", matchTerms: ["video", "production"] },
      { id: "event_coverage", label: "Event Coverage", description: "On-site filming and recap workflow.", matchTerms: ["event", "coverage"] },
      { id: "interview_package", label: "Interview Package", description: "Interview planning + release workflow.", matchTerms: ["interview"] },
      { id: "documentary_project", label: "Documentary Project", description: "Long-form narrative production workflow.", matchTerms: ["documentary"] },
      { id: "live_stream", label: "Live Stream", description: "Live event broadcast workflow.", matchTerms: ["live_stream", "live"] },
      { id: "recap_video", label: "Recap Video", description: "Post-event recap deliverable workflow.", matchTerms: ["recap"] },
    ],
    deliverableCatalog: [
      { id: "published_recaps", label: "Published Recaps", matchTerms: ["recap"] },
      { id: "client_approval_packets", label: "Client Approval Packets", matchTerms: ["approval"] },
      { id: "sponsor_packages", label: "Sponsor Packages", matchTerms: ["sponsor"] },
    ],
    companyMetricCards: [
      { id: "production_leads", label: "Production Leads" },
      { id: "active_video_projects", label: "Active Video Projects" },
      { id: "event_coverage_requests", label: "Event Coverage Requests" },
      { id: "client_approvals", label: "Client Approvals" },
      { id: "sponsor_leads", label: "Sponsor Leads" },
      { id: "published_recaps", label: "Published Recaps" },
    ],
    priorityRuleSummary: [
      "Protect production deadlines and approval turnaround.",
      "Escalate sponsor interest with no signed package.",
      "Promote story formats that repeat engagement and sponsor lift.",
    ],
    priorityOrder: [
      "lead_needs_follow_up",
      "client_approval_needed",
      "production_deadline_risk",
      "campaign_has_traffic_no_conversion",
      "learning_needs_approval",
    ],
    emptyStates: {
      command: "No command updates for Mont City Media Group in this range.",
      audience: "No audience signals for Mont City Media Group in this date range.",
      leads: "No production or event leads in this date range.",
      buyerJourney: "No buyer journey records in this date range.",
      offers: "No offer workflow activity in this date range.",
      campaigns: "No sponsor or production campaigns in this date range.",
      revenue: "No sponsor/package revenue data in this date range.",
      learning: "No learning outcomes in this date range.",
      workflows: "No production workflows in this date range.",
      systemHealth: "System health data is unavailable.",
    },
  },
  mont_city_network: {
    id: "mont_city_network",
    label: "Mont City Network",
    businessModel: "Media publishing, subscriptions, sponsor growth, and distribution performance.",
    matchTokens: ["montcitynetwork", "mont_city_network", "story", "distribution", "sponsor_campaign"],
    offerCatalog: ["Story Publishing", "Show Episode", "Interview Feature", "Sponsor Campaign", "Content Distribution"],
    leadMagnetCatalog: ["Story Pitch", "Interview Inquiry", "Sponsor Inquiry", "Subscription Signup"],
    workflowCatalog: [
      { id: "story_publishing", label: "Story Publishing", description: "Editorial story workflow.", matchTerms: ["story", "publishing"] },
      { id: "show_episode", label: "Show Episode", description: "Episode planning + release workflow.", matchTerms: ["episode", "show"] },
      { id: "interview_feature", label: "Interview Feature", description: "Feature interview workflow.", matchTerms: ["interview"] },
      { id: "sponsor_campaign", label: "Sponsor Campaign", description: "Sponsor package workflow.", matchTerms: ["sponsor"] },
      { id: "content_distribution", label: "Content Distribution", description: "Distribution + amplification workflow.", matchTerms: ["distribution"] },
    ],
    deliverableCatalog: [
      { id: "published_stories", label: "Published Stories", matchTerms: ["story"] },
      { id: "distribution_reports", label: "Distribution Reports", matchTerms: ["distribution"] },
      { id: "sponsor_reports", label: "Sponsor Reports", matchTerms: ["sponsor"] },
    ],
    companyMetricCards: [
      { id: "published_stories", label: "Published Stories" },
      { id: "interview_requests", label: "Interview Requests" },
      { id: "sponsor_leads", label: "Sponsor Leads" },
      { id: "subscribers", label: "Subscribers" },
      { id: "ad_revenue", label: "Ad Revenue" },
      { id: "distribution_performance", label: "Distribution Performance" },
    ],
    priorityRuleSummary: [
      "Escalate interview and sponsor leads that stall.",
      "Protect subscriber retention and ad-yield quality.",
      "Highlight distribution channels with strongest downstream conversion.",
    ],
    priorityOrder: [
      "lead_needs_follow_up",
      "campaign_has_traffic_no_conversion",
      "subscription_risk",
      "learning_needs_approval",
    ],
    emptyStates: {
      command: "No command updates for Mont City Network in this range.",
      audience: "No audience signals for Mont City Network in this date range.",
      leads: "No story/interview/sponsor leads in this date range.",
      buyerJourney: "No buyer journeys in this date range.",
      offers: "No publishing offer activity in this date range.",
      campaigns: "No campaign events in this date range.",
      revenue: "No ad/sponsor revenue in this date range.",
      learning: "No learning updates in this date range.",
      workflows: "No publishing workflows in this date range.",
      systemHealth: "System health data is unavailable.",
    },
  },
  vaughnx_technology: {
    id: "vaughnx_technology",
    label: "VaughnX Technology",
    businessModel: "AI product workflows: demos, subscriptions, support, onboarding, and agent builds.",
    matchTokens: ["vaughnxtechnology", "vaughnx", "agent_build", "ai_tool", "product"],
    offerCatalog: ["AI Tool Setup", "Client Onboarding", "Product Subscription", "Agent Build", "Support Request"],
    leadMagnetCatalog: ["Demo Request", "AI Audit Tool Signup", "Product Trial"],
    workflowCatalog: [
      { id: "ai_tool_setup", label: "AI Tool Setup", description: "Initial setup and configuration workflow.", matchTerms: ["ai_tool", "setup"] },
      { id: "client_onboarding", label: "Client Onboarding", description: "Activation + success workflow.", matchTerms: ["onboarding"] },
      { id: "product_subscription", label: "Product Subscription", description: "Subscription lifecycle workflow.", matchTerms: ["subscription"] },
      { id: "agent_build", label: "Agent Build", description: "Agent build and test workflow.", matchTerms: ["agent"] },
      { id: "support_request", label: "Support Request", description: "Support triage and resolution workflow.", matchTerms: ["support"] },
    ],
    deliverableCatalog: [
      { id: "onboarding_checklists", label: "Onboarding Checklists", matchTerms: ["onboarding"] },
      { id: "agent_delivery_packets", label: "Agent Delivery Packets", matchTerms: ["agent"] },
      { id: "support_resolutions", label: "Support Resolutions", matchTerms: ["support"] },
    ],
    companyMetricCards: [
      { id: "demo_requests", label: "Demo Requests" },
      { id: "product_users", label: "Product Users" },
      { id: "subscriptions", label: "Subscriptions" },
      { id: "agent_runs", label: "Agent Runs" },
      { id: "support_requests", label: "Support Requests" },
      { id: "client_onboarding", label: "Client Onboarding" },
    ],
    priorityRuleSummary: [
      "Escalate demo-to-subscription drop-off quickly.",
      "Track onboarding friction and simplify activation steps.",
      "Protect support SLA and successful agent delivery completion.",
    ],
    priorityOrder: [
      "lead_needs_follow_up",
      "workflow_needs_review",
      "campaign_has_traffic_no_conversion",
      "subscription_risk",
      "learning_needs_approval",
    ],
    emptyStates: {
      command: "No command updates for VaughnX Technology in this range.",
      audience: "No audience signals for VaughnX Technology in this date range.",
      leads: "No demo or support leads in this date range.",
      buyerJourney: "No buyer journeys in this date range.",
      offers: "No product offer activity in this date range.",
      campaigns: "No campaign activity in this date range.",
      revenue: "No subscription revenue in this date range.",
      learning: "No learning updates in this date range.",
      workflows: "No product workflows in this date range.",
      systemHealth: "System health data is unavailable.",
    },
  },
  external_client: {
    id: "external_client",
    label: "Future External Client",
    businessModel: "Template profile for onboarding future client workflows and deliverables.",
    matchTokens: [],
    offerCatalog: ["Offer A", "Offer B"],
    leadMagnetCatalog: ["Lead Magnet A"],
    workflowCatalog: [
      { id: "workflow_a", label: "Workflow A", description: "Replace with client-specific workflow.", matchTerms: ["workflow"] },
    ],
    deliverableCatalog: [
      { id: "deliverable_a", label: "Deliverable A", matchTerms: ["deliverable"] },
    ],
    companyMetricCards: [{ id: "demo_requests", label: "Client Leads" }],
    priorityRuleSummary: [
      "Define company profile before tracking live data.",
      "Map offers, lead magnets, workflows, and deliverables to this template.",
    ],
    priorityOrder: ["workflow_needs_review", "lead_needs_follow_up"],
    emptyStates: {
      command: "Select a configured client profile to populate command metrics.",
      audience: "No audience data configured for this client.",
      leads: "No lead schema mapped for this client yet.",
      buyerJourney: "No buyer journey schema mapped for this client yet.",
      offers: "No offers mapped for this client yet.",
      campaigns: "No campaign schema mapped for this client yet.",
      revenue: "No revenue schema mapped for this client yet.",
      learning: "No learning schema mapped for this client yet.",
      workflows: "No workflows mapped for this client yet.",
      systemHealth: "System health data is unavailable.",
    },
  },
}

const TEST_FIXTURES: Record<CompanyId, CompanyTestFixture> = {
  jahknowspr: {
    universalMetrics: {
      new_leads: 14,
      active_workflows: 11,
      follow_up_needed: 5,
      revenue_tracked: 8,
      audience_signals: 23,
      campaign_alerts: 2,
      learning_approvals: 3,
      action_needed: 10,
    },
    companyMetrics: {
      audit_requests: 3,
      strategy_session_leads: 4,
      pdf_reports: 6,
      audio_briefs: 5,
      brief_subscribers: 218,
      production_leads: 0,
      active_video_projects: 0,
      event_coverage_requests: 0,
      client_approvals: 0,
      sponsor_leads: 0,
      published_recaps: 0,
      published_stories: 0,
      interview_requests: 0,
      subscribers: 0,
      ad_revenue: 0,
      distribution_performance: 0,
      demo_requests: 0,
      product_users: 0,
      subscriptions: 0,
      agent_runs: 0,
      support_requests: 0,
      client_onboarding: 0,
    },
    priorities: [
      { type: "workflow_needs_review", count: 3 },
      { type: "lead_needs_follow_up", count: 1 },
      { type: "campaign_has_traffic_no_conversion", count: 1 },
      { type: "learning_needs_approval", count: 1 },
    ],
    leads: [
      { workflow: "Free Audit", status: "Needs review", source: "Visibility vs Clarity", occurred_at: new Date().toISOString() },
      { workflow: "Strategy Session", status: "Follow-up required", source: "Direct", occurred_at: new Date().toISOString() },
    ],
    journeys: [
      { status: "Lead captured", buyer: "prospect_a", stage: "Audit submitted", last_event_at: new Date().toISOString() },
      { status: "Offer presented", buyer: "prospect_b", stage: "Strategy session pending", last_event_at: new Date().toISOString() },
    ],
    offers: [{ offer: "Strategy Session", stage: "Paid trust builder", status: "Presented", occurred_at: new Date().toISOString() }],
    campaigns: [{ campaign: "Visibility vs Clarity", platform: "Meta", signal: "High traffic / no bookings", occurred_at: new Date().toISOString() }],
    revenue: [{ stream: "Strategy Sessions", amount: 1297, currency: "USD", occurred_at: new Date().toISOString() }],
    learning: [{ action: "Audience pattern found", status: "Needs approval", occurred_at: new Date().toISOString() }],
    workflows: [
      { workflowId: "free_audit", label: "Free Audit", active: 3, waiting: 2, completed: 8 },
      { workflowId: "strategy_session", label: "Strategy Session", active: 2, waiting: 1, completed: 4 },
      { workflowId: "the_brief", label: "The Brief", active: 1, waiting: 0, completed: 12 },
    ],
    deliverables: [
      { deliverableId: "pdf_report", label: "PDF Reports", completed: 6, pending: 1 },
      { deliverableId: "audio_brief", label: "Audio Briefs", completed: 5, pending: 2 },
    ],
  },
  mont_city_media_group: {
    universalMetrics: {
      new_leads: 9,
      active_workflows: 10,
      follow_up_needed: 4,
      revenue_tracked: 5,
      audience_signals: 17,
      campaign_alerts: 2,
      learning_approvals: 2,
      action_needed: 9,
    },
    companyMetrics: {
      audit_requests: 0,
      strategy_session_leads: 0,
      pdf_reports: 0,
      audio_briefs: 0,
      brief_subscribers: 0,
      production_leads: 5,
      active_video_projects: 4,
      event_coverage_requests: 2,
      client_approvals: 1,
      sponsor_leads: 3,
      published_recaps: 7,
      published_stories: 0,
      interview_requests: 0,
      subscribers: 0,
      ad_revenue: 0,
      distribution_performance: 0,
      demo_requests: 0,
      product_users: 0,
      subscriptions: 0,
      agent_runs: 0,
      support_requests: 0,
      client_onboarding: 0,
    },
    priorities: [
      { type: "lead_needs_follow_up", count: 2 },
      { type: "client_approval_needed", count: 1 },
      { type: "campaign_has_traffic_no_conversion", count: 1 },
      { type: "production_deadline_risk", count: 1 },
    ],
    leads: [{ workflow: "Event Coverage", status: "Needs follow-up", source: "SETX Visionary Awards", occurred_at: new Date().toISOString() }],
    journeys: [{ status: "In production", buyer: "sponsor_a", stage: "Package review", last_event_at: new Date().toISOString() }],
    offers: [{ offer: "Video Production", stage: "Quote sent", status: "Pending approval", occurred_at: new Date().toISOString() }],
    campaigns: [{ campaign: "SETX Visionary Awards", platform: "Instagram", signal: "Sponsor interest / no signed package", occurred_at: new Date().toISOString() }],
    revenue: [{ stream: "Production Packages", amount: 3200, currency: "USD", occurred_at: new Date().toISOString() }],
    learning: [{ action: "Community storytelling trend", status: "Needs approval", occurred_at: new Date().toISOString() }],
    workflows: [
      { workflowId: "video_production", label: "Video Production", active: 4, waiting: 1, completed: 5 },
      { workflowId: "event_coverage", label: "Event Coverage", active: 2, waiting: 1, completed: 7 },
    ],
    deliverables: [
      { deliverableId: "published_recaps", label: "Published Recaps", completed: 7, pending: 1 },
      { deliverableId: "client_approval_packets", label: "Client Approval Packets", completed: 6, pending: 2 },
    ],
  },
  mont_city_network: {
    universalMetrics: {
      new_leads: 12,
      active_workflows: 9,
      follow_up_needed: 3,
      revenue_tracked: 6,
      audience_signals: 28,
      campaign_alerts: 1,
      learning_approvals: 2,
      action_needed: 6,
    },
    companyMetrics: {
      audit_requests: 0,
      strategy_session_leads: 0,
      pdf_reports: 0,
      audio_briefs: 0,
      brief_subscribers: 0,
      production_leads: 0,
      active_video_projects: 0,
      event_coverage_requests: 0,
      client_approvals: 0,
      sponsor_leads: 3,
      published_recaps: 0,
      published_stories: 14,
      interview_requests: 4,
      subscribers: 1160,
      ad_revenue: 4200,
      distribution_performance: 88,
      demo_requests: 0,
      product_users: 0,
      subscriptions: 0,
      agent_runs: 0,
      support_requests: 0,
      client_onboarding: 0,
    },
    priorities: [
      { type: "lead_needs_follow_up", count: 2 },
      { type: "campaign_has_traffic_no_conversion", count: 1 },
      { type: "subscription_risk", count: 1 },
    ],
    leads: [{ workflow: "Interview Feature", status: "Needs follow-up", source: "Direct request", occurred_at: new Date().toISOString() }],
    journeys: [{ status: "Subscriber", buyer: "viewer_24", stage: "Retention watchlist", last_event_at: new Date().toISOString() }],
    offers: [{ offer: "Sponsor Campaign", stage: "Negotiation", status: "Open", occurred_at: new Date().toISOString() }],
    campaigns: [{ campaign: "Community Voices", platform: "YouTube", signal: "Strong watch-time", occurred_at: new Date().toISOString() }],
    revenue: [{ stream: "Ad Revenue", amount: 4200, currency: "USD", occurred_at: new Date().toISOString() }],
    learning: [{ action: "Distribution channel pattern", status: "Needs approval", occurred_at: new Date().toISOString() }],
    workflows: [
      { workflowId: "story_publishing", label: "Story Publishing", active: 5, waiting: 1, completed: 14 },
      { workflowId: "content_distribution", label: "Content Distribution", active: 4, waiting: 1, completed: 12 },
    ],
    deliverables: [
      { deliverableId: "published_stories", label: "Published Stories", completed: 14, pending: 2 },
      { deliverableId: "distribution_reports", label: "Distribution Reports", completed: 9, pending: 1 },
    ],
  },
  vaughnx_technology: {
    universalMetrics: {
      new_leads: 11,
      active_workflows: 8,
      follow_up_needed: 4,
      revenue_tracked: 7,
      audience_signals: 21,
      campaign_alerts: 2,
      learning_approvals: 3,
      action_needed: 8,
    },
    companyMetrics: {
      audit_requests: 0,
      strategy_session_leads: 0,
      pdf_reports: 0,
      audio_briefs: 0,
      brief_subscribers: 0,
      production_leads: 0,
      active_video_projects: 0,
      event_coverage_requests: 0,
      client_approvals: 0,
      sponsor_leads: 0,
      published_recaps: 0,
      published_stories: 0,
      interview_requests: 0,
      subscribers: 0,
      ad_revenue: 0,
      distribution_performance: 0,
      demo_requests: 6,
      product_users: 138,
      subscriptions: 41,
      agent_runs: 27,
      support_requests: 5,
      client_onboarding: 3,
    },
    priorities: [
      { type: "lead_needs_follow_up", count: 1 },
      { type: "workflow_needs_review", count: 2 },
      { type: "campaign_has_traffic_no_conversion", count: 1 },
      { type: "learning_needs_approval", count: 1 },
    ],
    leads: [{ workflow: "Demo Request", status: "Needs follow-up", source: "AI Audit Tool Campaign", occurred_at: new Date().toISOString() }],
    journeys: [{ status: "Onboarding", buyer: "tenant_07", stage: "Agent setup incomplete", last_event_at: new Date().toISOString() }],
    offers: [{ offer: "Product Subscription", stage: "Trial to paid", status: "In progress", occurred_at: new Date().toISOString() }],
    campaigns: [{ campaign: "AI Audit Tool", platform: "LinkedIn", signal: "Signups / no subscriptions", occurred_at: new Date().toISOString() }],
    revenue: [{ stream: "Subscriptions", amount: 5900, currency: "USD", occurred_at: new Date().toISOString() }],
    learning: [{ action: "Onboarding simplification pattern", status: "Needs approval", occurred_at: new Date().toISOString() }],
    workflows: [
      { workflowId: "agent_build", label: "Agent Build", active: 4, waiting: 2, completed: 11 },
      { workflowId: "client_onboarding", label: "Client Onboarding", active: 3, waiting: 1, completed: 8 },
    ],
    deliverables: [
      { deliverableId: "agent_delivery_packets", label: "Agent Delivery Packets", completed: 11, pending: 2 },
      { deliverableId: "support_resolutions", label: "Support Resolutions", completed: 19, pending: 3 },
    ],
  },
  external_client: {
    universalMetrics: {
      new_leads: 0,
      active_workflows: 0,
      follow_up_needed: 0,
      revenue_tracked: 0,
      audience_signals: 0,
      campaign_alerts: 0,
      learning_approvals: 0,
      action_needed: 0,
    },
    companyMetrics: {
      audit_requests: 0,
      strategy_session_leads: 0,
      pdf_reports: 0,
      audio_briefs: 0,
      brief_subscribers: 0,
      production_leads: 0,
      active_video_projects: 0,
      event_coverage_requests: 0,
      client_approvals: 0,
      sponsor_leads: 0,
      published_recaps: 0,
      published_stories: 0,
      interview_requests: 0,
      subscribers: 0,
      ad_revenue: 0,
      distribution_performance: 0,
      demo_requests: 0,
      product_users: 0,
      subscriptions: 0,
      agent_runs: 0,
      support_requests: 0,
      client_onboarding: 0,
    },
    priorities: [],
    leads: [],
    journeys: [],
    offers: [],
    campaigns: [],
    revenue: [],
    learning: [],
    workflows: [],
    deliverables: [],
  },
}

const OTHER_COMPANY_TOKENS = [
  ...COMPANY_PROFILES.mont_city_media_group.matchTokens,
  ...COMPANY_PROFILES.mont_city_network.matchTokens,
  ...COMPANY_PROFILES.vaughnx_technology.matchTokens,
]

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

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

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getRowTextValue(row: TableRow, key: string): string {
  const value = row[key]
  return typeof value === "string" ? value : ""
}

function getRowDate(row: TableRow): Date | null {
  const dateFields = ["occurred_at", "created_at", "updated_at", "presented_at", "last_event_at", "signed_at", "sent_at"]
  for (const field of dateFields) {
    const value = row[field]
    if (typeof value === "string" && value) {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
  }
  return null
}

function rowContainsTokens(row: TableRow, tokens: string[]): boolean {
  const candidateFields = [
    "client_id",
    "brand_id",
    "site_id",
    "offer_id",
    "lead_magnet_id",
    "lead_key",
    "campaign_id",
    "platform",
    "event_name",
  ]
  return candidateFields.some((field) => {
    const raw = row[field]
    if (typeof raw !== "string") return false
    const value = normalizeToken(raw)
    return tokens.some((token) => value.includes(normalizeToken(token)))
  })
}

function rowBelongsToCompany(row: TableRow, company: CompanyProfile): boolean {
  if (company.id === "external_client") return true
  if (rowContainsTokens(row, company.matchTokens)) return true
  if (company.id !== "jahknowspr") return false

  // JahKnowsPR remains default for legacy rows that don't contain explicit company tags.
  const hasOtherCompanyMarker = rowContainsTokens(row, OTHER_COMPANY_TOKENS)
  return !hasOtherCompanyMarker
}

function isWithinDateRange(row: TableRow, rangeDays: number): boolean {
  const rowDate = getRowDate(row)
  if (!rowDate) return true
  const minDate = Date.now() - rangeDays * 24 * 60 * 60 * 1000
  return rowDate.getTime() >= minDate
}

async function fetchCount(table: string): Promise<{ count: number | null; error: string | null }> {
  const { count, error } = await supabase.from(table).select("*", { head: true, count: "exact" })
  return { count: count ?? null, error: error?.message ?? null }
}

async function fetchLatest(
  table: string,
  columns: string,
  orderColumn: string,
  limit = 120,
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

function WorkflowStatusCard({ workflow }: { workflow: WorkflowStatus }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">{workflow.label}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-blue-50 p-2 text-blue-700">
          <div className="font-semibold">{workflow.active}</div>
          <div>Active</div>
        </div>
        <div className="rounded-md bg-amber-50 p-2 text-amber-700">
          <div className="font-semibold">{workflow.waiting}</div>
          <div>Waiting</div>
        </div>
        <div className="rounded-md bg-green-50 p-2 text-green-700">
          <div className="font-semibold">{workflow.completed}</div>
          <div>Completed</div>
        </div>
      </div>
    </div>
  )
}

function DeliverableStatusCard({ deliverable }: { deliverable: DeliverableStatus }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-900">{deliverable.label}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-md bg-green-50 p-2 text-green-700">
          <div className="font-semibold">{deliverable.completed}</div>
          <div>Completed</div>
        </div>
        <div className="rounded-md bg-amber-50 p-2 text-amber-700">
          <div className="font-semibold">{deliverable.pending}</div>
          <div>Pending</div>
        </div>
      </div>
    </div>
  )
}

function countByToken(rows: TableRow[], tokens: string[]): number {
  return rows.filter((row) => rowContainsTokens(row, tokens)).length
}

function sumAmounts(rows: TableRow[]): number {
  return rows.reduce((sum, row) => {
    const value = row.amount ?? row.contract_value
    if (typeof value === "number") return sum + value
    if (typeof value === "string") {
      const parsed = Number(value)
      if (!Number.isNaN(parsed)) return sum + parsed
    }
    return sum
  }, 0)
}

function createPriorityText(companyId: CompanyId, type: PriorityType, count: number): string {
  if (count <= 0) return ""

  switch (companyId) {
    case "jahknowspr":
      switch (type) {
        case "workflow_needs_review":
          return `${count} audit requests need review`
        case "lead_needs_follow_up":
          return `${count} strategy session lead${count > 1 ? "s" : ""} has not booked yet`
        case "campaign_has_traffic_no_conversion":
          return `${count} campaign${count > 1 ? "s are" : " is"} driving traffic without bookings`
        case "deliverable_missing":
          return `${count} audit deliverable${count > 1 ? "s are" : " is"} missing report or audio coverage`
        case "learning_needs_approval":
          return `${count} audience pattern${count > 1 ? "s" : ""} found by KORA need approval`
        case "payment_or_attribution_issue":
          return `${count} payment or attribution issue${count > 1 ? "s need" : " needs"} review`
        default:
          return `${count} priority item${count > 1 ? "s" : ""} require action`
      }
    case "mont_city_media_group":
      switch (type) {
        case "lead_needs_follow_up":
          return `${count} event coverage inquir${count > 1 ? "ies need" : "y needs"} follow-up`
        case "client_approval_needed":
          return `${count} recap video${count > 1 ? "s are" : " is"} waiting for client approval`
        case "campaign_has_traffic_no_conversion":
          return `${count} sponsor campaign${count > 1 ? "s are" : " is"} driving interest without signed packages`
        case "production_deadline_risk":
          return `${count} production timeline${count > 1 ? "s are" : " is"} at deadline risk`
        case "learning_needs_approval":
          return `${count} storytelling pattern${count > 1 ? "s need" : " needs"} approval`
        default:
          return `${count} priority item${count > 1 ? "s" : ""} require action`
      }
    case "mont_city_network":
      switch (type) {
        case "lead_needs_follow_up":
          return `${count} interview or sponsor lead${count > 1 ? "s need" : " needs"} follow-up`
        case "campaign_has_traffic_no_conversion":
          return `${count} distribution campaign${count > 1 ? "s" : ""} has traffic without revenue lift`
        case "subscription_risk":
          return `${count} subscriber segment${count > 1 ? "s show" : " shows"} retention risk`
        case "learning_needs_approval":
          return `${count} distribution insight${count > 1 ? "s need" : " needs"} approval`
        default:
          return `${count} priority item${count > 1 ? "s" : ""} require action`
      }
    case "vaughnx_technology":
      switch (type) {
        case "lead_needs_follow_up":
          return `${count} demo request${count > 1 ? "s need" : " needs"} follow-up`
        case "workflow_needs_review":
          return `${count} agent setup workflow${count > 1 ? "s are" : " is"} incomplete`
        case "campaign_has_traffic_no_conversion":
          return `${count} campaign${count > 1 ? "s have" : " has"} signups without subscriptions`
        case "learning_needs_approval":
          return `${count} onboarding pattern${count > 1 ? "s need" : " needs"} approval`
        case "subscription_risk":
          return `${count} subscription segment${count > 1 ? "s show" : " shows"} churn risk`
        default:
          return `${count} priority item${count > 1 ? "s" : ""} require action`
      }
    default:
      return `${count} priority item${count > 1 ? "s" : ""} require action`
  }
}

function computeCompanyMetric(
  metric: CompanyMetricId,
  company: CompanyProfile,
  data: {
    leadRows: TableRow[]
    journeyRows: TableRow[]
    offerRows: TableRow[]
    campaignRows: TableRow[]
    revenueRows: TableRow[]
    llsRows: TableRow[]
    auditRows: TableRow[]
    auditPdfRows: TableRow[]
    auditAudioRows: TableRow[]
  },
): number {
  switch (metric) {
    case "audit_requests":
      return data.auditRows.length
    case "strategy_session_leads":
      return countByToken(data.leadRows, ["strategy_session", "booking"])
    case "pdf_reports":
      return data.auditPdfRows.length
    case "audio_briefs":
      return data.auditAudioRows.length
    case "brief_subscribers":
      return countByToken(data.leadRows, ["the_brief", "newsletter"])
    case "production_leads":
      return countByToken(data.leadRows, ["production", "event", "interview"])
    case "active_video_projects":
      return countByToken(data.offerRows, ["video", "production"])
    case "event_coverage_requests":
      return countByToken(data.leadRows, ["event", "coverage"])
    case "client_approvals":
      return countByToken(data.offerRows, ["approval", "pending"])
    case "sponsor_leads":
      return countByToken(data.leadRows, ["sponsor"]) + countByToken(data.campaignRows, ["sponsor"])
    case "published_recaps":
      return countByToken(data.campaignRows, ["recap"])
    case "published_stories":
      return countByToken(data.campaignRows, ["story", "publish"])
    case "interview_requests":
      return countByToken(data.leadRows, ["interview"])
    case "subscribers":
      return countByToken(data.journeyRows, ["subscriber", "subscription"])
    case "ad_revenue":
      return Math.round(sumAmounts(data.revenueRows))
    case "distribution_performance":
      return countByToken(data.campaignRows, ["distribution"]) * 10
    case "demo_requests":
      return countByToken(data.leadRows, ["demo"])
    case "product_users":
      return data.journeyRows.length
    case "subscriptions":
      return countByToken(data.revenueRows, ["subscription", "brief"])
    case "agent_runs":
      return countByToken(data.campaignRows, ["agent"]) + countByToken(data.llsRows, ["agent"])
    case "support_requests":
      return countByToken(data.leadRows, ["support"]) + countByToken(data.llsRows, ["support"])
    case "client_onboarding":
      return countByToken(data.journeyRows, ["onboarding"])
    default:
      return 0
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("command")
  const [selectedCompanyId, setSelectedCompanyId] = useState<CompanyId>("jahknowspr")
  const [dateRangeId, setDateRangeId] = useState<DateRangeId>("30d")
  const [mode, setMode] = useState<ModeId>("live")
  const [isLoading, setIsLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [state, setState] = useState<DashboardState>(EMPTY_STATE)

  const selectedCompany = COMPANY_PROFILES[selectedCompanyId]
  const selectedDateRange = DATE_RANGE_OPTIONS.find((item) => item.id === dateRangeId) ?? DATE_RANGE_OPTIONS[2]
  const testFixture = TEST_FIXTURES[selectedCompanyId]

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
        fetchLatest("lead_magnets", "id,label,kind,is_paid,is_active,updated_at", "updated_at"),
        fetchLatest(
          "buyer_journeys",
          "id,journey_status,canonical_buyer_key,buyer_key,lead_key,purchase_count,total_revenue,last_event_at,client_id,brand_id,site_id",
          "last_event_at",
        ),
        fetchLatest(
          "lead_magnet_interactions",
          "id,lead_magnet_id,interaction_kind,interaction_status,offer_id,offer_stage,campaign_id,buyer_journey_id,client_id,brand_id,site_id,occurred_at",
          "occurred_at",
        ),
        fetchLatest(
          "offer_presentations",
          "id,offer_id,offer_stage,presentation_status,lead_magnet_id,buyer_journey_id,campaign_id,client_id,brand_id,presented_at",
          "presented_at",
        ),
        fetchLatest(
          "analytics_events",
          "id,event_name,platform,campaign_id,adset_id,creative_id,lead_magnet_id,offer_stage,client_id,brand_id,site_id,created_at",
          "created_at",
        ),
        fetchLatest(
          "revenue_attribution",
          "id,offer_id,offer_stage,lead_magnet_id,buyer_key,buyer_journey_id,campaign_id,client_id,brand_id,amount,currency,payment_provider,created_at",
          "created_at",
        ),
        fetchLatest(
          "buyer_purchase_attribution",
          "id,offer_id,offer_stage,lead_magnet_id,buyer_key,buyer_journey_id,campaign_id,client_id,brand_id,amount,currency,created_at",
          "created_at",
        ),
        fetchLatest(
          "contract_attribution",
          "id,offer_id,offer_stage,lead_magnet_id,buyer_key,buyer_journey_id,client_id,brand_id,contract_value,currency,status,signed_at,created_at",
          "created_at",
        ),
        fetchLatest(
          "lls_outcome_events",
          "id,action,business_goal,buyer_key,buyer_journey_id,lead_magnet_id,campaign_id,offer_id,offer_stage,client_id,brand_id,occurred_at",
          "occurred_at",
        ),
        fetchLatest(
          "audit_intakes",
          "id,status,free_audit_id,lead_key,lead_email_lower,client_id,brand_id,site_id,utm_source,utm_campaign,created_at,updated_at",
          "updated_at",
        ),
        fetchLatest(
          "audit_intake_original_answers",
          "id,audit_intake_id,growth_goal,primary_blocker,target_audience,positioning_readiness,updated_at",
          "updated_at",
        ),
        fetchLatest(
          "audit_intake_analysis",
          "id,audit_intake_id,interpreted_growth_goal,interpreted_blocker,diagnosis_summary,completion_status,updated_at",
          "updated_at",
        ),
        fetchLatest(
          "audit_pdf_deliverables",
          "id,audit_intake_id,delivery_status,report_filename,sent_at,updated_at",
          "updated_at",
        ),
        fetchLatest(
          "audit_audio_deliverables",
          "id,audit_intake_id,delivery_status,voice_selected,audio_public_url,updated_at",
          "updated_at",
        ),
      ])

      setState({
        counts,
        errors: {
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
        },
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

  const liveFiltered = useMemo(() => {
    const applyFilter = (rows: TableRow[]) =>
      rows.filter((row) => rowBelongsToCompany(row, selectedCompany) && isWithinDateRange(row, selectedDateRange.days))

    return {
      leadRows: applyFilter(state.leadMagnetInteractions),
      journeyRows: applyFilter(state.buyerJourneys),
      offerRows: applyFilter(state.offerPresentations),
      campaignRows: applyFilter(state.campaignEvents),
      revenueRows: applyFilter(state.revenueRows),
      purchaseRows: applyFilter(state.purchaseRows),
      contractRows: applyFilter(state.contractRows),
      llsRows: applyFilter(state.llsRows),
      auditRows: applyFilter(state.auditRows),
      auditOriginalRows: applyFilter(state.auditOriginalRows),
      auditAnalysisRows: applyFilter(state.auditAnalysisRows),
      auditPdfRows: applyFilter(state.auditPdfRows),
      auditAudioRows: applyFilter(state.auditAudioRows),
      leadMagnets: applyFilter(state.leadMagnets),
    }
  }, [selectedCompany, selectedDateRange.days, state])

  const workflowStatus = useMemo<WorkflowStatus[]>(() => {
    if (mode === "test") return testFixture.workflows

    return selectedCompany.workflowCatalog.map((workflow) => {
      const termRows = [
        ...liveFiltered.leadRows,
        ...liveFiltered.offerRows,
        ...liveFiltered.campaignRows,
        ...liveFiltered.auditRows,
      ]
      const active = countByToken(termRows, workflow.matchTerms)
      const completed = countByToken([...liveFiltered.revenueRows, ...liveFiltered.contractRows], workflow.matchTerms)
      const waiting = Math.max(active - completed, 0)
      return { workflowId: workflow.id, label: workflow.label, active, waiting, completed }
    })
  }, [mode, selectedCompany.workflowCatalog, liveFiltered, testFixture.workflows])

  const deliverableStatus = useMemo<DeliverableStatus[]>(() => {
    if (mode === "test") return testFixture.deliverables

    return selectedCompany.deliverableCatalog.map((deliverable) => {
      if (deliverable.id === "pdf_report") {
        return {
          deliverableId: deliverable.id,
          label: deliverable.label,
          completed: liveFiltered.auditPdfRows.length,
          pending: Math.max(liveFiltered.auditRows.length - liveFiltered.auditPdfRows.length, 0),
        }
      }
      if (deliverable.id === "audio_brief") {
        return {
          deliverableId: deliverable.id,
          label: deliverable.label,
          completed: liveFiltered.auditAudioRows.length,
          pending: Math.max(liveFiltered.auditRows.length - liveFiltered.auditAudioRows.length, 0),
        }
      }
      const completed = countByToken(
        [...liveFiltered.campaignRows, ...liveFiltered.revenueRows, ...liveFiltered.llsRows],
        deliverable.matchTerms,
      )
      const pending = Math.max(countByToken([...liveFiltered.offerRows, ...liveFiltered.leadRows], deliverable.matchTerms) - completed, 0)
      return { deliverableId: deliverable.id, label: deliverable.label, completed, pending }
    })
  }, [mode, selectedCompany.deliverableCatalog, liveFiltered, testFixture.deliverables])

  const companyMetrics = useMemo<Record<CompanyMetricId, number>>(() => {
    if (mode === "test") return testFixture.companyMetrics

    const baseData = {
      leadRows: liveFiltered.leadRows,
      journeyRows: liveFiltered.journeyRows,
      offerRows: liveFiltered.offerRows,
      campaignRows: liveFiltered.campaignRows,
      revenueRows: liveFiltered.revenueRows,
      llsRows: liveFiltered.llsRows,
      auditRows: liveFiltered.auditRows,
      auditPdfRows: liveFiltered.auditPdfRows,
      auditAudioRows: liveFiltered.auditAudioRows,
    }

    const values = {} as Record<CompanyMetricId, number>
    ;(Object.keys(testFixture.companyMetrics) as CompanyMetricId[]).forEach((metricId) => {
      values[metricId] = computeCompanyMetric(metricId, selectedCompany, baseData)
    })
    return values
  }, [mode, selectedCompany, liveFiltered, testFixture.companyMetrics])

  const prioritySignals = useMemo<PrioritySignal[]>(() => {
    const rawSignals =
      mode === "test"
        ? testFixture.priorities
        : [
            {
              type: "workflow_needs_review" as PriorityType,
              count: workflowStatus.reduce((sum, item) => sum + item.waiting, 0),
            },
            {
              type: "lead_needs_follow_up" as PriorityType,
              count: liveFiltered.leadRows.filter((row) => ["pending", "unknown", "failed"].includes(getRowTextValue(row, "interaction_status"))).length,
            },
            {
              type: "campaign_has_traffic_no_conversion" as PriorityType,
              count:
                liveFiltered.campaignRows.length > 0 && liveFiltered.revenueRows.length === 0
                  ? 1
                  : 0,
            },
            {
              type: "deliverable_missing" as PriorityType,
              count:
                selectedCompany.id === "jahknowspr"
                  ? Math.max(liveFiltered.auditRows.length - liveFiltered.auditPdfRows.length, 0)
                  : 0,
            },
            {
              type: "payment_or_attribution_issue" as PriorityType,
              count: liveFiltered.revenueRows.filter(
                (row) => !getRowTextValue(row, "buyer_journey_id") || !getRowTextValue(row, "lead_magnet_id"),
              ).length,
            },
            {
              type: "learning_needs_approval" as PriorityType,
              count: liveFiltered.llsRows.filter((row) => {
                const action = getRowTextValue(row, "action")
                return action.includes("approval") || action.includes("approve")
              }).length,
            },
            {
              type: "client_approval_needed" as PriorityType,
              count: liveFiltered.offerRows.filter((row) => getRowTextValue(row, "presentation_status").includes("approval")).length,
            },
            {
              type: "subscription_risk" as PriorityType,
              count:
                selectedCompany.id === "mont_city_network" || selectedCompany.id === "vaughnx_technology"
                  ? Math.max(companyMetrics.subscribers + companyMetrics.subscriptions - Math.max(companyMetrics.ad_revenue, 1), 0) > 0
                    ? 1
                    : 0
                  : 0,
            },
            {
              type: "production_deadline_risk" as PriorityType,
              count:
                selectedCompany.id === "mont_city_media_group"
                  ? workflowStatus.filter((item) => item.waiting > 0).length
                  : 0,
            },
          ]

    return selectedCompany.priorityOrder
      .map((type) => {
        const found = rawSignals.find((item) => item.type === type)
        const count = found?.count ?? 0
        return {
          type,
          count,
          text: createPriorityText(selectedCompany.id, type, count),
        }
      })
      .filter((item) => item.count > 0 && item.text.length > 0)
  }, [mode, testFixture.priorities, workflowStatus, liveFiltered, selectedCompany, companyMetrics])

  const universalMetrics = useMemo<Record<UniversalHealthKey, number>>(() => {
    if (mode === "test") return testFixture.universalMetrics

    const followUpNeeded = prioritySignals
      .filter((item) => ["lead_needs_follow_up", "workflow_needs_review", "client_approval_needed"].includes(item.type))
      .reduce((sum, item) => sum + item.count, 0)

    const campaignAlerts = prioritySignals
      .filter((item) => item.type === "campaign_has_traffic_no_conversion")
      .reduce((sum, item) => sum + item.count, 0)

    const learningApprovals = prioritySignals
      .filter((item) => item.type === "learning_needs_approval")
      .reduce((sum, item) => sum + item.count, 0)

    return {
      new_leads: liveFiltered.leadRows.length,
      active_workflows: workflowStatus.reduce((sum, item) => sum + item.active, 0),
      follow_up_needed: followUpNeeded,
      revenue_tracked: Math.round(sumAmounts([...liveFiltered.revenueRows, ...liveFiltered.contractRows])),
      audience_signals: liveFiltered.campaignRows.length,
      campaign_alerts: campaignAlerts,
      learning_approvals: learningApprovals,
      action_needed: prioritySignals.reduce((sum, item) => sum + item.count, 0),
    }
  }, [mode, testFixture.universalMetrics, liveFiltered, workflowStatus, prioritySignals])

  const commandLeadRows = mode === "test" ? testFixture.leads : liveFiltered.leadRows
  const commandJourneyRows = mode === "test" ? testFixture.journeys : liveFiltered.journeyRows
  const commandOfferRows = mode === "test" ? testFixture.offers : liveFiltered.offerRows
  const commandCampaignRows = mode === "test" ? testFixture.campaigns : liveFiltered.campaignRows
  const commandRevenueRows = mode === "test" ? testFixture.revenue : [...liveFiltered.revenueRows, ...liveFiltered.contractRows]
  const commandLearningRows = mode === "test" ? testFixture.learning : liveFiltered.llsRows

  const smokeChecks = useMemo(() => {
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

  const debugErrors = Object.entries(state.errors).filter(([, value]) => Boolean(value))
  const lastRefreshText = state.refreshedAt ? formatDate(state.refreshedAt) : "Not refreshed yet"

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">KORA Mission Control</h1>
            <p className="mt-1 text-sm text-gray-600">
              Company-aware closed-loop command center for audience, buyer, offer, campaign, revenue, learning, and workflows.
            </p>
          </div>

          <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 md:grid-cols-6">
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Company
              <select
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value as CompanyId)}
                className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-800"
              >
                {Object.values(COMPANY_PROFILES).map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Date Range
              <select
                value={dateRangeId}
                onChange={(event) => setDateRangeId(event.target.value as DateRangeId)}
                className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-800"
              >
                {DATE_RANGE_OPTIONS.map((range) => (
                  <option key={range.id} value={range.id}>
                    {range.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Mode
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as ModeId)}
                className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-800"
              >
                <option value="live">Live</option>
                <option value="test">Test Data</option>
              </select>
            </label>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={isLoading}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>

            <div className="col-span-2 rounded-md border border-gray-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last Refreshed</p>
              <p className="mt-1 text-sm text-gray-800">{lastRefreshText}</p>
              <p className="mt-1 text-xs text-gray-500">Mode: {mode === "live" ? "Live data" : "Test data scenario"}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        {globalError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load dashboard: {globalError}
          </div>
        ) : null}

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

        {activeTab === "command" ? (
          <section className="flex flex-col gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Command - {selectedCompany.label}</h2>
              <p className="mt-1 text-sm text-gray-600">{selectedCompany.businessModel}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {UNIVERSAL_CARDS.map((card) => (
                <KpiCard
                  key={card.id}
                  label={card.label}
                  value={formatMetric(universalMetrics[card.id])}
                />
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selectedCompany.companyMetricCards.map((card) => (
                <KpiCard
                  key={card.id}
                  label={card.label}
                  value={formatMetric(companyMetrics[card.id])}
                />
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Today's Priority</h3>
                {prioritySignals.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">{selectedCompany.emptyStates.command}</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm text-gray-800">
                    {prioritySignals.map((priority) => (
                      <li key={priority.type} className="rounded-md bg-gray-50 px-3 py-2">
                        {priority.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Company Profile</h3>
                <p className="mt-2 text-sm text-gray-700">{selectedCompany.businessModel}</p>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Offer Catalog</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedCompany.offerCatalog.map((item) => (
                      <span key={item} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lead Magnet Catalog</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedCompany.leadMagnetCatalog.map((item) => (
                      <span key={item} className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Priority Rules</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {selectedCompany.priorityRuleSummary.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "audience" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <KpiCard
              label="Audience Signals"
              value={formatMetric(universalMetrics.audience_signals)}
              hint={`Signals in ${selectedDateRange.label.toLowerCase()}`}
            />
            <DataTable
              title={`${selectedCompany.label} Audience Signals`}
              rows={commandCampaignRows}
              emptyLabel={selectedCompany.emptyStates.audience}
              columns={[
                { key: "campaign", label: "Campaign", formatter: (value) => (value ? String(value) : getRowTextValue as never) },
                { key: "event_name", label: "Signal", formatter: (value) => (value ? formatLabel(String(value)) : "-") },
                { key: "platform", label: "Channel", formatter: (value) => (value ? String(value) : "-") },
                { key: "occurred_at", label: "When", formatter: formatDate },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "leads" ? (
          <DataTable
            title={`${selectedCompany.label} Leads`}
            rows={commandLeadRows}
            emptyLabel={selectedCompany.emptyStates.leads}
            columns={[
              {
                key: "lead_magnet_id",
                label: "Lead Source",
                formatter: (value) => (value ? formatLabel(String(value)) : getRowTextValue as never),
              },
              {
                key: "interaction_kind",
                label: "Lead Action",
                formatter: (value) => (value ? formatLabel(String(value)) : "-"),
              },
              {
                key: "interaction_status",
                label: "Status",
                formatter: (value) => (value ? formatLabel(String(value)) : "-"),
              },
              {
                key: "offer_stage",
                label: "Workflow Stage",
                formatter: (value) => (value ? formatLabel(String(value)) : "-"),
              },
              { key: "occurred_at", label: "When", formatter: formatDate },
            ]}
          />
        ) : null}

        {activeTab === "buyerJourney" ? (
          <DataTable
            title={`${selectedCompany.label} Buyer Journey`}
            rows={commandJourneyRows}
            emptyLabel={selectedCompany.emptyStates.buyerJourney}
            columns={[
              {
                key: "journey_status",
                label: "Journey Status",
                formatter: (value) => (value ? formatLabel(String(value)) : "-"),
              },
              { key: "canonical_buyer_key", label: "Buyer" },
              { key: "purchase_count", label: "Purchases" },
              { key: "total_revenue", label: "Revenue" },
              { key: "last_event_at", label: "Last Touch", formatter: formatDate },
            ]}
          />
        ) : null}

        {activeTab === "offers" ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Offer Catalog</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCompany.offerCatalog.map((item) => (
                  <span key={item} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Lead Magnet Catalog</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCompany.leadMagnetCatalog.map((item) => (
                  <span key={item} className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <DataTable
              title={`${selectedCompany.label} Offer Activity`}
              rows={commandOfferRows}
              emptyLabel={selectedCompany.emptyStates.offers}
              columns={[
                {
                  key: "offer_id",
                  label: "Offer",
                  formatter: (value) => (value ? formatLabel(String(value)) : "-"),
                },
                {
                  key: "offer_stage",
                  label: "Stage",
                  formatter: (value) => (value ? formatLabel(String(value)) : "-"),
                },
                {
                  key: "presentation_status",
                  label: "Status",
                  formatter: (value) => (value ? formatLabel(String(value)) : "-"),
                },
                {
                  key: "lead_magnet_id",
                  label: "Lead Magnet",
                  formatter: (value) => (value ? formatLabel(String(value)) : "-"),
                },
                { key: "presented_at", label: "When", formatter: formatDate },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "campaigns" ? (
          <DataTable
            title={`${selectedCompany.label} Campaign Performance`}
            rows={commandCampaignRows}
            emptyLabel={selectedCompany.emptyStates.campaigns}
            columns={[
              {
                key: "campaign_id",
                label: "Campaign",
                formatter: (value) => (value ? String(value) : "-"),
              },
              {
                key: "platform",
                label: "Platform",
                formatter: (value) => (value ? String(value) : "-"),
              },
              {
                key: "event_name",
                label: "Signal",
                formatter: (value) => (value ? formatLabel(String(value)) : "-"),
              },
              { key: "adset_id", label: "Adset" },
              { key: "creative_id", label: "Creative" },
              { key: "created_at", label: "When", formatter: formatDate },
            ]}
          />
        ) : null}

        {activeTab === "revenue" ? (
          <section className="grid gap-4">
            <KpiCard
              label="Revenue Tracked"
              value={`$${formatMetric(universalMetrics.revenue_tracked)}`}
              hint={`${selectedCompany.label} tracked revenue in selected range`}
            />
            <DataTable
              title={`${selectedCompany.label} Revenue Activity`}
              rows={commandRevenueRows}
              emptyLabel={selectedCompany.emptyStates.revenue}
              columns={[
                {
                  key: "offer_id",
                  label: "Offer Stream",
                  formatter: (value) => (value ? formatLabel(String(value)) : (value as string | undefined) ?? "Revenue"),
                },
                {
                  key: "offer_stage",
                  label: "Stage",
                  formatter: (value) => (value ? formatLabel(String(value)) : "-"),
                },
                {
                  key: "amount",
                  label: "Amount",
                  formatter: (value) => (typeof value === "number" ? `$${value}` : value ? `$${value}` : "-"),
                },
                { key: "currency", label: "Currency" },
                { key: "status", label: "Status", formatter: (value) => (value ? formatLabel(String(value)) : "-") },
                { key: "created_at", label: "When", formatter: formatDate },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "learning" ? (
          <DataTable
            title={`${selectedCompany.label} Learning Log`}
            rows={commandLearningRows}
            emptyLabel={selectedCompany.emptyStates.learning}
            columns={[
              { key: "action", label: "Learning Action", formatter: (value) => (value ? formatLabel(String(value)) : "-") },
              { key: "business_goal", label: "Business Goal", formatter: (value) => (value ? formatLabel(String(value)) : "-") },
              { key: "offer_id", label: "Offer Context", formatter: (value) => (value ? formatLabel(String(value)) : "-") },
              { key: "lead_magnet_id", label: "Lead Magnet Context", formatter: (value) => (value ? formatLabel(String(value)) : "-") },
              { key: "occurred_at", label: "When", formatter: formatDate },
            ]}
          />
        ) : null}

        {activeTab === "workflows" ? (
          <section className="grid gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Workflows & Deliverables</h2>
              <p className="mt-1 text-sm text-gray-600">
                {selectedCompany.label} workflow groups and deliverable visibility.
              </p>
            </div>

            {workflowStatus.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">
                {selectedCompany.emptyStates.workflows}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {workflowStatus.map((workflow) => (
                  <WorkflowStatusCard key={workflow.workflowId} workflow={workflow} />
                ))}
              </div>
            )}

            {deliverableStatus.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {deliverableStatus.map((deliverable) => (
                  <DeliverableStatusCard key={deliverable.deliverableId} deliverable={deliverable} />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "systemHealth" ? (
          <section className="grid gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Smoke Checks</h3>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {smokeChecks.map((check) => (
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
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">System Status</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Identity Links" value={formatMetric(state.counts.buyer_identity_links)} />
                <KpiCard label="Buyer Journeys" value={formatMetric(state.counts.buyer_journeys)} />
                <KpiCard label="Lead Magnet Interactions" value={formatMetric(state.counts.lead_magnet_interactions)} />
                <KpiCard label="LLS Outcomes" value={formatMetric(state.counts.lls_outcome_events)} />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Debug / Helper Output</h3>
              {debugErrors.length === 0 ? (
                <p className="mt-2 text-sm text-gray-600">No query errors detected.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-red-700">
                  {debugErrors.map(([key, value]) => (
                    <li key={key}>
                      <span className="font-mono text-xs">{key}</span>: {value}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-gray-500">
                Technical table-key output is intentionally shown only in System Health debug.
              </p>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
