import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { CampaignBudget as BudgetType } from "../../types";

export interface BudgetTabProps {
  budget: BudgetType;
  onChange: (b: BudgetType) => void;
}

export function BudgetTab({ budget, onChange }: BudgetTabProps) {
  const update = (patch: Partial<BudgetType>) => onChange({ ...budget, ...patch });

  const fields: { key: keyof BudgetType; label: string }[] = [
    { key: "adSpend", label: "Ad spend" },
    { key: "influencerFees", label: "Influencer fees" },
    { key: "productionCosts", label: "Production costs" },
    { key: "toolsSaas", label: "Tools/SaaS" },
    { key: "prCosts", label: "PR costs" },
    { key: "cpl", label: "CPL" },
    { key: "cpa", label: "CPA" },
    { key: "roas", label: "ROAS" },
    { key: "engagementRate", label: "Engagement rate" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="space-y-4">
        <h3 className="text-sm font-medium">Budget and ROI placeholders</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                value={budget[key]}
                onChange={(e) => update({ [key]: e.target.value })}
                placeholder={label}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">No calculations; input only. TODO: backend.</p>
      </section>
    </div>
  );
}
