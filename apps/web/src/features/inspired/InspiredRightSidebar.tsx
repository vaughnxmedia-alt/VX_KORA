import {
  Inspect,
  FolderOpen,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { InspiredTool } from "./constants";
import { InspiredInspector } from "./InspiredInspector";
import { InspiredAssetsTab } from "./InspiredAssetsTab";
import { InspiredInspirationTab } from "./InspiredInspirationTab";
import type { BoardItem } from "./types";
import type { CustomFont } from "./fonts";

export const DRAG_TYPE_INSPIRED_TOOL = "application/x-inspired-tool";

export type RightPanelTab = "inspector" | "assets" | "inspiration" | "kora";

export interface InspiredToolDragPayload {
  toolType: InspiredTool;
  defaultSize: { w: number; h: number };
  defaultContent?: string;
}

const TAB_CONFIG: { id: RightPanelTab; label: string; icon: React.ElementType }[] = [
  { id: "inspector", label: "Inspector", icon: Inspect },
  { id: "assets", label: "Assets", icon: FolderOpen },
  { id: "inspiration", label: "Inspiration", icon: Lightbulb },
  { id: "kora", label: "KORA", icon: Sparkles },
];

export interface InspiredRightSidebarProps {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  selectedItem: BoardItem | null;
  onUpdateItem: (item: BoardItem) => void;
  onDeleteItem: (id: string) => void;
  onClearSelection: () => void;
  boardId: string | null;
  onPinAssetToBoard: (assetId: string, x?: number, y?: number) => void;
  onPinInspirationToBoard: (payload: { title: string; sourceUrl?: string; thumbnailUrl?: string; summary?: string }, x?: number, y?: number) => void;
  customFonts?: CustomFont[];
  onFontsChange?: () => void;
  onOpenKoraAssistant?: () => void;
}

export function InspiredRightSidebar({
  activeTab,
  onTabChange,
  selectedItem,
  onUpdateItem,
  onDeleteItem,
  onClearSelection,
  boardId,
  onPinAssetToBoard,
  onPinInspirationToBoard,
  customFonts = [],
  onFontsChange,
  onOpenKoraAssistant,
}: InspiredRightSidebarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-72 flex flex-col bg-[#0b0b0c] border-l border-white/10 shrink-0 min-h-0">
        {/* Inspector | Assets | Inspiration | KORA */}
        <div className="flex border-b border-white/10 shrink-0">
          {TAB_CONFIG.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              title={label}
              className={cn(
                "flex-1 flex items-center justify-center py-3 transition-colors",
                activeTab === id
                  ? "text-white border-b-2 border-white bg-white/5"
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              )}
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {activeTab === "inspector" && (
            <InspiredInspector
              selectedItem={selectedItem}
              onUpdate={onUpdateItem}
              onDelete={onDeleteItem}
              onClearSelection={onClearSelection}
              customFonts={customFonts}
              onFontsChange={onFontsChange}
            />
          )}
          {activeTab === "assets" && (
            <InspiredAssetsTab boardId={boardId} onPinToBoard={onPinAssetToBoard} />
          )}
          {activeTab === "inspiration" && (
            <InspiredInspirationTab boardId={boardId} onPinToBoard={onPinInspirationToBoard} />
          )}
          {activeTab === "kora" && onOpenKoraAssistant && (
            <div className="p-4 flex flex-col gap-4">
              <h3 className="text-sm font-medium text-white/90">KORA</h3>
              <p className="text-xs text-white/50">
                AI-powered creative intelligence. Get suggestions and references for your board.
              </p>
              <button
                type="button"
                onClick={onOpenKoraAssistant}
                className="w-full rounded-lg flex items-center justify-center gap-2 py-3 bg-gradient-to-b from-amber-500/20 to-amber-600/10 border border-amber-500/25 text-amber-200 hover:from-amber-500/30 hover:to-amber-600/15 font-semibold transition-colors"
              >
                <span className="text-lg">K</span>
                Open KORA Assistant
              </button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
