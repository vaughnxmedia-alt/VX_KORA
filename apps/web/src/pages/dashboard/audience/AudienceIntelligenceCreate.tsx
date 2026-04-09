import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/components/AuthProvider";
import { loadCustomAudienceProfiles, saveCustomAudienceProfiles, createCustomAudienceProfile } from "@/features/audience-intelligence/store";
import { audienceProfilesMock } from "@/features/audience-intelligence/mockData";
import type { AudienceType } from "@/features/audience-intelligence/types";

export default function AudienceIntelligenceCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [useBaseAudience, setUseBaseAudience] = useState(false);
  const [form, setForm] = useState({
    audienceName: "",
    clientId: "",
    clientName: "",
    linkedAsset: "",
    linkedAssetType: "offer" as "offer" | "product" | "service" | "campaign",
    audienceCategory: "custom",
    description: "",
    primaryGoal: "",
    notes: "",
    audienceType: "custom" as AudienceType,
    baseAudienceId: "",
  });

  const availableBaseAudiences = useMemo(() => [...audienceProfilesMock, ...loadCustomAudienceProfiles()], []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const profile = createCustomAudienceProfile({
      ...form,
      baseAudienceId: useBaseAudience ? form.baseAudienceId : undefined,
      createdBy: user?.email || "Dashboard User",
    });

    const existing = loadCustomAudienceProfiles();
    saveCustomAudienceProfiles([profile, ...existing]);
    navigate(`/dashboard/audience/${profile.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">New Custom Audience</h1>
        <p className="text-muted-foreground mt-2">Create a custom or hybrid audience profile and optionally seed it from an existing audience.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audience Setup</CardTitle>
          <CardDescription>This creates a living audience asset that can be refined over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2 md:col-span-2">
              <Label>Audience name</Label>
              <Input value={form.audienceName} onChange={(e) => setForm((prev) => ({ ...prev, audienceName: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input value={form.clientId} onChange={(e) => setForm((prev) => ({ ...prev, clientId: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Client name</Label>
              <Input value={form.clientName} onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Linked offer/product/service/campaign</Label>
              <Input value={form.linkedAsset} onChange={(e) => setForm((prev) => ({ ...prev, linkedAsset: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Linked asset type</Label>
              <Select value={form.linkedAssetType} onValueChange={(value: any) => setForm((prev) => ({ ...prev, linkedAssetType: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audience type</Label>
              <Select value={form.audienceType} onValueChange={(value: any) => setForm((prev) => ({ ...prev, audienceType: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="ai_generated">AI Generated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audience category</Label>
              <Input value={form.audienceCategory} onChange={(e) => setForm((prev) => ({ ...prev, audienceCategory: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Primary goal</Label>
              <Input value={form.primaryGoal} onChange={(e) => setForm((prev) => ({ ...prev, primaryGoal: e.target.value }))} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Optional notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Start from existing audience</p>
                <p className="text-xs text-muted-foreground">Use AI-generated or previous custom profile as a base for hybrid strategy.</p>
              </div>
              <Switch checked={useBaseAudience} onCheckedChange={setUseBaseAudience} />
            </div>
            {useBaseAudience && (
              <div className="space-y-2 md:col-span-2">
                <Label>Base audience</Label>
                <Select value={form.baseAudienceId} onValueChange={(value) => setForm((prev) => ({ ...prev, baseAudienceId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Choose a starting audience" /></SelectTrigger>
                  <SelectContent>
                    {availableBaseAudiences.map((audience) => (
                      <SelectItem key={audience.id} value={audience.id}>{audience.audienceName} - {audience.clientName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="md:col-span-2 flex items-center gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard/audience")}>Cancel</Button>
              <Button type="submit">Create Audience</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
