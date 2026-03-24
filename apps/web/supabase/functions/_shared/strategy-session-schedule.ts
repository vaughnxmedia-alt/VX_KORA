/**
 * Load host schedule + generate Strategy Session slots (Luxon, host timezone).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DateTime } from "npm:luxon@3.5.0";

export type ScheduleSource = "database" | "fallback";

export type EffectiveSchedule = {
  source: ScheduleSource;
  hostUserId: string;
  active: boolean;
  timezone: string;
  /** Luxon ISO weekday: 1=Mon .. 7=Sun */
  weekdays: number[];
  dayStart: string;
  dayEnd: string;
  slotDurationMinutes: number;
  blocks: Set<string>;
  overrides: Map<
    string,
    { isClosed: boolean; windows: [string, string][] | null }
  >;
};

export type DayDiagnostic = {
  ymd: string;
  skipped: boolean;
  reasons: string[];
  candidateSlots: number;
  removedPast: number;
  removedBooked: number;
  remaining: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Normalize Postgres time / string to HH:mm */
export function toHHmm(t: string): string {
  const s = String(t).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "09:00";
  return `${pad2(Number(m[1]))}:${m[2]}`;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = toHHmm(hhmm).split(":").map((x) => Number(x));
  return h * 60 + m;
}

function parseWindows(raw: unknown): [string, string][] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: [string, string][] = [];
  for (const row of raw) {
    if (!Array.isArray(row) || row.length !== 2) continue;
    const a = String(row[0]);
    const b = String(row[1]);
    if (!a || !b) continue;
    out.push([a, b]);
  }
  return out.length ? out : null;
}

export function buildFallbackSchedule(hostUserId: string): EffectiveSchedule {
  return {
    source: "fallback",
    hostUserId,
    active: true,
    timezone: "America/New_York",
    weekdays: [1, 2, 3, 4],
    dayStart: "09:00",
    dayEnd: "18:00",
    slotDurationMinutes: 60,
    blocks: new Set(),
    overrides: new Map(),
  };
}

export async function loadEffectiveSchedule(
  supabase: SupabaseClient,
  hostUserId: string,
): Promise<EffectiveSchedule> {
  const [schRes, blocksRes, overRes] = await Promise.all([
    supabase
      .from("strategy_session_host_schedule")
      .select(
        "active, timezone, weekdays, day_start, day_end, slot_duration_minutes",
      )
      .eq("host_user_id", hostUserId)
      .maybeSingle(),
    supabase
      .from("strategy_session_schedule_block")
      .select("block_date")
      .eq("host_user_id", hostUserId),
    supabase
      .from("strategy_session_schedule_override")
      .select("on_date, is_closed, time_windows")
      .eq("host_user_id", hostUserId),
  ]);

  if (schRes.error) throw schRes.error;
  if (blocksRes.error) throw blocksRes.error;
  if (overRes.error) throw overRes.error;

  const row = schRes.data;
  if (!row) {
    return buildFallbackSchedule(hostUserId);
  }

  const wdRaw = row.weekdays as unknown;
  const weekdays = Array.isArray(wdRaw)
    ? (wdRaw as number[]).map((n) => Number(n)).filter((n) => n >= 1 && n <= 7)
    : [1, 2, 3, 4];

  const blocks = new Set<string>(
    (blocksRes.data || []).map((r) => String(r.block_date)),
  );
  const overrides = new Map<
    string,
    { isClosed: boolean; windows: [string, string][] | null }
  >();
  for (const r of overRes.data || []) {
    const ymd = String(r.on_date);
    overrides.set(ymd, {
      isClosed: !!r.is_closed,
      windows: r.is_closed ? null : parseWindows(r.time_windows),
    });
  }

  return {
    source: "database",
    hostUserId,
    active: !!row.active,
    timezone: String(row.timezone || "America/New_York"),
    weekdays: weekdays.length ? weekdays : [1, 2, 3, 4],
    dayStart: toHHmm(String(row.day_start ?? "09:00")),
    dayEnd: toHHmm(String(row.day_end ?? "18:00")),
    slotDurationMinutes: Math.max(
      15,
      Math.min(240, Number(row.slot_duration_minutes) || 60),
    ),
    blocks,
    overrides,
  };
}

type Interval = { startMin: number; endMin: number };

function defaultIntervals(schedule: EffectiveSchedule): Interval[] {
  return [{
    startMin: timeToMinutes(schedule.dayStart),
    endMin: timeToMinutes(schedule.dayEnd),
  }];
}

