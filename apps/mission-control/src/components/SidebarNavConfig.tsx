import type { LucideIcon } from "lucide-react"
import {
  MessageSquareText,
  Shield,
  Users,
  BookOpen,
  Layers,
  Building2,
  BarChart3,
  Search,
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
  label: "Clients / Intake",
  caption: "Client records, intake answers, and brand identity",
  icon: MessageSquareText,
  overviewPath: "/intake",
  overviewLabel: "Intake overview",
  items: [
    { to: "/intake/users", label: "Users", icon: Building2, hint: "Tenant records tied to Telegram / portal" },
    { to: "/intake/clarifier", label: "Intake Clarifier", icon: MessageSquareText, hint: "Structured intake & clarifications" },
    { to: "/intake/brand-identity", label: "Brand Identity", icon: Shield, hint: "Full Brand Identity report (includes strategy)" },
  ],
}

export const audienceGroup: SidebarAgentGroup = {
  id: "audience-pools",
  label: "Audiences",
  caption: "Audience intelligence, pools, and ad testing",
  icon: Users,
  overviewPath: "/intake/audience-intelligence",
  overviewLabel: "Audience Intelligence",
  items: [
    { to: "/audience-pools", label: "Audience Pools", icon: Users, hint: "Build, rate, and test ad audiences" },
  ],
}

export const campaignAssemblyGroup: SidebarAgentGroup = {
  id: "ads-campaigns",
  label: "Campaigns",
  caption: "Paid channels, audience pools, and results",
  icon: Layers,
  overviewPath: "/ads-campaigns",
  overviewLabel: "All Campaigns",
  items: [
    { to: "/ads-campaigns/google", label: "Google Ads", icon: Search, hint: "Search and YouTube intent campaigns" },
    { to: "/ads-campaigns/facebook", label: "Facebook Ads", icon: Layers, hint: "Facebook placements through Meta Business Suite" },
    { to: "/ads-campaigns/instagram", label: "Instagram Ads", icon: Layers, hint: "Instagram placements through Meta Business Suite" },
    { to: "/ads-campaigns/tiktok", label: "TikTok Ads", icon: Layers, hint: "TikTok ad campaigns and creative tests" },
    { to: "/ads-campaigns/linkedin", label: "LinkedIn Ads", icon: Layers, hint: "LinkedIn B2B and authority campaigns" },
    { to: "/ads-campaigns/youtube", label: "YouTube Ads", icon: Layers, hint: "YouTube video and retargeting campaigns" },
  ],
}

export const ragIntelligenceGroup: SidebarAgentGroup = {
  id: "rag-copy-support",
  label: "RAG / Copy Support",
  caption: "Audience-informed content and ad copy support",
  icon: BookOpen,
  overviewPath: "/rag-copy-support",
  overviewLabel: "RAG / Copy Support",
  items: [],
}

export const platformGroup: SidebarAgentGroup = {
  id: "analytics-revenue",
  label: "Analytics & Revenue",
  caption: "Client analytics, conversions, and revenue signals",
  icon: BarChart3,
  overviewPath: "/analytics-revenue",
  overviewLabel: "Analytics & Revenue",
  items: [],
}

export const pipelineAgentGroups: SidebarAgentGroup[] = [
  intakeGroup,
  audienceGroup,
  campaignAssemblyGroup,
  ragIntelligenceGroup,
  platformGroup,
]

function itemPathMatches(pathname: string, itemTo: string): boolean {
  if (pathname === itemTo) return true
  if (pathname.startsWith(itemTo + "/")) return true
  return false
}

export function pathnameMatchesGroup(pathname: string, group: SidebarAgentGroup): boolean {
  if (pathname === group.overviewPath) return true
  if (group.id === "audience-pools" && (pathname.startsWith("/audience/") || pathname.startsWith("/intake/audience-intelligence"))) return true
  return group.items.some((item) => itemPathMatches(pathname, item.to))
}
