import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CampaignAnalytics as AnalyticsType } from "../../types";

export interface AnalyticsTabProps {
  analytics: AnalyticsType;
  onChange: (a: AnalyticsType) => void;
}

const CONNECTORS = [
  { id: "web_analytics", label: "External Web Analytics" },
  { id: "meta", label: "Meta" },
  { id: "crm", label: "CRM" },
];

export function AnalyticsTab({ analytics, onChange }: AnalyticsTabProps) {
  const update = (patch: Partial<AnalyticsType>) =>
    onChange({ ...analytics, ...patch });

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="space-y-4">
        <h3 className="text-sm font-medium">Track</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: "traffic" as const, label: "Traffic" },
            { key: "conversionRate" as const, label: "Conversion rate" },
            { key: "engagement" as const, label: "Engagement" },
            { key: "emailOpenRate" as const, label: "Email open rate" },
            { key: "leadQuality" as const, label: "Lead quality" },
            { key: "revenueAttribution" as const, label: "Revenue attribution" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                value={analytics[key]}
                onChange={(e) => update({ [key]: e.target.value })}
                placeholder={label}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Connectors</h3>
        <p className="text-xs text-muted-foreground mb-2">Disabled — TODO: integrate.</p>
        <div className="flex flex-wrap gap-2">
          {CONNECTORS.map((c) => (
            <Button key={c.id} variant="outline" size="sm" disabled>
              {c.label}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
