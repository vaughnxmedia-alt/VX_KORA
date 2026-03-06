import { supabase } from "@/integrations/supabase/client";

const BUCKET = "inspired-assets";
const PATH_PREFIX = "uploads";

export interface UploadedAsset {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  public_url: string | null;
  thumbnail_url: string | null;
}

/**
 * Upload a file to Supabase Storage and insert metadata into inspired_assets.
 * Path: org/default/uploads/{timestamp}_{filename} (TODO: use real org_id when available).
 */
export async function uploadInspiredAsset(file: File): Promise<UploadedAsset | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user?.id ?? undefined;
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${PATH_PREFIX}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData?.publicUrl ?? null;

  const { data: row, error: insertError } = await supabase
    .from("inspired_assets")
    .insert({
      org_id: null,
      uploader_id: uid,
      filename: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      storage_path: storagePath,
      public_url: publicUrl,
      thumbnail_url: null, // TODO: generate thumbnail for images
    })
    .select("id, filename, mime_type, size_bytes, public_url, thumbnail_url")
    .single();

  if (insertError) {
    console.error("Insert inspired_assets error:", insertError);
    return null;
  }

  return row as UploadedAsset;
}
