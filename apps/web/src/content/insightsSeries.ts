import type { InsightSeries } from "./types";

export const insightSeries: InsightSeries[] = [
  {
    id: "the-brief",
    name: "The Brief",
    tagline: "Strategic communications and PR analysis",
    description:
      "Written analysis on positioning, media, reputation, and the decisions leaders face before they communicate publicly.",
    href: "/insights/the-brief",
  },
  {
    id: "spam-report",
    name: "SPAM Report",
    tagline: "Social, PR, Advertising, and Marketing",
    description:
      "Clear-eyed analysis of how social, PR, advertising, and marketing intersect—what changed, what matters, and what leaders should watch.",
    href: "/insights/spam-report",
  },
  {
    id: "pr-court",
    name: "PR Court",
    tagline: "Communications decisions under scrutiny",
    description:
      "Long-form examination of public responses, campaigns, controversies, and strategic mistakes—so judgment improves before the next crisis or launch.",
    href: "/insights/pr-court",
    listed: false,
  },
];

export function getInsightSeries(id: InsightSeries["id"]): InsightSeries | undefined {
  return insightSeries.find((s) => s.id === id);
}

export const listedInsightSeries = insightSeries.filter((series) => series.listed !== false);
