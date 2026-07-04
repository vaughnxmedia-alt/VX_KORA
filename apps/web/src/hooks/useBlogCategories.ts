import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sortBlogCategories, type BlogCategoryRecord } from "@/lib/blog-categories";

type UseBlogCategoriesOptions = {
  includeInactive?: boolean;
  enabled?: boolean;
};

export function useBlogCategories(options: UseBlogCategoriesOptions = {}) {
  const { includeInactive = false, enabled = true } = options;
  const [categories, setCategories] = useState<BlogCategoryRecord[]>([]);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    let query = supabase
      .from("blog_categories")
      .select("id, name, slug, display_order, is_active, created_at, updated_at")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to load blog categories:", error.message);
      setCategories([]);
    } else {
      setCategories(sortBlogCategories((data ?? []) as BlogCategoryRecord[]));
    }
    setLoading(false);
  }, [enabled, includeInactive]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { categories, loading, refresh };
}
