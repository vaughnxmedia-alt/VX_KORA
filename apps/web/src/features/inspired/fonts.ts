const BUCKET = "inspired-assets";
const FONTS_PATH_PREFIX = "fonts";
const STORAGE_KEY = "inspired_custom_fonts";

export interface CustomFont {
  id: string;
  name: string;
  /** CSS font-family value (e.g. "My Font", "MyFont") */
  fontFamily: string;
  /** URL to .ttf, .otf, .woff, or .woff2 */
  url: string;
  /** Optional: filename for display */
  filename?: string;
  /** CSS format for @font-face: woff2, woff, truetype, opentype */
  format?: string;
}

function loadStored(): CustomFont[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomFont[];
  } catch {
    return [];
  }
}

function saveStored(fonts: CustomFont[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fonts));
}

/** Get all custom fonts (from localStorage). */
export function getCustomFonts(): CustomFont[] {
  return loadStored();
}

/** Add a custom font (e.g. after upload). Call after uploading file to storage. */
export function addCustomFont(font: CustomFont): void {
  const fonts = loadStored();
  if (fonts.some((f) => f.id === font.id)) return;
  fonts.push(font);
  saveStored(fonts);
}

/** Remove a custom font by id. */
export function removeCustomFont(id: string): void {
  saveStored(loadStored().filter((f) => f.id !== id));
}

/** Derive a safe font-family name from filename (e.g. "My Font Bold.otf" -> "My Font Bold"). */
export function fontFamilyFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .trim() || "Custom Font";
}
