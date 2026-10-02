import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ciApi } from "../api";
import {
  CI_MEMBER_ROLE_LABELS,
  CI_MEMBER_ROLES,
  CI_ONBOARDING_STATUS_LABELS,
  CI_ORG_STATUS_LABELS,
  CI_ORG_TYPE_LABELS,
  type CiMemberRole,
} from "../types";
import { ciFriendlyError, inviteUrl, parseSocialChannels, parseSpokespersons } from "../workspace";
import type { CiWorkspaceContext } from "../workspace";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-2.5 border-b border-border/70 last:border-0">
      <dt className="text-xs uppercase tracking-[0.08em] text-muted-foreground pt-0.5">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

function PlaceholderStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}

export function CiOrganizationOverviewTab() {
  const { org } = useOutletContext<CiWorkspaceContext>();
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CiMemberRole>("owner");
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  const { data: counts } = useQuery({
    queryKey: ["ci", "organizations", org.id, "counts"],
    queryFn: () => ciApi.workspace.counts(org.id),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["ci", "members", org.id],
    queryFn: () => ciApi.members.listForOrganization(org.id),
  });
  const { data: invitations = [] } = useQuery({
    queryKey: ["ci", "invitations", org.id],
    queryFn: () => ciApi.invitations.list(org.id),
  });

  const invite = useMutation({
    mutationFn: async (override?: { email?: string; member_role?: CiMemberRole }) => {
      return ciApi.invitations.create({
        organization_id: org.id,
        email: override?.email ?? inviteEmail,
        member_role: override?.member_role ?? inviteRole,
      });
    },
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
  const revokeMember = useMutation({
    mutationFn: (id: string) => ciApi.members.revoke(id),
    onSuccess: () => {
      toast.success("Portal access removed");
      void qc.invalidateQueries({ queryKey: ["ci", "members", org.id] });
      void qc.invalidateQueries({ queryKey: ["ci", "organizations", org.id, "counts"] });
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-background p-5 md:p-6">
        <h2 className="font-serif text-xl font-bold mb-3">Organization profile</h2>
        <dl>
          <MetaRow label="Name">{org.name}</MetaRow>
          <MetaRow label="Type">
            {org.organization_type ? CI_ORG_TYPE_LABELS[org.organization_type] : "—"}
          </MetaRow>
          <MetaRow label="Industry">{org.industry || "—"}</MetaRow>
          <MetaRow label="Website">
            {org.website ? (
              <a
                href={org.website.startsWith("http") ? org.website : `https://${org.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline break-all"
              >
                {org.website}
              </a>
            ) : (
              "—"
            )}
          </MetaRow>
          <MetaRow label="Location">{org.location || "—"}</MetaRow>
          <MetaRow label="Description">
            <span className="whitespace-pre-wrap leading-relaxed">{org.description || "—"}</span>
          </MetaRow>
          <MetaRow label="Audiences">
            <span className="whitespace-pre-wrap">{org.primary_audiences || "—"}</span>
          </MetaRow>
          <MetaRow label="Goals">
            <span className="whitespace-pre-wrap">{org.communication_goals || "—"}</span>
          </MetaRow>
          <MetaRow label="Challenges">
            <span className="whitespace-pre-wrap">{org.major_challenges || "—"}</span>
          </MetaRow>
          <MetaRow label="PR / media">
            <span className="whitespace-pre-wrap">{org.pr_media_concerns || "—"}</span>
          </MetaRow>
          <MetaRow label="Reputation">
            <span className="whitespace-pre-wrap">{org.reputation_concerns || "—"}</span>
          </MetaRow>
          <MetaRow label="Upcoming">
            <span className="whitespace-pre-wrap">{org.upcoming_events || "—"}</span>
          </MetaRow>
          <MetaRow label="Spokespersons">
            {parseSpokespersons(org.key_spokespersons).length
              ? parseSpokespersons(org.key_spokespersons)
                  .map((p) => (p.role ? `${p.name} — ${p.role}` : p.name))
                  .join(", ")
              : "—"}
          </MetaRow>
          <MetaRow label="Social">
            {Object.entries(parseSocialChannels(org.social_channels))
              .filter(([, value]) => value)
              .map(([key, value]) => `${key}: ${value}`)
              .join(" · ") || "—"}
          </MetaRow>
          <MetaRow label="Approved messaging">
            {org.has_approved_messaging === true
              ? "Yes"
              : org.has_approved_messaging === false
                ? "Not yet"
                : "—"}
          </MetaRow>
          <MetaRow label="Onboarding">
            {CI_ONBOARDING_STATUS_LABELS[org.onboarding_status] || "—"}
          </MetaRow>
          <MetaRow label="HQ client">
            {org.hq_client ? (
              <Link to={`/hq/clients/${org.hq_client.id}`} className="text-primary hover:underline">
                {org.hq_client.client_name}
                {org.hq_client.primary_contact ? ` · ${org.hq_client.primary_contact}` : ""}
              </Link>
            ) : (
              "—"
            )}
          </MetaRow>
          <MetaRow label="Status">{CI_ORG_STATUS_LABELS[org.status]}</MetaRow>
          <MetaRow label="Members">{counts?.members ?? "…"}</MetaRow>
          <MetaRow label="Created">{formatDate(org.created_at)}</MetaRow>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-background p-5 md:p-6 space-y-4">
        <div>
          <h2 className="font-serif text-xl font-bold">Portal members</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Invite by email. New and existing accounts accept the same secure link. Access stays
            limited to this organization.
          </p>
        </div>
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate({});
          }}
        >
          <Label htmlFor="ci-invite-email" className="sr-only">
            Invite email
          </Label>
          <Input
            id="ci-invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="client@email.com"
            required
          />
          <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as CiMemberRole)}>
            <SelectTrigger className="sm:w-36" aria-label="Membership role">
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
          <Button type="submit" disabled={invite.isPending || !inviteEmail.trim()}>
            {invite.isPending ? "Creating…" : "Invite"}
          </Button>
        </form>
        {lastInviteLink ? (
          <div className="rounded-md border border-border bg-cream/40 p-3 text-sm space-y-2">
            <p>Send this link to the invited person. It expires in 7 days.</p>
            <p className="break-all text-xs">{lastInviteLink}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(lastInviteLink)}
            >
              Copy invitation link
            </Button>
          </div>
        ) : null}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold">Pending invitations</h3>
          {invitations.filter((item) => !item.accepted_at && !item.revoked_at).length ? (
            invitations
              .filter((item) => !item.accepted_at && !item.revoked_at)
              .map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p>
                    {item.email} · {CI_MEMBER_ROLE_LABELS[item.member_role]} · expires{" "}
                    {formatDate(item.expires_at)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => invite.mutate({ email: item.email, member_role: item.member_role })}
                    >
                      Resend
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => revokeInvite.mutate(item.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground">No pending invitations. Invite the organization owner next.</p>
          )}
        </div>
        <ul className="space-y-2 text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
              <span>
                {m.full_name || m.email || m.user_id} · {CI_MEMBER_ROLE_LABELS[m.member_role]} · {m.status}
              </span>
              {m.status === "active" ? (
                <Button type="button" size="sm" variant="outline" onClick={() => revokeMember.mutate(m.id)}>
                  Remove access
                </Button>
              ) : null}
            </li>
          ))}
          {!members.length ? (
            <li className="text-muted-foreground">No portal members yet. Send an invitation to get started.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl font-bold mb-1">At a glance</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Open intelligence, opportunities, actions, and counsel requests for this organization.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <PlaceholderStat label="Open Intelligence Items" value={counts?.intelligence_open ?? 0} />
          <PlaceholderStat label="Active Opportunities" value={counts?.opportunities_active ?? 0} />
          <PlaceholderStat label="Open Actions" value={counts?.actions_open ?? 0} />
          <PlaceholderStat label="Counsel Requests" value={counts?.counsel_open ?? 0} />
        </div>
      </section>
    </div>
  );
}
