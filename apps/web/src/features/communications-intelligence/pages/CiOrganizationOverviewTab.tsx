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
  type CiAssessmentProfileStatus,
  type CiMemberRole,
  type CiOrganizationType,
} from "../types";
import { ciFriendlyError, inviteUrl, parseSocialChannels } from "../workspace";
import type { CiWorkspaceContext } from "../workspace";

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
    website: org.website ?? "",
    primary_contact: org.primary_contact ?? "",
    description: org.description ?? "",
    primary_audiences: org.primary_audiences ?? "",
    communication_goals: org.communication_goals ?? "",
    major_challenges: org.major_challenges ?? "",
    pr_media_concerns: org.pr_media_concerns ?? "",
    reputation_concerns: org.reputation_concerns ?? "",
    upcoming_events: org.upcoming_events ?? "",
    current_services: org.current_services ?? "",
    assessment_notes: org.assessment_notes ?? "",
    instagram: social.instagram ?? "",
    facebook: social.facebook ?? "",
    tiktok: social.tiktok ?? "",
    linkedin: social.linkedin ?? "",
    other: social.other ?? "",
  });

  const profileStatus = (org.assessment_profile_status ?? "draft") as CiAssessmentProfileStatus;

  const { data: members = [] } = useQuery({
    queryKey: ["ci", "members", org.id],
    queryFn: () => ciApi.members.listForOrganization(org.id),
  });
  const { data: invitations = [] } = useQuery({
    queryKey: ["ci", "invitations", org.id],
    queryFn: () => ciApi.invitations.list(org.id),
  });

  const save = useMutation({
    mutationFn: (status: CiAssessmentProfileStatus) =>
      ciApi.organizations.saveProfile(org.id, {
        name: form.name,
        organization_type: form.organization_type,
        website: form.website,
        primary_contact: form.primary_contact,
        description: form.description,
        primary_audiences: form.primary_audiences,
        communication_goals: form.communication_goals,
        major_challenges: form.major_challenges,
        pr_media_concerns: form.pr_media_concerns,
        reputation_concerns: form.reputation_concerns,
        upcoming_events: form.upcoming_events,
        current_services: form.current_services,
        assessment_notes: form.assessment_notes,
        assessment_profile_status: status,
        social_channels: {
          instagram: form.instagram,
          facebook: form.facebook,
          tiktok: form.tiktok,
          linkedin: form.linkedin,
          other: form.other,
        },
      }),
    onSuccess: async (_data, status) => {
      try {
        const assessment = await ciApi.assessments.ensureForOrganization(org.id);
        await ciApi.assessments.syncProfileSnapshot(assessment.id, org.id);
      } catch {
        // Profile save still succeeded; assessment sync can retry on Step 2.
      }
      if (status === "complete") {
        toast.success("Organization profile saved. Next: internal communications assessment.");
      } else {
        toast.success("Draft saved. You can come back and finish this later.");
      }
      void qc.invalidateQueries({ queryKey: ["ci", "organizations", org.id] });
      void qc.invalidateQueries({ queryKey: ["ci", "assessment"] });
      void qc.invalidateQueries({ queryKey: ["ci", "workflow", org.id] });
      void qc.invalidateQueries({ queryKey: ["ci", "ops"] });
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-dark">
            Communications Assessment · Step 1 of 3
          </p>
          <h2 className="font-serif text-2xl font-bold mt-1">Organization Profile</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Capture what JahKnowsPR needs to know before assessing communications. Save a draft
            anytime. Finish this step before the internal assessment.
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">
            {profileStatus === "complete" ? "Marked complete" : "Draft in progress"}
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate("complete");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="ci-profile-name">Organization name</Label>
            <Input
              id="ci-profile-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization type</Label>
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
              <Label htmlFor="ci-profile-website">Website</Label>
              <Input
                id="ci-profile-website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-profile-contact">Primary contact</Label>
            <Input
              id="ci-profile-contact"
              value={form.primary_contact}
              onChange={(e) => setForm({ ...form, primary_contact: e.target.value })}
              placeholder="Name, and role or email if you have it"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-profile-does">What does the organization do?</Label>
            <Textarea
              id="ci-profile-does"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-profile-serve">Who does the organization serve?</Label>
            <Textarea
              id="ci-profile-serve"
              rows={2}
              value={form.primary_audiences}
              onChange={(e) => setForm({ ...form, primary_audiences: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-profile-goals">
              What does the organization want communications to accomplish?
            </Label>
            <Textarea
              id="ci-profile-goals"
              rows={2}
              value={form.communication_goals}
              onChange={(e) => setForm({ ...form, communication_goals: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-profile-care">What currently needs care or attention?</Label>
            <Textarea
              id="ci-profile-care"
              rows={2}
              value={form.major_challenges}
              onChange={(e) => setForm({ ...form, major_challenges: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-profile-media">Media or visibility concerns</Label>
            <Textarea
              id="ci-profile-media"
              rows={2}
              value={form.pr_media_concerns}
              onChange={(e) => setForm({ ...form, pr_media_concerns: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-profile-reputation">Reputation concerns</Label>
            <Textarea
              id="ci-profile-reputation"
              rows={2}
              value={form.reputation_concerns}
              onChange={(e) => setForm({ ...form, reputation_concerns: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-profile-dates">
              Upcoming dates, launches, events, or announcements
            </Label>
            <Textarea
              id="ci-profile-dates"
              rows={2}
              value={form.upcoming_events}
              onChange={(e) => setForm({ ...form, upcoming_events: e.target.value })}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ci-profile-instagram">Instagram</Label>
              <Input
                id="ci-profile-instagram"
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-profile-facebook">Facebook</Label>
              <Input
                id="ci-profile-facebook"
                value={form.facebook}
                onChange={(e) => setForm({ ...form, facebook: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-profile-tiktok">TikTok</Label>
              <Input
                id="ci-profile-tiktok"
                value={form.tiktok}
                onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-profile-linkedin">LinkedIn</Label>
              <Input
                id="ci-profile-linkedin"
                value={form.linkedin}
                onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-profile-other">Other communication channels</Label>
            <Input
              id="ci-profile-other"
              value={form.other}
              onChange={(e) => setForm({ ...form, other: e.target.value })}
              placeholder="YouTube, newsletter, Google Business, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-profile-services">Current services, products, or programs</Label>
            <Textarea
              id="ci-profile-services"
              rows={3}
              value={form.current_services}
              onChange={(e) => setForm({ ...form, current_services: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ci-profile-notes">Notes</Label>
            <Textarea
              id="ci-profile-notes"
              rows={3}
              value={form.assessment_notes}
              onChange={(e) => setForm({ ...form, assessment_notes: e.target.value })}
              placeholder="Anything else the assessment team should know."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={() => save.mutate("draft")}
            >
              {save.isPending ? "Saving…" : "Save draft"}
            </Button>
            <Button type="submit" disabled={save.isPending || !form.name.trim()}>
              {save.isPending ? "Saving…" : "Save & continue to assessment"}
            </Button>
            {profileStatus === "complete" ? (
              <Button asChild type="button" variant="ghost">
                <Link to={`/hq/intelligence/organizations/${org.id}/health`}>
                  Go to Step 2
                </Link>
              </Button>
            ) : null}
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
              Reopen client onboarding
            </Button>
          ) : null}
          <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as CiMemberRole)}>
                <SelectTrigger className="w-[140px]">
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
            </div>
            <Button
              type="button"
              disabled={!inviteEmail.trim() || invite.isPending}
              onClick={() => invite.mutate()}
            >
              {invite.isPending ? "Creating…" : "Create invite"}
            </Button>
          </div>
          {lastInviteLink ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 break-all">
              <p className="text-xs text-muted-foreground mb-1">Copy this link and send it:</p>
              <p className="text-sm">{lastInviteLink}</p>
            </div>
          ) : null}
          {invitations.length ? (
            <ul className="space-y-2">
              {invitations.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {row.email} · {CI_MEMBER_ROLE_LABELS[row.member_role]}
                    {row.accepted_at ? " · accepted" : row.revoked_at ? " · revoked" : " · pending"}
                  </span>
                  {!row.accepted_at && !row.revoked_at ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => revokeInvite.mutate(row.id)}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {members.length ? (
            <ul className="space-y-2">
              {members.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {member.email || member.user_id} · {CI_MEMBER_ROLE_LABELS[member.role]}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => revokeMember.mutate(member.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="px-0 text-destructive hover:bg-transparent hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete this client
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
