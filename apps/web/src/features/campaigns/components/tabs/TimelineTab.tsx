import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CampaignTimeline as TimelineType } from "../../types";

const PHASE_NAMES = [
  "Pre-launch",
  "Tease",
  "Launch day",
  "Sustain",
  "Retargeting",
  "Post-campaign recap",
];

export interface TimelineTabProps {
  timeline: TimelineType;
  onChange: (t: TimelineType) => void;
}

export function TimelineTab({ timeline, onChange }: TimelineTabProps) {
  const update = (patch: Partial<TimelineType>) =>
    onChange({ ...timeline, ...patch });

  const setPhase = (id: string, field: "start" | "end" | "notes", value: string) => {
    update({
      phases: timeline.phases.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="space-y-4">
        <h3 className="text-sm font-medium">Phases</h3>
        <div className="border rounded-lg divide-y">
          {timeline.phases.map((p) => (
            <div key={p.id} className="p-4 grid grid-cols-[1fr_100px_100px_1fr] gap-2 items-center">
              <span className="text-sm font-medium">{p.name}</span>
              <Input
                type="date"
                value={p.start}
                onChange={(e) => setPhase(p.id, "start", e.target.value)}
                className="text-sm"
              />
              <Input
                type="date"
                value={p.end}
                onChange={(e) => setPhase(p.id, "end", e.target.value)}
                className="text-sm"
              />
              <Input
                value={p.notes}
                onChange={(e) => setPhase(p.id, "notes", e.target.value)}
                placeholder="Notes"
                className="text-sm"
              />
            </div>
          ))}
        </div>
      </section>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          Sync with 30-Day Content Calendar Template
        </Button>
        <span className="text-xs text-muted-foreground">(Stub — TODO)</span>
      </div>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Template connection</h3>
        <p className="text-sm text-muted-foreground">
          Connect visually to template &quot;30-Day Content Calendar&quot;. TODO: wire to Get
          Inspired.
        </p>
      </section>
    </div>
  );
}
