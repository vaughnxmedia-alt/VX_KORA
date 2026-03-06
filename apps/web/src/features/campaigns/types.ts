/** Campaign status lifecycle */
export type CampaignStatus =
  | "Draft"
  | "In Production"
  | "Live"
  | "Optimizing"
  | "Completed";

/** Campaign type (Marketing, PR, or both) */
export type CampaignType = "Marketing" | "PR" | "Hybrid";

/** Template types for campaign creation and templates drawer */
export type CampaignTemplateType =
  | "Full Campaign Launch Blueprint"
  | "Product Launch War Room"
  | "Content Series Builder"
  | "30-Day Content Calendar";

/** Channel groups for distribution */
export interface CampaignChannels {
  organic: ChannelEntry[];
  paid: ChannelEntry[];
  owned: ChannelEntry[];
  partnerships: ChannelEntry[];
}

export interface ChannelEntry {
  id: string;
  name: string;
  enabled: boolean;
  notes: string;
  ownerId: string | null;
}

/** Foundation tab data */
export interface CampaignFoundation {
  campaignName: string;
  objective: "Awareness" | "Leads" | "Sales" | "Authority" | "Community";
  primaryKpi: string;
  timelineStart: string;
  timelineEnd: string;
  budget: string;
  targetAudience: string;
  coreMessage: string;
  offerCta: string;
}

/** Positioning tab data */
export interface CampaignPositioning {
  coreAngle: string;
  hookVariations: string[];
  emotionalDrivers: string[];
  objectionHandling: string[];
  competitiveDifferentiator: string;
}

/** Asset checklist item status */
export type AssetStatus = "Not started" | "In progress" | "Done";

export interface ContentAssetItem {
  id: string;
  name: string;
  status: AssetStatus;
}

/** Assets tab data */
export interface CampaignAssets {
  contentAssets: ContentAssetItem[];
  fonts: string;
  colorScheme: string;
  photoDirection: string;
  bRollStyle: string;
  moodReferences: string;
}

/** Timeline phase */
export interface TimelinePhase {
  id: string;
  name: string;
  start: string;
  end: string;
  notes: string;
}

/** Timeline tab data */
export interface CampaignTimeline {
  phases: TimelinePhase[];
}

/** Budget tab data */
export interface CampaignBudget {
  adSpend: string;
  influencerFees: string;
  productionCosts: string;
  toolsSaas: string;
  prCosts: string;
  cpl: string;
  cpa: string;
  roas: string;
  engagementRate: string;
}

/** Analytics tab data */
export interface CampaignAnalytics {
  traffic: string;
  conversionRate: string;
  engagement: string;
  emailOpenRate: string;
  leadQuality: string;
  revenueAttribution: string;
}

/** Optimization checklist item */
export interface OptimizationItem {
  id: string;
  label: string;
  done: boolean;
}

/** Optimization tab data */
export interface CampaignOptimization {
  items: OptimizationItem[];
}

/** PR tab - story angle */
export interface StoryAngleItem {
  id: string;
  type: "hook" | "timely" | "cultural" | "human-interest" | "data-backed";
  value: string;
}

/** Press materials checklist */
export interface PressMaterialItem {
  id: string;
  name: string;
  done: boolean;
}

/** Outlet category */
export type OutletCategory =
  | "Local"
  | "Regional"
  | "National"
  | "Podcasts"
  | "Digital Publications";

/** Pitch status */
export type PitchStatus =
  | "Not pitched"
  | "Pitched"
  | "Follow-up 1"
  | "Follow-up 2"
  | "Responded"
  | "Booked"
  | "Published"
  | "No response";

export interface MediaOutlet {
  id: string;
  name: string;
  category: OutletCategory;
  status: PitchStatus;
  lastContacted: string;
  nextFollowUp: string;
  notes: string;
}

/** PR tab data */
export interface CampaignPR {
  objective:
    | "awareness"
    | "thought leadership"
    | "crisis"
    | "reputation shift"
    | "event amplification";
  storyAngles: StoryAngleItem[];
  pressMaterials: PressMaterialItem[];
  outlets: MediaOutlet[];
  influencerAmplification: string[];
  eventsLayer: string[];
  crisisRiskAssessment: string;
  preDraftedResponses: string;
  monitoringTools: string;
  socialListening: string;
  commentProtocol: string;
  placements: string;
  backlinks: string;
  domainAuthority: string;
  mentions: string;
  socialGrowth: string;
  shareOfVoice: string;
  sentiment: string;
}

/** Default channel names by group */
export const DEFAULT_ORGANIC_CHANNELS = [
  "Instagram",
  "TikTok",
  "LinkedIn",
  "Threads",
  "YouTube",
  "Pinterest",
];
export const DEFAULT_PAID_CHANNELS = [
  "Meta Ads",
  "Google Ads",
  "TikTok Ads",
  "YouTube Ads",
  "LinkedIn Ads",
];
export const DEFAULT_OWNED_CHANNELS = ["Email list", "SMS", "Website", "Blog"];
export const DEFAULT_PARTNERSHIP_CHANNELS = [
  "Influencers",
  "Collaborations",
  "Affiliates",
  "Community leaders",
];

/** Full campaign model (mock; no persistence) */
export interface Campaign {
  id: string;
  orgId: string;
  name: string;
  status: CampaignStatus;
  type: CampaignType;
  createdAt: string;
  updatedAt: string;
  fromBoardId?: string;
  assignedUserIds: string[];
  templateType: CampaignTemplateType | null;
  channels: CampaignChannels;
  foundation: CampaignFoundation;
  positioning: CampaignPositioning;
  assets: CampaignAssets;
  timeline: CampaignTimeline;
  budget: CampaignBudget;
  analytics: CampaignAnalytics;
  optimization: CampaignOptimization;
  pr: CampaignPR;
}

/** Whiteboard connection item (read-only in UI) */
export interface WhiteboardConnection {
  id: string;
  title: string;
  boardId?: string;
}
