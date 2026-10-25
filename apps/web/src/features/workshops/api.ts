import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const WORKSHOP_SLUG = "make-your-business-make-sense";
export const WORKSHOP_PATH = "/experiences/make-your-business-make-sense";

export type PublicWorkshop = {
  ok: boolean;
  code?: string;
  slug?: string;
  title?: string;
  host_name?: string;
  format_label?: string;
  audience_label?: string;
  duration_minutes?: number;
  starts_at?: string | null;
  timezone?: string | null;
  capacity?: number | null;
  price_cents?: number | null;
  currency?: string;
  cancellation_terms?: string | null;
  preparation_notes?: string | null;
  registration_open?: boolean;
  configured?: boolean;
  purchasable?: boolean;
  confirmed_count?: number;
  seats_remaining?: number | null;
};

export type WorkshopRegistrationStatus = {
  ok: boolean;
  code?: string;
  status?: string;
  full_name?: string;
  email?: string;
  confirmation_email_status?: string;
  amount_cents?: number;
  currency?: string;
  event?: PublicWorkshop;
};

export async function fetchPublicWorkshop(): Promise<PublicWorkshop> {
  const { data, error } = await supabase.rpc("workshop_event_public", { p_slug: WORKSHOP_SLUG });
  if (error) throw error;
  return data as PublicWorkshop;
}

export async function fetchWorkshopStatus(token: string): Promise<WorkshopRegistrationStatus> {
  const { data, error } = await supabase.rpc("workshop_registration_status", { p_token: token });
  if (error) throw error;
  return data as WorkshopRegistrationStatus;
}

export async function messageFromCheckoutError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json() as { error?: string };
      if (body.error) return body.error;
    } catch {
      /* ignore */
    }
  }
  return "Payment could not be completed. Please try again.";
}
