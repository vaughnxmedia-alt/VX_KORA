import { isBlogPostPubliclyLive } from "@/lib/blog-publish-schedule";
import { resolvePublicationStatus } from "@/lib/blog-publication-status";

/** Fields needed to build Featured / Hot / grid sections on The Brief. */
export type BriefListingPost = {
  id: string;
  slug?: string | null;
  title: string;
  description: string;
  category: string;
  read_time: string;
  published_date: string;
  publish_scheduled_at?: string | null;
  author_name: string;
  cover_image_url?: string;
  status?: string | null;
  publication_status?: string | null;
  is_hidden?: boolean | null;
  is_featured?: boolean | null;
  is_hot_topic?: boolean | null;
  promo_featured?: boolean | null;
  promo_editors_pick?: boolean | null;
  promo_trending?: boolean | null;
  promo_homepage_shuffle?: boolean | null;
  feature_priority?: number | null;
};

function publishInstantMs<T extends BriefListingPost>(p: T): number {
  if (p.publish_scheduled_at) return new Date(p.publish_scheduled_at).getTime();
  return new Date(p.published_date).getTime();
}

function byPublishedDesc<T extends BriefListingPost>(a: T, b: T) {
  return publishInstantMs(b) - publishInstantMs(a);
}

export function filterLiveBriefPosts<T extends BriefListingPost>(articles: T[]): T[] {
  return articles.filter((a) => {
    if (resolvePublicationStatus(a) !== "live") return false;
    return isBlogPostPubliclyLive({
      publishedDate: a.published_date,
      publishScheduledAt: a.publish_scheduled_at,
      status: "published",
      isHidden: false,
      publicationStatus: "live",
    });
  });
}

/**
 * @deprecated Prefer deriveBriefHomepageLayout for The Brief homepage.
 * Kept for category-filtered views and Events page reuse.
 */
export function deriveBriefPageSections<T extends BriefListingPost>(
  articlesFromApi: T[],
  selectedCategory: string
) {
  const live = filterLiveBriefPosts(articlesFromApi).sort(byPublishedDesc);

  const inCategory = (a: T) =>
    selectedCategory === "All" || a.category === selectedCategory;

  const pool = live.filter(inCategory);
  const featuredInPool = pool.filter((a) => a.promo_featured ?? a.is_featured).sort(byPublishedDesc);
  const heroArticle = featuredInPool[0] ?? pool[0];

  const heroId = heroArticle?.id;

  const hotArticles = live
    .filter((a) => inCategory(a) && (a.promo_trending ?? a.is_hot_topic) && a.id !== heroId)
    .sort(byPublishedDesc);

  const hotIds = new Set(hotArticles.map((a) => a.id));

  const gridArticles = pool.filter(
    (a) => a.id !== heroId && !hotIds.has(a.id)
  );

  return { heroArticle, hotArticles, gridArticles };
}
