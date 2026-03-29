import { useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCustomFonts, removeCustomFont, type CustomFont } from "./fonts";
import { uploadFontFile, isFontFile } from "./uploadFont";

export interface InspiredFontsTabProps {
  customFonts: CustomFont[];
  onFontsChange: () => void;
}

export function InspiredFontsTab({ customFonts, onFontsChange }: InspiredFontsTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isFontFile(file)) {
      setError("Please upload a font file (.ttf, .otf, .woff, .woff2).");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const added = await uploadFontFile(file);
      if (added) onFontsChange();
    } catch (err) {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (id: string) => {
    removeCustomFont(id);
    onFontsChange();
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <h3 className="text-sm font-medium text-white/90">Custom fonts</h3>
      <p className="text-xs text-white/50">
        Upload .ttf, .otf, .woff, or .woff2 files. They will appear in the Inspector when editing text.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
        className="hidden"
        onChange={handleUpload}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full rounded-lg border-white/20 bg-white/5 text-white hover:bg-white/10"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="w-4 h-4 mr-2" />
        {uploading ? "Uploading…" : "Upload font"}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <ul className="space-y-2 min-h-0 overflow-auto">
        {customFonts.length === 0 ? (
          <li className="text-white/40 text-xs">No custom fonts yet.</li>
        ) : (
          customFonts.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-white/5 border border-white/10"
            >
              <span className="text-sm text-white/90 truncate" style={{ fontFamily: f.fontFamily }}>
                {f.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-white/50 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => handleRemove(f.id)}
                title="Remove font"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
