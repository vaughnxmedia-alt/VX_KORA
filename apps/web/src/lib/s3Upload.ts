import { supabase, supabaseUrl, supabasePublishableKey } from "@/integrations/supabase/client";

/**
 * S3 key prefixes for video uploads via `upload-to-s3` (same bucket as the content calendar).
 * Keep in sync with any bucket policies or migration scripts.
 */
export const S3_VIDEO_FOLDERS = {
  /** Content calendar scheduled posts */
  contentCalendar: "scheduled-posts/videos",
  /** Blog post body video (dashboard editor) */
  blog: "blog/videos",
  /** Get Inspired / creative assets (video files only; images stay on Supabase below) */
  inspired: "inspired/videos",
  /**
   * Static marketing assets (e.g. PR vs marketing mp4). Upload outside the app (AWS CLI, CI)
   * and set `VITE_PR_VS_MARKETING_VIDEO_URL` to the resulting public object URL.
   */
  site: "site/videos",
  /** Asset Library — per-audit diagnosis / client videos */
  assetLibraryAudit: "asset-library/audits",
} as const;

export function s3AuditVideoFolder(auditId: string): string {
  return `${S3_VIDEO_FOLDERS.assetLibraryAudit}/${auditId}/videos`;
}

export interface UploadToS3Options {
  file: File;
  bucketName?: string; // Optional, will use default from edge function
  folder?: string;
  fileType?: "video" | "image";
  onProgress?: (progress: number) => void;
}

/**
 * Uploads a file to S3 using a Supabase Edge Function that generates
 * a presigned URL, then uploading directly from the client to S3.
 *
 * This avoids memory limits in Edge Functions because the file data
 * never passes through the function — only metadata does.
 */
export const uploadToS3 = async ({
  file,
  folder = "",
  fileType = "video",
  onProgress,
}: UploadToS3Options): Promise<string> => {
  try {
    // Get the current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error("You must be authenticated to upload files.");
    }

    // 1) Ask Edge Function for a presigned URL (metadata only)
    const response = await fetch(`${supabaseUrl}/functions/v1/upload-to-s3`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabasePublishableKey,
      },
      body: JSON.stringify({
        fileName: file.name,
        folder,
        contentType: file.type || (fileType === "video" ? "video/mp4" : "image/jpeg"),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Failed to get presigned URL (status ${response.status})`);
    }

    const { presignedUrl, publicUrl } = await response.json();

    if (!presignedUrl || !publicUrl) {
      throw new Error("Edge Function did not return a presignedUrl/publicUrl");
    }

    // 2) Upload directly to S3 using the presigned URL
    // If onProgress handler is provided, use XHR for progress events
    if (onProgress) {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            onProgress(parseFloat(percent.toFixed(2)));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("S3 upload failed"));
        });

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type || (fileType === "video" ? "video/mp4" : "image/jpeg"));
        xhr.send(file);
      });
    } else {
      // Simple upload with fetch if no progress tracking is needed
      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || (fileType === "video" ? "video/mp4" : "image/jpeg"),
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => "");
        throw new Error(`S3 upload failed: ${uploadResponse.status} ${errorText}`);
      }
    }

    // 3) Return the public URL of the uploaded file
    return publicUrl as string;
  } catch (error: any) {
    console.error("S3 upload error:", error);
    throw new Error(error.message || "Failed to upload file to S3");
  }
};

