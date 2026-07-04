import { supabase } from "@/integrations/supabase/client";

const BUCKET = "sponsor-request-logos";

export async function uploadSponsorRequestLogo(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file for your company logo.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Logo must be smaller than 5MB.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `requests/${fileName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
