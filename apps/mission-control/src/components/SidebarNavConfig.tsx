import type { LucideIcon } from "lucide-react"
import {
  MessageSquareText,
  Shield,
  Users,
  Search,
  Cpu,
  Rss,
  PlayCircle,
  Database,
  Sparkles,
  ListTodo,
  BookOpen,
  GitBranch,
  Layers,
  Send,
  Building2,
  Filter,
  History,
  Activity,
  SlidersHorizontal,
  PenTool,
} from "lucide-react"

/** One link in the sidebar; `hint` is surfaced as a tooltip (deliverable focus). */
export interface SidebarNavLeaf {
  to: string
  label: string
  icon: LucideIcon
  hint?: string
}

export interface SidebarAgentGroup {
  id: string
  label: string
  /** Short line under the group name in the collapsed row */
  caption: string
  icon: LucideIcon
  /** "Overview" for this section (intake hub or agent dashboard) */
  overviewPath: string
  overviewLabel?: string
  items: SidebarNavLeaf[]
}

export const intakeGroup: SidebarAgentGroup = {
  id: "intake-clarifier",
  label: "Intake Clarifier",
  caption: "Profiles, clarifying Q&A, onboarding handoff",
  icon: MessageSquareText,
  overviewPath: "/intake",
  overviewLabel: "Intake overview",
  items: [
    { to: "/intake/users", label: "Users", icon: Building2, hint: "Tenant records tied to Telegram / portal" },
    { to: "/intake/clarifier", label: "Intake Clarifier", icon: MessageSquareText, hint: "Structured intake & clarifications" },
    { to: "/intake/brand-identity", label: "Brand Identity", icon: Shield, hint: "Full Brand Identity report (includes strategy)" },
    { to: "/intake/audience-intelligence", label: "Audiences", icon: Users, hint: "Audience analyses feeding strategy" },
  ],
}

export const sourceDiscoveryGroup: SidebarAgentGroup = {
  id: "source-discovery",
  label: "Source Discovery",
  caption: "Find and rank candidate sources before approval",
  icon: Search,
  overviewPath: "/agents/source-discovery",
  overviewLabel: "Agent dashboard",
  items: [
    {
      to: "/agents/source-discovery",
      label: "Agent dashboard",
      icon: Search,
      hint: "Discover RSS, channels, pages, and links matched to strategy",
    },
    {
      to: "/core/sources",
      label: "Sources catalog",
      icon: Rss,
      hint: "Configure and manage source endpoints",
    },
  ],
}

export const sourceProcessingGroup: SidebarAgentGroup = {
  id: "source-processing",
  label: "Source Processing",
  caption: "Ingest, normalize, and land intelligence in the pool",
  icon: Cpu,
  overviewPath: "/agents/source-processing",
  overviewLabel: "Agent dashboard",
  items: [
    {
      to: "/agents/source-processing",
      label: "Agent dashboard",
      icon: Cpu,
      hint: "Scrape, transcribe, translate, chunk — items ready for pool / RAG",
    },
    {
      to: "/core/ingest-runs",
      label: "Ingest runs",
      icon: PlayCircle,
      hint: "Trigger and review pipeline runs",
    },
    {
      to: "/core/intelligence-pool",
      label: "Intelligence pool",
      icon: Database,
      hint: "Global pool of processed intelligence items",
    },
  ],
}

export const contentStrategyGroup: SidebarAgentGroup = {
  id: "content-strategy",
  label: "Content Strategy",
  caption: "Strategies, enrichment, and brief-ready outputs",
  icon: PenTool,
  overviewPath: "/agents/content-strategy",
  overviewLabel: "Agent dashboard",
  items: [
    {
      to: "/agents/content-strategy",
      label: "Agent dashboard",
      icon: PenTool,
      hint: "Strategy objects and Telegram-ready briefings",
    },
    {
      to: "/core/enrichment",
      label: "Enrichment queue",
      icon: Sparkles,
      hint: "Make Me Smarter and enrichment types",
    },
    {
      to: "/core/events-queue",
      label: "Events queue",
      icon: ListTodo,
      hint: "Events discovered and pushed toward strategy / Telegram",
    },
  ],
}

export const campaignAssemblyGroup: SidebarAgentGroup = {
  id: "campaign-assembly",
  label: "Campaign Assembly",
  caption: "Campaign options and audience-facing handoff",
  icon: Layers,
  overviewPath: "/agents/campaign-assembly",
  overviewLabel: "Agent dashboard",
  items: [
    {
      to: "/agents/campaign-assembly",
      label: "Agent dashboard",
      icon: Layers,
      hint: "Campaign strategy options on the main site",
    },
    {
      to: "/audience/queue",
      label: "Audience queue",
      icon: Users,
      hint: "Audience runs and deep insights jobs",
    },
  ],
}

export const ragIntelligenceGroup: SidebarAgentGroup = {
  id: "rag-intelligence",
  label: "RAG Intelligence",
  caption: "Tenant chunks and Creative Hub / bot grounding",
  icon: BookOpen,
  overviewPath: "/agents/rag-intelligence",
  overviewLabel: "Agent dashboard",
  items: [
    {
      to: "/agents/rag-intelligence",
      label: "Agent dashboard",
      icon: BookOpen,
      hint: "Embeddings, usage, and RAG health",
    },
    {
      to: "/core/tenant-rag",
      label: "Tenant RAG",
      icon: GitBranch,
      hint: "Per-customer documents in kora_tenant_rag_documents",
    },
  ],
}

/** Telegram: delivery agent plus routing, approvals, and filters. */
export const telegramSystemGroup: SidebarAgentGroup = {
  id: "telegram-system",
  label: "Telegram System",
  caption: "Delivery agent, preferences, approvals, filters",
  icon: Send,
  overviewPath: "/agents/telegram-delivery",
  overviewLabel: "Telegram Delivery",
  items: [
    {
      to: "/telegram-preferences",
      label: "Preferences & schedule",
      icon: SlidersHorizontal,
      hint: "Frequency, timezone, content toggles",
    },
    {
      to: "/approval-history",
      label: "Approval history",
      icon: History,
      hint: "Source and content approvals from Telegram",
    },
    {
      to: "/intelligence-filters",
      label: "Intelligence filters",
      icon: Filter,
      hint: "Tenant routing and “Make me smarter” defaults",
    },
  ],
}

export const platformGroup: SidebarAgentGroup = {
  id: "platform-ops",
  label: "Platform",
  caption: "Cross-agent health and legacy core hub",
  icon: Activity,
  overviewPath: "/core",
  overviewLabel: "Core hub",
  items: [
    {
      to: "/core/health",
      label: "Health & logs",
      icon: Activity,
      hint: "System health and operational logs",
    },
  ],
}

export const pipelineAgentGroups: SidebarAgentGroup[] = [
  intakeGroup,
  sourceDiscoveryGroup,
  sourceProcessingGroup,
  contentStrategyGroup,
  campaignAssemblyGroup,
  ragIntelligenceGroup,
  telegramSystemGroup,
  platformGroup,
]

function itemPathMatches(pathname: string, itemTo: string): boolean {
  if (pathname === itemTo) return true
  if (pathname.startsWith(itemTo + "/")) return true
  return false
}

export function pathnameMatchesGroup(pathname: string, group: SidebarAgentGroup): boolean {
  if (pathname === group.overviewPath) return true
  if (group.id === "campaign-assembly" && pathname.startsWith("/audience/")) return true
  return group.items.some((item) => itemPathMatches(pathname, item.to))
}
