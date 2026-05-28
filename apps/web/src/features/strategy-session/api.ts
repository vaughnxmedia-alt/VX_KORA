import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase, supabaseIsConfigured } from "@/integrations/supabase/client";
import { readFreeAuditAttribution } from "@/lib/freeAuditAttribution";
import type { IntakeValues } from "./schema";

function ensureSupabaseForEdgeFunctions() {
  if (!supabaseIsConfigured) {
    if (import.meta.env.DEV) {
      console.warn(
        "[strategy-session] Missing VITE_SUPABASE_URL or key in .env — Edge Functions will not run. See apps/web/.env.example.",
      );
    }
    throw new Error(
      "Scheduling is temporarily unavailable. Please try again later or contact us.",
    );
  }
}

const SCHEDULING_UNAVAILABLE =
  "Scheduling is temporarily unavailable. Please try again later or contact us.";

/** Turns Supabase Functions invoke errors into text suitable for end users (details only in dev console). */
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
          if (import.meta.env.DEV) {
            console.warn("[strategy-session] Edge function missing or not deployed.", edgeDetail);
          }
          return SCHEDULING_UNAVAILABLE;
        }
        if (/scheduling is temporarily unavailable|try again later/i.test(edgeDetail)) {
          return SCHEDULING_UNAVAILABLE;
        }
        if (error.context.status === 400 && /invalid employee|reference code/i.test(edgeDetail)) {
          return (
            "That referral code was not recognized. Leave the code blank for the default schedule, " +
            "or use the code from your card."
          );
        }
        if (
          (error.context.status === 402 || error.context.status === 400 || error.context.status === 409) &&
          edgeDetail
        ) {
          return edgeDetail;
        }
        if (import.meta.env.DEV) {
          return `${error.message}: ${edgeDetail}`;
        }
        return SCHEDULING_UNAVAILABLE;
      }
    } catch {
      /* ignore JSON parse */
    }
    return import.meta.env.DEV ? error.message : SCHEDULING_UNAVAILABLE;
  }
  if (error instanceof FunctionsRelayError) {
    if (import.meta.env.DEV) {
      console.warn("[strategy-session] Function relay error.", error.message);
    }
    return SCHEDULING_UNAVAILABLE;
  }
  if (error instanceof FunctionsFetchError) {
    const c = error.context;
    const extra = c instanceof Error ? c.message : "";
    const base = extra ? `${error.message} — ${extra}` : error.message;
    if (/failed to fetch|networkerror|load failed/i.test(base)) {
      if (import.meta.env.DEV) {
        console.warn(
          "[strategy-session] Function fetch failed — check .env (real Supabase URL + VITE_ keys), deploy edge functions, CORS/origin.",
          base,
        );
      }
      return SCHEDULING_UNAVAILABLE;
    }
    return import.meta.env.DEV ? base : SCHEDULING_UNAVAILABLE;
  }
  if (error instanceof Error) return import.meta.env.DEV ? error.message : SCHEDULING_UNAVAILABLE;
  return import.meta.env.DEV ? "Unknown error" : SCHEDULING_UNAVAILABLE;
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
  ensureSupabaseForEdgeFunctions();
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

export async function processSquareStrategySessionPayment(input: {
  sourceId: string;
  idempotencyKey: string;
  buyerEmail?: string;
  applicationId?: string;
}): Promise<{
  ok?: boolean;
  squarePaymentId?: string;
  status?: string;
  error?: string;
}> {
  ensureSupabaseForEdgeFunctions();
  const { data, error } = await supabase.functions.invoke("square-strategy-session-payment", {
    body: {
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      ...(input.buyerEmail?.trim() ? { buyerEmail: input.buyerEmail.trim() } : {}),
      ...(input.applicationId?.trim() ? { applicationId: input.applicationId.trim() } : {}),
    },
  });
  if (error) {
    return { ok: false, error: await messageFromFunctionInvokeError(error) };
  }
  const body = (data || {}) as {
    ok?: boolean;
    squarePaymentId?: string;
    status?: string;
    error?: string;
  };
  if (body.error && !body.squarePaymentId) {
    return { ok: false, error: body.error };
  }
  return body;
}

export async function processSquareTelegramSubscriptionPayment(input: {
  sourceId: string;
  idempotencyKey: string;
  email: string;
  fullName: string;
}): Promise<{
  ok?: boolean;
  squareSubscriptionId?: string;
  status?: string;
  joinLink?: string;
  error?: string;
}> {
  ensureSupabaseForEdgeFunctions();
  const { data, error } = await supabase.functions.invoke("square-telegram-subscription-payment", {
    body: {
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      email: input.email.trim(),
      fullName: input.fullName.trim(),
    },
  });
  if (error) {
    throw new Error(await messageFromFunctionInvokeError(error));
  }
  return (data || {}) as {
    ok?: boolean;
    squareSubscriptionId?: string;
    status?: string;
    joinLink?: string;
    error?: string;
  };
}

export async function submitStrategySessionBooking(
  intake: IntakeValues,
  slotStartIso: string,
  timezone: string,
  options?: {
    squarePaymentId?: string;
    promoCode?: string;
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
  const pay = options?.squarePaymentId?.trim();
  const promo = options?.promoCode?.trim();
  if (!pay && !promo) {
    throw new Error("Payment or a valid promo code is required to complete booking.");
  }
  ensureSupabaseForEdgeFunctions();
  const code = intake.employeeReferenceCode?.trim();
  const leadSource = readFreeAuditAttribution();
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
      ...(pay ? { squarePaymentId: pay } : {}),
      ...(promo ? { promoCode: promo } : {}),
      ...(code ? { employeeReferenceCode: code.toUpperCase() } : {}),
      ...(options?.bookingKind ? { bookingKind: options.bookingKind } : {}),
      leadSource,
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
  opts?: { guestHtml?: string; guestSubject?: string; generatedBy?: "human" | "gemini" | "system" },
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
      ...(opts?.generatedBy !== undefined ? { generatedBy: opts.generatedBy } : {}),
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

export async function generateLeadConfirmationDraft(input: {
  meetingId?: string;
  fullName?: string | null;
  businessName?: string | null;
  email?: string | null;
  meetingDate?: string;
  timezone?: string | null;
  sessionType?: string | null;
  hostName?: string | null;
}): Promise<{ subject: string; bodyHtml: string; rationale?: string; generatedBy: "gemini" }> {
  const { data, error } = await supabase.functions.invoke("leads-email-draft-generate", {
    body: {
      templateType: "lead_confirmation",
      lead: {
        meetingId: input.meetingId,
        fullName: input.fullName ?? undefined,
        businessName: input.businessName ?? undefined,
        email: input.email ?? undefined,
        meetingDate: input.meetingDate,
        timezone: input.timezone ?? undefined,
        sessionType: input.sessionType ?? undefined,
        hostName: input.hostName ?? undefined,
      },
    },
  });
  if (error) {
    throw new Error(await messageFromFunctionInvokeError(error));
  }
  return (data || {}) as { subject: string; bodyHtml: string; rationale?: string; generatedBy: "gemini" };
}
