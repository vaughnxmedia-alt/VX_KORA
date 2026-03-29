import { campaignTemplates } from "./campaignTemplates";
import { creativeTemplates } from "./creativeTemplates";
import { strategyTemplates } from "./strategyTemplates";
import { businessTemplates } from "./businessTemplates";
import { socialTemplates } from "./socialTemplates";
import { eliteTemplates } from "./eliteTemplates";
import type { InspiredTemplate, TemplateCategory } from "./types";

export type { InspiredTemplate, TemplateCategory, TemplateAIPrompts } from "./types";
export { TEMPLATE_CATEGORIES, CATEGORY_LABELS } from "./types";

export const ALL_TEMPLATES: InspiredTemplate[] = [
  ...campaignTemplates,
  ...creativeTemplates,
  ...strategyTemplates,
  ...businessTemplates,
  ...socialTemplates,
  ...eliteTemplates,
];

export function getTemplatesByCategory(category: TemplateCategory): InspiredTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): InspiredTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}
