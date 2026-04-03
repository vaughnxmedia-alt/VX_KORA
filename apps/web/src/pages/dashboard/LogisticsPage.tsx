import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function LogisticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignIdParam = searchParams.get("campaignId") ?? "";
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState({
    shoot_times: "",
    locations: "",
    vendors: "",
    rentals: "",
    booking_links: "",
    production_notes: "",
    talent: "",
    props: "",
    budget_notes: "",
    miscellaneous: "",
    status: "draft",
  });

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["operational-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, logistics_status")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedCampaignId = campaignIdParam || campaigns[0]?.id || "";

  useEffect(() => {
    if (!campaignIdParam && campaigns[0]?.id) {
      setSearchParams({ campaignId: campaigns[0].id }, { replace: true });
    }
  }, [campaignIdParam, campaigns, setSearchParams]);

  const { data: logisticsRow, isLoading: loadingLogistics } = useQuery({
    queryKey: ["campaign-logistics", selectedCampaignId],
    queryFn: async () => {
      if (!selectedCampaignId) return null;
      const { data, error } = await supabase
        .from("campaign_logistics")
        .select("*")
        .eq("campaign_id", selectedCampaignId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCampaignId,
  });

  useEffect(() => {
    if (logisticsRow) {
      setDraft({
        shoot_times: logisticsRow.shoot_times ?? "",
        locations: logisticsRow.locations ?? "",
        vendors: logisticsRow.vendors ?? "",
        rentals: logisticsRow.rentals ?? "",
        booking_links: logisticsRow.booking_links ?? "",
        production_notes: logisticsRow.production_notes ?? "",
        talent: logisticsRow.talent ?? "",
        props: logisticsRow.props ?? "",
        budget_notes: logisticsRow.budget_notes ?? "",
        miscellaneous: logisticsRow.miscellaneous ?? "",
        status: logisticsRow.status ?? "draft",
      });
    } else {
      setDraft({
        shoot_times: "",
        locations: "",
        vendors: "",
        rentals: "",
        booking_links: "",
        production_notes: "",
        talent: "",
        props: "",
        budget_notes: "",
        miscellaneous: "",
        status: "draft",
      });
    }
  }, [logisticsRow, selectedCampaignId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCampaignId) throw new Error("No campaign");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        ...draft,
        campaign_id: selectedCampaignId,
        created_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await supabase.from("campaign_logistics").upsert(payload, {
        onConflict: "campaign_id",
      });
      if (upErr) throw upErr;

      const { error: cErr } = await supabase
        .from("campaigns")
        .update({
          logistics_status: "created",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCampaignId);
      if (cErr) throw cErr;
    },
    onSuccess: () => {
      toast.success("Logistics saved.");
      void queryClient.invalidateQueries({ queryKey: ["campaign-logistics", selectedCampaignId] });
      void queryClient.invalidateQueries({ queryKey: ["operational-campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const campaignName = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId)?.name ?? "Campaign",
    [campaigns, selectedCampaignId]
  );

  if (loadingCampaigns) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/dashboard/creative-hub">
            <ArrowLeft className="h-4 w-4" />
            Back to Creative Hub
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>No campaigns yet</CardTitle>
            <CardDescription>
              Convert a content plan in Creative Hub to create a campaign, then return here for logistics.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logistics</h1>
          <p className="text-muted-foreground mt-1">
            Production workspace for shoot times, locations, vendors, and notes. Scoped per campaign.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/dashboard/creative-hub">Creative Hub</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaign</CardTitle>
          <CardDescription>Select which operational campaign you are planning for.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedCampaignId}
            onValueChange={(v) => setSearchParams({ campaignId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCampaignId && (
            <Button variant="link" className="px-0 mt-2 h-auto" asChild>
              <Link to={`/dashboard/campaigns/${selectedCampaignId}`}>Open campaign detail →</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{campaignName}</CardTitle>
          <CardDescription>
            {logisticsRow
              ? "Edit execution details. Saving marks logistics as created for this campaign."
              : "Not set — fill in sections below and save."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingLogistics ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Shoot times"
                  value={draft.shoot_times}
                  onChange={(v) => setDraft((d) => ({ ...d, shoot_times: v }))}
                />
                <Field
                  label="Locations"
                  value={draft.locations}
                  onChange={(v) => setDraft((d) => ({ ...d, locations: v }))}
                />
                <Field
                  label="Vendors"
                  value={draft.vendors}
                  onChange={(v) => setDraft((d) => ({ ...d, vendors: v }))}
                />
                <Field
                  label="Rentals"
                  value={draft.rentals}
                  onChange={(v) => setDraft((d) => ({ ...d, rentals: v }))}
                />
                <Field
                  label="Booking links"
                  value={draft.booking_links}
                  onChange={(v) => setDraft((d) => ({ ...d, booking_links: v }))}
                />
                <Field
                  label="Talent"
                  value={draft.talent}
                  onChange={(v) => setDraft((d) => ({ ...d, talent: v }))}
                />
              </div>
              <Field
                label="Production notes"
                value={draft.production_notes}
                onChange={(v) => setDraft((d) => ({ ...d, production_notes: v }))}
              />
              <Field
                label="Props"
                value={draft.props}
                onChange={(v) => setDraft((d) => ({ ...d, props: v }))}
              />
              <Field
                label="Budget notes"
                value={draft.budget_notes}
                onChange={(v) => setDraft((d) => ({ ...d, budget_notes: v }))}
              />
              <Field
                label="Miscellaneous"
                value={draft.miscellaneous}
                onChange={(v) => setDraft((d) => ({ ...d, miscellaneous: v }))}
              />
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !selectedCampaignId}
                >
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save logistics
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
