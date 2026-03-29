/**
 * Strategy Session availability: loads per-host schedule from DB (or fallback) and returns slots.
 * Slot instants are generated in the host schedule timezone, returned as ISO UTC.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DateTime } from "npm:luxon@3.5.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { resolveStrategySessionHost } from "../_shared/strategy-session-resolve-host.ts";
import {
  generateSlotsForRange,
  loadEffectiveSchedule,
} from "../_shared/strategy-session-schedule.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration incomplete" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let startStr: string | null = null;
    let endStr: string | null = null;
    let clientTimezone = "America/New_York";
    let hostCode: string | undefined;
    let includeDiagnostics = false;

    if (req.method === "GET") {
      const url = new URL(req.url);
      startStr = url.searchParams.get("start");
      endStr = url.searchParams.get("end");
      clientTimezone = url.searchParams.get("timezone") || clientTimezone;
      const hc = url.searchParams.get("hostCode");
      hostCode = hc && hc.trim() ? hc : undefined;
      includeDiagnostics = url.searchParams.get("diagnostics") === "1";
    } else {
      const body = await req.json().catch(() => ({}));
      startStr = body.start ?? null;
      endStr = body.end ?? null;
      clientTimezone = typeof body.timezone === "string" ? body.timezone : clientTimezone;
      const hc = typeof body.hostCode === "string" ? body.hostCode : undefined;
      hostCode = hc && hc.trim() ? hc : undefined;
      includeDiagnostics = !!body.includeDiagnostics;
    }

    if (!startStr || !endStr) {
      return new Response(
        JSON.stringify({ error: "Query params start and end (YYYY-MM-DD) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const envFallbackHost = Deno.env.get("STRATEGY_SESSION_DEFAULT_HOST_USER_ID") ||
      undefined;

    let hostUserId: string;
    try {
      const resolved = await resolveStrategySessionHost(supabase, hostCode, envFallbackHost);
      hostUserId = resolved.userId;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "UNKNOWN_HOST_CODE") {
        return new Response(
          JSON.stringify({ error: "Invalid employee reference code." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (msg === "NO_DEFAULT_STRATEGY_HOST") {
        return new Response(
          JSON.stringify({
            error: "Scheduling is temporarily unavailable. Please try again later.",
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw e;
    }

    const schedule = await loadEffectiveSchedule(supabase, hostUserId);

    const zone = schedule.timezone;
    const startDay = DateTime.fromISO(startStr, { zone }).startOf("day");
    const endDay = DateTime.fromISO(endStr, { zone }).startOf("day");
    if (!startDay.isValid || !endDay.isValid) {
      return new Response(JSON.stringify({ error: "Invalid date format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rangeStartUtc = startDay.toUTC().toISO()!;
    const rangeEndUtc = endDay.endOf("day").toUTC().toISO()!;

    const { data: booked, error: bookErr } = await supabase
      .from("meetings")
      .select("meeting_date")
      .eq("service_name", "Strategy Session")
      .eq("host_user_id", hostUserId)
      .gte("meeting_date", rangeStartUtc)
      .lte("meeting_date", rangeEndUtc);

    if (bookErr) throw bookErr;

    const taken = new Set(
      (booked || []).map((r) => {
        const d = new Date(r.meeting_date as string);
        return Math.floor(d.getTime() / 60000);
      }),
    );

    const rangeStartYmd = startDay.toFormat("yyyy-MM-dd");
    const rangeEndYmd = endDay.toFormat("yyyy-MM-dd");

    const gen = generateSlotsForRange({
      schedule,
      rangeStartYmd,
      rangeEndYmd,
      bookedMinuteKeysUtc: taken,
      includeDiagnostics,
      diagnosticClientTimezone: includeDiagnostics ? clientTimezone : undefined,
    });
    const slots = gen.slots;
    const dayDiagnostics = gen.dayDiagnostics;
    const clientDayDiagnostics = gen.clientDayDiagnostics;

    const payload = {
      timezone: zone,
      clientTimezone,
      hostUserId,
      schedule: {
        source: schedule.source,
        active: schedule.active,
        weekdays: schedule.weekdays,
        dayStart: schedule.dayStart,
        dayEnd: schedule.dayEnd,
        slotDurationMinutes: schedule.slotDurationMinutes,
      },
      slots,
      ...(includeDiagnostics && dayDiagnostics ? { dayDiagnostics } : {}),
      ...(includeDiagnostics && clientDayDiagnostics
        ? { clientDayDiagnostics }
        : {}),
    };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
