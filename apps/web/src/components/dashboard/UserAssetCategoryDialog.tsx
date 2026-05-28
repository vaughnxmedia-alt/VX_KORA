import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Film, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MediaUploadDropzone } from "@/components/dashboard/MediaUploadDropzone";
import {
  fetchAuditMediaBundle,
  openAuditMediaItem,
  openIntakeAsset,
  uploadAuditDoc,
  uploadAuditImage,
  uploadAuditVideo,
  type AssetMediaKind,
  type AssetMediaItem,
  type AuditMediaBundle,
} from "@/lib/assetLibrary";
import type { IntakeMeetingAsset } from "@/lib/brandIdentityScope";

const KIND_META: Record<
  AssetMediaKind,
  { title: string; description: string; icon: typeof Film; accept: string; hint: string }
> = {
  video: {
    title: "Video content",
    description: "Same S3 files as Content Calendar — one upload, visible in both places.",
    icon: Film,
    accept: "video/mp4,video/webm,video/quicktime,video/mov,.mp4,.mov,.webm,.avi",
    hint: "MP4, MOV, AVI, WEBM — stored in S3 (scheduled-posts/videos)",
  },
  image: {
    title: "Images",
    description: "Screenshots and visuals in Supabase (shared with calendar when linked).",
    icon: ImageIcon,
    accept: "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp",
    hint: "PNG, JPG, WEBP, GIF",
  },
  doc: {
    title: "Documents",
    description: "PDFs, notes, and exports stored in Supabase.",
    accept: ".pdf,.doc,.docx,.txt,.md,.csv,application/pdf,text/plain",
    hint: "PDF, DOC, TXT, MD, CSV",
    icon: FileText,
  },
};

type OpenState = {
  auditId: string | null;
  customerId?: string | null;
  businessName: string;
  kind: AssetMediaKind;
  extraDocs?: IntakeMeetingAsset[];
} | null;

function itemsForKind(bundle: AuditMediaBundle, kind: AssetMediaKind): AssetMediaItem[] {
  if (kind === "video") return bundle.videos;
  if (kind === "image") return bundle.images;
  return bundle.docs;
}

function sourceLabel(source: AssetMediaItem["source"]): string {
  if (source === "content_calendar") return "Content calendar";
  if (source === "evidence") return "Research";
  if (source === "storage") return "Storage";
  return "Upload";
}

