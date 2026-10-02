import { Navigate, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { ciApi } from "../api";
import { CiPortalLayout } from "./CiPortalLayout";

export function CiPortalApp() {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["ci", "portal", "memberships", user?.id],
    queryFn: () => ciApi.portal.listMemberships(user!.id),
    enabled: Boolean(user?.id),
  });

  const requested = params.get("org");
  const selectedId =
    requested && memberships?.some((m) => m.organization_id === requested)
      ? requested
      : memberships?.[0]?.organization_id;

  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ["ci", "organizations", selectedId],
    queryFn: () => ciApi.organizations.get(selectedId!),
    enabled: Boolean(selectedId),
  });

  if (authLoading || (user && (isLoading || (selectedId && orgLoading)))) {
    return (
      <div className="min-h-screen grid place-items-center bg-cream/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading portal" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?next=/portal" replace />;
  }

  if (!memberships?.length) {
    return (
      <div className="min-h-screen grid place-items-center bg-cream/50 px-4">
        <div className="max-w-md text-center space-y-3 rounded-lg border border-border bg-background p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-dark">
            Communications Intelligence
          </p>
          <h1 className="font-serif text-2xl font-bold">Portal access required</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This space is invite-only. Ask JahKnowsPR to send you an invitation for your organization.
          </p>
          <a href="/" className="text-sm text-primary underline">
            Back to the public site
          </a>
        </div>
      </div>
    );
  }

  const role = memberships.find((m) => m.organization_id === selectedId)?.member_role;
  const onboardingIncomplete =
    Boolean(organization) && organization?.onboarding_status !== "completed" && role !== "viewer";

  if (onboardingIncomplete && !location.pathname.startsWith("/portal/onboarding")) {
    const search = selectedId ? `?org=${selectedId}` : "";
    return <Navigate to={`/portal/onboarding${search}`} replace />;
  }

  if (onboardingIncomplete) {
    return (
      <div className="min-h-screen bg-cream/50 text-foreground">
        <header className="border-b border-border bg-background">
          <div className="mx-auto max-w-3xl px-4 py-4">
            <p className="font-serif text-lg font-bold tracking-tight">JahKnowsPR</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-gold-dark">
              Communications Intelligence
            </p>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8 pb-16">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <CiPortalLayout memberships={memberships}>
      <Outlet />
    </CiPortalLayout>
  );
}

export default CiPortalApp;
