export const BLOG_UNCATEGORIZED = "Uncategorized";

/** Legacy post.category values mapped to current admin-managed names. */
export const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  "Brand Authority": "Visionary Highlight",
  "Educational Frameworks": "Educational Series",
};

export function normalizeBlogPostCategory(category: string | null | undefined): string {
  const value = category?.trim() || "";
  return LEGACY_CATEGORY_ALIASES[value] ?? value;
}

export type BlogCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string | null;
};

export function slugifyCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sortBlogCategories<T extends { display_order: number; name: string }>(
  categories: T[],
): T[] {
  return [...categories].sort(
    (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name),
  );
}

export async function ensureUniqueCategorySlug(
  baseSlug: string,
  existingSlugs: Set<string>,
  currentSlug?: string | null,
): Promise<string> {
  let slug = baseSlug || "category";
  if (currentSlug && slug === currentSlug) return slug;

  if (!existingSlugs.has(slug)) return slug;

  let suffix = 2;
  while (existingSlugs.has(`${slug}-${suffix}`)) {
    suffix += 1;
  }
  return `${slug}-${suffix}`;
}

export function formatBlogCategoryError(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as { message?: string; code?: string; hint?: string };
    if (record.code === "42P01" || record.message?.includes("blog_categories")) {
      return "Blog categories table is missing. Run the Supabase migration (20260704200000_blog_categories).";
    }
    if (record.code === "42501" || record.message?.toLowerCase().includes("row-level security")) {
      return "You do not have permission to manage blog categories. Admin access is required.";
    }
    if (record.message) return record.message;
  }
  if (error instanceof Error) return error.message;
  return "Could not save category.";
}
