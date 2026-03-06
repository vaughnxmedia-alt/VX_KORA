import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CampaignChannels } from "../../types";
import { useMockAuth } from "../../context/MockAuthContext";

export interface DistributionTabProps {
  channels: CampaignChannels;
  onChange: (c: CampaignChannels) => void;
}

const GROUP_LABELS: Record<keyof CampaignChannels, string> = {
  organic: "Organic",
  paid: "Paid",
  owned: "Owned",
  partnerships: "Partnerships",
};

export function DistributionTab({ channels, onChange }: DistributionTabProps) {
  const { users } = useMockAuth();

  const update = (patch: Partial<CampaignChannels>) =>
    onChange({ ...channels, ...patch });

  const setChannel = (
    group: keyof CampaignChannels,
    id: string,
    updates: { enabled?: boolean; notes?: string; ownerId?: string | null }
  ) => {
    const list = channels[group].map((ch) =>
      ch.id === id ? { ...ch, ...updates } : ch
    );
    update({ [group]: list });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {(Object.keys(GROUP_LABELS) as (keyof CampaignChannels)[]).map((group) => (
        <section key={group}>
          <h3 className="text-sm font-medium mb-3">{GROUP_LABELS[group]}</h3>
          <div className="space-y-3 border rounded-lg p-4">
            {channels[group].map((ch) => (
              <div
                key={ch.id}
                className="flex flex-wrap items-center gap-4 border-b last:border-0 pb-3 last:pb-0"
              >
                <div className="flex items-center gap-2 min-w-[140px]">
                  <Switch
                    checked={ch.enabled}
                    onCheckedChange={(v) => setChannel(group, ch.id, { enabled: v })}
                  />
                  <span className="text-sm">{ch.name}</span>
                </div>
                <Input
                  placeholder="Notes"
                  value={ch.notes}
                  onChange={(e) => setChannel(group, ch.id, { notes: e.target.value })}
                  className="max-w-xs"
                />
                <Select
                  value={ch.ownerId ?? "none"}
                  onValueChange={(v) =>
                    setChannel(group, ch.id, { ownerId: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
