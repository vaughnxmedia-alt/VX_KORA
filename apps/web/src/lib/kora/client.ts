/**
 * K.O.R.A Client-Side Service
 * 
 * Client-side functions for interacting with the KORA backend.
 * All requests go through server-side API routes that resolve tenant context.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  RequestContentStrategyRequest,
  RequestContentStrategyResponse,
  RequestCampaignRequest,
  RequestCampaignResponse,
  ContentStrategyOutput,
  CampaignOutput,
  KoraErrorResponse,
  ContentStrategiesListResponse,
  CampaignsListResponse,
} from "./types";

const API_BASE = "/api/kora";

// Mock data for development when tables are not ready
const MOCK_STRATEGIES: ContentStrategyOutput[] = [
  {
    id: "mock-strategy-001",
    tenant_id: "mock-tenant-001",
    request_id: "mock-request-001",
    status: "completed",
    title: "Q1 2026 Social Media Strategy",
    summary: "A comprehensive content strategy focused on brand awareness and engagement across Instagram and LinkedIn.",
    platforms: ["instagram", "linkedin"],
    goals: ["brand_awareness", "engagement", "lead_generation"],
    window: { days: 30 },
    content_pillars: [
      {
        id: "pillar-1",
        name: "Thought Leadership",
        description: "Industry insights and expert commentary",
        percentage: 30,
        example_topics: ["Industry trends", "Expert interviews", "Case studies"],
      },
      {
        id: "pillar-2",
        name: "Brand Culture",
        description: "Behind-the-scenes and team highlights",
        percentage: 25,
        example_topics: ["Team spotlights", "Office culture", "Company values"],
      },
      {
        id: "pillar-3",
        name: "Educational Content",
        description: "Tips, tutorials, and how-to guides",
        percentage: 30,
        example_topics: ["Quick tips", "Step-by-step guides", "FAQ answers"],
      },
      {
        id: "pillar-4",
        name: "Promotional",
        description: "Product/service highlights and offers",
        percentage: 15,
        example_topics: ["New features", "Client success stories", "Special offers"],
      },
    ],
    weekly_themes: [
      { week_number: 1, theme: "Brand Introduction", focus_pillar: "Brand Culture" },
      { week_number: 2, theme: "Industry Deep Dive", focus_pillar: "Thought Leadership" },
      { week_number: 3, theme: "Education Week", focus_pillar: "Educational Content" },
      { week_number: 4, theme: "Value Showcase", focus_pillar: "Promotional" },
    ],
    post_cadence: {
      posts_per_week: 5,
      platform_breakdown: { instagram: 3, linkedin: 2 },
      best_posting_times: {
        instagram: ["9:00 AM", "12:00 PM", "6:00 PM"],
        linkedin: ["8:00 AM", "12:00 PM"],
      },
    },
    key_messages: [
      "Innovation meets reliability",
      "Your success is our mission",
      "Building the future together",
    ],
    hashtag_strategy: {
      branded: ["#YourBrand", "#BrandTagline"],
      industry: ["#Marketing", "#DigitalStrategy"],
      trending_relevant: ["#ContentCreation", "#SocialMediaTips"],
      niche: ["#PRStrategy", "#BrandBuilding"],
    },
    created_at: "2026-02-01T10:00:00Z",
    updated_at: "2026-02-01T12:00:00Z",
    completed_at: "2026-02-01T12:00:00Z",
  },
  {
    id: "mock-strategy-002",
    tenant_id: "mock-tenant-001",
    request_id: "mock-request-002",
    status: "processing",
    title: "Product Launch Campaign Strategy",
    summary: "Strategic content plan for upcoming product launch.",
    platforms: ["instagram", "twitter", "tiktok"],
    goals: ["product_launch", "awareness", "engagement"],
    window: { days: 14 },
    created_at: "2026-02-18T14:00:00Z",
    updated_at: "2026-02-18T14:05:00Z",
  },
];

const MOCK_CAMPAIGNS: CampaignOutput[] = [
  {
    id: "mock-campaign-001",
    tenant_id: "mock-tenant-001",
    request_id: "mock-campaign-req-001",
    content_strategy_id: "mock-strategy-001",
    status: "completed",
    platform: "instagram",
    objective: "awareness",
    title: "Brand Awareness Instagram Series",
    posts: [
      {
        id: "post-1",
        sequence_number: 1,
        scheduled_date: "2026-02-20",
        caption: "Introducing a new way to think about your brand. Every detail matters. Every story counts.",
        hashtags: ["#BrandStory", "#Marketing", "#Innovation"],
        media_suggestions: [
          { type: "image", description: "Hero brand image with logo overlay", dimensions: "1080x1080" },
        ],
        cta: "Learn more at the link in bio",
      },
      {
        id: "post-2",
        sequence_number: 2,
        scheduled_date: "2026-02-22",
        caption: "Behind every great brand is a team that believes in the vision. Meet the people making it happen.",
        hashtags: ["#TeamSpotlight", "#BehindTheScenes", "#CompanyCulture"],
        media_suggestions: [
          { type: "carousel", description: "Team member portraits with quote overlays", dimensions: "1080x1080" },
        ],
        cta: "Tag someone who inspires you",
      },
      {
        id: "post-3",
        sequence_number: 3,
        scheduled_date: "2026-02-24",
        caption: "Your brand deserves more than templates. It deserves a strategy built around your unique story.",
        hashtags: ["#BrandStrategy", "#ContentMarketing", "#Growth"],
        media_suggestions: [
          { type: "reel", description: "Quick tips video with text overlays", dimensions: "1080x1920", duration_seconds: 30 },
        ],
        cta: "Save this for later",
      },
    ],
    created_at: "2026-02-15T10:00:00Z",
    updated_at: "2026-02-15T11:00:00Z",
    completed_at: "2026-02-15T11:00:00Z",
  },
];

// Check if we're in mock mode
const isMockMode = (): boolean => {
  return import.meta.env.VITE_KORA_MOCK_MODE === "true" || 
         import.meta.env.MODE === "development";
};

/**
 * Get the current access token from Supabase session
 */
