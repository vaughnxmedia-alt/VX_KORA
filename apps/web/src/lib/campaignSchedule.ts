import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_CAMPAIGN_TIMEZONE = "America/Chicago";

export const CAMPAIGN_TIMEZONE_OPTIONS = [
  { value: "America/Chicago", label: "Central Time (America/Chicago)" },
  { value: "America/New_York", label: "Eastern Time (America/New_York)" },
  { value: "America/Denver", label: "Mountain Time (America/Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (America/Los_Angeles)" },
  { value: "America/Puerto_Rico", label: "Atlantic (America/Puerto_Rico)" },
] as const;

export async function computeNextCampaignSendIso(
  cadence: string,
  sendTime: string,
  sendDayOfWeek: string | null,
  timezone: string = DEFAULT_CAMPAIGN_TIMEZONE,
): Promise<string | null> {
  if (cadence === "one_time") return null;

  const normalizedTime = sendTime.length === 5 ? `${sendTime}:00` : sendTime;
  const { data, error } = await supabase.rpc("compute_subscriber_campaign_next_send", {
    p_cadence: cadence,
    p_send_time: normalizedTime,
    p_send_day_of_week: sendDayOfWeek,
    p_timezone: timezone || DEFAULT_CAMPAIGN_TIMEZONE,
  });

  if (error) throw error;
  return (data as string | null) ?? null;
}

export function formatCampaignSendPreview(
  iso: string | null | undefined,
  timezone: string = DEFAULT_CAMPAIGN_TIMEZONE,
): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