function intervalsForDay(
  schedule: EffectiveSchedule,
  ymd: string,
): Interval[] | null {
  const ov = schedule.overrides.get(ymd);
  if (ov?.isClosed) return null;
  if (ov && !ov.isClosed && ov.windows && ov.windows.length > 0) {
    const ints: Interval[] = [];
    for (const [a, b] of ov.windows) {
      const startMin = timeToMinutes(a);
      const endMin = timeToMinutes(b);
      if (startMin < endMin) ints.push({ startMin, endMin });
    }
    return ints.length ? ints : defaultIntervals(schedule);
  }
  return defaultIntervals(schedule);
}

export function generateSlotsForRange(params: {
  schedule: EffectiveSchedule;
  rangeStartYmd: string;
  rangeEndYmd: string;
  bookedMinuteKeysUtc: Set<number>;
  includeDiagnostics?: boolean;
  /** When set, also key diagnostics by this IANA zone (booking UI timezone). */
  diagnosticClientTimezone?: string;
}): {
  slots: { start: string; label: string }[];
  dayDiagnostics?: Record<string, DayDiagnostic>;
  /** Same entries as dayDiagnostics, keyed by yyyy-MM-DD in diagnosticClientTimezone (noon anchor). */
  clientDayDiagnostics?: Record<string, DayDiagnostic>;
} {
  const { schedule, rangeStartYmd, rangeEndYmd, bookedMinuteKeysUtc } =
    params;
  const includeDiag = !!params.includeDiagnostics;
  const diagClientZone = params.diagnosticClientTimezone?.trim() || undefined;

  const slots: { start: string; label: string }[] = [];
  const dayDiagnostics: Record<string, DayDiagnostic> = {};
  const clientDayDiagnostics: Record<string, DayDiagnostic> = {};

  if (!schedule.active) {
    console.log(
      JSON.stringify({
        tag: "strategy_session_availability",
        event: "schedule_inactive",
        hostUserId: schedule.hostUserId,
        source: schedule.source,
      }),
    );
    return includeDiag ? { slots: [], dayDiagnostics: {} } : { slots: [] };
  }

  const startDay = DateTime.fromISO(rangeStartYmd, {
    zone: schedule.timezone,
  }).startOf("day");
  const endDay = DateTime.fromISO(rangeEndYmd, {
    zone: schedule.timezone,
  }).startOf("day");

  if (!startDay.isValid || !endDay.isValid) {
    return includeDiag ? { slots: [], dayDiagnostics: {} } : { slots: [] };
  }

  const nowInHostZone = DateTime.now().setZone(schedule.timezone);
  let cursor = startDay;
  const last = endDay;

  while (cursor <= last) {
    const ymd = cursor.toFormat("yyyy-MM-dd");
    const wd = cursor.weekday;
    const reasons: string[] = [];
    let skipped = false;
    let candidateSlots = 0;
    let removedPast = 0;
    let removedBooked = 0;

    if (!schedule.weekdays.includes(wd)) {
      reasons.push("WEEKDAY_CLOSED");
      skipped = true;
    } else if (schedule.blocks.has(ymd)) {
      reasons.push("DATE_BLOCKED");
      skipped = true;
    } else {
      const ov = schedule.overrides.get(ymd);
      if (ov?.isClosed) {
        reasons.push("OVERRIDE_CLOSED");
        skipped = true;
      }
    }

    let remaining = 0;
    if (!skipped) {
      const intervals = intervalsForDay(schedule, ymd);
      if (intervals == null) {
        reasons.push("OVERRIDE_CLOSED");
        skipped = true;
      } else {
        for (const { startMin, endMin } of intervals) {
          const dur = schedule.slotDurationMinutes;
          for (
            let m = startMin;
            m + dur <= endMin;
            m += dur
          ) {
            candidateSlots++;
            const hour = Math.floor(m / 60);
            const minute = m % 60;
            const local = cursor.set({
              hour,
              minute,
              second: 0,
              millisecond: 0,
            });
            if (local < nowInHostZone) {
              removedPast++;
              continue;
            }
            const utcIso = local.toUTC().toISO();
            if (!utcIso) continue;
            const minKey = Math.floor(new Date(utcIso).getTime() / 60000);
            if (bookedMinuteKeysUtc.has(minKey)) {
              removedBooked++;
              continue;
            }
            remaining++;
            slots.push({
              start: utcIso,
              label: local.toFormat("ccc, MMM d — h:mm a"),
            });
          }
        }
      }
    }

    if (includeDiag) {
      const effectiveRemaining = skipped ? 0 : remaining;
      const diagReasons = skipped ? reasons : [...reasons];
      if (!skipped && candidateSlots > 0 && effectiveRemaining === 0) {
        if (removedPast === candidateSlots) diagReasons.push("ALL_PAST");
        else if (removedBooked === candidateSlots) diagReasons.push("ALL_BOOKED");
        else if (removedPast + removedBooked >= candidateSlots) {
          diagReasons.push("ALL_PAST_OR_BOOKED");
        } else diagReasons.push("NO_SLOTS_AFTER_RULES");
      }
      if (!skipped && effectiveRemaining > 0 && diagReasons.length === 0) {
        diagReasons.push("OK");
      }
      const diag: DayDiagnostic = {
        ymd,
        skipped,
        reasons: diagReasons.length ? diagReasons : ["OK"],
        candidateSlots: skipped ? 0 : candidateSlots,
        removedPast: skipped ? 0 : removedPast,
        removedBooked: skipped ? 0 : removedBooked,
        remaining: effectiveRemaining,
      };
      dayDiagnostics[ymd] = diag;
      if (diagClientZone) {
        const clientYmd = cursor
          .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
          .setZone(diagClientZone)
          .toFormat("yyyy-MM-dd");
        clientDayDiagnostics[clientYmd] = diag;
      }
    }

    const logReasons = includeDiag ? dayDiagnostics[ymd]?.reasons : reasons;

    console.log(
      JSON.stringify({
        tag: "strategy_session_availability_day",
        ymd,
        hostUserId: schedule.hostUserId,
        zone: schedule.timezone,
        skipped,
        reasons: logReasons,
        candidateSlots: includeDiag ? dayDiagnostics[ymd]?.candidateSlots : undefined,
        remaining: includeDiag ? dayDiagnostics[ymd]?.remaining : undefined,
      }),
    );

    cursor = cursor.plus({ days: 1 });
  }

  console.log(
    JSON.stringify({
      tag: "strategy_session_availability_summary",
      hostUserId: schedule.hostUserId,
      source: schedule.source,
      zone: schedule.timezone,
      rangeStartYmd,
      rangeEndYmd,
      slotCount: slots.length,
      weekdays: schedule.weekdays,
    }),
  );

  if (!includeDiag) {
    return { slots };
  }
  const out: {
    slots: { start: string; label: string }[];
    dayDiagnostics: Record<string, DayDiagnostic>;
    clientDayDiagnostics?: Record<string, DayDiagnostic>;
  } = { slots, dayDiagnostics };
  if (diagClientZone && Object.keys(clientDayDiagnostics).length > 0) {
    out.clientDayDiagnostics = clientDayDiagnostics;
  }
  return out;
}

