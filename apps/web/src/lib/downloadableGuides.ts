/** Registry of downloadable PDF guides — add entries as new guides ship. */
export type DownloadableGuide = {
  id: string;
  seriesLabel: string;
  productLabel: string;
  /** Supabase table for download rows */
  table: "making_of_a_brand_pdf_downloads";
  messageType: string;
  hubPath: string;
};

export const DOWNLOADABLE_GUIDES: DownloadableGuide[] = [
  {
    id: "making_of_a_brand",
    seriesLabel: "The Making of a Brand",
    productLabel: "Before You Build the Brand — starter guide (22-page PDF)",
    table: "making_of_a_brand_pdf_downloads",
    messageType: "making_of_a_brand_pdf",
    hubPath: "/the-brief/before-you-build-the-brand-starter-guide",
  },
];

export function getDownloadableGuide(id: string) {
  return DOWNLOADABLE_GUIDES.find((g) => g.id === id) ?? DOWNLOADABLE_GUIDES[0];
}
