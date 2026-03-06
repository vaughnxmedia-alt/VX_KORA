import type { Connector } from "./types";
import type { SearchFilters, SearchResult } from "./types";

// TODO: Integrate Motion Array official API when available.
export const motionArrayConnector: Connector = {
  name: "Motion Array",

  async search(_query: string, _filters?: SearchFilters): Promise<SearchResult[]> {
    return [
      {
        id: "motionarray-stub-1",
        title: "Motion Array result (stub)",
        type: "video",
        thumbnailUrl: null,
        sourceName: "Motion Array",
        sourceUrl: "https://motionarray.com",
        tags: ["stub"],
      },
    ];
  },

  async getDetails(id: string): Promise<SearchResult | null> {
    if (!id.startsWith("motionarray-")) return null;
    return {
      id,
      title: "Motion Array result (stub)",
      type: "video",
      thumbnailUrl: null,
      sourceName: "Motion Array",
      sourceUrl: "https://motionarray.com",
    };
  },
};