/** Server-side validation for booking */
export async function isSlotBookableForHost(
  supabase: SupabaseClient,
  hostUserId: string,
  slotStartIso: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const schedule = await loadEffectiveSchedule(supabase, hostUserId);
  if (!schedule.active) {
    return { ok: false, reason: "Strategy session scheduling is closed for this host." };
  }

  const slotDt = DateTime.fromISO(slotStartIso, { setZone: true });
  if (!slotDt.isValid) {
    return { ok: false, reason: "Invalid session time." };
  }

  const local = slotDt.setZone(schedule.timezone);
  const ymd = local.toFormat("yyyy-MM-dd");

  const startDay = local.startOf("day");
  const endDay = local.startOf("day");
  const rangeStartYmd = startDay.toFormat("yyyy-MM-dd");
  const rangeEndYmd = endDay.toFormat("yyyy-MM-dd");

  const targetMinUtc = Math.floor(slotDt.toUTC().toMillis() / 60000);

  const { data: meetings, error } = await supabase
    .from("meetings")
    .select("meeting_date")
    .eq("service_name", "Strategy Session")
    .eq("host_user_id", hostUserId)
    .gte("meeting_date", startDay.toUTC().toISO()!)
    .lte("meeting_date", endDay.endOf("day").toUTC().toISO()!);

  if (error) throw error;

  const taken = new Set(
    (meetings || []).map((r) =>
      Math.floor(new Date(r.meeting_date as string).getTime() / 60000)
    ),
  );

  const { slots } = generateSlotsForRange({
    schedule,
    rangeStartYmd,
    rangeEndYmd,
    bookedMinuteKeysUtc: taken,
    includeDiagnostics: false,
  });

  const match = slots.some((s) =>
    Math.floor(new Date(s.start).getTime() / 60000) === targetMinUtc
  );
  if (match) {
    return { ok: true };
  }

  if (!schedule.weekdays.includes(local.weekday)) {
    return { ok: false, reason: "That day is not available for this strategist." };
  }
  if (schedule.blocks.has(ymd)) {
    return { ok: false, reason: "That date is blocked." };
  }
  const ov = schedule.overrides.get(ymd);
  if (ov?.isClosed) {
    return { ok: false, reason: "That date is closed." };
  }
  if (taken.has(targetMinUtc)) {
    return { ok: false, reason: "That time slot was just taken." };
  }

  const nowZ = DateTime.now().setZone(schedule.timezone);
  if (local < nowZ) {
    return { ok: false, reason: "That time is in the past." };
  }

  return {
    ok: false,
    reason: "That time is not available. Pick a time from the open calendar.",
  };
}
