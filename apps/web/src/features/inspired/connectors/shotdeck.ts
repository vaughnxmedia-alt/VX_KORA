import type { Connector } from "./types";
import type { SearchFilters, SearchResult } from "./types";

// TODO: Integrate official Shotdeck API when available. No scraping.
export const shotdeckConnector: Connector = {
  name: "Shotdeck",

  async search(_query: string, _filters?: SearchFilters): Promise<SearchResult[]> {
    // Stub: return placeholder results for UI development.
    return [
      {
        id: "shotdeck-stub-1",
        title: "Shotdeck result (stub)",
        type: "image",
        thumbnailUrl: null,
        sourceName: "Shotdeck",
        sourceUrl: "https://shotdeck.com",
        tags: ["stub"],
      },
    ];
  },

  async getDetails(id: string): Promise<SearchResult | null> {
    if (!id.startsWith("shotdeck-")) return null;
    return {
      id,
      title: "Shotdeck result (stub)",
      type: "image",
      thumbnailUrl: null,
      sourceName: "Shotdeck",
      sourceUrl: "https://shotdeck.com",
    };
  },
};
