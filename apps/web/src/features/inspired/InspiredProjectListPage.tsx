import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadBoards, saveBoards } from "./storage";
import type { Board } from "./types";

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

export function InspiredProjectListPage() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);

  useEffect(() => {
    setBoards(loadBoards());
  }, []);

  const handleNewProject = () => {
    const board = createBoard("Untitled project");
    const next = [...boards, board];
    setBoards(next);
    saveBoards(next);
    navigate(`/dashboard/get-inspired/board/${board.id}`);
  };

  const handleOpenProject = (boardId: string) => {
    navigate(`/dashboard/get-inspired/board/${boardId}`);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-[#0b0b0c] text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-white/80" />
          <h1 className="text-2xl font-semibold text-white">Get Inspired</h1>
        </div>
        <p className="text-white/60 text-sm mb-8">
          Your creative plans and campaigns. Open a project to edit on the whiteboard or collaborate with your team.
        </p>

        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            onClick={handleNewProject}
            className="rounded-xl h-24 px-6 bg-white/10 hover:bg-white/15 text-white border border-white/20 border-dashed flex flex-col items-center justify-center gap-2 min-w-[180px]"
          >
            <Plus className="w-8 h-8 text-white/80" />
            <span className="text-sm font-medium">New project</span>
          </Button>

          {boards.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => handleOpenProject(board.id)}
              className="rounded-xl h-24 px-6 bg-white/5 hover:bg-white/10 text-white border border-white/10 flex flex-col items-start justify-center gap-1 min-w-[180px] text-left transition-colors"
            >
              <div className="flex items-center gap-2 w-full">
                <FolderOpen className="w-5 h-5 text-white/60 shrink-0" />
                <span className="font-medium truncate flex-1">{board.name}</span>
              </div>
              <span className="text-xs text-white/50">
                {board.items.length} item{board.items.length !== 1 ? "s" : ""} · {formatDate(board.updatedAt)}
              </span>
            </button>
          ))}
        </div>

        {boards.length === 0 && (
          <div className="rounded-xl border border-white/10 border-dashed p-12 text-center text-white/50">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No projects yet. Create one to start planning.</p>
          </div>
        )}
      </div>
    </div>
  );
}
