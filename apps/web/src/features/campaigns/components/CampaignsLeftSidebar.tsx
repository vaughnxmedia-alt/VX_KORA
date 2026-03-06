import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CampaignsLeftSidebarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  className?: string;
}

/** Left sidebar for Campaigns: search/filter. Buttons show "Drag Me" tooltip (UI only; no drag logic). */
export function CampaignsLeftSidebar({
  searchQuery,
  onSearchChange,
  className,
}: CampaignsLeftSidebarProps) {
  return (
    <aside
      className={cn(
        "w-56 shrink-0 border-r bg-muted/30 flex flex-col gap-2 p-3",
        className
      )}
    >
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      <TooltipProvider>
        <div className="flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="justify-start w-full">
                Filter by status
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Drag Me</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="justify-start w-full">
                Filter by type
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Drag Me</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </aside>
  );
}
