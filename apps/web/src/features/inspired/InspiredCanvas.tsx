import { useCallback, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { toBlob } from "html-to-image";
import { Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BoardItem, BoardItemType, TextStyle } from "./types";
import {
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_TEXT_WIDTH,
  DEFAULT_TEXT_HEIGHT,
  DEFAULT_SHAPE_WIDTH,
  DEFAULT_SHAPE_HEIGHT,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_COLUMN_HEIGHT,
  DEFAULT_FILE_CARD_WIDTH,
  DEFAULT_FILE_CARD_HEIGHT,
} from "./types";
import { INSPIRED_TOOL, type InspiredTool } from "./constants";
import { DRAG_TYPE_INSPIRED_TOOL, type InspiredToolDragPayload } from "./InspiredRightSidebar";

const DOT_SIZE = 1;
const DOT_GAP = 20;

function textStyleToCss(ts?: TextStyle): React.CSSProperties {
  if (!ts) return {};
  return {
    fontFamily: ts.fontFamily ?? undefined,
    fontSize: ts.fontSize != null ? `${ts.fontSize}px` : undefined,
    color: ts.color ?? undefined,
    fontWeight: ts.fontWeight ?? undefined,
    fontStyle: ts.fontStyle ?? undefined,
    textAlign: ts.textAlign ?? undefined,
  };
}

function createId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createItem(
  type: BoardItemType,
  x: number,
  y: number,
  opts?: { w?: number; h?: number; content?: string; src?: string; filename?: string; sizeBytes?: number; mimeType?: string; assetId?: string; contentJson?: Record<string, unknown> }
): BoardItem {
  const now = new Date().toISOString();
  const base = { id: createId(), x, y, createdAt: now, updatedAt: now };
  switch (type) {
    case "note":
      return { ...base, type: "note", w: opts?.w ?? DEFAULT_NOTE_WIDTH, h: opts?.h ?? DEFAULT_NOTE_HEIGHT, content: opts?.content ?? "" };
    case "text":
      return { ...base, type: "text", w: opts?.w ?? DEFAULT_TEXT_WIDTH, h: opts?.h ?? DEFAULT_TEXT_HEIGHT, content: opts?.content ?? "" };
    case "shape":
      return { ...base, type: "shape", w: opts?.w ?? DEFAULT_SHAPE_WIDTH, h: opts?.h ?? DEFAULT_SHAPE_HEIGHT, content: opts?.content ?? "" };
    case "image":
      return { ...base, type: "image", w: opts?.w ?? 160, h: opts?.h ?? 120, content: opts?.content ?? "", src: opts?.src, contentJson: opts?.contentJson };
    case "link":
      return { ...base, type: "link", w: opts?.w ?? 200, h: opts?.h ?? 40, content: opts?.content ?? "" };
    case "column":
      return { ...base, type: "column", w: opts?.w ?? DEFAULT_COLUMN_WIDTH, h: opts?.h ?? DEFAULT_COLUMN_HEIGHT, content: opts?.content ?? "" };
    case "file":
      return { ...base, type: "file", w: opts?.w ?? DEFAULT_FILE_CARD_WIDTH, h: opts?.h ?? DEFAULT_FILE_CARD_HEIGHT, content: opts?.content ?? "", src: opts?.src, filename: opts?.filename, sizeBytes: opts?.sizeBytes, mimeType: opts?.mimeType, assetId: opts?.assetId };
    default:
      return { ...base, type: "note", w: DEFAULT_NOTE_WIDTH, h: DEFAULT_NOTE_HEIGHT, content: "" };
  }
}

function ColumnElement({
  item,
  title,
  isSelected,
  onUpdateItem,
}: {
  item: import("./types").ColumnItem;
  title: string;
  isSelected: boolean;
  onUpdateItem: (id: string, patch: Partial<BoardItem>) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  const saveTitle = useCallback(() => {
    const trimmed = titleValue.trim() || "New Column";
    onUpdateItem(item.id, { columnTitle: trimmed, content: trimmed });
    setTitleValue(trimmed);
    setEditingTitle(false);
  }, [item.id, titleValue, onUpdateItem]);

  return (
    <div className="w-full h-full rounded-lg bg-slate-100 border-2 border-slate-300 flex flex-col overflow-hidden">
      <div
        className="px-3 py-2 border-b border-slate-300 bg-slate-200/80 font-medium truncate cursor-text"
        style={textStyleToCss(item.textStyle)}
        onClick={(e) => {
          e.stopPropagation();
          setEditingTitle(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {editingTitle ? (
          <input
            ref={inputRef}
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setTitleValue(title);
                setEditingTitle(false);
              }
            }}
            onBlur={saveTitle}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full bg-transparent outline-none font-medium"
            autoFocus
          />
        ) : (
          <span className="truncate">{title}</span>
        )}
      </div>
      <div className="px-2 py-1 text-xs text-slate-500">
        0 cards
      </div>
      <div className="flex-1 min-h-[80px] bg-slate-50/50 p-2">
        <textarea
          className="w-full h-full resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 border-none outline-none"
          placeholder="Start typing..."
          value={item.content === title ? "" : item.content}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => onUpdateItem(item.id, { content: e.target.value })}
        />
      </div>
    </div>
  );
}

export interface InspiredCanvasProps {
  items: BoardItem[];
  selectedId: string | null;
  activeTool: InspiredTool;
  onItemsChange: (items: BoardItem[]) => void;
  onSelect: (id: string | null) => void;
  onDeleteItem?: (id: string) => void;
  onOpenInspiration?: () => void;
}

export interface InspiredCanvasHandle {
  captureAsPng: () => Promise<Blob | null>;
}

type ResizeHandle = "nw" | "ne" | "sw" | "se";

export const InspiredCanvas = forwardRef<InspiredCanvasHandle, InspiredCanvasProps>(function InspiredCanvas({
  items,
  selectedId,
  activeTool,
  onItemsChange,
  onSelect,
  onDeleteItem,
  onOpenInspiration,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const trashBinRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; itemX: number; itemY: number } | null>(null);
  const [resizeState, setResizeState] = useState<{
    id: string;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startItemX: number;
    startItemY: number;
  } | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);

  const MIN_SIZE = 40;
  const updateItem = useCallback(
    (id: string, patch: Partial<BoardItem>) => {
      onItemsChange(
        items.map((i) =>
          i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i
        )
      );
    },
    [items, onItemsChange]
  );

  const CANVAS_MARGIN = 16;

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.DragEvent) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: e.clientX - rect.left + el.scrollLeft - CANVAS_MARGIN,
      y: e.clientY - rect.top + el.scrollTop - CANVAS_MARGIN,
    };
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const openInspiration = e.dataTransfer.getData("text/plain") === "open-inspiration";
      if (openInspiration) {
        onOpenInspiration?.();
        return;
      }
      const raw = e.dataTransfer.getData(DRAG_TYPE_INSPIRED_TOOL);
      if (!raw) return;
      let payload: InspiredToolDragPayload;
      try {
        payload = JSON.parse(raw) as InspiredToolDragPayload;
      } catch {
        return;
      }
      const point = getCanvasPoint(e);
      const toolType = payload.toolType;
      const { w, h } = payload.defaultSize;
      const content = payload.defaultContent ?? "";
      let itemType: BoardItemType = "note";
      if (toolType === INSPIRED_TOOL.STICKY_NOTE) itemType = "note";
      else if (toolType === INSPIRED_TOOL.TEXT) itemType = "text";
      else if (toolType === INSPIRED_TOOL.LINK) itemType = "link";
      else if (toolType === INSPIRED_TOOL.IMAGE) itemType = "image";
      else if (toolType === INSPIRED_TOOL.UPLOAD) itemType = "file";
      else if (toolType === INSPIRED_TOOL.COLUMN) itemType = "column";
      else if (toolType === INSPIRED_TOOL.SHAPE || toolType === INSPIRED_TOOL.PEN) itemType = "shape";
      else return;
      const next = createItem(itemType, point.x, point.y, { w, h, content });
      onItemsChange([...items, next]);
      onSelect(next.id);
    },
    [items, getCanvasPoint, onItemsChange, onSelect, onOpenInspiration]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      const point = getCanvasPoint(e);
      if (activeTool === INSPIRED_TOOL.STICKY_NOTE) {
        const next = createItem("note", point.x, point.y);
        onItemsChange([...items, next]);
        onSelect(next.id);
      } else if (activeTool === INSPIRED_TOOL.TEXT) {
        const next = createItem("text", point.x, point.y);
        onItemsChange([...items, next]);
        onSelect(next.id);
      } else if (activeTool === INSPIRED_TOOL.SHAPE) {
        const next = createItem("shape", point.x, point.y);
        onItemsChange([...items, next]);
        onSelect(next.id);
      } else if (activeTool === INSPIRED_TOOL.COLUMN) {
        const next = createItem("column", point.x, point.y);
        onItemsChange([...items, next]);
        onSelect(next.id);
      } else if (activeTool === INSPIRED_TOOL.IMAGE) {
        const next = createItem("image", point.x, point.y);
        onItemsChange([...items, next]);
        onSelect(next.id);
      } else if (activeTool === INSPIRED_TOOL.LINK) {
        const next = createItem("link", point.x, point.y);
        onItemsChange([...items, next]);
        onSelect(next.id);
      } else {
        onSelect(null);
      }
    },
    [activeTool, items, getCanvasPoint, onItemsChange, onSelect]
  );

  const handleItemMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target.closest("[data-resize-handle]")) return;
      if (target.closest("textarea, input") && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) {
        onSelect(id);
        return;
      }
      const item = items.find((i) => i.id === id);
      if (!item) return;
      onSelect(id);
      setDragState({ id, startX: e.clientX, startY: e.clientY, itemX: item.x, itemY: item.y });
    },
    [items, onSelect]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, id: string, handle: ResizeHandle) => {
      e.stopPropagation();
      const item = items.find((i) => i.id === id);
      if (!item) return;
      onSelect(id);
      setResizeState({
        id,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startW: item.w,
        startH: item.h,
        startItemX: item.x,
        startItemY: item.y,
      });
    },
    [items, onSelect]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (resizeState) {
        const dx = e.clientX - resizeState.startX;
        const dy = e.clientY - resizeState.startY;
        const { id, handle, startW, startH, startItemX, startItemY } = resizeState;
        let w = startW;
        let h = startH;
        let x = startItemX;
        let y = startItemY;
        if (handle === "se") {
          w = Math.max(MIN_SIZE, startW + dx);
          h = Math.max(MIN_SIZE, startH + dy);
        } else if (handle === "sw") {
          w = Math.max(MIN_SIZE, startW - dx);
          h = Math.max(MIN_SIZE, startH + dy);
          x = startItemX + dx;
        } else if (handle === "ne") {
          w = Math.max(MIN_SIZE, startW + dx);
          h = Math.max(MIN_SIZE, startH - dy);
          y = startItemY + dy;
        } else {
          w = Math.max(MIN_SIZE, startW - dx);
          h = Math.max(MIN_SIZE, startH - dy);
          x = startItemX + dx;
          y = startItemY + dy;
        }
        updateItem(id, { w, h, x, y });
        return;
      }
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      onItemsChange(
        items.map((i) =>
          i.id === dragState!.id
            ? { ...i, x: dragState!.itemX + dx, y: dragState!.itemY + dy, updatedAt: new Date().toISOString() }
            : i
        )
      );
    },
    [dragState, resizeState, items, onItemsChange, updateItem]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (dragState && onDeleteItem && trashBinRef.current) {
        const rect = trashBinRef.current.getBoundingClientRect();
        const inTrash =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        if (inTrash) {
          onDeleteItem(dragState.id);
          onSelect(null);
        }
      }
      setDragState(null);
      setResizeState(null);
      setIsOverTrash(false);
    },
    [dragState, onDeleteItem, onSelect]
  );

  const handleMouseMoveForTrash = useCallback(
    (e: React.MouseEvent) => {
      if (trashBinRef.current && dragState) {
        const rect = trashBinRef.current.getBoundingClientRect();
        const over =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        setIsOverTrash(over);
      }
    },
    [dragState]
  );

  const handleMouseLeave = useCallback(() => {
    setDragState(null);
    setResizeState(null);
    setIsOverTrash(false);
  }, []);

  const contentBounds = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    for (const item of items) {
      maxX = Math.max(maxX, item.x + item.w);
      maxY = Math.max(maxY, item.y + item.h);
    }
    return {
      width: Math.max(1200, maxX + 80),
      height: Math.max(600, maxY + 80),
    };
  }, [items]);

  useImperativeHandle(ref, () => ({
    captureAsPng: async () => {
      const el = paperRef.current;
      if (!el) return null;
      try {
        const blob = await toBlob(el, {
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          cacheBust: true,
          includeQueryParams: true,
        });
        return blob;
      } catch (err) {
        console.error("Export PNG failed:", err);
        return null;
      }
    },
  }), []);

  return (
    <div
      className="flex-1 overflow-hidden relative bg-[#0b0b0c]"
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleMouseMoveForTrash(e);
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-auto cursor-crosshair"
        style={{
          backgroundImage: `radial-gradient(circle, #d1d5db ${DOT_SIZE}px, transparent ${DOT_SIZE}px)`,
          backgroundSize: `${DOT_GAP}px ${DOT_GAP}px`,
          backgroundPosition: "0 0",
        }}
        onClick={handleCanvasClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div
          ref={paperRef}
          className="relative rounded-lg bg-white shadow-lg m-2"
          style={{ minWidth: contentBounds.width, minHeight: contentBounds.height }}
        >
          {items.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onMouseDown={(e) => handleItemMouseDown(e, item.id)}
                className={cn(
                  "absolute transition-shadow select-none",
                  item.type === "text"
                    ? "border-0 rounded-none ring-0"
                    : "rounded-lg border-2",
                  item.type === "text"
                    ? isSelected
                      ? "outline outline-1 outline-[#0b0b0c]/20"
                      : ""
                    : isSelected
                      ? "border-[#0b0b0c] shadow-lg ring-2 ring-white/20"
                      : "border-transparent hover:border-white/30"
                )}
                style={{
                  left: item.x,
                  top: item.y,
                  width: item.w,
                  height: item.h,
                }}
              >
                {item.type === "note" && (() => {
                  const noteItem = item as import("./types").NoteItem;
                  const borderWidth = noteItem.borderWidth ?? 1;
                  const borderColor = noteItem.borderColor ?? "rgb(253 230 138 / 0.8)";
                  return (
                    <div
                      className="w-full h-full bg-amber-50 rounded-lg p-3 overflow-hidden"
                      style={{
                        ...textStyleToCss(noteItem.textStyle),
                        borderWidth: borderWidth === 0 ? 0 : borderWidth,
                        borderStyle: borderWidth === 0 ? "none" : "solid",
                        borderColor,
                      }}
                      onClick={(e) => {
                        const isTextarea = (e.target as HTMLElement).closest("textarea");
                        if (isTextarea) {
                          e.stopPropagation();
                          (e.target as HTMLTextAreaElement).focus?.();
                        }
                      }}
                    >
                      <textarea
                        className="w-full h-full resize-none bg-transparent placeholder:text-amber-600/50 border-none outline-none"
                        placeholder="Write a note..."
                        value={item.content}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => updateItem(item.id, { content: e.target.value })}
                      />
                    </div>
                  );
                })()}
                {item.type === "text" && (() => {
                  const textItem = item as import("./types").TextItem;
                  const textStyle = textItem.textStyle ?? {};
                  const fontFamily = textStyle.fontFamily || "Montserrat";
                  const fontWeight = textStyle.fontWeight ?? 700;
                  const color = textStyle.color ?? "#0b0b0c";
                  return (
                    <div
                      className="w-full h-full bg-transparent p-1 min-h-[1em] overflow-hidden"
                      style={{ ...textStyleToCss(textStyle), fontFamily, fontWeight, color }}
                    >
                      <textarea
                        className="w-full h-full min-h-[1em] resize-none bg-transparent border-none outline-none overflow-auto placeholder:text-[#0b0b0c]/40"
                        style={{ fontFamily, fontWeight, color }}
                        value={item.content}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => updateItem(item.id, { content: e.target.value })}
                        placeholder="Click to type..."
                      />
                    </div>
                  );
                })()}
              {item.type === "shape" && (
                <div className="w-full h-full rounded-lg bg-slate-100 border border-slate-300" />
              )}
              {item.type === "image" && (() => {
                const img = item as import("./types").ImageItem;
                const thumb = img.contentJson?.thumbnailUrl as string | undefined;
                const src = img.src ?? thumb;
                if (src) return <img src={src} alt="" className="w-full h-full rounded-lg object-cover" />;
                return (
                  <div className="w-full h-full rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400 text-xs">
                    Image
                  </div>
                );
              })()}
              {item.type === "link" && (() => {
                const linkItem = item as import("./types").LinkItem;
                const url = linkItem.url;
                let faviconUrl: string | null = null;
                if (url) {
                  try {
                    const domain = new URL(url).hostname;
                    faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                  } catch {}
                }
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <div
                        className="w-full h-full rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2 truncate px-3 cursor-pointer hover:bg-blue-100 transition-colors"
                        style={{ ...textStyleToCss(linkItem.textStyle), color: linkItem.textStyle?.color ?? "#1d4ed8" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {faviconUrl && <img src={faviconUrl} alt="" className="w-4 h-4 shrink-0" />}
                        <span className="truncate flex-1">{item.content || "Link"}</span>
                        {url && <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60" />}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-[#1a1a1b] border-white/10" align="start" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-white/60 text-xs">Label</Label>
                          <Input
                            placeholder="Link text..."
                            value={item.content}
                            onChange={(e) => updateItem(item.id, { content: e.target.value })}
                            className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div>
                          <Label className="text-white/60 text-xs">URL</Label>
                          <Input
                            placeholder="Paste link here..."
                            value={url ?? ""}
                            onChange={(e) => updateItem(item.id, { url: e.target.value })}
                            className="mt-1 h-9 rounded-lg bg-white/5 border-white/10 text-white"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {url && (
                          <div className="flex items-center gap-2 rounded border border-white/10 p-2 bg-white/5">
                            {faviconUrl && <img src={faviconUrl} alt="" className="h-8 w-8 shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate block">
                                {url}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })()}
              {item.type === "column" && (() => {
                const colItem = item as import("./types").ColumnItem;
                const title = colItem.columnTitle || colItem.content || "New Column";
                return (
                  <ColumnElement
                    item={colItem}
                    title={title}
                    isSelected={isSelected}
                    onUpdateItem={updateItem}
                  />
                );
              })()}
              {item.type === "file" && (
                <div className="w-full h-full rounded-lg bg-white border border-slate-200 p-2 flex flex-col">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                      <span className="text-xs">📄</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-700 truncate font-medium">{(item as import("./types").FileItem).filename || "File"}</p>
                      {(item as import("./types").FileItem).sizeBytes != null && (
                        <p className="text-[10px] text-slate-500">{(item as import("./types").FileItem).sizeBytes! / 1024} KB</p>
                      )}
                    </div>
                  </div>
                  {(item as import("./types").FileItem).src && (
                    <a href={(item as import("./types").FileItem).src} target="_blank" rel="noopener noreferrer" className="mt-auto text-xs text-blue-600 hover:underline">
                      Open
                    </a>
                  )}
                </div>
              )}
                {isSelected && (
                  <>
                    {(["nw", "ne", "sw", "se"] as const).map((handle) => (
                      <div
                        key={handle}
                        data-resize-handle
                        className="absolute w-2.5 h-2.5 bg-[#0b0b0c] border-2 border-white rounded-sm z-10 hover:bg-white/20"
                        style={{
                          top: handle.includes("n") ? -4 : undefined,
                          bottom: handle.includes("s") ? -4 : undefined,
                          left: handle.includes("w") ? -4 : undefined,
                          right: handle.includes("e") ? -4 : undefined,
                          cursor:
                            handle === "nw" || handle === "se" ? "nwse-resize" : "nesw-resize",
                        }}
                        onMouseDown={(e) => handleResizeMouseDown(e, item.id, handle)}
                        title="Drag to resize"
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Trash bin: drag a board item here to delete */}
      <div
        ref={trashBinRef}
        className={cn(
          "absolute bottom-4 right-4 z-10 flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl border-2 transition-colors",
          isOverTrash && dragState
            ? "bg-red-500/20 border-red-400 text-red-300"
            : "bg-white/5 border-white/20 text-white/50"
        )}
        title="Drag items here to delete"
      >
        <Trash2 className="w-6 h-6" />
        <span className="text-[10px] leading-tight">Delete</span>
      </div>
    </div>
  );
});
