import { useCallback } from "react";
import { ArrowLeftRight, Inspect, FolderOpen, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { InspiredInspector } from "./InspiredInspector";
import { InspiredAssetsTab } from "./InspiredAssetsTab";
import { InspiredInspirationTab } from "./InspiredInspirationTab";
import type { BoardItem } from "./types";

export type RightPanelTab = "inspector" | "assets" | "inspiration";

export interface InspiredRightPanelProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  selectedItem: BoardItem | null;
  onUpdateItem: (item: BoardItem) => void;
  onDeleteItem: (id: string) => void;
  onClearSelection: () => void;
  boardId: string | null;
  onPinAssetToBoard: (assetId: string, x?: number, y?: number) => void;
  onPinInspirationToBoard: (payload: { title: string; sourceUrl?: string; thumbnailUrl?: string; summary?: string }, x?: number, y?: number) => void;
}

const TAB_CONFIG: { id: RightPanelTab; label: string; icon: React.ElementType }[] = [
  { id: "inspector", label: "Inspector", icon: Inspect },
  { id: "assets", label: "Assets", icon: FolderOpen },
  { id: "inspiration", label: "Inspiration", icon: Lightbulb },
];

export function InspiredRightPanel({
  collapsed,
  onCollapsedChange,
  activeTab,
  onTabChange,
  selectedItem,
  onUpdateItem,
  onDeleteItem,
  onClearSelection,
  boardId,
  onPinAssetToBoard,
  onPinInspirationToBoard,
}: InspiredRightPanelProps) {
  const toggleCollapse = useCallback(() => {
    onCollapsedChange(!collapsed);
  }, [collapsed, onCollapsedChange]);

  return (
    <div className="flex shrink-0 h-full">
      <div
        className={cn(
          "flex flex-col bg-[#0b0b0c] border-r border-white/10 overflow-hidden transition-[width] duration-200 ease-in-out",
          collapsed ? "w-14" : "w-72"
        )}
      >
        {collapsed ? (
          <div className="flex flex-col items-center py-2 gap-1 w-14">
            {TAB_CONFIG.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onTabChange(id);
                  onCollapsedChange(false);
                }}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  activeTab === id ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
                title={label}
              >
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex border-b border-white/10 shrink-0">
              {TAB_CONFIG.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors",
                    activeTab === id
                      ? "text-white border-b-2 border-white bg-white/5"
                      : "text-white/60 hover:text-white/90 hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
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
                />
              )}
              {activeTab === "assets" && (
                <InspiredAssetsTab
                  boardId={boardId}
                  onPinToBoard={onPinAssetToBoard}
                />
              )}
              {activeTab === "inspiration" && (
                <InspiredInspirationTab
                  boardId={boardId}
                  onPinToBoard={onPinInspirationToBoard}
                />
              )}
            </div>
          </>
        )}
      </div>
      {/* Collapse handle between panel and canvas */}
      <button
        type="button"
        onClick={toggleCollapse}
        className="shrink-0 w-6 h-full flex items-center justify-center bg-[#0b0b0c] border-r border-white/10 hover:bg-white/5 text-white/50 hover:text-white/80 transition-colors"
        aria-label={collapsed ? "Expand panel" : "Collapse panel"}
      >
        <ArrowLeftRight className="w-4 h-4" />
      </button>
    </div>
  );
}
