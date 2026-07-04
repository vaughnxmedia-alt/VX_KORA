import { DateTime } from "luxon";

/** Eastern time for CMS scheduling; matches RLS `publish_scheduled_at` / `published_date` rules. */
export const BLOG_PUBLISH_TIMEZONE = "America/New_York";

export function isBlogPostPubliclyLive(params: {
  publishedDate: string | null | undefined;
  publishScheduledAt?: string | null | undefined;
  status?: string | null;
  isHidden?: boolean | null;
  publicationStatus?: string | null;
}): boolean {
  const pubStatus = params.publicationStatus?.toLowerCase();
  if (pubStatus === "archived" || pubStatus === "draft") return false;
  if (pubStatus === "live") {
    // Live posts still require a publish date and schedule gate when applicable.
  } else if (params.isHidden === true) return false;

  const st = pubStatus === "live" || pubStatus === "scheduled"
    ? "published"
    : (params.status ?? "published").toLowerCase();
  if (st !== "published" && pubStatus !== "scheduled" && pubStatus !== "live") return false;
  const raw = params.publishedDate?.trim();
  if (!raw) return false;

  const scheduledIso = params.publishScheduledAt?.trim();
  if (scheduledIso) {
    const instant = DateTime.fromISO(scheduledIso, { setZone: true });
    if (!instant.isValid) return false;
    return DateTime.now().toUTC() >= instant.toUTC();
  }

  const pub = DateTime.fromFormat(raw.slice(0, 10), "yyyy-MM-dd", {
    zone: BLOG_PUBLISH_TIMEZONE,
  }).startOf("day");
  if (!pub.isValid) return false;

  const today = DateTime.now().setZone(BLOG_PUBLISH_TIMEZONE).startOf("day");
  return today >= pub;
}

/**
 * Build UTC ISO for DB from the calendar day shown in the picker (local date components)
 * plus HH:mm interpreted as US Eastern wall time on that day.
 */
export function buildPublishScheduledAtIso(
  calendarDay: Date,
  timeHHmm: string
): { publishScheduledAt: string; publishedDateYmd: string } {
  const z = BLOG_PUBLISH_TIMEZONE;
  const y = calendarDay.getFullYear();
  const mo = calendarDay.getMonth() + 1;
  const d = calendarDay.getDate();
  const [hStr, mStr] = timeHHmm.split(":");
  const hour = Math.min(23, Math.max(0, parseInt(hStr ?? "0", 10) || 0));
  const minute = Math.min(59, Math.max(0, parseInt(mStr ?? "0", 10) || 0));
  const dt = DateTime.fromObject(
    { year: y, month: mo, day: d, hour, minute, second: 0, millisecond: 0 },
    { zone: z }
  );
  return {
    publishScheduledAt: dt.toUTC().toISO()!,
    publishedDateYmd: dt.toFormat("yyyy-MM-dd"),
  };
}

/** Dashboard / tooltips: show when a post is scheduled to go public (Eastern). */
export function formatBlogPublishScheduleDisplay(params: {
  publishedDate: string | null | undefined;
  publishScheduledAt: string | null | undefined;
}): string | null {
  const z = BLOG_PUBLISH_TIMEZONE;
  if (params.publishScheduledAt?.trim()) {
    const dt = DateTime.fromISO(params.publishScheduledAt.trim(), { setZone: true }).setZone(z);
    if (!dt.isValid) return null;
    return dt.toFormat("MMM d, yyyy · h:mm a") + " ET";
  }
  const raw = params.publishedDate?.trim();
  if (!raw) return null;
  const d = DateTime.fromFormat(raw.slice(0, 10), "yyyy-MM-dd", { zone: z }).startOf("day");
  if (!d.isValid) return null;
  return d.toFormat("MMM d, yyyy · h:mm a") + " ET";
}
