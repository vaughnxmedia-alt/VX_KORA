/**
 * POST /api/kora/request-campaign
 * 
 * Creates a campaign request and queues it for KORA processing.
 * Server resolves tenant_id from auth session (never trusted from client).
 * 
 * Request body:
 * - content_strategy_id: string (required)
 * - platform: string
 * - objective: "awareness" | "engagement" | "traffic" | "leads" | "sales" | "retention"
 * - cta: string
 * - length: "single_post" | "series_3" | "series_5" | "series_7" | "full_campaign"
 * - timeline: { start_date: string, end_date?: string, publish_immediately?: boolean }
 * - offer?: string
 * - constraints?: string
 * - target_audience_override?: string
 * 
 * Response:
 * - success: boolean
 * - event_id: string
 * - request_id: string
 * - message: string
 */

import type {
  RequestCampaignRequest,
  RequestCampaignResponse,
  KoraErrorResponse,
  CampaignRequestPayload,
  CampaignObjective,
  CampaignLength,
} from "../../src/lib/kora/types";
import {
  getTenantContext,
  extractAccessToken,
  createServerClient,
  generateEventId,
  generateRequestId,
} from "../../src/lib/kora/server";

interface VercelRequest {
  method?: string;
  body?: unknown;
  headers: {
    get: (key: string) => string | null;
  };
}

interface VercelResponse {
  setHeader: (key: string, value: string) => void;
  status: (code: number) => { json: (data: unknown) => void };
}

// Mock mode flag for development without Supabase tables
const MOCK_MODE = process.env.KORA_MOCK_MODE === "true";

const VALID_OBJECTIVES: CampaignObjective[] = [
  "awareness",
  "engagement",
  "traffic",
  "leads",
  "sales",
  "retention",
];

