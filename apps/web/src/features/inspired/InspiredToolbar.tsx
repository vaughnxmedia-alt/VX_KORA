import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Upload, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface InspiredToolbarProps {
  onBackToProjects?: () => void;
  boardName?: string;
  onBoardNameChange?: (name: string) => void;
  onNewBoard: () => void;
  onTemplates: () => void;
  onExport: () => void;
  onExportJson?: () => void;
  /** Navigate to campaign creation with this board as source (Turn Into Campaign). */
  onTurnIntoCampaign?: () => void;
}

export function InspiredToolbar({
  onBackToProjects,
  boardName,
  onBoardNameChange,
  onNewBoard,
  onTemplates,
  onExport,
  onExportJson,
  onTurnIntoCampaign,
}: InspiredToolbarProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(boardName ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(boardName ?? "");
  }, [boardName]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const displayName = boardName ?? "plan your next project";
  const canEdit = Boolean(onBoardNameChange);

  const handleSave = () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== boardName) onBoardNameChange?.(trimmed);
    else setValue(boardName ?? "");
  };

  return (
    <header className="h-14 flex items-center justify-between gap-4 px-4 bg-[#0b0b0c] border-b border-white/10 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {onBackToProjects && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToProjects}
            className="rounded-full h-9 px-2 text-white/70 hover:bg-white/10 hover:text-white shrink-0"
            title="Back to projects"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setValue(boardName ?? "");
                setEditing(false);
              }
            }}
            className="text-lg font-semibold text-white bg-white/10 rounded px-2 py-1 min-w-0 border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/40"
            placeholder="Board name"
            autoFocus
          />
        ) : (
          <h1
            role="button"
            tabIndex={0}
            onClick={() => canEdit && setEditing(true)}
            onKeyDown={(e) => canEdit && (e.key === "Enter" || e.key === " ") && setEditing(true)}
            className={cn(
              "text-lg font-semibold text-white truncate min-w-0",
              canEdit && "cursor-text hover:text-white/90 hover:underline decoration-white/50"
            )}
            title={canEdit ? "Click to rename" : undefined}
          >
            {displayName}
          </h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onTurnIntoCampaign && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onTurnIntoCampaign}
            className="rounded-full h-9 px-4 text-white/90 hover:bg-white/10 hover:text-white border border-white/10"
            title="Turn this board into a campaign"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            Turn Into Campaign
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewBoard}
          className="rounded-full h-9 px-4 text-white/90 hover:bg-white/10 hover:text-white border border-white/10"
        >
          New Board
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onTemplates}
          className="rounded-full h-9 px-4 text-white/90 hover:bg-white/10 hover:text-white border border-white/10"
        >
          Templates
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full h-9 px-4 text-white/90 hover:bg-white/10 hover:text-white border border-white/10"
              title="Share / Export"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-white/10">
            <DropdownMenuItem onClick={onExport}>Export as PNG</DropdownMenuItem>
            {onExportJson && (
              <DropdownMenuItem onClick={onExportJson}>Export as JSON</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
