import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomFontStyles } from "./CustomFontStyles";
import { InspiredToolbar } from "./InspiredToolbar";
import { InspiredToolStrip } from "./InspiredToolStrip";
import { InspiredCanvas } from "./InspiredCanvas";
import { InspiredRightSidebar } from "./InspiredRightSidebar";
import type { BoardItem } from "./types";
import type { InspiredTool } from "./constants";
import type { RightPanelTab } from "./InspiredRightSidebar";
import type { CustomFont } from "./fonts";
import type { InspiredCanvasHandle } from "./InspiredCanvas";

export interface InspiredLayoutProps {
  activeTool: InspiredTool;
  onToolChange: (tool: InspiredTool) => void;
  items: BoardItem[];
  onItemsChange: (items: BoardItem[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateItem: (item: BoardItem) => void;
  onDeleteItem: (id: string) => void;
  onBackToProjects?: () => void;
  boardName?: string;
  onBoardNameChange?: (name: string) => void;
  onNewBoard: () => void;
  onTemplates: () => void;
  onExport: () => void;
  onExportJson?: () => void;
  onTurnIntoCampaign?: () => void;
  activeRightTab: RightPanelTab;
  onActiveRightTabChange: (tab: RightPanelTab) => void;
  onOpenInspiration: () => void;
  onOpenKoraAssistant?: () => void;
  onUploadClick?: () => void;
  boardId: string | null;
  onPinAssetToBoard: (assetId: string, x?: number, y?: number) => void;
  onPinInspirationToBoard: (payload: { title: string; sourceUrl?: string; thumbnailUrl?: string; summary?: string }, x?: number, y?: number) => void;
  rightSidebarCollapsed?: boolean;
  onRightSidebarCollapsedChange?: (collapsed: boolean) => void;
  customFonts?: CustomFont[];
  onFontsChange?: () => void;
  canvasRef?: React.RefObject<InspiredCanvasHandle | null>;
}

export function InspiredLayout({
  activeTool,
  onToolChange,
  items,
  onItemsChange,
  selectedId,
  onSelect,
  onUpdateItem,
  onDeleteItem,
  onBackToProjects,
  boardName,
  onBoardNameChange,
  onNewBoard,
  onTemplates,
  onExport,
  onExportJson,
  onTurnIntoCampaign,
  activeRightTab,
  onActiveRightTabChange,
  onOpenInspiration,
  onOpenKoraAssistant,
  onUploadClick,
  boardId,
  onPinAssetToBoard,
  onPinInspirationToBoard,
  rightSidebarCollapsed = false,
  onRightSidebarCollapsedChange,
  customFonts = [],
  onFontsChange,
  canvasRef,
}: InspiredLayoutProps) {
  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) ?? null : null;

  const handleOpenInspiration = () => {
    onActiveRightTabChange("inspiration");
    onOpenInspiration();
  };

  const canToggleSidebar = typeof onRightSidebarCollapsedChange === "function";

  return (
    <div className="flex h-full bg-[#0b0b0c] text-white" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
      {customFonts.length > 0 && <CustomFontStyles fonts={customFonts} />}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <InspiredToolbar
          onBackToProjects={onBackToProjects}
          boardName={boardName}
          onBoardNameChange={onBoardNameChange}
          onNewBoard={onNewBoard}
          onTemplates={onTemplates}
          onExport={onExport}
          onExportJson={onExportJson}
          onTurnIntoCampaign={onTurnIntoCampaign}
        />
        <InspiredToolStrip
          activeTool={activeTool}
          onToolChange={onToolChange}
          onOpenInspiration={handleOpenInspiration}
          onUploadClick={onUploadClick}
          onTabChange={onActiveRightTabChange}
        />
        <div className="flex flex-1 min-h-0 relative">
          <InspiredCanvas
            ref={canvasRef ?? undefined}
            items={items}
            selectedId={selectedId}
            activeTool={activeTool}
            onItemsChange={onItemsChange}
            onSelect={onSelect}
            onDeleteItem={onDeleteItem}
            onOpenInspiration={handleOpenInspiration}
          />
          {rightSidebarCollapsed ? (
            canToggleSidebar && (
              <div className="w-10 shrink-0 flex flex-col items-center justify-center bg-[#0b0b0c] border-l border-white/10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => onRightSidebarCollapsedChange(false)}
                  title="Show sidebar"
                >
                  <PanelRightOpen className="w-4 h-4" />
                </Button>
              </div>
            )
          ) : (
            <>
              {canToggleSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-[17.5rem] top-2 z-10 h-7 w-7 rounded-l-md bg-[#0b0b0c] border border-r-0 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => onRightSidebarCollapsedChange(true)}
                  title="Hide sidebar to see more whiteboard"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </Button>
              )}
              <InspiredRightSidebar
                activeTab={activeRightTab}
                onTabChange={onActiveRightTabChange}
                selectedItem={selectedItem}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
                onClearSelection={() => onSelect(null)}
                boardId={boardId}
                onPinAssetToBoard={onPinAssetToBoard}
                onPinInspirationToBoard={onPinInspirationToBoard}
                customFonts={customFonts}
                onFontsChange={onFontsChange}
                onOpenKoraAssistant={onOpenKoraAssistant}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