async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as KoraErrorResponse).error || "Request failed");
  }

  return data as T;
}

/**
 * Request a new content strategy from KORA
 */
export async function requestContentStrategy(
  request: RequestContentStrategyRequest
): Promise<RequestContentStrategyResponse> {
  if (isMockMode()) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      success: true,
      event_id: `mock-event-${Date.now()}`,
      request_id: `mock-request-${Date.now()}`,
      message: "Content strategy request queued successfully (mock mode)",
    };
  }

  return apiRequest<RequestContentStrategyResponse>("/request-content-strategy", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Request a new campaign from KORA
 */
export async function requestCampaign(
  request: RequestCampaignRequest
): Promise<RequestCampaignResponse> {
  if (isMockMode()) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      success: true,
      event_id: `mock-event-${Date.now()}`,
      request_id: `mock-request-${Date.now()}`,
      message: "Campaign request queued successfully (mock mode)",
    };
  }

  return apiRequest<RequestCampaignResponse>("/request-campaign", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/**
 * Get list of content strategies for the current tenant
 */
export async function getContentStrategies(): Promise<ContentStrategiesListResponse> {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      strategies: MOCK_STRATEGIES,
      total: MOCK_STRATEGIES.length,
    };
  }

  const { data, error } = await supabase
    .from("content_strategies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Transform database rows to ContentStrategyOutput
  const strategies: ContentStrategyOutput[] = (data || []).map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    request_id: row.request_id || "",
    status: row.status as ContentStrategyOutput["status"],
    title: row.title,
    summary: row.summary || undefined,
    platforms: row.platforms || [],
    goals: row.goals || [],
    window: { days: row.window_days as 7 | 14 | 30 | 60 | 90 },
    ...(row.output_json as Record<string, unknown> || {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at || undefined,
  }));

  return {
    strategies,
    total: strategies.length,
  };
}

/**
 * Get a single content strategy by ID
 */
export async function getContentStrategy(id: string): Promise<ContentStrategyOutput | null> {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_STRATEGIES.find((s) => s.id === id) || null;
  }

  const { data, error } = await supabase
    .from("content_strategies")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    request_id: data.request_id || "",
    status: data.status as ContentStrategyOutput["status"],
    title: data.title,
    summary: data.summary || undefined,
    platforms: data.platforms || [],
    goals: data.goals || [],
    window: { days: data.window_days as 7 | 14 | 30 | 60 | 90 },
    ...(data.output_json as Record<string, unknown> || {}),
    created_at: data.created_at,
    updated_at: data.updated_at,
    completed_at: data.completed_at || undefined,
  };
}

/**
 * Get list of campaigns for the current tenant
 */
