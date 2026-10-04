import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hqApi } from "@/features/hq/api";
import { ciApi } from "../api";
import { ciDraftFromHqClient } from "../workspace";
import {
  CI_ORG_TYPE_LABELS,
  CI_ORG_TYPES,
  type CiOrgCreateInput,
  type CiOrgProfileInput,
  type CiOrganizationType,
} from "../types";

const emptyCreate = (): CiOrgCreateInput => ({
  name: "",
  organization_type: "small_business",
  industry: "",
  website: "",
  location: "",
  description: "",
  status: "active",
  hq_client_id: null,
});

export function CiAddClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState<CiOrgCreateInput>(emptyCreate());
  const [profileExtras, setProfileExtras] = useState<CiOrgProfileInput>({});

  const { data: orgs = [] } = useQuery({
    queryKey: ["ci", "organizations", "all"],
    queryFn: () => ciApi.organizations.list({ status: "all" }),
    enabled: open,
  });

  const { data: hqClients = [] } = useQuery({
    queryKey: ["hq", "clients"],
    queryFn: () => hqApi.clients.list(),
    enabled: open,
  });

  const linkedClientIds = useMemo(
    () => new Set(orgs.map((o) => o.hq_client_id).filter(Boolean) as string[]),
    [orgs],
  );

  const applyHqClient = (id: string | null) => {
    if (!id) {
      setForm({ ...form, hq_client_id: null });
      return;
    }
    const client = hqClients.find((row) => row.id === id);
    if (!client) {
      setForm({ ...form, hq_client_id: id });
      return;
    }
    const draft = ciDraftFromHqClient(client);
    setForm(draft.create);
    setProfileExtras(draft.profile);
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Client name is required");
      const org = await ciApi.organizations.create({
        ...form,
        created_by: user?.id ?? null,
        hq_client_id: form.hq_client_id || null,
      });
      if (form.hq_client_id) {
        await ciApi.organizations.saveProfile(org.id, {
          ...profileExtras,
          name: form.name,
          industry: form.industry,
          website: form.website,
          location: form.location,
          description: form.description,
          assessment_profile_status: "draft",
        });
      }
      return org;
    },
    onSuccess: (org) => {
      void qc.invalidateQueries({ queryKey: ["ci"] });
      toast.success(
        form.hq_client_id
          ? "Client added from HQ. Review the organization profile."
          : "Client added. Start with the organization profile.",
      );
      setForm(emptyCreate());
      setProfileExtras({});
      onOpenChange(false);
      navigate(`/hq/intelligence/organizations/${org.id}`);
    },
    onError: (e: Error) => toast.error(e.message || "Could not add this client"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Add a client</DialogTitle>
          <DialogDescription>
            If they are already in HQ, choose their name. Their HQ profile will fill this form.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Already in HQ?</Label>
            <Select
              value={form.hq_client_id ?? "none"}
              onValueChange={(v) => applyHqClient(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an HQ client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not in HQ yet — enter by hand</SelectItem>
                {hqClients.map((c) => (
                  <SelectItem
                    key={c.id}
                    value={c.id}
                    disabled={linkedClientIds.has(c.id) && form.hq_client_id !== c.id}
                  >
                    {c.client_name}
                    {c.company && c.company !== c.client_name ? ` · ${c.company}` : ""}
                    {linkedClientIds.has(c.id) ? " (already linked)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {form.hq_client_id
                ? "HQ details are filled in below. You can edit them before adding."
                : "Choose a name to copy their HQ profile, or enter a new client below."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-client-name">Client name *</Label>
            <Input
              id="ci-client-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Harbor & Pine Wellness Studio"
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>What kind of organization?</Label>
              <Select
                value={form.organization_type ?? "other"}
                onValueChange={(v) =>
                  setForm({ ...form, organization_type: v as CiOrganizationType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CI_ORG_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {CI_ORG_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={form.industry ?? ""}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder="Wellness, food, nonprofit…"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={form.website ?? ""}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={form.location ?? ""}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="City, state"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>What should we know first?</Label>
            <Textarea
              rows={5}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="A short note is enough. You can finish the profile in the next step."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
