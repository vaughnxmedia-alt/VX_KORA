import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { InspiredLayout } from "./InspiredLayout";
import type { InspiredCanvasHandle } from "./InspiredCanvas";
import { KoraAssistantModal } from "./KoraAssistantModal";
import { InspiredTemplatesModal } from "./InspiredTemplatesModal";
import { loadBoards, saveBoards } from "./storage";
import { getCustomFonts, type CustomFont } from "./fonts";
import type { InspiredTemplate } from "./templates";
import { DEFAULT_BOARD_NAME } from "./constants";
import { INSPIRED_TOOL, type InspiredTool } from "./constants";
import type { Board, BoardItem } from "./types";
import type { RightPanelTab } from "./InspiredRightSidebar";
import type { KoraSuggestion } from "./api/koraInspiration";
import { supabase } from "@/integrations/supabase/client";
import { uploadInspiredAsset } from "./uploadAsset";
import {
  DEFAULT_FILE_CARD_WIDTH,
  DEFAULT_FILE_CARD_HEIGHT,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
} from "./types";

function createBoard(name: string): Board {
  const now = new Date().toISOString();
  return {
    id: `board-${Date.now()}`,
    name,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function GetInspiredPage() {
  const { boardId: urlBoardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<InspiredTool>(INSPIRED_TOOL.SELECT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<RightPanelTab>("inspector");
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>(() => getCustomFonts());
  const [koraModalOpen, setKoraModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<InspiredCanvasHandle>(null);

  useEffect(() => {
    if (!urlBoardId) {
      navigate("/dashboard/get-inspired", { replace: true });
      return;
    }
    const loaded = loadBoards();
    const board = loaded.find((b) => b.id === urlBoardId);
    if (!board) {
      navigate("/dashboard/get-inspired", { replace: true });
      return;
    }
    setBoards(loaded);
    setActiveBoardId(urlBoardId);
  }, [urlBoardId, navigate]);

  useEffect(() => {
    if (boards.length > 0) saveBoards(boards);
  }, [boards]);

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const items = activeBoard?.items ?? [];

  const setItems = useCallback(
    (next: BoardItem[]) => {
      if (!activeBoardId) return;
      setBoards((prev) =>
        prev.map((b) => (b.id === activeBoardId ? { ...b, items: next, updatedAt: new Date().toISOString() } : b))
      );
    },
    [activeBoardId]
  );

  const onUpdateItem = useCallback(
    (item: BoardItem) => {
      if (!activeBoardId) return;
      setBoards((prev) =>
        prev.map((b) =>
          b.id === activeBoardId
            ? {
                ...b,
                items: b.items.map((i) => (i.id === item.id ? item : i)),
                updatedAt: new Date().toISOString(),
              }
            : b
        )
      );
    },
    [activeBoardId]
  );

  const onDeleteItem = useCallback(
    (id: string) => {
      if (!activeBoardId) return;
      setBoards((prev) =>
        prev.map((b) =>
          b.id === activeBoardId
            ? {
                ...b,
                items: b.items.filter((i) => i.id !== id),
                updatedAt: new Date().toISOString(),
              }
            : b
        )
      );
      setSelectedId(null);
    },
    [activeBoardId]
  );

  const onBoardNameChange = useCallback(
    (name: string) => {
      if (!activeBoardId) return;
      setBoards((prev) =>
        prev.map((b) =>
          b.id === activeBoardId ? { ...b, name, updatedAt: new Date().toISOString() } : b
        )
      );
    },
    [activeBoardId]
  );

  const onNewBoard = useCallback(() => {
    const board = createBoard("Untitled Board");
    const next = [...boards, board];
    setBoards(next);
    saveBoards(next);
    setSelectedId(null);
    navigate(`/dashboard/get-inspired/board/${board.id}`);
  }, [boards, navigate]);

  const onBackToProjects = useCallback(() => {
    navigate("/dashboard/get-inspired");
  }, [navigate]);

  const onTurnIntoCampaign = useCallback(() => {
    if (activeBoardId) {
      navigate(`/dashboard/campaigns/new?fromBoardId=${encodeURIComponent(activeBoardId)}`);
    }
  }, [navigate, activeBoardId]);

  const onTemplates = useCallback(() => setTemplatesModalOpen(true), []);

  const onApplyTemplate = useCallback(
    (template: InspiredTemplate) => {
      const boardId = `board-${Date.now()}`;
      const orgId = "";
      const items = template.generateBoard(boardId, orgId);
      const now = new Date().toISOString();
      const newBoard: Board = {
        id: boardId,
        name: template.name,
        items,
        createdAt: now,
        updatedAt: now,
      };
      const next = [...boards, newBoard];
      setBoards(next);
      saveBoards(next);
      // TODO: Persist to Supabase (inspired_boards + inspired_items) when org_id/user available; respect RLS.
      navigate(`/dashboard/get-inspired/board/${boardId}`);
      setTemplatesModalOpen(false);
    },
    [boards, navigate]
  );
  const onExportPng = useCallback(async () => {
    const blob = await canvasRef.current?.captureAsPng();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeBoard?.name ?? "board"}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeBoard?.name]);

  const onExportJson = useCallback(() => {
    const data = JSON.stringify(boards, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inspired-boards-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [boards]);

  const getDropOffset = useCallback(() => {
    const len = items.length;
    return { x: 40 + (len % 4) * 220, y: 40 + Math.floor(len / 4) * 140 };
  }, [items.length]);

  const onPinAssetToBoard = useCallback(
    async (assetId: string) => {
      if (!activeBoardId || !activeBoard) return;
      const { data: asset, error } = await supabase
        .from("inspired_assets")
        .select("id, filename, public_url, mime_type, size_bytes")
        .eq("id", assetId)
        .single();
      if (error || !asset) return;
      const { x, y } = getDropOffset();
      const now = new Date().toISOString();
      const isImage = (asset.mime_type ?? "").startsWith("image/");
      const newItem: BoardItem = isImage
        ? {
            id: createId(),
            type: "image",
            x,
            y,
            w: 160,
            h: 120,
            content: asset.filename,
            src: asset.public_url ?? undefined,
            createdAt: now,
            updatedAt: now,
          }
        : {
            id: createId(),
            type: "file",
            x,
            y,
            w: DEFAULT_FILE_CARD_WIDTH,
            h: DEFAULT_FILE_CARD_HEIGHT,
            content: asset.filename,
            src: asset.public_url ?? undefined,
            filename: asset.filename,
            sizeBytes: asset.size_bytes ?? undefined,
            assetId: asset.id,
            createdAt: now,
            updatedAt: now,
          };
      setItems([...items, newItem]);
      setSelectedId(newItem.id);
    },
    [activeBoardId, activeBoard, items, setItems, getDropOffset]
  );

  const onPinInspirationToBoard = useCallback(
    (payload: { title: string; sourceUrl?: string; thumbnailUrl?: string; summary?: string }) => {
      if (!activeBoardId || !activeBoard) return;
      const { x, y } = getDropOffset();
      const now = new Date().toISOString();
      const newItem: BoardItem = {
        id: createId(),
        type: "image",
        x,
        y,
        w: 200,
        h: 140,
        content: payload.title,
        contentJson: {
          title: payload.title,
          sourceUrl: payload.sourceUrl,
          thumbnailUrl: payload.thumbnailUrl,
          summary: payload.summary,
        },
        src: payload.thumbnailUrl,
        createdAt: now,
        updatedAt: now,
      };
      setItems([...items, newItem]);
      setSelectedId(newItem.id);
    },
    [activeBoardId, activeBoard, items, setItems, getDropOffset]
  );

  const onUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !activeBoardId || !activeBoard) return;
      const asset = await uploadInspiredAsset(file);
      if (!asset) return;
      const { x, y } = getDropOffset();
      const now = new Date().toISOString();
      const isImage = (asset.mime_type ?? "").startsWith("image/");
      const newItem: BoardItem = isImage
        ? {
            id: createId(),
            type: "image",
            x,
            y,
            w: 160,
            h: 120,
            content: asset.filename,
            src: asset.public_url ?? undefined,
            createdAt: now,
            updatedAt: now,
          }
        : {
            id: createId(),
            type: "file",
            x,
            y,
            w: DEFAULT_FILE_CARD_WIDTH,
            h: DEFAULT_FILE_CARD_HEIGHT,
            content: asset.filename,
            src: asset.public_url ?? undefined,
            filename: asset.filename,
            sizeBytes: asset.size_bytes ?? undefined,
            createdAt: now,
            updatedAt: now,
          };
      setItems([...items, newItem]);
      setSelectedId(newItem.id);
    },
    [activeBoardId, activeBoard, items, setItems, getDropOffset]
  );

  const onPinKoraSuggestions = useCallback(
    (suggestions: KoraSuggestion[]) => {
      if (!activeBoardId || !activeBoard) return;
      const now = new Date().toISOString();
      const newItems: BoardItem[] = suggestions.map((s, i) => {
        const { x, y } = { x: 40 + (i % 3) * 220, y: 40 + Math.floor(i / 3) * 120 };
        return {
          id: createId(),
          type: "note" as const,
          x,
          y,
          w: DEFAULT_NOTE_WIDTH,
          h: DEFAULT_NOTE_HEIGHT,
          content: [s.title, s.summary, s.rationale].filter(Boolean).join("\n"),
          createdAt: now,
          updatedAt: now,
        };
      });
      setItems([...items, ...newItems]);
    },
    [activeBoardId, activeBoard, items, setItems]
  );

  if (!activeBoard) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#0b0b0c] text-white/60">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.mp4"
        className="hidden"
        onChange={onFileSelect}
      />
      <div className="-mx-4 -mb-4 md:-mx-6 md:-mb-6 lg:-mx-8 lg:-mb-8 min-h-[calc(100vh-7rem)]">
        <InspiredLayout
          activeTool={activeTool}
          onToolChange={setActiveTool}
          items={items}
          onItemsChange={setItems}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onBackToProjects={onBackToProjects}
          boardName={activeBoard.name}
          onBoardNameChange={onBoardNameChange}
          onNewBoard={onNewBoard}
          onTemplates={onTemplates}
          onExport={onExportPng}
          onExportJson={onExportJson}
          onTurnIntoCampaign={onTurnIntoCampaign}
          canvasRef={canvasRef}
          activeRightTab={activeRightTab}
          onActiveRightTabChange={setActiveRightTab}
          onOpenInspiration={() => {}}
          onOpenKoraAssistant={() => setKoraModalOpen(true)}
          onUploadClick={onUploadClick}
          boardId={activeBoardId}
          onPinAssetToBoard={onPinAssetToBoard}
          onPinInspirationToBoard={onPinInspirationToBoard}
          rightSidebarCollapsed={rightSidebarCollapsed}
          onRightSidebarCollapsedChange={setRightSidebarCollapsed}
          customFonts={customFonts}
          onFontsChange={() => setCustomFonts(getCustomFonts())}
        />
      </div>
      <KoraAssistantModal
        open={koraModalOpen}
        onOpenChange={setKoraModalOpen}
        onPinAll={onPinKoraSuggestions}
      />
      <InspiredTemplatesModal
        open={templatesModalOpen}
        onOpenChange={setTemplatesModalOpen}
        onApplyTemplate={onApplyTemplate}
      />
    </>
  );
}
