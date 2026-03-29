import type { Connector } from "./types";
import type { SearchFilters, SearchResult } from "./types";
import { supabase } from "@/integrations/supabase/client";

export const internalConnector: Connector = {
  name: "Internal",

  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const { data: assets, error } = await supabase
      .from("inspired_assets")
      .select("id, filename, public_url, thumbnail_url, mime_type, storage_path, created_at")
      .ilike("filename", `%${query}%`)
      .limit(50);
    if (error) return [];
    return (assets ?? []).map((a) => ({
      id: a.id,
      title: a.filename,
      type: (a.mime_type?.startsWith("video/") ? "video" : "image") as "image" | "video",
      thumbnailUrl: a.thumbnail_url ?? a.public_url ?? null,
      sourceName: "Internal",
      sourceUrl: a.public_url ?? null,
      metadata: { storagePath: (a as { storage_path?: string }).storage_path },
    }));
  },

  async getDetails(id: string): Promise<SearchResult | null> {
    const { data, error } = await supabase
      .from("inspired_assets")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      title: data.filename,
      type: data.mime_type?.startsWith("video/") ? "video" : "image",
      thumbnailUrl: data.thumbnail_url ?? data.public_url ?? null,
      sourceName: "Internal",
      sourceUrl: data.public_url ?? null,
      metadata: { storagePath: data.storage_path },
    };
  },
};
