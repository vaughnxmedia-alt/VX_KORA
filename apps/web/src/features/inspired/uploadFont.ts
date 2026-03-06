import { supabase } from "@/integrations/supabase/client";
import { addCustomFont, fontFamilyFromFilename, type CustomFont } from "./fonts";

const BUCKET = "inspired-assets";
const FONTS_PATH_PREFIX = "fonts";

const FONT_TYPES = [
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
  "application/font-woff2",
  "application/font-woff",
  "application/x-font-ttf",
  "application/x-font-otf",
];

export function isFontFile(file: File): boolean {
  const ext = file.name.toLowerCase().split(".").pop();
  if (["ttf", "otf", "woff", "woff2"].includes(ext ?? "")) return true;
  return FONT_TYPES.includes(file.type);
}

/**
 * Upload a font file to Supabase Storage, add to custom fonts list, and return the CustomFont.
 */
export async function uploadFontFile(file: File): Promise<CustomFont | null> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${FONTS_PATH_PREFIX}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });

  if (uploadError) {
    console.error("Font upload error:", uploadError);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const url = urlData?.publicUrl ?? "";

  const ext = (file.name.toLowerCase().match(/\.(ttf|otf|woff2?)$/)?.[1] ?? "ttf") as string;
  const format =
    ext === "woff2" ? "woff2" : ext === "woff" ? "woff" : ext === "otf" ? "opentype" : "truetype";
  const fontFamily = fontFamilyFromFilename(file.name);
  const customFont: CustomFont = {
    id: `font-${timestamp}-${Math.random().toString(36).slice(2, 9)}`,
    name: fontFamily,
    fontFamily: `"${fontFamily}"`,
    url,
    filename: file.name,
    format,
  };

  addCustomFont(customFont);
  return customFont;
}
