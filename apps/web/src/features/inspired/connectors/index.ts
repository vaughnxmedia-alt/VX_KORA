import { internalConnector } from "./internal";
import { shotdeckConnector } from "./shotdeck";
import { motionArrayConnector } from "./motionarray";
import { adobeStockConnector } from "./adobestock";
import type { Connector } from "./types";

export type { Connector, SearchResult, SearchFilters, ResultDetails } from "./types";

export const connectors: Connector[] = [
  internalConnector,
  shotdeckConnector,
  motionArrayConnector,
  adobeStockConnector,
];

export function getConnector(name: string): Connector | undefined {
  return connectors.find((c) => c.name.toLowerCase() === name.toLowerCase());
}
