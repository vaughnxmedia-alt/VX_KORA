import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = String(row[key] ?? "unknown");
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function dateKey(value: unknown): string {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "unknown" : date.toISOString().slice(0, 10);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowed = (roleRows ?? []).some((row: { role: string }) =>
      ["admin", "author", "intern", "3pv"].includes(row.role),
    );
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: audits, error } = await supabase
      .from("free_audits")
      .select("id,created_at,readiness_level,lead_source,follow_up_status,completion_status,metadata")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;

    const rows = audits ?? [];
    const auditsPerDay = rows.reduce<Record<string, number>>((counts, row) => {
      const key = dateKey(row.created_at);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});

    const bookedCount = rows.filter((row) => row.follow_up_status === "booked_strategy_session").length;
    const convertedCount = rows.filter((row) => row.follow_up_status === "converted").length;

    return new Response(
      JSON.stringify({
        total_audits: rows.length,
        audits_per_day: auditsPerDay,
        readiness_breakdown: countBy(rows, "readiness_level"),
        lead_source_breakdown: countBy(rows, "lead_source"),
        follow_up_status_breakdown: countBy(rows, "follow_up_status"),
        completion_breakdown: countBy(rows, "completion_status"),
        conversion_to_strategy_sessions: {
          booked_count: bookedCount,
          converted_count: convertedCount,
          booked_rate: rows.length ? Number((bookedCount / rows.length).toFixed(4)) : 0,
          converted_rate: rows.length ? Number((convertedCount / rows.length).toFixed(4)) : 0,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("free-audit-summary error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
