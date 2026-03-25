import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { IntakeValues } from "./schema";

/** Turns Supabase Functions invoke errors into actionable text (e.g. NOT_FOUND → deploy hint). */
export async function messageFromFunctionInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.clone().json()) as {
        code?: string;
        message?: string;
        error?: string;
      };
      const edgeDetail =
        typeof body?.error === "string"
          ? body.error
          : typeof body?.message === "string"
            ? body.message
            : "";
      if (edgeDetail) {
        if (body?.code === "NOT_FOUND" || /not found/i.test(edgeDetail)) {
          return `${edgeDetail} Deploy Strategy Session functions: from apps/web run npm run deploy:edge-strategy (requires Supabase CLI + login).`;
        }
        // Edge functions return { error: "..." } for 4xx/5xx bodies
        if (/scheduling is temporarily unavailable|try again later/i.test(edgeDetail)) {
          return (
            "Scheduling is temporarily unavailable. Ensure a default strategist exists in the database " +
            "(strategy_session_hosts with is_default_public, or set STRATEGY_SESSION_DEFAULT_HOST_USER_ID on Edge Functions). " +
            "If this persists, contact us."
          );
        }
        if (error.context.status === 400 && /invalid employee|reference code/i.test(edgeDetail)) {
          return (
            "That referral code was not recognized. Leave the code blank for the default schedule, " +
            "or use the code from your card."
          );
        }
        return `${error.message}: ${edgeDetail}`;
      }
    } catch {
      /* ignore JSON parse */
    }
    return error.message;
  }
  if (error instanceof FunctionsRelayError) {
    return `${error.message} The function may be missing, crashing on boot, or unreachable. Deploy or check Edge Function logs in Supabase Dashboard.`;
  }
  if (error instanceof FunctionsFetchError) {
    const c = error.context;
    const extra = c instanceof Error ? c.message : "";
    return extra ? `${error.message} — ${extra}` : error.message;
  }
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export type AvailabilitySlot = { start: string; label: string };

export type DayDiagnostic = {
  ymd: string;
  skipped: boolean;
  reasons: string[];
  candidateSlots: number;
  removedPast: number;
  removedBooked: number;
  remaining: number;
};

export type StrategySessionAvailabilityResponse = {
  slots: AvailabilitySlot[];
  /** Host schedule IANA timezone (source of truth for slot generation). */
  timezone: string;
  clientTimezone?: string;
  hostUserId?: string;
  schedule?: {
    source: string;
    active: boolean;
    weekdays: number[];
    dayStart: string;
    dayEnd: string;
    slotDurationMinutes: number;
  };
  dayDiagnostics?: Record<string, DayDiagnostic>;
  clientDayDiagnostics?: Record<string, DayDiagnostic>;
};

export type StrategySessionHostOption = {
  reference_code: string;
  display_name: string;
  is_default_public: boolean;
  /** Optional brand or nickname shown in parentheses next to display_name. */
  list_subtitle?: string | null;
};

export async function fetchStrategySessionHosts(): Promise<StrategySessionHostOption[]> {
  const { data, error } = await supabase.functions.invoke("strategy-session-hosts", {
    body: {},
  });
  if (error) {
    throw new Error(await messageFromFunctionInvokeError(error));
  }
  const hosts = (data as { hosts?: StrategySessionHostOption[] })?.hosts;
  return Array.isArray(hosts) ? hosts : [];
}

export async function fetchAvailability(params: {
  start: string;
  end: string;
  timezone: string;
  /** Uppercase code or omit for default strategist */
  hostCode?: string;
  includeDiagnostics?: boolean;
}): Promise<StrategySessionAvailabilityResponse> {
  const { data, error } = await supabase.functions.invoke("strategy-session-availability", {
    body: {
      start: params.start,
      end: params.end,
      timezone: params.timezone,
      includeDiagnostics: !!params.includeDiagnostics,
      ...(params.hostCode?.trim() ? { hostCode: params.hostCode.trim().toUpperCase() } : {}),
    },
  });
  if (error) {
    throw new Error(await messageFromFunctionInvokeError(error));
  }
  return data as StrategySessionAvailabilityResponse;
}

export async function submitStrategySessionBooking(
  intake: IntakeValues,
  slotStartIso: string,
  timezone: string,
  options?: {
    bookingKind?:
      | "full_program_sales"
      | "creative_consultation"
      | "telegram"
      | "strategy_session"
      | "campaign_retainer";
  },
): Promise<{
  ok?: boolean;
  meetingId?: string;
  confirmationStatus?: string;
  error?: string;
}> {
  const code = intake.employeeReferenceCode?.trim();
  const { data, error } = await supabase.functions.invoke("strategy-session-book", {
    body: {
      fullName: intake.fullName,
      businessName: intake.businessName,
      email: intake.email,
      phone: intake.phone,
      websiteOrSocial: intake.websiteOrSocial || "",
      industry: intake.industry,
      offerSummary: intake.offerSummary,
      targetAudience: intake.targetAudience,
      currentChallenge: intake.currentChallenge,
      sessionGoal: intake.sessionGoal,
      sessionType: intake.sessionType,
      inPersonLocation: intake.inPersonLocation || "",
      additionalNotes: intake.additionalNotes || "",
      slotStart: slotStartIso,
      timezone,
      ...(code ? { employeeReferenceCode: code.toUpperCase() } : {}),
      ...(options?.bookingKind ? { bookingKind: options.bookingKind } : {}),
    },
  });
  if (error) {
    throw new Error(await messageFromFunctionInvokeError(error));
  }
  return (data || {}) as {
    ok?: boolean;
    meetingId?: string;
    confirmationStatus?: string;
    message?: string;
    error?: string;
  };
}

/** Admin-only (dashboard): confirm pending Strategy Session and send guest + ops emails. */
export async function confirmStrategySessionBooking(
  meetingId: string,
  opts?: { guestHtml?: string; guestSubject?: string },
): Promise<{
  ok?: boolean;
  meetingId?: string;
  confirmationStatus?: string;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke("strategy-session-admin-confirm", {
    body: {
      meetingId,
      ...(opts?.guestHtml !== undefined ? { guestHtml: opts.guestHtml } : {}),
      ...(opts?.guestSubject !== undefined ? { guestSubject: opts.guestSubject } : {}),
    },
  });
  if (error) {
    throw new Error(await messageFromFunctionInvokeError(error));
  }
  return (data || {}) as {
    ok?: boolean;
    meetingId?: string;
    confirmationStatus?: string;
    error?: string;
  };
}
