/**
 * K.O.R.A Server-Side Helpers
 * 
 * These functions run server-side only (API routes, server actions).
 * They resolve tenant context securely from the auth session.
 * 
 * IMPORTANT: Never trust tenant_id from the client. Always resolve it server-side.
 */

import { createClient } from "@supabase/supabase-js";
import type { TenantContext, TenantRole, TenantUserRow } from "./types";

// Server-side Supabase client with service role for secure operations
// This should only be used in API routes, never exposed to the client
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function createServerClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase server credentials");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Create a client that respects the user's session (for RLS)
export function createUserClient(accessToken: string) {
  if (!SUPABASE_URL) {
    throw new Error("Missing Supabase URL");
  }
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface GetTenantContextOptions {
  accessToken?: string;
  userId?: string;
}

export interface TenantContextResult {
  success: true;
  context: TenantContext;
}

export interface TenantContextError {
  success: false;
  error: string;
  code: "UNAUTHORIZED" | "NO_TENANT" | "SERVER_ERROR";
}

/**
 * Get tenant context from auth session or JWT.
 * 
 * This function MUST be called server-side only.
 * It resolves the tenant_id from the tenant_users table based on the authenticated user.
 * 
 * @param options - Either accessToken (JWT) or userId
 * @returns TenantContext with tenant_id, user_id, and role
 */
export async function getTenantContext(
  options: GetTenantContextOptions
): Promise<TenantContextResult | TenantContextError> {
  try {
    const supabase = createServerClient();
    
    let userId = options.userId;
    
    // If accessToken provided, verify it and extract user_id
    if (options.accessToken) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(options.accessToken);
      
      if (authError || !user) {
        return {
          success: false,
          error: "Invalid or expired access token",
          code: "UNAUTHORIZED",
        };
      }
      
      userId = user.id;
    }
    
    if (!userId) {
      return {
        success: false,
        error: "No user ID provided",
        code: "UNAUTHORIZED",
      };
    }
    
    // Query tenant_users to get tenant mapping
    const { data: tenantUser, error: tenantError } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("user_id", userId)
      .single();
    
    if (tenantError || !tenantUser) {
      // For development/mock mode, create a default tenant context
      if (process.env.NODE_ENV === "development" && process.env.KORA_MOCK_TENANT) {
        return {
          success: true,
          context: {
            tenant_id: process.env.KORA_MOCK_TENANT,
            user_id: userId,
            role: "owner" as TenantRole,
          },
        };
      }
      
      return {
        success: false,
        error: "User is not associated with any tenant",
        code: "NO_TENANT",
      };
    }
    
    return {
      success: true,
      context: {
        tenant_id: tenantUser.tenant_id,
        user_id: userId,
        role: tenantUser.role as TenantRole,
      },
    };
  } catch (error) {
    console.error("getTenantContext error:", error);
    return {
      success: false,
      error: "Server error while resolving tenant context",
      code: "SERVER_ERROR",
    };
  }
}

/**
 * Extract access token from request headers.
 * Supports both Authorization: Bearer <token> and cookie-based sessions.
 */
export function extractAccessToken(headers: Headers): string | null {
  const authHeader = headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  
  // Try to get from cookie (for SSR/server components)
  const cookies = headers.get("Cookie");
  if (cookies) {
    const match = cookies.match(/sb-access-token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Validate that a user has at least the required role level.
 */
export function hasRequiredRole(userRole: TenantRole, requiredRole: TenantRole): boolean {
  const roleHierarchy: TenantRole[] = ["viewer", "member", "admin", "owner"];
  const userLevel = roleHierarchy.indexOf(userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Generate a unique event ID
 */
export function generateEventId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
