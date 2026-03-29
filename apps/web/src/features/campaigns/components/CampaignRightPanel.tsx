import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WhiteboardConnection } from "../types";

export interface CampaignRightPanelProps {
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  /** Connections from whiteboard/Get Inspired (read-only). */
  connections: WhiteboardConnection[];
  fromBoardId?: string | null;
}

export function CampaignRightPanel({
  collapsed,
  onCollapsedChange,
  connections,
  fromBoardId,
}: CampaignRightPanelProps) {
  if (collapsed) {
    return (
      <div className="w-10 shrink-0 flex flex-col items-center justify-center border-l bg-muted/20">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onCollapsedChange(false)}
          title="Expand panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-80 shrink-0 border-l bg-muted/20">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Inspector</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onCollapsedChange(true)}
          title="Collapse panel"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Tabs defaultValue="connections" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-2 rounded-none border-b h-9">
          <TabsTrigger value="connections" className="rounded-none">
            Connections
          </TabsTrigger>
          <TabsTrigger value="notes" className="rounded-none">
            Notes
          </TabsTrigger>
        </TabsList>
        <TabsContent value="connections" className="flex-1 m-0 p-2 overflow-hidden">
          <ScrollArea className="h-full">
            <ul className="space-y-1 text-sm">
              {connections.length === 0 ? (
                <li className="text-muted-foreground">No whiteboard connections yet.</li>
              ) : (
                connections.map((conn) => (
                  <li key={conn.id} className="rounded border bg-background px-2 py-1.5">
                    <span className="font-medium">{conn.title}</span>
                    {(fromBoardId || conn.boardId) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Linked from board: {conn.boardId ?? fromBoardId}
                      </p>
                    )}
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="notes" className="flex-1 m-0 p-2 overflow-hidden">
          <p className="text-sm text-muted-foreground">
            Connection notes and template links. TODO: Supabase integration.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