const VALID_LENGTHS: CampaignLength[] = [
  "single_post",
  "series_3",
  "series_5",
  "series_7",
  "full_campaign",
];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).json({});
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    const error: KoraErrorResponse = {
      success: false,
      error: "Method not allowed",
      code: "METHOD_NOT_ALLOWED",
    };
    res.status(405).json(error);
    return;
  }

  try {
    // Extract access token from headers
    const accessToken = extractAccessToken(req.headers as unknown as Headers);
    
    if (!accessToken && !MOCK_MODE) {
      const error: KoraErrorResponse = {
        success: false,
        error: "Authentication required",
        code: "UNAUTHORIZED",
      };
      res.status(401).json(error);
      return;
    }

    // Resolve tenant context server-side
    let tenantId: string;
    let userId: string;

    if (MOCK_MODE) {
      tenantId = process.env.KORA_MOCK_TENANT || "mock-tenant-001";
      userId = "mock-user-001";
    } else {
      const tenantResult = await getTenantContext({ accessToken: accessToken! });
      
      if (!tenantResult.success) {
        const error: KoraErrorResponse = {
          success: false,
          error: tenantResult.error,
          code: tenantResult.code,
        };
        res.status(tenantResult.code === "UNAUTHORIZED" ? 401 : 403).json(error);
        return;
      }
      
      tenantId = tenantResult.context.tenant_id;
      userId = tenantResult.context.user_id;
    }

    // Parse and validate request body
    const body = req.body as RequestCampaignRequest;
    
    // Required fields validation
    if (!body.content_strategy_id) {
      const error: KoraErrorResponse = {
        success: false,
        error: "content_strategy_id is required",
        code: "VALIDATION_ERROR",
      };
      res.status(400).json(error);
      return;
    }

    if (!body.platform) {
      const error: KoraErrorResponse = {
        success: false,
        error: "platform is required",
        code: "VALIDATION_ERROR",
      };
      res.status(400).json(error);
      return;
    }

    if (!body.objective || !VALID_OBJECTIVES.includes(body.objective)) {
      const error: KoraErrorResponse = {
        success: false,
        error: `objective must be one of: ${VALID_OBJECTIVES.join(", ")}`,
        code: "VALIDATION_ERROR",
      };
      res.status(400).json(error);
      return;
    }

    if (!body.cta) {
      const error: KoraErrorResponse = {
        success: false,
        error: "cta (call to action) is required",
        code: "VALIDATION_ERROR",
      };
      res.status(400).json(error);
      return;
    }

    if (!body.length || !VALID_LENGTHS.includes(body.length)) {
      const error: KoraErrorResponse = {
        success: false,
        error: `length must be one of: ${VALID_LENGTHS.join(", ")}`,
        code: "VALIDATION_ERROR",
      };
      res.status(400).json(error);
      return;
    }

    if (!body.timeline || !body.timeline.start_date) {
      const error: KoraErrorResponse = {
        success: false,
        error: "timeline with start_date is required",
        code: "VALIDATION_ERROR",
      };
      res.status(400).json(error);
      return;
    }

    // Generate IDs
    const eventId = generateEventId();
    const requestId = generateRequestId();

    // Prepare payload
    const payload: CampaignRequestPayload = {
      content_strategy_id: body.content_strategy_id,
      platform: body.platform,
      objective: body.objective,
      cta: body.cta,
      length: body.length,
      timeline: body.timeline,
      offer: body.offer,
      constraints: body.constraints,
      target_audience_override: body.target_audience_override,
    };

    if (MOCK_MODE) {
      // Mock mode: return success without database writes
      console.log("[MOCK] Campaign request:", {
        eventId,
        requestId,
        tenantId,
        userId,
        payload,
      });

      const response: RequestCampaignResponse = {
        success: true,
        event_id: eventId,
        request_id: requestId,
        message: "Campaign request queued successfully (mock mode)",
      };
      res.status(200).json(response);
      return;
    }

    // Production mode: write to database
    const supabase = createServerClient();

    // Verify content_strategy_id belongs to tenant (security check)
    const { data: strategy, error: strategyError } = await supabase
      .from("content_strategies")
      .select("id, tenant_id")
      .eq("id", body.content_strategy_id)
      .single();

    if (strategyError || !strategy) {
      const error: KoraErrorResponse = {
        success: false,
        error: "Content strategy not found",
        code: "NOT_FOUND",
      };
      res.status(404).json(error);
      return;
    }

    if (strategy.tenant_id !== tenantId) {
      const error: KoraErrorResponse = {
        success: false,
        error: "Content strategy does not belong to your organization",
        code: "FORBIDDEN",
      };
      res.status(403).json(error);
      return;
    }

    // Insert into kora_events (job queue)
    const { error: eventError } = await supabase
      .from("kora_events")
      .insert({
        id: eventId,
        tenant_id: tenantId,
        event_type: "campaign_requested",
        status: "pending",
        payload: {
          ...payload,
          user_id: userId,
          request_id: requestId,
        },
      });

    if (eventError) {
      console.error("Failed to insert kora_event:", eventError);
      const error: KoraErrorResponse = {
        success: false,
        error: "Failed to queue campaign request",
        code: "DATABASE_ERROR",
      };
      res.status(500).json(error);
      return;
    }

    // Insert into campaign_requests
    const { error: requestError } = await supabase
      .from("campaign_requests")
      .insert({
        id: requestId,
        tenant_id: tenantId,
        event_id: eventId,
        content_strategy_id: body.content_strategy_id,
        status: "requested",
        payload,
      });

    if (requestError) {
      console.error("Failed to insert campaign_request:", requestError);
      // Event was created, so we still return success but log the error
    }

    const response: RequestCampaignResponse = {
      success: true,
      event_id: eventId,
      request_id: requestId,
      message: "Campaign request queued successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Campaign request error:", error);
    const errorResponse: KoraErrorResponse = {
      success: false,
      error: "Internal server error",
      code: "SERVER_ERROR",
    };
    res.status(500).json(errorResponse);
  }
}
