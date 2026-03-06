import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CampaignFoundation as FoundationType, WhiteboardConnection } from "../../types";

const OBJECTIVES: FoundationType["objective"][] = [
  "Awareness",
  "Leads",
  "Sales",
  "Authority",
  "Community",
];

export interface FoundationTabProps {
  foundation: FoundationType;
  onChange: (f: FoundationType) => void;
  connections: WhiteboardConnection[];
  fromBoardId?: string | null;
}

export function FoundationTab({
  foundation,
  onChange,
  connections,
  fromBoardId,
}: FoundationTabProps) {
  const update = (patch: Partial<FoundationType>) =>
    onChange({ ...foundation, ...patch });

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="space-y-4">
        <h3 className="text-sm font-medium">Core fields</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Campaign Name</Label>
            <Input
              value={foundation.campaignName}
              onChange={(e) => update({ campaignName: e.target.value })}
              placeholder="Campaign name"
            />
          </div>
          <div className="space-y-2">
            <Label>Campaign Objective</Label>
            <Select
              value={foundation.objective}
              onValueChange={(v) => update({ objective: v as FoundationType["objective"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBJECTIVES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Primary KPI</Label>
          <Input
            value={foundation.primaryKpi}
            onChange={(e) => update({ primaryKpi: e.target.value })}
            placeholder="e.g. Sign-ups, CTR"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Timeline Start</Label>
            <Input
              type="date"
              value={foundation.timelineStart}
              onChange={(e) => update({ timelineStart: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Timeline End</Label>
            <Input
              type="date"
              value={foundation.timelineEnd}
              onChange={(e) => update({ timelineEnd: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Budget</Label>
          <Input
            value={foundation.budget}
            onChange={(e) => update({ budget: e.target.value })}
            placeholder="Budget"
          />
        </div>
        <div className="space-y-2">
          <Label>Target Audience (auto-import placeholder)</Label>
          <Textarea
            value={foundation.targetAudience}
            onChange={(e) => update({ targetAudience: e.target.value })}
            placeholder="Target audience"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Core Message (auto-import placeholder)</Label>
          <Textarea
            value={foundation.coreMessage}
            onChange={(e) => update({ coreMessage: e.target.value })}
            placeholder="Core message"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Offer / CTA</Label>
          <Input
            value={foundation.offerCta}
            onChange={(e) => update({ offerCta: e.target.value })}
            placeholder="Offer or call to action"
          />
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Whiteboard Connection</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground">
          <li>Messaging Notes</li>
          <li>Visual Moodboard</li>
          <li>Audience Research</li>
        </ul>
        {connections.length > 0 && (
          <ul className="mt-2 space-y-1">
            {connections.map((c) => (
              <li key={c.id} className="text-xs">
                {c.title}
                {(fromBoardId || c.boardId) && (
                  <> — Linked from board: {c.boardId ?? fromBoardId}</>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
