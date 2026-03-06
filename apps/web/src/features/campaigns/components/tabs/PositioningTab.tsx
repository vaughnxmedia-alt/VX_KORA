import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { CampaignPositioning as PositioningType } from "../../types";

export interface PositioningTabProps {
  positioning: PositioningType;
  onChange: (p: PositioningType) => void;
}

export function PositioningTab({ positioning, onChange }: PositioningTabProps) {
  const update = (patch: Partial<PositioningType>) =>
    onChange({ ...positioning, ...patch });

  const addHook = () =>
    update({ hookVariations: [...positioning.hookVariations, ""] });
  const setHook = (i: number, v: string) => {
    const next = [...positioning.hookVariations];
    next[i] = v;
    update({ hookVariations: next });
  };
  const removeHook = (i: number) =>
    update({
      hookVariations: positioning.hookVariations.filter((_, j) => j !== i),
    });

  const addObjection = () =>
    update({ objectionHandling: [...positioning.objectionHandling, ""] });
  const setObjection = (i: number, v: string) => {
    const next = [...positioning.objectionHandling];
    next[i] = v;
    update({ objectionHandling: next });
  };
  const removeObjection = (i: number) =>
    update({
      objectionHandling: positioning.objectionHandling.filter((_, j) => j !== i),
    });

  const addDriver = () => {
    const v = (document.getElementById("new-driver") as HTMLInputElement)?.value?.trim();
    if (v) update({ emotionalDrivers: [...positioning.emotionalDrivers, v] });
  };
  const removeDriver = (i: number) =>
    update({
      emotionalDrivers: positioning.emotionalDrivers.filter((_, j) => j !== i),
    });

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="space-y-4">
        <div className="space-y-2">
          <Label>Core Angle</Label>
          <Input
            value={positioning.coreAngle}
            onChange={(e) => update({ coreAngle: e.target.value })}
            placeholder="Core angle"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Hook Variations</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addHook}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          {positioning.hookVariations.map((h, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={h}
                onChange={(e) => setHook(i, e.target.value)}
                placeholder={`Hook ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeHook(i)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Label>Emotional Drivers (multi-tag)</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {positioning.emotionalDrivers.map((d, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-sm"
              >
                {d}
                <button
                  type="button"
                  onClick={() => removeDriver(i)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input id="new-driver" placeholder="Add driver and press Add" />
            <Button type="button" variant="outline" size="sm" onClick={addDriver}>
              Add
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Objection Handling</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addObjection}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          {positioning.objectionHandling.map((o, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={o}
                onChange={(e) => setObjection(i, e.target.value)}
                placeholder={`Objection ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeObjection(i)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Label>Competitive Differentiator</Label>
          <Textarea
            value={positioning.competitiveDifferentiator}
            onChange={(e) => update({ competitiveDifferentiator: e.target.value })}
            placeholder="Competitive differentiator"
            rows={3}
          />
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Whiteboard Connection</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground">
          <li>Competitive Landscape Map</li>
          <li>Narrative Architecture Blueprint</li>
          <li>Viral Content Deconstruction Board</li>
        </ul>
      </section>
    </div>
  );
}
