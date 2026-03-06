import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CampaignPR as PRType, OutletCategory, PitchStatus } from "../../types";

const PR_OBJECTIVES: PRType["objective"][] = [
  "awareness",
  "thought leadership",
  "crisis",
  "reputation shift",
  "event amplification",
];

const OUTLET_CATEGORIES: OutletCategory[] = [
  "Local",
  "Regional",
  "National",
  "Podcasts",
  "Digital Publications",
];

const PITCH_STATUSES: PitchStatus[] = [
  "Not pitched",
  "Pitched",
  "Follow-up 1",
  "Follow-up 2",
  "Responded",
  "Booked",
  "Published",
  "No response",
];

export interface PRTabProps {
  pr: PRType;
  onChange: (p: PRType) => void;
}

export function PRTab({ pr, onChange }: PRTabProps) {
  const update = (patch: Partial<PRType>) => onChange({ ...pr, ...patch });

  const setPressDone = (id: string, done: boolean) => {
    update({
      pressMaterials: pr.pressMaterials.map((m) =>
        m.id === id ? { ...m, done } : m
      ),
    });
  };

  const addOutlet = () => {
    update({
      outlets: [
        ...pr.outlets,
        {
          id: `outlet-${Date.now()}`,
          name: "New outlet",
          category: "National",
          status: "Not pitched",
          lastContacted: "",
          nextFollowUp: "",
          notes: "",
        },
      ],
    });
  };

  const setOutlet = (
    id: string,
    field: keyof PRType["outlets"][0],
    value: string
  ) => {
    update({
      outlets: pr.outlets.map((o) =>
        o.id === id ? { ...o, [field]: value } : o
      ),
    });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="space-y-2">
        <Label>PR Objective</Label>
        <Select
          value={pr.objective}
          onValueChange={(v) => update({ objective: v as PRType["objective"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PR_OBJECTIVES.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Story Angle Development</h3>
        <p className="text-xs text-muted-foreground">
          Whiteboard: Narrative Architecture Blueprint, Cultural Moment Strategy Board
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Press Materials Needed</h3>
        <div className="space-y-2">
          {pr.pressMaterials.map((m) => (
            <label key={m.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={m.done}
                onCheckedChange={(v) => setPressDone(m.id, !!v)}
              />
              <span className="text-sm">{m.name}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Media Targeting / Outlets</h3>
          <Button type="button" variant="outline" size="sm" onClick={addOutlet}>
            Add outlet
          </Button>
        </div>
        <div className="border rounded-lg divide-y">
          {pr.outlets.map((o) => (
            <div key={o.id} className="p-3 grid gap-2 sm:grid-cols-2">
              <Input
                value={o.name}
                onChange={(e) => setOutlet(o.id, "name", e.target.value)}
                placeholder="Outlet name"
              />
              <Select
                value={o.category}
                onValueChange={(v) => setOutlet(o.id, "category", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTLET_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={o.status}
                onValueChange={(v) => setOutlet(o.id, "status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PITCH_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={o.lastContacted}
                onChange={(e) => setOutlet(o.id, "lastContacted", e.target.value)}
                placeholder="Last contacted"
              />
              <Input
                type="date"
                value={o.nextFollowUp}
                onChange={(e) => setOutlet(o.id, "nextFollowUp", e.target.value)}
                placeholder="Next follow-up"
              />
              <Input
                value={o.notes}
                onChange={(e) => setOutlet(o.id, "notes", e.target.value)}
                placeholder="Notes"
                className="sm:col-span-2"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Crisis and Reputation Safeguards</h3>
        <div className="space-y-2">
          <Label>Risk assessment</Label>
          <Textarea
            value={pr.crisisRiskAssessment}
            onChange={(e) => update({ crisisRiskAssessment: e.target.value })}
            rows={2}
          />
          <Label>Pre-drafted responses</Label>
          <Textarea
            value={pr.preDraftedResponses}
            onChange={(e) => update({ preDraftedResponses: e.target.value })}
            rows={2}
          />
          <Label>Monitoring tools / Social listening / Comment protocol</Label>
          <Input
            value={pr.monitoringTools}
            onChange={(e) => update({ monitoringTools: e.target.value })}
          />
        </div>
        <p className="text-xs text-muted-foreground">Connection: Crisis Response Map</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Measurement KPIs</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { key: "placements" as const, label: "Placements" },
            { key: "backlinks" as const, label: "Backlinks" },
            { key: "domainAuthority" as const, label: "Domain authority" },
            { key: "mentions" as const, label: "Mentions" },
            { key: "socialGrowth" as const, label: "Social growth" },
            { key: "shareOfVoice" as const, label: "Share of voice" },
            { key: "sentiment" as const, label: "Sentiment" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                value={pr[key]}
                onChange={(e) => update({ [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