export async function getCampaigns(): Promise<CampaignsListResponse> {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      campaigns: MOCK_CAMPAIGNS,
      total: MOCK_CAMPAIGNS.length,
    };
  }

  const { data, error } = await supabase
    .from("campaign_outputs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Transform database rows to CampaignOutput
  const campaigns: CampaignOutput[] = (data || []).map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    request_id: row.request_id || "",
    content_strategy_id: row.content_strategy_id || "",
    status: row.status as CampaignOutput["status"],
    platform: row.platform,
    objective: row.objective as CampaignOutput["objective"],
    title: row.title,
    posts: (row.output_json as { posts?: CampaignOutput["posts"] })?.posts,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at || undefined,
  }));

  return {
    campaigns,
    total: campaigns.length,
  };
}

/**
 * Get campaigns for a specific content strategy
 */
export async function getCampaignsByStrategy(
  contentStrategyId: string
): Promise<CampaignsListResponse> {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const filtered = MOCK_CAMPAIGNS.filter(
      (c) => c.content_strategy_id === contentStrategyId
    );
    return {
      campaigns: filtered,
      total: filtered.length,
    };
  }

  const { data, error } = await supabase
    .from("campaign_outputs")
    .select("*")
    .eq("content_strategy_id", contentStrategyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const campaigns: CampaignOutput[] = (data || []).map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    request_id: row.request_id || "",
    content_strategy_id: row.content_strategy_id || "",
    status: row.status as CampaignOutput["status"],
    platform: row.platform,
    objective: row.objective as CampaignOutput["objective"],
    title: row.title,
    posts: (row.output_json as { posts?: CampaignOutput["posts"] })?.posts,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at || undefined,
  }));

  return {
    campaigns,
    total: campaigns.length,
  };
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(id: string): Promise<CampaignOutput | null> {
  if (isMockMode()) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_CAMPAIGNS.find((c) => c.id === id) || null;
  }

  const { data, error } = await supabase
    .from("campaign_outputs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    request_id: data.request_id || "",
    content_strategy_id: data.content_strategy_id || "",
    status: data.status as CampaignOutput["status"],
    platform: data.platform,
    objective: data.objective as CampaignOutput["objective"],
    title: data.title,
    posts: (data.output_json as { posts?: CampaignOutput["posts"] })?.posts,
    created_at: data.created_at,
    updated_at: data.updated_at,
    completed_at: data.completed_at || undefined,
  };
}

/**
 * Subscribe to real-time updates for content strategies
 */
export function subscribeToStrategies(
  callback: (strategy: ContentStrategyOutput) => void
): () => void {
  if (isMockMode()) {
    return () => {};
  }

  const channel = supabase
    .channel("content_strategies_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "content_strategies",
      },
      (payload) => {
        if (payload.new) {
          const row = payload.new as Record<string, unknown>;
          callback({
            id: row.id as string,
            tenant_id: row.tenant_id as string,
            request_id: (row.request_id as string) || "",
            status: row.status as ContentStrategyOutput["status"],
            title: row.title as string,
            summary: (row.summary as string) || undefined,
            platforms: (row.platforms as string[]) || [],
            goals: (row.goals as string[]) || [],
            window: { days: row.window_days as 7 | 14 | 30 | 60 | 90 },
            ...(row.output_json as Record<string, unknown> || {}),
            created_at: row.created_at as string,
            updated_at: row.updated_at as string,
            completed_at: (row.completed_at as string) || undefined,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to real-time updates for campaigns
 */
export function subscribeToCampaigns(
  callback: (campaign: CampaignOutput) => void
): () => void {
  if (isMockMode()) {
    return () => {};
  }

  const channel = supabase
    .channel("campaign_outputs_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "campaign_outputs",
      },
      (payload) => {
        if (payload.new) {
          const row = payload.new as Record<string, unknown>;
          callback({
            id: row.id as string,
            tenant_id: row.tenant_id as string,
            request_id: (row.request_id as string) || "",
            content_strategy_id: (row.content_strategy_id as string) || "",
            status: row.status as CampaignOutput["status"],
            platform: row.platform as string,
            objective: row.objective as CampaignOutput["objective"],
            title: row.title as string,
            posts: (row.output_json as { posts?: CampaignOutput["posts"] })?.posts,
            created_at: row.created_at as string,
            updated_at: row.updated_at as string,
            completed_at: (row.completed_at as string) || undefined,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
