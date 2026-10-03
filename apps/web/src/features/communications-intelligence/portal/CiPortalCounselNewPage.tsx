import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { trackCiActivity } from "../activity";
import { ciApi } from "../api";
import { ciFriendlyError } from "../workspace";
import {
  CI_COUNSEL_REQUEST_TYPE_LABELS,
  CI_COUNSEL_REQUEST_TYPES,
  CI_COUNSEL_URGENCIES,
  CI_COUNSEL_URGENCY_LABELS,
  type CiCounselRequestType,
  type CiCounselUrgency,
} from "../types";

export function CiPortalCounselNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orgId = params.get("org") || undefined;
  const search = params.toString() ? `?${params.toString()}` : "";

  const { data: memberships } = useQuery({
    queryKey: ["ci", "portal", "memberships", user?.id],
    queryFn: () => ciApi.portal.listMemberships(user!.id),
    enabled: Boolean(user?.id),
  });

  const selectedOrg =
    orgId && memberships?.some((m) => m.organization_id === orgId)
      ? orgId
      : memberships?.[0]?.organization_id;

  const { data: organization } = useQuery({
    queryKey: ["ci", "organizations", selectedOrg],
    queryFn: () => ciApi.organizations.get(selectedOrg!),
    enabled: Boolean(selectedOrg),
  });

  const initialType = (params.get("type") as CiCounselRequestType | null) || "general_strategic_counsel";
  const [subject, setSubject] = useState(params.get("subject") || "");
  const [requestType, setRequestType] = useState<CiCounselRequestType>(
    CI_COUNSEL_REQUEST_TYPES.includes(initialType) ? initialType : "general_strategic_counsel",
  );
  const [description, setDescription] = useState(params.get("description") || "");
  const [urgency, setUrgency] = useState<CiCounselUrgency>("normal");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const related = useMemo(
    () => ({
      opportunity_id: params.get("opportunity") || null,
      intelligence_item_id: params.get("intelligence") || null,
      action_item_id: params.get("action") || null,
    }),
    [params],
  );

  const submit = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedOrg) throw new Error("Not signed in");
      if (!subject.trim()) throw new Error("Please add a short subject");
      if (!description.trim()) throw new Error("Please describe the situation");
      let attachment_path: string | null = null;
      if (file) {
        attachment_path = await ciApi.counsel.uploadAttachment(selectedOrg, file);
      }
      return ciApi.counsel.create({
        organization_id: selectedOrg,
        subject,
        request_type: requestType,
        description,
        urgency,
        link_url: linkUrl,
        attachment_path,
        opportunity_id: related.opportunity_id,
        intelligence_item_id: related.intelligence_item_id,
        action_item_id: related.action_item_id,
        submitted_by: user.id,
      });
    },
    onSuccess: (request) => {
      trackCiActivity({
        organization_id: selectedOrg,
        event_type: "counsel_submitted",
        entity_type: "counsel_request",
        entity_id: request.id,
      });
      toast.success("Your request has been submitted to JahKnowsPR for review.");
      const next = new URLSearchParams();
      if (selectedOrg) next.set("org", selectedOrg);
      navigate({
        pathname: `/portal/counsel/${request.id}`,
        search: next.toString() ? `?${next.toString()}` : "",
      });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {organization?.name || "Your organization"}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
          Request strategic counsel
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Share the situation as clearly as you can. JahKnowsPR will review it and respond when
          guidance is ready.
        </p>
      </header>

      <form
        className="space-y-5 rounded-lg border border-border bg-background p-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="ci-counsel-subject">Subject *</Label>
          <Input
            id="ci-counsel-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ci-counsel-type">Request type</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as CiCounselRequestType)}>
              <SelectTrigger id="ci-counsel-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CI_COUNSEL_REQUEST_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CI_COUNSEL_REQUEST_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ci-counsel-urgency">Urgency</Label>
            <Select value={urgency} onValueChange={(v) => setUrgency(v as CiCounselUrgency)}>
              <SelectTrigger id="ci-counsel-urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CI_COUNSEL_URGENCIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CI_COUNSEL_URGENCY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-counsel-org">Related organization</Label>
          <Input id="ci-counsel-org" value={organization?.name || ""} readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-counsel-description">What needs review? *</Label>
          <Textarea
            id="ci-counsel-description"
            rows={7}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-counsel-url">Optional URL</Label>
          <Input
            id="ci-counsel-url"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ci-counsel-file">Optional attachment</Label>
          <Input
            id="ci-counsel-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.doc,.docx"
          />
          <p className="text-xs text-muted-foreground">
            PDF, image, or a short document. This stays with the request.
          </p>
        </div>
        {related.opportunity_id || related.intelligence_item_id || related.action_item_id ? (
          <p className="text-xs text-muted-foreground">
            This request will include the related communications item so JahKnowsPR has the context.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? "Submitting…" : "Submit request"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to={{ pathname: "/portal/counsel", search }}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CiPortalCounselNewPage;
