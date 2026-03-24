/**
 * Resolve which auth user owns a Strategy Session slot from optional employee reference code.
 * Empty code → default public host (is_default_public). Unknown code → error.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ResolvedHost = {
  userId: string;
  displayName: string;
  /** Uppercase code if client specified one; null if default host */
  normalizedCode: string | null;
};

export async function resolveStrategySessionHost(
  supabase: SupabaseClient,
  employeeReferenceCode: string | undefined,
  envFallbackUserId: string | undefined,
): Promise<ResolvedHost> {
  const raw = employeeReferenceCode?.trim();

  if (!raw) {
    const { data, error } = await supabase
      .from("strategy_session_hosts")
      .select("user_id, display_name")
      .eq("is_default_public", true)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data?.user_id) {
      return {
        userId: data.user_id as string,
        displayName: (data.display_name as string) || "Your strategist",
        normalizedCode: null,
      };
    }
    if (envFallbackUserId?.trim()) {
      return {
        userId: envFallbackUserId.trim(),
        displayName: "Your strategist",
        normalizedCode: null,
      };
    }
    const { data: sole } = await supabase
      .from("strategy_session_hosts")
      .select("user_id, display_name")
      .eq("active", true)
      .limit(2);
    if (sole?.length === 1 && sole[0]?.user_id) {
      console.log(
        JSON.stringify({
          tag: "strategy_session_resolve_host",
          event: "implicit_single_active_host",
          userId: sole[0].user_id,
        }),
      );
      return {
        userId: sole[0].user_id as string,
        displayName: (sole[0].display_name as string) || "Your strategist",
        normalizedCode: null,
      };
    }
    throw new Error("NO_DEFAULT_STRATEGY_HOST");
  }

  const code = raw.toUpperCase();
  const { data, error } = await supabase
    .from("strategy_session_hosts")
    .select("user_id, display_name")
    .eq("reference_code", code)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data?.user_id) {
    throw new Error("UNKNOWN_HOST_CODE");
  }

  return {
    userId: data.user_id as string,
    displayName: (data.display_name as string) || "Your strategist",
    normalizedCode: code,
  };
}
