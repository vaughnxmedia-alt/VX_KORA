import type { AudienceLifecycleStatus as AudienceStatus, AudienceType } from "@kora/sdk";

export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  painPoint: string;
  whyTheyFollow: string;
  whyTheyHesitate: string;
  buyingMotivation: string;
  bestContentAngle: string;
  bestCta: string;
}

export interface AudiencePersona {
  id: string;
  name: string;
  roleTitle: string;
  stageOfBusiness: string;
  goals: string[];
  fears: string[];
  objections: string[];
  platformsUsed: string[];
  resonantMessaging: string[];
  offerFit: string;
}

export interface PlatformInsight {
  platform: "Instagram" | "TikTok" | "LinkedIn" | "Facebook" | "YouTube" | "Email";
  relevanceScore: number;
  bestContentType: string;
  toneStyle: string;
  conversionRole: string;
}

export interface AudiencePsychology {
  motivations: string[];
  fears: string[];
  trustDrivers: string[];
  emotionalTriggers: string[];
  buyingBarriers: string[];
}

export interface ContentInsight {
  hooks: string[];
  storyAngles: string[];
  educationalThemes: string[];
  trustBuilding: string[];
  conversionContent: string[];
  contentToAvoid: string[];
}

export interface AudienceAnalysisRun {
  generatedBy: "Audience Intelligence Agent";
  triggeredBy: "intake" | "brand_strategy_session" | "manual_run";
  sourceInputsUsed: string[];
  analysisDate: string;
  lastRunAt: string;
  confidenceLevel: number;
  humanEdited: boolean;
  needsReview: boolean;
  runVersion: number;
}

export interface AudienceCoreProfile {
  demographics: string;
  psychographics: string;
  behaviors: string;
  motivations: string;
  painPoints: string;
  objections: string;
  buyingTriggers: string;
  desiredTransformation: string;
}

export interface AudienceMessagingGuidance {
  resonantLanguage: string[];
  trustedWords: string[];
  turnOffLanguage: string[];
  toneDirection: string;
  positioningNotes: string;
  ctaSuggestions: string[];
}

export interface AudienceProfile {
  id: string;
  clientId: string;
  clientName: string;
  audienceName: string;
  linkedAsset: string;
  linkedAssetType: "product" | "service" | "offer" | "campaign";
  audienceCategory: string;
  description: string;
  status: AudienceStatus;
  audienceType: AudienceType;
  segments: AudienceSegment[];
  personas: AudiencePersona[];
  platformIntelligence: PlatformInsight[];
  psychology: AudiencePsychology;
  coreProfile: AudienceCoreProfile;
  contentInsights: ContentInsight;
  messagingGuidance: AudienceMessagingGuidance;
  analysisRun: AudienceAnalysisRun;
  confidenceScore: number;
  completenessScore: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AudienceFilters {
  clientId: string;
  status: "all" | AudienceStatus;
  audienceType: "all" | AudienceType;
}
