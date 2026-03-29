import type { BoardItem } from "../types";

/** Category for template library. */
export type TemplateCategory =
  | "Campaign"
  | "Creative"
  | "Strategy"
  | "Business"
  | "Social"
  | "Elite";

/** Optional AI integration (future KORA Assistant). */
export interface TemplateAIPrompts {
  contextBuilder: string;
  recommendedQueries: string[];
}

export interface InspiredTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  previewImage?: string;
  /** Generate board items for this template. Returns positioned columns, notes, text. */
  generateBoard: (boardId: string, orgId: string) => BoardItem[];
  /** TODO: Connect to KORA Assistant for guided prompts. */
  aiPrompts?: TemplateAIPrompts;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Campaign",
  "Creative",
  "Strategy",
  "Business",
  "Social",
  "Elite",
];

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  Campaign: "Campaign",
  Creative: "Creative",
  Strategy: "Strategy",
  Business: "Business",
  Social: "Social",
  Elite: "Elite",
};
