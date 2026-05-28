import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { S3_VIDEO_FOLDERS, uploadToS3 } from "@/lib/s3Upload";
import type { AssetMediaKind } from "@/lib/assetLibrary";

export const MEDIA_UPLOAD_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/gif,image/webp,video/mp4,video/mov,video/avi,video/webm,video/quicktime";

export const MEDIA_UPLOAD_HINT = "PNG, JPG, GIF, WEBP, MP4, MOV, AVI";

export function s3StoragePathFromPublicUrl(publicUrl: string): string {
  try {
    return new URL(publicUrl).pathname.replace(/^\//, "");
  } catch {
    return publicUrl;
  }
}

export function isLikelyVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("/videos/") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".avi") ||
    lower.includes("video/")
  );
}

export function filenameFromUrl(url: string, fallback = "media"): string {
  try {
    const name = new URL(url).pathname.split("/").pop();
    return name && name.length > 0 ? decodeURIComponent(name) : fallback;
  } catch {
    return fallback;
  }
}

/** Upload video once to the shared content-calendar S3 prefix (canonical store). */
export async function uploadContentCalendarVideo(file: File): Promise<{
  publicUrl: string;
  storagePath: string;
}> {
  const publicUrl = await uploadToS3({
    file,
    folder: S3_VIDEO_FOLDERS.contentCalendar,
    fileType: "video",
  });
  return { publicUrl, storagePath: s3StoragePathFromPublicUrl(publicUrl) };
}

/** Register an existing file in Asset Library without re-uploading. */
export async function registerAuditMediaReference(params: {
  auditId: string;
  customerId?: string | null;
  assetKind: AssetMediaKind;
  storageProvider: "s3" | "supabase";
  storageBucket: string | null;
  storagePath: string;
  publicUrl: string | null;
  filename: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  linkedFrom?: "content_calendar" | "asset_library" | "manual";
  scheduledPostId?: string | null;
}): Promise<{ created: boolean; id?: string }> {
  const { data: existing } = await supabase
    .from("audit_client_assets")
    .select("id")
    .eq("audit_id", params.auditId)
    .eq("storage_path", params.storagePath)
    .maybeSingle();

  if (existing?.id) {
    return { created: false, id: existing.id };
  }

  const { data: userData } = await supabase.auth.getUser();
  const metadata: Record<string, unknown> = {
    linked_from: params.linkedFrom ?? "manual",
  };
  if (params.scheduledPostId) metadata.scheduled_post_id = params.scheduledPostId;

  const { data, error } = await supabase
    .from("audit_client_assets")
    .insert({
      audit_id: params.auditId,
      customer_id: params.customerId ?? null,
      asset_kind: params.assetKind,
      storage_provider: params.storageProvider,
      storage_bucket: params.storageBucket,
      storage_path: params.storagePath,
      public_url: params.publicUrl,
      filename: params.filename,
      mime_type: params.mimeType ?? null,
      file_size_bytes: params.fileSizeBytes ?? null,
      uploaded_by: userData.user?.id ?? null,
      metadata: metadata as Json,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { created: true, id: data?.id };
}

export async function resolveAuditIdForCustomer(customerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("free_audits")
    .select("id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function linkCalendarVideoToAudit(params: {
  auditId: string;
  customerId?: string | null;
  publicUrl: string;
  storagePath: string;
  filename: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  scheduledPostId?: string | null;
}): Promise<void> {
  await registerAuditMediaReference({
    auditId: params.auditId,
    customerId: params.customerId,
    assetKind: "video",
    storageProvider: "s3",
    storageBucket: null,
    storagePath: params.storagePath,
    publicUrl: params.publicUrl,
    filename: params.filename,
    mimeType: params.mimeType ?? "video/mp4",
    fileSizeBytes: params.fileSizeBytes,
    linkedFrom: "content_calendar",
    scheduledPostId: params.scheduledPostId,
  });
}

export async function linkCalendarImageToAudit(params: {
  auditId: string;
  customerId?: string | null;
  storageBucket: string;
  storagePath: string;
  publicUrl: string;
  filename: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  scheduledPostId?: string | null;
}): Promise<void> {
  await registerAuditMediaReference({
    auditId: params.auditId,
    customerId: params.customerId,
    assetKind: "image",
    storageProvider: "supabase",
    storageBucket: params.storageBucket,
    storagePath: params.storagePath,
    publicUrl: params.publicUrl,
    filename: params.filename,
    mimeType: params.mimeType,
    fileSizeBytes: params.fileSizeBytes,
    linkedFrom: "content_calendar",
    scheduledPostId: params.scheduledPostId,
  });
}
