/**
 * POST /api/kora/request-content-strategy
 * 
 * Creates a content strategy request and queues it for KORA processing.
 * Server resolves tenant_id from auth session (never trusted from client).
 * 
 * Request body:
 * - window: { days: 7|14|30|60|90, start_date?, end_date? }
 * - platforms: string[]
 * - goals: string[]
 * - tone?: string
 * - constraints?: string
 * - additional_context?: string
 * 
 * Response:
 * - success: boolean
 * - event_id: string
 * - request_id: string
 * - message: string
 */

import type {
  RequestContentStrategyRequest,
  RequestContentStrategyResponse,
  KoraErrorResponse,
  ContentStrategyRequestPayload,
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
    const body = req.body as RequestContentStrategyRequest;
    
    if (!body.window || !body.platforms || !body.goals) {
      const error: KoraErrorResponse = {
        success: false,
        error: "Missing required fields: window, platforms, goals",
        code: "VALIDATION_ERROR",
      };
      res.status(400).json(error);
      return;
    }

    if (!Array.isArray(body.platforms) || body.platforms.length === 0) {
      const error: KoraErrorResponse = {
        success: false,
        error: "platforms must be a non-empty array",
        code: "VALIDATION_ERROR",
      };
      res.status(400).json(error);
      return;
    }

    if (!Array.isArray(body.goals) || body.goals.length === 0) {
      const error: KoraErrorResponse = {
        success: false,
        error: "goals must be a non-empty array",
        code: "VALIDATION_ERROR",
      };
      res.status(400).json(error);
      return;
    }

    const validWindowDays = [7, 14, 30, 60, 90];
    if (!validWindowDays.includes(body.window.days)) {
      const error: KoraErrorResponse = {
        success: false,
        error: "window.days must be one of: 7, 14, 30, 60, 90",
        code: "VALIDATION_ERROR",
      };
      res.status(400).json(error);
      return;
    }

    // Generate IDs
    const eventId = generateEventId();
    const requestId = generateRequestId();

    // Prepare payload
    const payload: ContentStrategyRequestPayload = {
      window: body.window,
      platforms: body.platforms,
      goals: body.goals,
      tone: body.tone,
      constraints: body.constraints,
      additional_context: body.additional_context,
    };

    if (MOCK_MODE) {
      // Mock mode: return success without database writes
      console.log("[MOCK] Content strategy request:", {
        eventId,
        requestId,
        tenantId,
        userId,
        payload,
      });

      const response: RequestContentStrategyResponse = {
        success: true,
        event_id: eventId,
        request_id: requestId,
        message: "Content strategy request queued successfully (mock mode)",
      };
      res.status(200).json(response);
      return;
    }

    // Production mode: write to database
    const supabase = createServerClient();

    // Insert into kora_events (job queue)
    const { error: eventError } = await supabase
      .from("kora_events")
      .insert({
        id: eventId,
        tenant_id: tenantId,
        event_type: "content_strategy_requested",
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
        error: "Failed to queue content strategy request",
        code: "DATABASE_ERROR",
      };
      res.status(500).json(error);
      return;
    }

    // Insert into content_strategy_requests
    const { error: requestError } = await supabase
      .from("content_strategy_requests")
      .insert({
        id: requestId,
        tenant_id: tenantId,
        event_id: eventId,
        status: "requested",
        payload,
      });

    if (requestError) {
      console.error("Failed to insert content_strategy_request:", requestError);
      // Event was created, so we still return success but log the error
    }

    const response: RequestContentStrategyResponse = {
      success: true,
      event_id: eventId,
      request_id: requestId,
      message: "Content strategy request queued successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Content strategy request error:", error);
    const errorResponse: KoraErrorResponse = {
      success: false,
      error: "Internal server error",
      code: "SERVER_ERROR",
    };
    res.status(500).json(errorResponse);
  }
}
