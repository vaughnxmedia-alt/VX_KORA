import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardCopy, FileUp, Loader2, Mic, Send, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  createSignedIntakeAssetUrl,
  fetchIntakePipelineRows,
  uploadStrategySessionIntakeAsset,
  type IntakePipelineRow,
} from "@/lib/brandIdentityScope";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

/** KORA Telegram bot — same as ShareLeadMagnetLinksDialog / subscription flow */
const TELEGRAM_BOT_URL = "https://t.me/VX_kora_bot";

const FILE_ACCEPT =
  ".pdf,.doc,.docx,.txt,.md,.csv,image/*,audio/mpeg,audio/mp3,audio/wav,audio/x-m4a,audio/mp4,.mp3,.m4a,.wav,.webm,.aac";

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

function displayName(row: { business_name: string | null; first_name: string | null; last_name: string | null }) {
  if (row.business_name?.trim()) return row.business_name.trim();
  const n = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return n || "—";
}

function sessionLabel(sessionType: string | null | undefined) {
  if (!sessionType) return "—";
  if (sessionType === "zoom") return "Zoom";
  if (sessionType === "in_person") return "In person";
  return sessionType;
}

function inferKind(file: File): "document" | "recording" {
  if (file.type.startsWith("audio/")) return "recording";
  if (/\.(mp3|m4a|wav|aac|webm|ogg)$/i.test(file.name)) return "recording";
  return "document";
}

export default function IntakePipelinePage() {
  const queryClient = useQueryClient();
  const [openingPath, setOpeningPath] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["customers-pending-intake"],
    queryFn: fetchIntakePipelineRows,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ meetingId, files }: { meetingId: string; files: File[] }) => {
      for (const file of files) {
        if (file.size > MAX_UPLOAD_BYTES) {
          throw new Error(`${file.name} is too large (max 500 MB).`);
        }
        await uploadStrategySessionIntakeAsset(meetingId, file, inferKind(file));
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers-pending-intake"] });
      toast.success("Upload complete");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Upload failed");
    },
  });

  const handleFiles = (meetingId: string, list: FileList | null) => {
    if (!list?.length) return;
    uploadMutation.mutate({ meetingId, files: Array.from(list) });
  };

  const openSigned = async (storagePath: string) => {
    setOpeningPath(storagePath);
    try {
      const url = await createSignedIntakeAssetUrl(storagePath);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error("Could not open file");
    } finally {
      setOpeningPath(null);
    }
  };

  const intakeUrl =
    typeof window !== "undefined" ? `${window.location.origin}/strategy-session` : "/strategy-session";

  const copyIntakeLink = async () => {
    try {
      await navigator.clipboard.writeText(intakeUrl);
      toast.success("Intake link copied");
    } catch {
      toast.error("Could not copy — copy the URL manually.");
    }
  };

  const copyTelegramLink = async () => {
    try {
      await navigator.clipboard.writeText(TELEGRAM_BOT_URL);
      toast.success("Telegram link copied");
    } catch {
      toast.error(`Could not copy — open ${TELEGRAM_BOT_URL}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Intake</h1>
          <p className="text-muted-foreground max-w-2xl">
            After you <strong>confirm</strong> a paid Strategy Session in{" "}
            <Link to="/dashboard/leads" className="text-primary underline-offset-4 hover:underline">
              Leads
            </Link>
            , the lead appears here. Run the Zoom or in-person session, then upload notes, exports, or an MP3 voice
            recording. When you generate their Brand Identity, they leave this list.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={() => void copyIntakeLink()}>
            <ClipboardCopy className="h-4 w-4 mr-2" />
            Copy intake link
          </Button>
          <Button type="button" variant="default" size="sm" onClick={() => void copyTelegramLink()}>
            <Send className="h-4 w-4 mr-2" />
            Copy Telegram link
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Confirmed sessions — pending Identity ({rows.length})
          </CardTitle>
          <CardDescription>
            Uploads are stored securely and linked to the meeting. MP3/M4A/WAV recordings are tagged as recordings;
            everything else counts as documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              No confirmed Strategy Session leads still waiting on an Identity report—or confirm bookings in Leads
              first.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization / name</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Uploads</TableHead>
                  <TableHead className="w-[140px]">Add files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <IntakeRow
                    key={row.meeting_id}
                    row={row}
                    openingPath={openingPath}
                    onOpen={openSigned}
                    onPickFiles={(files) => handleFiles(row.meeting_id, files)}
                    uploading={uploadMutation.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IntakeRow({
  row,
  openingPath,
  onOpen,
  onPickFiles,
  uploading,
}: {
  row: IntakePipelineRow;
  openingPath: string | null;
  onOpen: (path: string) => void;
  onPickFiles: (files: FileList | null) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <TableRow>
      <TableCell className="font-medium">{displayName(row)}</TableCell>
      <TableCell className="text-muted-foreground text-sm">{sessionLabel(row.session_type)}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {row.meeting_date ? format(new Date(row.meeting_date), "MMM d, yyyy h:mm a") : "—"}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1.5 max-w-[min(100vw-8rem,28rem)]">
          {row.intake_meeting_assets.length === 0 ? (
            <span className="text-xs text-muted-foreground">None yet</span>
          ) : (
            row.intake_meeting_assets.map((a) => (
              <Button
                key={`${a.storage_path}-${a.uploaded_at}`}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 text-xs font-normal"
                disabled={openingPath === a.storage_path}
                onClick={() => void onOpen(a.storage_path)}
              >
                {a.kind === "recording" ? <Mic className="h-3 w-3 shrink-0" /> : <FileUp className="h-3 w-3 shrink-0" />}
                <span className="truncate max-w-[10rem]">{a.filename}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                  {a.kind === "recording" ? "Audio" : "File"}
                </Badge>
              </Button>
            ))
          )}
        </div>
      </TableCell>
      <TableCell>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          accept={FILE_ACCEPT}
          onChange={(e) => {
            onPickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4 mr-1.5" />}
          Upload
        </Button>
      </TableCell>
    </TableRow>
  );
}
