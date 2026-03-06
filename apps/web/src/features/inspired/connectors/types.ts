export interface SearchFilters {
  industry?: string;
  audience?: string;
  platform?: string;
  campaignGoal?: string;
  assetType?: "image" | "video" | "article";
  timeRange?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  type: "image" | "video" | "article" | "asset";
  thumbnailUrl: string | null;
  sourceName: string;
  sourceUrl: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ResultDetails extends SearchResult {
  description?: string;
  summary?: string;
}

export interface Connector {
  readonly name: string;
  search(query: string, filters?: SearchFilters): Promise<SearchResult[]>;
  getDetails(id: string): Promise<ResultDetails | null>;
}
