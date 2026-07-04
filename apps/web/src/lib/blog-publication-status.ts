export type PublicationStatus = "draft" | "scheduled" | "live" | "archived";

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  live: "Live",
  archived: "Archived",
};

export type PromotionTagKey =
  | "promo_featured"
  | "promo_editors_pick"
  | "promo_trending"
  | "promo_homepage_shuffle";

export const PROMOTION_TAG_LABELS: Record<PromotionTagKey, string> = {
  promo_featured: "Featured",
  promo_editors_pick: "Editor's Pick",
  promo_trending: "Trending",
  promo_homepage_shuffle: "Homepage Shuffle Eligible",
};

export type BlogPublicationFields = {
  publication_status?: PublicationStatus | null;
  status?: string | null;
  is_hidden?: boolean | null;
  publish_scheduled_at?: string | null;
  published_date?: string | null;
};

/** Resolve stored publication status, with legacy fallback when column is unset. */
export function resolvePublicationStatus(post: BlogPublicationFields): PublicationStatus {
  if (post.publication_status) return post.publication_status;
  if (post.is_hidden) return "archived";
  if ((post.status ?? "draft").toLowerCase() === "draft") return "draft";
  if (post.publish_scheduled_at && new Date(post.publish_scheduled_at).getTime() > Date.now()) {
    return "scheduled";
  }
  return "live";
}

export function publicationStatusBadgeClass(status: PublicationStatus): string {
  switch (status) {
    case "live":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "scheduled":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "archived":
      return "border-slate-300 bg-slate-100 text-slate-600";
    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

export function buildPublicationPayload(
  publicationStatus: PublicationStatus,
  params: {
    publishMode: "publish_now" | "schedule";
    publishedDateYmd: string;
    publishScheduledAt: string | null;
    publishedAtIso?: string | null;
  },
): Pick<BlogPublicationFields, "publication_status" | "status" | "is_hidden" | "publish_scheduled_at"> {
  switch (publicationStatus) {
    case "draft":
      return {
        publication_status: "draft",
        status: "draft",
        is_hidden: false,
        publish_scheduled_at: null,
      };
    case "scheduled":
      return {
        publication_status: "scheduled",
        status: "published",
        is_hidden: false,
        publish_scheduled_at: params.publishScheduledAt,
      };
    case "live":
      return {
        publication_status: "live",
        status: "published",
        is_hidden: false,
        publish_scheduled_at: params.publishMode === "schedule" ? params.publishScheduledAt : null,
      };
    case "archived":
      return {
        publication_status: "archived",
        status: "published",
        is_hidden: true,
        publish_scheduled_at: null,
      };
  }
}
