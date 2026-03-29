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
import type { CampaignAssets as AssetsType, AssetStatus } from "../../types";

const STATUS_OPTIONS: AssetStatus[] = ["Not started", "In progress", "Done"];

export interface AssetsTabProps {
  assets: AssetsType;
  onChange: (a: AssetsType) => void;
}

export function AssetsTab({ assets, onChange }: AssetsTabProps) {
  const update = (patch: Partial<AssetsType>) => onChange({ ...assets, ...patch });

  const setAssetStatus = (id: string, status: AssetStatus) => {
    update({
      contentAssets: assets.contentAssets.map((a) =>
        a.id === id ? { ...a, status } : a
      ),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="space-y-4">
        <h3 className="text-sm font-medium">Content Assets checklist</h3>
        <div className="border rounded-lg divide-y">
          {assets.contentAssets.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2"
            >
              <span className="text-sm">{item.name}</span>
              <Select
                value={item.status}
                onValueChange={(v) => setAssetStatus(item.id, v as AssetStatus)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <h3 className="text-sm font-medium">Visual Direction</h3>
        <div className="space-y-2">
          <Label>Fonts</Label>
          <Input
            value={assets.fonts}
            onChange={(e) => update({ fonts: e.target.value })}
            placeholder="Fonts"
          />
        </div>
        <div className="space-y-2">
          <Label>Color scheme</Label>
          <Input
            value={assets.colorScheme}
            onChange={(e) => update({ colorScheme: e.target.value })}
            placeholder="Color scheme"
          />
        </div>
        <div className="space-y-2">
          <Label>Photo direction</Label>
          <Input
            value={assets.photoDirection}
            onChange={(e) => update({ photoDirection: e.target.value })}
            placeholder="Photo direction"
          />
        </div>
        <div className="space-y-2">
          <Label>B-roll style</Label>
          <Input
            value={assets.bRollStyle}
            onChange={(e) => update({ bRollStyle: e.target.value })}
            placeholder="B-roll style"
          />
        </div>
        <div className="space-y-2">
          <Label>Mood references</Label>
          <Textarea
            value={assets.moodReferences}
            onChange={(e) => update({ moodReferences: e.target.value })}
            placeholder="Mood references"
            rows={2}
          />
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Whiteboard Connection</h3>
        <ul className="list-disc list-inside text-sm text-muted-foreground">
          <li>Brand Moodboard</li>
          <li>Photo Shoot Creative Brief</li>
          <li>Ad Creative Testing Board</li>
        </ul>
      </section>
    </div>
  );
}
