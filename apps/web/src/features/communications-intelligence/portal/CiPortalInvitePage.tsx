import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { ciApi } from "../api";
import { ciFriendlyError } from "../workspace";
import { CI_MEMBER_ROLE_LABELS } from "../types";

export function CiPortalInvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const next = `/join/${token}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ["ci", "invite", token],
    queryFn: () => ciApi.invitations.preview(token!),
    enabled: Boolean(token),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: () => ciApi.invitations.accept(token!),
    onSuccess: (organizationId) => {
      toast.success("You now have access to this organization.");
      navigate(`/portal?org=${organizationId}`);
    },
    onError: (e: Error) => toast.error(ciFriendlyError(e)),
  });

  const blocked = data?.already_used || data?.expired || data?.revoked;

  return (
    <div className="min-h-screen grid place-items-center bg-cream/50 px-4 py-12">
      <div className="w-full max-w-md space-y-5 rounded-lg border border-border bg-background p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
          JahKnowsPR
        </p>
        <h1 className="font-serif text-3xl font-bold leading-tight">Join this organization</h1>
        {authLoading || isLoading ? (
          <p className="text-sm text-muted-foreground">Checking this invitation…</p>
        ) : error || !data ? (
          <p className="text-sm text-destructive">{ciFriendlyError(error) || "Invitation not found."}</p>
        ) : (
          <>
            <p className="text-sm leading-relaxed">
              You have been invited to <span className="font-medium">{data.organization_name}</span>
              {data.member_role ? ` as ${CI_MEMBER_ROLE_LABELS[data.member_role]}.` : "."}
            </p>
            <p className="text-sm text-muted-foreground">
              This invitation belongs to {data.email}. The organization cannot be changed here.
            </p>
            {blocked ? (
              <p className="text-sm text-muted-foreground">
                {data.already_used
                  ? "This invitation has already been used."
                  : data.revoked
                    ? "This invitation is no longer valid."
                    : "This invitation has expired. Ask JahKnowsPR to send a new one."}
              </p>
            ) : !user ? (
              <div className="flex flex-col gap-3">
                <Button asChild>
                  <Link
                    to={`/auth?next=${encodeURIComponent(next)}&ciInvite=1&email=${encodeURIComponent(data.email)}`}
                  >
                    Sign in to accept
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link
                    to={`/auth?next=${encodeURIComponent(next)}&ciInvite=1&email=${encodeURIComponent(data.email)}`}
                  >
                    Create an account with this email
                  </Link>
                </Button>
              </div>
            ) : (
              <Button onClick={() => accept.mutate()} disabled={accept.isPending}>
                {accept.isPending ? "Accepting…" : `Continue as ${user.email}`}
              </Button>
            )}
          </>
        )}
        <p className="text-xs text-muted-foreground">
          <Link to="/" className="underline">
            Public site
          </Link>
        </p>
      </div>
    </div>
  );
}

export default CiPortalInvitePage;
