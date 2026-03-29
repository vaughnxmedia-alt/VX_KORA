/** Public booking / dashboard: "Jocelyn (Jahknowspr)" when subtitle set; otherwise just "Jocelyn". */
export type HostListLabelInput = {
  display_name: string;
  list_subtitle?: string | null;
};

export function formatStrategyHostListLabel(h: HostListLabelInput): string {
  const sub = h.list_subtitle?.trim();
  if (sub) return `${h.display_name.trim()} (${sub})`;
  return h.display_name.trim();
}
