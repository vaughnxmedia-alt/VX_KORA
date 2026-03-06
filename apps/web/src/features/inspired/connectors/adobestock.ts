import type { Connector } from "./types";
import type { SearchFilters, SearchResult } from "./types";

// TODO: Integrate Adobe Stock official API when available.
export const adobeStockConnector: Connector = {
  name: "Adobe Stock",

  async search(_query: string, _filters?: SearchFilters): Promise<SearchResult[]> {
    return [
      {
        id: "adobestock-stub-1",
        title: "Adobe Stock result (stub)",
        type: "image",
        thumbnailUrl: null,
        sourceName: "Adobe Stock",
        sourceUrl: "https://stock.adobe.com",
        tags: ["stub"],
      },
    ];
  },

  async getDetails(id: string): Promise<SearchResult | null> {
    if (!id.startsWith("adobestock-")) return null;
    return {
      id,
      title: "Adobe Stock result (stub)",
      type: "image",
      thumbnailUrl: null,
      sourceName: "Adobe Stock",
      sourceUrl: "https://stock.adobe.com",
    };
  },
};
