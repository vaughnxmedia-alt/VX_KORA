import { useCallback } from "react";
import {
  MousePointer2,
  StickyNote,
  Type,
  Link,
  Image,
  Square,
  Pen,
  Upload,
  LayoutList,
  Search,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { INSPIRED_TOOL, type InspiredTool } from "./constants";
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

export const DRAG_TYPE_INSPIRED_TOOL = "application/x-inspired-tool";

export interface InspiredToolDragPayload {
  toolType: InspiredTool;
  defaultSize: { w: number; h: number };
  defaultContent?: string;
}

const TOOL_CONFIG: {
  id: InspiredTool;
  icon: React.ElementType;
  label: string;
  description: string;
  disabled?: boolean;
  opensPanel?: "inspiration";
  defaultSize: { w: number; h: number };
  defaultContent?: string;
}[] = [
  { id: INSPIRED_TOOL.SELECT, icon: MousePointer2, label: "Select", description: "Select and move items on the board.", defaultSize: { w: 200, h: 120 } },
  { id: INSPIRED_TOOL.STICKY_NOTE, icon: StickyNote, label: "Note", description: "Sticky note for quick ideas; drag to the board or click to add, then type.", defaultSize: { w: DEFAULT_NOTE_WIDTH, h: DEFAULT_NOTE_HEIGHT } },
  { id: INSPIRED_TOOL.TEXT, icon: Type, label: "Text", description: "Plain text box; drag or click to add, then click to edit.", defaultSize: { w: DEFAULT_TEXT_WIDTH, h: DEFAULT_TEXT_HEIGHT } },
  { id: INSPIRED_TOOL.LINK, icon: Link, label: "Link", description: "Add a link; click to paste a URL and see a preview thumbnail.", defaultSize: { w: 200, h: 40 } },
  { id: INSPIRED_TOOL.IMAGE, icon: Image, label: "Image", description: "Add an image; drag or click to add, then upload or paste a link.", defaultSize: { w: 160, h: 120 } },
  { id: INSPIRED_TOOL.UPLOAD, icon: Upload, label: "File", description: "Upload a file from your device; click or drag to the board, then choose a file.", defaultSize: { w: DEFAULT_FILE_CARD_WIDTH, h: DEFAULT_FILE_CARD_HEIGHT } },
  { id: INSPIRED_TOOL.COLUMN, icon: LayoutList, label: "Column", description: "Layout column for grouping items; drag to the board to add.", defaultSize: { w: DEFAULT_COLUMN_WIDTH, h: DEFAULT_COLUMN_HEIGHT } },
  { id: INSPIRED_TOOL.SHAPE, icon: Square, label: "Shape", description: "Add a shape (rectangle, circle, etc.); drag to the board or click to add.", defaultSize: { w: DEFAULT_SHAPE_WIDTH, h: DEFAULT_SHAPE_HEIGHT } },
  { id: INSPIRED_TOOL.SEARCH, icon: Search, label: "Inspiration", description: "Search for inspiration from the web and add to your board.", opensPanel: "inspiration", defaultSize: { w: 200, h: 40 } },
  { id: INSPIRED_TOOL.PEN, icon: Pen, label: "Pen", description: "Draw freehand on the board.", defaultSize: { w: 120, h: 80 } },
];

export interface InspiredToolSidebarProps {
  activeTool: InspiredTool;
  onToolChange: (tool: InspiredTool) => void;
  onOpenInspiration?: () => void;
  onOpenKoraAssistant?: () => void;
  onUploadClick?: () => void;
}

export function InspiredToolSidebar({
  activeTool,
  onToolChange,
  onOpenInspiration,
  onOpenKoraAssistant,
  onUploadClick,
}: InspiredToolSidebarProps) {
  const handleClick = useCallback(
    (id: InspiredTool, disabled?: boolean, opensPanel?: "inspiration") => {
      if (disabled) return;
      if (opensPanel === "inspiration") {
        onOpenInspiration?.();
        onToolChange(id);
        return;
      }
      if (id === INSPIRED_TOOL.UPLOAD) {
        onUploadClick?.();
        onToolChange(id);
        return;
      }
      onToolChange(id);
    },
    [onToolChange, onOpenInspiration, onUploadClick]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, config: (typeof TOOL_CONFIG)[number]) => {
      if (config.disabled || config.opensPanel === "inspiration") {
        if (config.opensPanel === "inspiration") {
          e.dataTransfer.setData("text/plain", "open-inspiration");
        }
        return;
      }
      const payload: InspiredToolDragPayload = {
        toolType: config.id,
        defaultSize: config.defaultSize,
        defaultContent: config.defaultContent,
      };
      e.dataTransfer.setData(DRAG_TYPE_INSPIRED_TOOL, JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className="w-20 flex flex-col items-center py-4 gap-3 bg-[#0b0b0c] border-l border-white/10 shrink-0"
        style={{ minHeight: "100%" }}
      >
        {onOpenKoraAssistant && (
          <div className="mb-2 pb-2 border-b border-white/10 w-full flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onOpenKoraAssistant}
              className="w-14 py-2 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-gradient-to-b from-amber-500/15 to-amber-600/10 border border-amber-500/25 text-amber-200 hover:from-amber-500/25 hover:to-amber-600/15 hover:border-amber-500/40 font-bold text-lg transition-colors"
              title="KORA Assistant — AI-powered creative intelligence"
            >
              <span className="leading-none tracking-tighter">K</span>
              <span className="text-[10px] font-semibold text-amber-300/90 tracking-wide">KORA</span>
            </button>
          </div>
        )}
        {TOOL_CONFIG.map((config) => {
          const { id, icon: Icon, label, description, disabled, opensPanel } = config;
          const isSearch = id === INSPIRED_TOOL.SEARCH;
          const draggable = !disabled && (opensPanel !== "inspiration" || isSearch);
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  draggable={draggable}
                  onDragStart={(e) => handleDragStart(e, config)}
                  onClick={() => handleClick(id, disabled, opensPanel)}
                  disabled={disabled}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 w-14 py-2 rounded-xl transition-colors cursor-grab active:cursor-grabbing",
                    activeTool === id && !disabled
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] leading-tight text-center max-w-full truncate px-0.5">
                    {label}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-[#1a1a1b] border-white/10 text-white/90 max-w-[200px]">
                <p className="font-medium">{label}</p>
                <p className="text-xs text-white/70 mt-0.5">{description}</p>
                {disabled && <p className="text-xs text-amber-400 mt-1">(Coming soon)</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </aside>
    </TooltipProvider>
  );
}
