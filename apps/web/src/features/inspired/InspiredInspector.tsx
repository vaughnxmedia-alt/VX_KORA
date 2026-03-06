import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Upload } from "lucide-react";
import type { BoardItem } from "./types";
import type { TextStyle } from "./types";
import type { CustomFont } from "./fonts";
import { removeCustomFont } from "./fonts";
import { uploadFontFile, isFontFile } from "./uploadFont";

const SYSTEM_FONTS = [
  { value: "inherit", label: "Inherit" },
  { value: "system-ui", label: "System UI" },
  { value: "Inter", label: "Inter" },
  { value: "Georgia", label: "Georgia" },
  { value: "serif", label: "Serif" },
  { value: "sans-serif", label: "Sans Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "cursive", label: "Cursive" },
];

/** Google Fonts loaded via index.html – available in the Inspector font dropdown */
const GOOGLE_FONTS = [
  { value: "Alfa Slab One", label: "Alfa Slab One" },
  { value: "Ballet", label: "Ballet" },
  { value: "Caesar Dressing", label: "Caesar Dressing" },
  { value: "Cinzel Decorative", label: "Cinzel Decorative" },
  { value: "DM Serif Text", label: "DM Serif Text" },
  { value: "Erica One", label: "Erica One" },
  { value: "Funnel Sans", label: "Funnel Sans" },
  { value: "Google Sans Code", label: "Google Sans Code" },
  { value: "Honk", label: "Honk" },
  { value: "Jacquard 24", label: "Jacquard 24" },
  { value: "Luckiest Guy", label: "Luckiest Guy" },
  { value: "Macondo", label: "Macondo" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Tinos", label: "Tinos" },
  { value: "Unifraktur Cook", label: "Unifraktur Cook" },
  { value: "Vend Sans", label: "Vend Sans" },
  { value: "Zalando Sans Expanded", label: "Zalando Sans Expanded" },
];

export interface InspiredInspectorProps {
  selectedItem: BoardItem | null;
  onUpdate: (item: BoardItem) => void;
  onDelete: (id: string) => void;
  onClearSelection: () => void;
  customFonts?: CustomFont[];
  onFontsChange?: () => void;
}

function hasTextStyle(item: BoardItem): item is BoardItem & { textStyle?: TextStyle } {
  return ["note", "text", "link", "column"].includes(item.type);
}

export function InspiredInspector({
  selectedItem,
  onUpdate,
  onDelete,
  onClearSelection,
  customFonts = [],
  onFontsChange,
}: InspiredInspectorProps) {
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [fontUploading, setFontUploading] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const update = useCallback(
    (patch: Partial<BoardItem>) => {
      if (!selectedItem) return;
      onUpdate({ ...selectedItem, ...patch, updatedAt: new Date().toISOString() });
    },
    [selectedItem, onUpdate]
  );

  const updateTextStyle = useCallback(
    (patch: Partial<TextStyle>) => {
      if (!selectedItem || !hasTextStyle(selectedItem)) return;
      const next = { ...(selectedItem.textStyle ?? {}), ...patch };
      update({ textStyle: next } as Partial<BoardItem>);
    },
    [selectedItem, update]
  );

  if (!selectedItem) {
    return (
      <div className="p-6">
        <p className="text-white/50 text-sm">Select an item to edit details.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-auto">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-sm font-medium text-white/90">Inspector</h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <Label className="text-white/60 text-xs">Type</Label>
          <p className="text-white text-sm capitalize mt-1">{selectedItem.type}</p>
        </div>
        <div>
          <Label className="text-white/60 text-xs">Content</Label>
          <Textarea
            value={selectedItem.content}
            onChange={(e) => update({ content: e.target.value })}
            placeholder={selectedItem.type === "column" ? "Column title..." : "Enter content..."}
            className="mt-1 min-h-[80px] rounded-lg bg-white/5 border-white/10 text-white placeholder:text-white/40 resize-none"
          />
        </div>
        {selectedItem.type === "link" && (
          <div>
            <Label className="text-white/60 text-xs">URL</Label>
            <Input
              value={(selectedItem as import("./types").LinkItem).url ?? ""}
              onChange={(e) => update({ url: e.target.value } as Partial<BoardItem>)}
              placeholder="https://..."
              className="mt-1 rounded-lg bg-white/5 border-white/10 text-white"
            />
          </div>
        )}
        {selectedItem.type === "note" && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            <h4 className="text-xs font-medium text-white/70">Border</h4>
            <div>
              <Label className="text-white/60 text-xs">Border Width</Label>
              <Select
                value={String((selectedItem as import("./types").NoteItem).borderWidth ?? 1)}
                onValueChange={(v) => update({ borderWidth: Number(v) } as Partial<BoardItem>)}
              >
                <SelectTrigger className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1b] border-white/10">
                  <SelectItem value="0" className="text-white focus:bg-white/10">None</SelectItem>
                  <SelectItem value="1" className="text-white focus:bg-white/10">Thin (1px)</SelectItem>
                  <SelectItem value="2" className="text-white focus:bg-white/10">Medium (2px)</SelectItem>
                  <SelectItem value="4" className="text-white focus:bg-white/10">Thick (4px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/60 text-xs">Border Color</Label>
              <div className="mt-1 flex gap-1.5">
                {["#fcd34d", "#94a3b8", "#f87171", "#4ade80", "#60a5fa", "#a78bfa", "#0b0b0c"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => update({ borderColor: color } as Partial<BoardItem>)}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-1">
                <Input
                  type="color"
                  value={(selectedItem as import("./types").NoteItem).borderColor ?? "#fcd34d"}
                  onChange={(e) => update({ borderColor: e.target.value } as Partial<BoardItem>)}
                  className="h-8 w-8 rounded p-1 cursor-pointer bg-white/5 border-white/10"
                />
                <Input
                  value={(selectedItem as import("./types").NoteItem).borderColor ?? "#fcd34d"}
                  onChange={(e) => update({ borderColor: e.target.value } as Partial<BoardItem>)}
                  className="flex-1 h-8 rounded bg-white/5 border-white/10 text-white text-xs"
                />
              </div>
            </div>
          </div>
        )}
        {hasTextStyle(selectedItem) && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            <h4 className="text-xs font-medium text-white/70">Typography</h4>
            <div>
              <Label className="text-white/60 text-xs">Font</Label>
              <Select
                value={(selectedItem as { textStyle?: TextStyle }).textStyle?.fontFamily ?? "inherit"}
                onValueChange={(v) => updateTextStyle({ fontFamily: v === "inherit" ? undefined : v })}
              >
                <SelectTrigger className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Inherit" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1b] border-white/10 max-h-[280px]">
                  {SYSTEM_FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="text-white focus:bg-white/10">
                      <span style={f.value !== "inherit" ? { fontFamily: f.value } : undefined}>{f.label}</span>
                    </SelectItem>
                  ))}
                  {GOOGLE_FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="text-white focus:bg-white/10">
                      <span style={{ fontFamily: f.value }}>{f.label}</span>
                    </SelectItem>
                  ))}
                  {customFonts.map((f) => (
                    <SelectItem key={f.id} value={f.fontFamily} className="text-white focus:bg-white/10">
                      <span style={{ fontFamily: f.fontFamily }}>{f.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-white/60 text-xs">Size (px)</Label>
                <Input
                  type="number"
                  min={8}
                  max={200}
                  value={(selectedItem as { textStyle?: TextStyle }).textStyle?.fontSize ?? 14}
                  onChange={(e) => updateTextStyle({ fontSize: Number(e.target.value) || undefined })}
                  className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Color</Label>
                <div className="mt-1 flex gap-1">
                  <Input
                    type="color"
                    value={(selectedItem as { textStyle?: TextStyle }).textStyle?.color ?? "#0b0b0c"}
                    onChange={(e) => updateTextStyle({ color: e.target.value })}
                    className="h-9 w-9 rounded-lg p-1 cursor-pointer bg-white/5 border-white/10"
                  />
                  <Input
                    value={(selectedItem as { textStyle?: TextStyle }).textStyle?.color ?? "#0b0b0c"}
                    onChange={(e) => updateTextStyle({ color: e.target.value })}
                    className="flex-1 h-9 rounded-lg bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-white/60 text-xs">Weight</Label>
                <Select
                  value={(selectedItem as { textStyle?: TextStyle }).textStyle?.fontWeight?.toString() ?? "normal"}
                  onValueChange={(v) => updateTextStyle({ fontWeight: v === "normal" ? undefined : v === "bold" ? "bold" : Number(v) })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1b] border-white/10">
                    <SelectItem value="normal" className="text-white focus:bg-white/10">Normal</SelectItem>
                    <SelectItem value="bold" className="text-white focus:bg-white/10">Bold</SelectItem>
                    <SelectItem value="100" className="text-white focus:bg-white/10">100</SelectItem>
                    <SelectItem value="200" className="text-white focus:bg-white/10">200</SelectItem>
                    <SelectItem value="300" className="text-white focus:bg-white/10">300</SelectItem>
                    <SelectItem value="400" className="text-white focus:bg-white/10">400</SelectItem>
                    <SelectItem value="500" className="text-white focus:bg-white/10">500</SelectItem>
                    <SelectItem value="600" className="text-white focus:bg-white/10">600</SelectItem>
                    <SelectItem value="700" className="text-white focus:bg-white/10">700</SelectItem>
                    <SelectItem value="800" className="text-white focus:bg-white/10">800</SelectItem>
                    <SelectItem value="900" className="text-white focus:bg-white/10">900</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/60 text-xs">Style</Label>
                <Select
                  value={(selectedItem as { textStyle?: TextStyle }).textStyle?.fontStyle ?? "normal"}
                  onValueChange={(v) => updateTextStyle({ fontStyle: v as "normal" | "italic" })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1b] border-white/10">
                    <SelectItem value="normal" className="text-white focus:bg-white/10">Normal</SelectItem>
                    <SelectItem value="italic" className="text-white focus:bg-white/10">Italic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-white/60 text-xs">Align</Label>
              <Select
                value={(selectedItem as { textStyle?: TextStyle }).textStyle?.textAlign ?? "left"}
                onValueChange={(v) => updateTextStyle({ textAlign: v as "left" | "center" | "right" })}
              >
                <SelectTrigger className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1b] border-white/10">
                  <SelectItem value="left" className="text-white focus:bg-white/10">Left</SelectItem>
                  <SelectItem value="center" className="text-white focus:bg-white/10">Center</SelectItem>
                  <SelectItem value="right" className="text-white focus:bg-white/10">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {onFontsChange && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h4 className="text-xs font-medium text-white/70">Custom fonts</h4>
            <p className="text-[11px] text-white/45">Upload .ttf, .otf, .woff, .woff2 to use in the Font dropdown above.</p>
            <input
              ref={fontInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (!isFontFile(file)) {
                  setFontError("Use .ttf, .otf, .woff, or .woff2");
                  return;
                }
                setFontError(null);
                setFontUploading(true);
                try {
                  const added = await uploadFontFile(file);
                  if (added) onFontsChange();
                } catch {
                  setFontError("Upload failed.");
                } finally {
                  setFontUploading(false);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-lg h-8 border-white/20 bg-white/5 text-white hover:bg-white/10 text-xs"
              onClick={() => fontInputRef.current?.click()}
              disabled={fontUploading}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {fontUploading ? "Uploading…" : "Upload font"}
            </Button>
            {fontError && <p className="text-[11px] text-red-400">{fontError}</p>}
            {customFonts.length > 0 && (
              <ul className="space-y-1.5 max-h-24 overflow-auto">
                {customFonts.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-white/5 border border-white/10">
                    <span className="text-[11px] text-white/80 truncate" style={{ fontFamily: f.fontFamily }}>{f.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => { removeCustomFont(f.id); onFontsChange(); }}
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-white/60 text-xs">X</Label>
            <Input
              type="number"
              value={Math.round(selectedItem.x)}
              onChange={(e) => update({ x: Number(e.target.value) || 0 })}
              className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-white/60 text-xs">Y</Label>
            <Input
              type="number"
              value={Math.round(selectedItem.y)}
              onChange={(e) => update({ y: Number(e.target.value) || 0 })}
              className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-white/60 text-xs">Width</Label>
            <Input
              type="number"
              value={Math.round(selectedItem.w)}
              onChange={(e) => update({ w: Math.max(20, Number(e.target.value) || 0) })}
              className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-white/60 text-xs">Height</Label>
            <Input
              type="number"
              value={Math.round(selectedItem.h)}
              onChange={(e) => update({ h: Math.max(20, Number(e.target.value) || 0) })}
              className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onDelete(selectedItem.id);
            onClearSelection();
          }}
          className="w-full rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}
