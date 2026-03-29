import React from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { CampaignOptimization as OptimizationType } from "../../types";

export interface OptimizationTabProps {
  optimization: OptimizationType;
  onChange: (o: OptimizationType) => void;
}

export function OptimizationTab({ optimization, onChange }: OptimizationTabProps) {
  const toggle = (id: string) => {
    onChange({
      ...optimization,
      items: optimization.items.map((i) =>
        i.id === id ? { ...i, done: !i.done } : i
      ),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="space-y-4">
        <h3 className="text-sm font-medium">Checklist</h3>
        <div className="space-y-2">
          {optimization.items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={item.done}
                onCheckedChange={() => toggle(item.id)}
              />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Whiteboard Connection</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground">
          <li>Ad Creative Testing Board</li>
          <li>Audience Deep Dive Board</li>
        </ul>
      </section>
    </div>
  );
}
