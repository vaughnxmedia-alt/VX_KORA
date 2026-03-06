import type {
  Campaign,
  CampaignChannels,
  CampaignFoundation,
  CampaignPositioning,
  CampaignAssets,
  CampaignTimeline,
  CampaignBudget,
  CampaignAnalytics,
  CampaignOptimization,
  CampaignPR,
  CampaignTemplateType,
} from "../types";
import {
  DEFAULT_ORGANIC_CHANNELS,
  DEFAULT_PAID_CHANNELS,
  DEFAULT_OWNED_CHANNELS,
  DEFAULT_PARTNERSHIP_CHANNELS,
} from "../types";

function channelId(group: string, name: string, i: number): string {
  return `ch-${group}-${i}-${name.replace(/\s+/g, "-").toLowerCase()}`;
}

function buildChannels(): CampaignChannels {
  return {
    organic: DEFAULT_ORGANIC_CHANNELS.map((name, i) => ({
      id: channelId("organic", name, i),
      name,
      enabled: false,
      notes: "",
      ownerId: null,
    })),
    paid: DEFAULT_PAID_CHANNELS.map((name, i) => ({
      id: channelId("paid", name, i),
      name,
      enabled: false,
      notes: "",
      ownerId: null,
    })),
    owned: DEFAULT_OWNED_CHANNELS.map((name, i) => ({
      id: channelId("owned", name, i),
      name,
      enabled: false,
      notes: "",
      ownerId: null,
    })),
    partnerships: DEFAULT_PARTNERSHIP_CHANNELS.map((name, i) => ({
      id: channelId("partnerships", name, i),
      name,
      enabled: false,
      notes: "",
      ownerId: null,
    })),
  };
}

const DEFAULT_PHASES = [
  { id: "p1", name: "Pre-launch", start: "", end: "", notes: "" },
  { id: "p2", name: "Tease", start: "", end: "", notes: "" },
  { id: "p3", name: "Launch day", start: "", end: "", notes: "" },
  { id: "p4", name: "Sustain", start: "", end: "", notes: "" },
  { id: "p5", name: "Retargeting", start: "", end: "", notes: "" },
  { id: "p6", name: "Post-campaign recap", start: "", end: "", notes: "" },
];

const CONTENT_ASSET_NAMES = [
  "Reels/Shorts",
  "Carousels",
  "Static",
  "Email sequence",
  "Landing page",
  "Ad creatives",
  "Blog",
  "Press kit",
  "Case study",
];

const PRESS_MATERIAL_NAMES = [
  "Press release",
  "Pitch email",
  "Bio",
  "Fact sheet",
  "High-res images",
  "B-roll",
  "Quote sheet",
  "FAQ",
];

const OPTIMIZATION_LABELS = [
  "A/B testing",
  "Creative iteration",
  "Messaging shift",
  "Budget reallocation",
  "Audience refinement",
];

export interface CreateDefaultCampaignOverrides {
  id?: string;
  orgId?: string;
  name?: string;
  fromBoardId?: string;
  assignedUserIds?: string[];
  templateType?: CampaignTemplateType | null;
  type?: Campaign["type"];
}

export function createDefaultCampaign(overrides: CreateDefaultCampaignOverrides = {}): Campaign {
  const now = new Date().toISOString();
  const id =
    overrides.id ?? `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const foundation: CampaignFoundation = {
    campaignName: overrides.name ?? "Untitled Campaign",
    objective: "Awareness",
    primaryKpi: "",
    timelineStart: "",
    timelineEnd: "",
    budget: "",
    targetAudience: "",
    coreMessage: "",
    offerCta: "",
  };
  const positioning: CampaignPositioning = {
    coreAngle: "",
    hookVariations: [],
    emotionalDrivers: [],
    objectionHandling: [],
    competitiveDifferentiator: "",
  };
  const assets: CampaignAssets = {
    contentAssets: CONTENT_ASSET_NAMES.map((name, i) => ({
      id: `asset-${i}-${name.replace(/\s+/g, "-").toLowerCase()}`,
      name,
      status: "Not started" as const,
    })),
    fonts: "",
    colorScheme: "",
    photoDirection: "",
    bRollStyle: "",
    moodReferences: "",
  };
  const timeline: CampaignTimeline = {
    phases: DEFAULT_PHASES.map((p) => ({ ...p, id: `${id}-${p.id}` })),
  };
  const budget: CampaignBudget = {
    adSpend: "",
    influencerFees: "",
    productionCosts: "",
    toolsSaas: "",
    prCosts: "",
    cpl: "",
    cpa: "",
    roas: "",
    engagementRate: "",
  };
  const analytics: CampaignAnalytics = {
    traffic: "",
    conversionRate: "",
    engagement: "",
    emailOpenRate: "",
    leadQuality: "",
    revenueAttribution: "",
  };
  const optimization: CampaignOptimization = {
    items: OPTIMIZATION_LABELS.map((label, i) => ({
      id: `opt-${i}`,
      label,
      done: false,
    })),
  };
  const pr: CampaignPR = {
    objective: "awareness",
    storyAngles: [],
    pressMaterials: PRESS_MATERIAL_NAMES.map((name, i) => ({
      id: `press-${i}`,
      name,
      done: false,
    })),
    outlets: [],
    influencerAmplification: [],
    eventsLayer: [],
    crisisRiskAssessment: "",
    preDraftedResponses: "",
    monitoringTools: "",
    socialListening: "",
    commentProtocol: "",
    placements: "",
    backlinks: "",
    domainAuthority: "",
    mentions: "",
    socialGrowth: "",
    shareOfVoice: "",
    sentiment: "",
  };

  return {
    id,
    orgId: overrides.orgId ?? "org-1",
    name: overrides.name ?? "Untitled Campaign",
    status: "Draft",
    type: overrides.type ?? "Marketing",
    createdAt: now,
    updatedAt: now,
    fromBoardId: overrides.fromBoardId,
    assignedUserIds: overrides.assignedUserIds ?? [],
    templateType: overrides.templateType ?? null,
    channels: buildChannels(),
    foundation,
    positioning,
    assets,
    timeline,
    budget,
    analytics,
    optimization,
    pr,
  };
}
