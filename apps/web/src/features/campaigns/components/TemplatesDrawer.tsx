import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";
import type { CampaignTemplateType } from "../types";

const TEMPLATE_LIST: CampaignTemplateType[] = [
  "Full Campaign Launch Blueprint",
  "Product Launch War Room",
  "Content Series Builder",
  "30-Day Content Calendar",
];

export interface TemplatesDrawerProps {
  currentTemplate: CampaignTemplateType | null;
  onSelectTemplate: (template: CampaignTemplateType) => void;
  trigger?: React.ReactNode;
}

/** Templates drawer: lists template types; selecting updates recommended sections (UI only). */
export function TemplatesDrawer({
  currentTemplate,
  onSelectTemplate,
  trigger,
}: TemplatesDrawerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-80 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Campaign templates</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <ul className="space-y-2">
            {TEMPLATE_LIST.map((t) => (
              <li key={t}>
                <Button
                  variant={currentTemplate === t ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    onSelectTemplate(t);
                    setOpen(false);
                  }}
                >
                  {t}
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-6 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Template checklist</p>
            <p className="mt-1">
              Selecting a template highlights which tabs to complete first and shows a summary
              checklist. (UI only; TODO: wire to campaign templateType and recommendations.)
            </p>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
