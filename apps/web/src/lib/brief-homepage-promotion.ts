import { filterLiveBriefPosts, type BriefListingPost } from "@/lib/brief-listing";

export type BriefPromotionPost = BriefListingPost & {
  promo_featured?: boolean | null;
  promo_editors_pick?: boolean | null;
  promo_trending?: boolean | null;
  promo_homepage_shuffle?: boolean | null;
  feature_priority?: number | null;
};

export type FeaturedInsightSlot = {
  category: string;
  article: BriefPromotionPost | null;
};

/** Maximum articles shown in the Trending section on The Brief. */
export const MAX_TRENDING_ARTICLES = 3;

function publishInstantMs(p: BriefPromotionPost): number {
  if (p.publish_scheduled_at) return new Date(p.publish_scheduled_at).getTime();
  return new Date(p.published_date).getTime();
}

function byPublishedDesc(a: BriefPromotionPost, b: BriefPromotionPost) {
  return publishInstantMs(b) - publishInstantMs(a);
}

function byFeaturePriority(a: BriefPromotionPost, b: BriefPromotionPost) {
  const ap = a.feature_priority ?? 99;
  const bp = b.feature_priority ?? 99;
  if (ap !== bp) return ap - bp;
  return byPublishedDesc(a, b);
}

function pickRandom<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

/** One manually selected hero article for the homepage. */
export function pickEditorsPickHero<T extends BriefPromotionPost>(
  articles: T[],
): T | undefined {
  const live = filterLiveBriefPosts(articles);
  return live.find((article) => article.promo_editors_pick);
}

/**
 * One article per Featured Insights category using shuffle → priority → newest rules.
 */
export function pickFeaturedInsightsByCategory<T extends BriefPromotionPost>(
  articles: T[],
  categoryNames: string[],
  random: () => number = Math.random,
): FeaturedInsightSlot[] {
  const live = filterLiveBriefPosts(articles);

  return categoryNames.map((category) => {
    const inCategory = live.filter((article) => article.category === category);
    if (inCategory.length === 0) return { category, article: null };

    const shufflePool = inCategory.filter((article) => article.promo_homepage_shuffle);
    if (shufflePool.length > 0) {
      return {
        category,
        article: pickRandom(shufflePool, random),
      };
    }

    const featuredPool = inCategory.filter(
      (article) => article.promo_featured ?? article.is_featured,
    );
    if (featuredPool.length > 0) {
      return { category, article: [...featuredPool].sort(byFeaturePriority)[0]! };
    }

    const withPriority = inCategory.filter((article) => article.feature_priority != null);
    if (withPriority.length > 0) {
      return { category, article: [...withPriority].sort(byFeaturePriority)[0]! };
    }

    return { category, article: [...inCategory].sort(byPublishedDesc)[0]! };
  });
}

/** Fisher–Yates shuffle so Featured Insights slide order varies on each page load. */
export function shuffleFeaturedInsightSlots(
  slots: FeaturedInsightSlot[],
  random: () => number = Math.random,
): FeaturedInsightSlot[] {
  const copy = [...slots];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function deriveBriefHomepageLayout<T extends BriefPromotionPost>(
  articles: T[],
  featuredInsightCategories: string[],
  selectedCategory: string,
  random: () => number = Math.random,
) {
  const live = filterLiveBriefPosts(articles).sort(byPublishedDesc);
  const showHomepagePromos = selectedCategory === "All";

  const editorsPick = showHomepagePromos ? pickEditorsPickHero(articles) : undefined;

  const featuredInsights = showHomepagePromos
    ? shuffleFeaturedInsightSlots(
        pickFeaturedInsightsByCategory(articles, featuredInsightCategories, random),
        random,
      )
    : [];

  const excludeIds = new Set<string>();
  if (editorsPick?.id) excludeIds.add(editorsPick.id);
  for (const slot of featuredInsights) {
    if (slot.article?.id) excludeIds.add(slot.article.id);
  }

  const inCategory = (article: T) =>
    selectedCategory === "All" || article.category === selectedCategory;

  const trendingArticles = live
    .filter(
      (article) =>
        inCategory(article) &&
        article.promo_trending &&
        !excludeIds.has(article.id),
    )
    .slice(0, MAX_TRENDING_ARTICLES);

  for (const article of trendingArticles) {
    excludeIds.add(article.id);
  }

  const gridArticles = live.filter(
    (article) => inCategory(article) && !excludeIds.has(article.id),
  );

  return {
    editorsPick,
    featuredInsights,
    trendingArticles,
    gridArticles,
  };
}
