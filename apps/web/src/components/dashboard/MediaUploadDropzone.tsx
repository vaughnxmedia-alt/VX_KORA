import { useRef } from "react";
import { Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MEDIA_UPLOAD_ACCEPT, MEDIA_UPLOAD_HINT } from "@/lib/clientMedia";

type MediaUploadDropzoneProps = {
  id: string;
  label?: string;
  accept?: string;
  hint?: string;
  multiple?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  onFiles: (files: FileList | null) => void;
  className?: string;
};

export function MediaUploadDropzone({
  id,
  label = "Upload Content",
  accept = MEDIA_UPLOAD_ACCEPT,
  hint = MEDIA_UPLOAD_HINT,
  multiple = true,
  disabled = false,
  uploading = false,
  onFiles,
  className,
}: MediaUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-base font-semibold">{label}</Label>
      <div
        className={cn(
          "border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center transition-colors",
          disabled || uploading
            ? "opacity-60 cursor-not-allowed"
            : "hover:border-primary/50 cursor-pointer",
        )}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled && !uploading) inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={accept}
          disabled={disabled || uploading}
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {uploading ? "Uploading…" : "Click to upload or drag and drop"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </div>
    </div>
  );
}
