import { audienceProfilesMock } from "./mockData";
import type { AudienceProfile, AudienceType, AudienceStatus } from "./types";

const KEY = "kora.audience.customProfiles";

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function loadCustomAudienceProfiles(): AudienceProfile[] {
  if (typeof window === "undefined") return [];
  return safeJsonParse<AudienceProfile[]>(window.localStorage.getItem(KEY), []);
}

export function saveCustomAudienceProfiles(profiles: AudienceProfile[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(profiles));
}

export function createCustomAudienceProfile(input: {
  audienceName: string;
  clientId: string;
  clientName: string;
  linkedAsset: string;
  linkedAssetType: "product" | "service" | "offer" | "campaign";
  audienceCategory: string;
  description: string;
  primaryGoal: string;
  notes?: string;
  audienceType: AudienceType;
  baseAudienceId?: string;
  createdBy: string;
}): AudienceProfile {
  const now = new Date().toISOString();
  const status: AudienceStatus = "draft";
  const base = input.baseAudienceId
    ? [...audienceProfilesMock, ...loadCustomAudienceProfiles()].find((p) => p.id === input.baseAudienceId)
    : undefined;

  return {
    id: `aud-custom-${Date.now()}`,
    clientId: input.clientId,
    clientName: input.clientName,
    audienceName: input.audienceName,
    linkedAsset: input.linkedAsset,
    linkedAssetType: input.linkedAssetType,
    audienceCategory: input.audienceCategory,
    description: input.description,
    status,
    audienceType: input.audienceType,
    segments: base?.segments || [],
    personas: base?.personas || [],
    platformIntelligence: base?.platformIntelligence || [],
    psychology: base?.psychology || {
      motivations: [],
      fears: [],
      trustDrivers: [],
      emotionalTriggers: [],
      buyingBarriers: [],
    },
    coreProfile: base?.coreProfile || {
      demographics: input.notes || "",
      psychographics: "",
      behaviors: "",
      motivations: input.primaryGoal,
      painPoints: "",
      objections: "",
      buyingTriggers: "",
      desiredTransformation: "",
    },
    contentInsights: base?.contentInsights || {
      hooks: [],
      storyAngles: [],
      educationalThemes: [],
      trustBuilding: [],
      conversionContent: [],
      contentToAvoid: [],
    },
    messagingGuidance: base?.messagingGuidance || {
      resonantLanguage: [],
      trustedWords: [],
      turnOffLanguage: [],
      toneDirection: "",
      positioningNotes: "",
      ctaSuggestions: [],
    },
    analysisRun: {
      generatedBy: "Audience Intelligence Agent",
      triggeredBy: "manual_run",
      sourceInputsUsed: ["Custom audience form"],
      analysisDate: now,
      lastRunAt: now,
      confidenceLevel: base?.confidenceScore || 0,
      humanEdited: true,
      needsReview: true,
      runVersion: 1,
    },
    confidenceScore: base?.confidenceScore || 0,
    completenessScore: base?.completenessScore || 15,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
}
