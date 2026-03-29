import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_CATEGORIES,
  CATEGORY_LABELS,
  getTemplatesByCategory,
} from "./templates";
import type { InspiredTemplate, TemplateCategory } from "./templates";

export interface InspiredTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyTemplate: (template: InspiredTemplate) => void;
}

export function InspiredTemplatesModal({
  open,
  onOpenChange,
  onApplyTemplate,
}: InspiredTemplatesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("Campaign");
  const [pendingTemplate, setPendingTemplate] = useState<InspiredTemplate | null>(null);

  const templates = getTemplatesByCategory(selectedCategory);

  const handleSelectTemplate = (template: InspiredTemplate) => {
    setPendingTemplate(template);
  };

  const handleConfirmApply = () => {
    if (pendingTemplate) {
      onApplyTemplate(pendingTemplate);
      setPendingTemplate(null);
      onOpenChange(false);
    }
  };

  const handleCancelConfirm = () => {
    setPendingTemplate(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#0f0f10] border-white/10 text-white max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-white/10 shrink-0">
            <DialogTitle className="text-white text-lg font-semibold">
              Template library
            </DialogTitle>
            <p className="text-sm text-white/50 mt-1">
              Structured frameworks for campaigns, strategy, and creative. Select a template to create a new board.
            </p>
          </DialogHeader>
          <div className="flex flex-1 min-h-0">
            {/* Category sidebar */}
            <aside className="w-44 shrink-0 border-r border-white/10 py-3 flex flex-col gap-0.5">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2.5 text-left text-sm transition-colors",
                    selectedCategory === cat
                      ? "bg-white/10 text-white font-medium"
                      : "text-white/60 hover:bg-white/5 hover:text-white/80"
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </aside>
            {/* Template cards */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTemplate(t)}
                    className="text-left p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-white/95">{t.name}</h3>
                      <span className="text-[10px] uppercase tracking-wider text-white/40 shrink-0">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 mt-2 line-clamp-2">{t.description}</p>
                    <span className="inline-block mt-3 text-xs text-white/40">Use template →</span>
                  </button>
                ))}
              </div>
              {templates.length === 0 && (
                <p className="text-white/50 text-sm">No templates in this category.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingTemplate} onOpenChange={(o) => !o && handleCancelConfirm()}>
        <AlertDialogContent className="bg-[#0f0f10] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Create board from template</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTemplate
                ? `Create a new project board using "${pendingTemplate.name}"? The board will be populated with structured columns and prompts.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white/80 hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmApply}
              className="bg-white text-[#0f0f10] hover:bg-white/90"
            >
              Create board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