function MediaTile({
  item,
  onOpen,
  opening,
}: {
  item: AssetMediaItem;
  onOpen: (item: AssetMediaItem) => void;
  opening: boolean;
}) {
  const isVideo = item.kind === "video";
  const isImage = item.kind === "image";

  return (
    <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
      {isVideo && item.viewUrl ? (
        <video
          src={item.viewUrl}
          controls
          className="w-full max-h-48 rounded-md bg-black"
          preload="metadata"
        />
      ) : isImage && item.viewUrl ? (
        <a href={item.viewUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img src={item.viewUrl} alt={item.title} className="w-full max-h-40 object-cover rounded-md" />
        </a>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-md bg-muted text-muted-foreground text-sm">
          {item.kind === "doc" ? "Document" : "Preview unavailable"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" title={item.title}>
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {sourceLabel(item.source)}
          {item.createdAt ? ` · ${format(new Date(item.createdAt), "MMM d, yyyy")}` : ""}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="w-full"
        disabled={!item.viewUrl || opening}
        onClick={() => onOpen(item)}
      >
        {opening ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
        Open
      </Button>
    </div>
  );
}

function IntakeDocRow({
  asset,
  onOpen,
  opening,
}: {
  asset: IntakeMeetingAsset;
  onOpen: (path: string) => void;
  opening: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{asset.filename}</p>
        <p className="text-xs text-muted-foreground">Strategy session · {asset.kind}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={opening}
        onClick={() => onOpen(asset.storage_path)}
      >
        {opening ? <Loader2 className="h-3 w-3 animate-spin" /> : "Open"}
      </Button>
    </div>
  );
}

export function UserAssetCategoryButtons({
  auditId,
  customerId,
  businessName,
  extraDocs,
  className,
}: {
  auditId: string | null;
  customerId?: string | null;
  businessName: string;
  extraDocs?: IntakeMeetingAsset[];
  className?: string;
}) {
  const [open, setOpen] = useState<OpenState>(null);

  return (
    <>
      <div className={className ?? "flex flex-wrap gap-2"}>
        {(["video", "image", "doc"] as const).map((kind) => {
          const Icon = KIND_META[kind].icon;
          const disabled = !auditId && !(kind === "doc" && (extraDocs?.length ?? 0) > 0);
          return (
            <Button
              key={kind}
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={disabled}
              onClick={() => setOpen({ auditId, customerId, businessName, kind, extraDocs })}
            >
              <Icon className="h-4 w-4" />
              {kind === "video" ? "Video" : kind === "image" ? "Images" : "Docs"}
            </Button>
          );
        })}
      </div>
      <UserAssetCategoryDialog open={open} onOpenChange={(next) => setOpen(next)} />
    </>
  );
}

export function UserAssetCategoryDialog({
  open,
  onOpenChange,
}: {
  open: OpenState;
  onOpenChange: (value: OpenState) => void;
}) {
  const queryClient = useQueryClient();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const auditId = open?.auditId ?? "";
  const kind = open?.kind ?? "video";

  const { data: bundle, isLoading, refetch } = useQuery({
    queryKey: ["audit-media-bundle", auditId],
    queryFn: () => fetchAuditMediaBundle(auditId),
    enabled: Boolean(open && auditId),
  });

  const emptyBundle: AuditMediaBundle = { videos: [], images: [], docs: [] };
  const items = itemsForKind(bundle ?? emptyBundle, kind);
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const showIntakeDocs = kind === "doc" && (open?.extraDocs?.length ?? 0) > 0;

  const handleOpenItem = async (item: AssetMediaItem) => {
    setOpeningId(item.id);
    try {
      const ok = await openAuditMediaItem(item);
      if (!ok) toast.error("Could not open file");
    } finally {
      setOpeningId(null);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !open?.auditId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (kind === "video") {
          if (!file.type.startsWith("video/")) {
            toast.error(`${file.name} is not a video file`);
            continue;
          }
          await uploadAuditVideo(open.auditId, file, open.customerId);
        } else if (kind === "image") {
          if (!file.type.startsWith("image/")) {
            toast.error(`${file.name} is not an image`);
            continue;
          }
          await uploadAuditImage(open.auditId, file, open.customerId);
        } else {
          await uploadAuditDoc(open.auditId, file, open.customerId);
        }
      }
      await refetch();
      void queryClient.invalidateQueries({ queryKey: ["asset-library-pre-screening"] });
      toast.success("Upload complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenIntake = async (path: string) => {
    setOpeningId(path);
    try {
      const url = await openIntakeAsset(path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error("Could not open file");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <Dialog open={Boolean(open)} onOpenChange={(v) => !v && onOpenChange(null)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {meta.title}
            {open?.businessName ? ` — ${open.businessName}` : ""}
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {open?.auditId ? (
            <MediaUploadDropzone
              id={`asset-upload-${kind}-${open.auditId}`}
              label="Upload Content"
              accept={meta.accept}
              hint={meta.hint}
              disabled={!open.auditId}
              uploading={uploading}
              onFiles={(files) => void handleUpload(files)}
            />
          ) : (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-6 text-center">
              Link a free audit to this client to upload {kind === "video" ? "videos" : kind === "image" ? "images" : "documents"} here.
            </p>
          )}

          <div className="space-y-3">
            {items.length > 0 && (
              <p className="text-sm font-semibold text-primary">Library ({items.length})</p>
            )}

            {isLoading && open?.auditId ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-8 w-8" />
              </div>
            ) : items.length === 0 && !showIntakeDocs ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No files yet. Upload above or add from Content Calendar — choose this client under &quot;Also show in Asset
                Library&quot; when scheduling a post.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <MediaTile
                    key={item.id}
                    item={item}
                    opening={openingId === item.id}
                    onOpen={(i) => void handleOpenItem(i)}
                  />
                ))}
              </div>
            )}

            {showIntakeDocs && open?.extraDocs && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-semibold">Strategy session intake</p>
                {open.extraDocs.map((asset) => (
                  <IntakeDocRow
                    key={asset.storage_path}
                    asset={asset}
                    opening={openingId === asset.storage_path}
                    onOpen={(path) => void handleOpenIntake(path)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
