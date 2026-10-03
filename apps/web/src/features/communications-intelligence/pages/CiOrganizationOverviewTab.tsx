import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { ciApi } from "../api";
import { CiDeleteClientDialog } from "./CiDeleteClientDialog";
import {
  CI_MEMBER_ROLE_LABELS,
  CI_MEMBER_ROLES,
  CI_ONBOARDING_STATUS_LABELS,
  CI_ORG_TYPE_LABELS,
  CI_ORG_TYPES,
  type CiMemberRole,
  type CiOrganizationType,
} from "../types";
import { ciFriendlyError, inviteUrl, parseSocialChannels, parseSpokespersons } from "../workspace";
import type { CiWorkspaceContext } from "../workspace";

function spokespeopleToText(value: unknown) {
  return parseSpokespersons(value)
    .map((p) => (p.role ? `${p.name} — ${p.role}` : p.name))
    .join("\n");
}

function textToSpokespeople(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, role] = line.split(/\s+[—-]\s+/);
      return { name: (name || line).trim(), role: role?.trim() };
    });
}

export function CiOrganizationOverviewTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const qc = useQueryClient();
  const social = parseSocialChannels(org.social_channels);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CiMemberRole>("owner");
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    name: org.name ?? "",
    organization_type: (org.organization_type ?? "other") as CiOrganizationType,
    industry: org.industry ?? "",
    website: org.website ?? "",
    location: org.location ?? "",
    description: org.description ?? "",
    primary_audiences: org.primary_audiences ?? "",
    communication_goals: org.communication_goals ?? "",
    major_challenges: org.major_challenges ?? "",
    pr_media_concerns: org.pr_media_concerns ?? "",
    reputation_concerns: org.reputation_concerns ?? "",
    upcoming_events: org.upcoming_events ?? "",
    spokespeople: spokespeopleToText(org.key_spokespersons),
    instagram: social.instagram ?? "",
    facebook: social.facebook ?? "",
    linkedin: social.linkedin ?? "",
    tiktok: social.tiktok ?? "",
    other: social.other ?? "",
  });

  const { data: members = [] } = useQuery({
    queryKey: ["ci", "members", org.id],
    queryFn: () => ciApi.members.listForOrganization(org.id),
  });
  const { data: invitations = [] } = useQuery({
    queryKey: ["ci", "invitations", org.id],
    queryFn: () => ciApi.invitations.list(org.id),
  });

  const save = useMutation({
    mutationFn: () =>
      ciApi.organizations.saveProfile(org.id, {
        name: form.name,
        organization_type: form.organization_type,
        industry: form.industry,
        website: form.website,
        location: form.location,
        description: form.description,
        primary_audiences: form.primary_audiences,
        communication_goals: form.communication_goals,
        major_challenges: form.major_challenges,
        pr_media_concerns: form.pr_media_concerns,
        reputation_concerns: form.reputation_concerns,
        upcoming_events: form.upcoming_events,
        key_spokespersons: textToSpokespeople(form.spokespeople),
        social_channels: {
          instagram: form.instagram,
          facebook: form.facebook,
          linkedin: form.linkedin,
          tiktok: form.tiktok,
          other: form.other,
        },
      }),
    onSuccess: () => {
      toast.success("Organization notes saved. Next: complete the assessment.");
      void qc.invalidateQueries({ queryKey: ["ci", "organizations", org.id] });
      void qc.invalidateQueries({ queryKey: ["ci", "workflow", org.id] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  const invite = useMutation({
    mutationFn: async () =>
      ciApi.invitations.create({
        organization_id: org.id,
        email: inviteEmail,
        member_role: inviteRole,
      }),
    onSuccess: (row) => {
      setInviteEmail("");
      setLastInviteLink(inviteUrl(row.token));
      toast.success("Invitation created. Copy the link and send it to the client.");
      void qc.invalidateQueries({ queryKey: ["ci", "invitations", org.id] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });
  const revokeInvite = useMutation({
    mutationFn: (id: string) => ciApi.invitations.revoke(id),
    onSuccess: () => {
      toast.success("Invitation revoked");
      void qc.invalidateQueries({ queryKey: ["ci", "invitations", org.id] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });
  const reopenOnboarding = useMutation({
    mutationFn: () =>
      ciApi.organizations.saveProfile(org.id, {
        onboarding_status: "in_progress",
      }),
    onSuccess: () => {
      toast.success("Onboarding is open again. The client will see it on their next portal visit.");
      void qc.invalidateQueries({ queryKey: ["ci", "organizations", org.id] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });
  const revokeMember = useMutation({
    mutationFn: (id: string) => ciApi.members.revoke(id),
    onSuccess: () => {
      toast.success("Portal access removed");
      void qc.invalidateQueries({ queryKey: ["ci", "members", org.id] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl font-bold">Understand this organization</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Write down who they are, who they speak to, and what needs care. You can finish this
            from a first conversation. Finish this section before moving to the next step.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Organization name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.organization_type}
                onValueChange={(v) => setForm({ ...form, organization_type: v as CiOrganizationType })}
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
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>What they do</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Who they speak to</Label>
            <Textarea
              rows={2}
              value={form.primary_audiences}
              onChange={(e) => setForm({ ...form, primary_audiences: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>What they want communications to do</Label>
            <Textarea
              rows={2}
              value={form.communication_goals}
              onChange={(e) => setForm({ ...form, communication_goals: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>What needs care</Label>
            <Textarea
              rows={2}
              value={form.major_challenges}
              onChange={(e) => setForm({ ...form, major_challenges: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Media or visibility concerns</Label>
            <Textarea
              rows={2}
              value={form.pr_media_concerns}
              onChange={(e) => setForm({ ...form, pr_media_concerns: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Reputation concerns</Label>
            <Textarea
              rows={2}
              value={form.reputation_concerns}
              onChange={(e) => setForm({ ...form, reputation_concerns: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Upcoming dates</Label>
            <Textarea
              rows={2}
              value={form.upcoming_events}
              onChange={(e) => setForm({ ...form, upcoming_events: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>People who speak for them</Label>
            <Textarea
              rows={2}
              value={form.spokespeople}
              onChange={(e) => setForm({ ...form, spokespeople: e.target.value })}
              placeholder="One name per line. Add a role after a dash if you know it."
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>TikTok</Label>
              <Input value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save organization notes"}
            </Button>
            <Button asChild type="button" variant="outline">
              <Link to={`/hq/intelligence/organizations/${org.id}/health`}>Complete Assessment</Link>
            </Button>
          </div>
        </form>
      </section>

      <details className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Client access and invites</summary>
        <div className="mt-4 space-y-4">
          <p className="text-muted-foreground">
            Client onboarding: {CI_ONBOARDING_STATUS_LABELS[org.onboarding_status] || "—"}. Invite the
            owner when you are ready for them to see the portal.
          </p>
          {org.onboarding_status === "completed" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={reopenOnboarding.isPending}
              onClick={() => reopenOnboarding.mutate()}
            >
              Reopen for client
            </Button>
          ) : null}
          <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate();
            }}
          >
            <Label htmlFor="ci-invite-email" className="sr-only">
              Email
            </Label>
            <Input
              id="ci-invite-email"
              type="email"
              required
              placeholder="owner@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as CiMemberRole)}>
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CI_MEMBER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {CI_MEMBER_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={invite.isPending}>
              Invite
            </Button>
          </form>
          {lastInviteLink ? (
            <p className="break-all text-xs">
              Invite link:{" "}
              <a href={lastInviteLink} className="text-primary underline">
                {lastInviteLink}
              </a>
            </p>
          ) : null}
          <ul className="space-y-2">
            {invitations
              .filter((item) => !item.revoked_at && !item.accepted_at)
              .map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {item.email} · {CI_MEMBER_ROLE_LABELS[item.member_role]}
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={() => revokeInvite.mutate(item.id)}>
                    Revoke
                  </Button>
                </li>
              ))}
          </ul>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {m.full_name || m.email || m.user_id} · {CI_MEMBER_ROLE_LABELS[m.member_role]}
                </span>
                {m.status === "active" ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => revokeMember.mutate(m.id)}>
                    Remove access
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-destructive">Delete this client</summary>
        <div className="mt-3 space-y-3">
          <p className="text-muted-foreground">
            Removes the communications workspace and portal access. The HQ client record stays.
          </p>
          <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete {org.name}
          </Button>
        </div>
      </details>
      <CiDeleteClientDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        organizationId={org.id}
        organizationName={org.name}
      />
    </div>
  );
}
