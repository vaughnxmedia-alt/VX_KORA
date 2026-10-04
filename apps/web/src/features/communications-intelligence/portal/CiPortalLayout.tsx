import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ciApi } from "../api";
import type { CiOrganizationMember } from "../types";
import type { ReactNode } from "react";

const PORTAL_NAV = [
  { to: "/portal", label: "Home", end: true },
  { to: "/portal/plan", label: "My Plan", end: false },
  { to: "/portal/messaging", label: "Messaging", end: false },
  { to: "/portal/counsel", label: "Ask JahKnowsPR", end: false },
] as const;

const PORTAL_MORE = [
  { to: "/portal/onboarding", label: "Organization profile" },
  { to: "/portal/priorities", label: "Communications priorities" },
  { to: "/portal/progress", label: "Progress" },
  { to: "/portal/reports", label: "Updates" },
  { to: "/portal/feedback", label: "Feedback" },
] as const;

export function CiPortalLayout({
  memberships,
  children,
}: {
  memberships: CiOrganizationMember[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requested = params.get("org");
  const selectedId =
    requested && memberships.some((m) => m.organization_id === requested)
      ? requested
      : memberships[0].organization_id;
  const search = params.toString() ? `?${params.toString()}` : "";

  const { data: orgs = [] } = useQuery({
    queryKey: ["ci", "portal", "orgs", memberships.map((m) => m.organization_id).join(",")],
    queryFn: async () => {
      const rows = await Promise.all(memberships.map((m) => ciApi.organizations.get(m.organization_id)));
      return rows.filter(Boolean);
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth?next=/portal");
  };

  return (
    <div className="min-h-screen bg-cream/50 text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-4 sm:max-w-2xl">
          <div className="min-w-0">
            <p className="font-serif text-lg font-bold tracking-tight">JahKnowsPR</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-gold-dark">Your communications plan</p>
          </div>
          <div className="flex items-center gap-2">
            {memberships.length > 1 ? (
              <Select
                value={selectedId}
                onValueChange={(id) => {
                  const next = new URLSearchParams(params);
                  next.set("org", id);
                  setParams(next, { replace: true });
                }}
              >
                <SelectTrigger className="w-[10.5rem] sm:w-52 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {memberships.map((m) => {
                    const org = orgs.find((o) => o?.id === m.organization_id);
                    return (
                      <SelectItem key={m.organization_id} value={m.organization_id}>
                        {org?.name || "Organization"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-xl gap-4 overflow-x-auto px-4 pb-3 sm:max-w-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Portal"
        >
          {PORTAL_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={{ pathname: item.to, search }}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "shrink-0 text-sm min-h-11 inline-flex items-center pb-0.5 border-b-2 -mb-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  isActive
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <details className="relative shrink-0">
            <summary className="min-h-11 list-none inline-flex items-center text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              More
            </summary>
            <div className="absolute z-20 mt-1 rounded-lg border border-border bg-background p-3 shadow-sm">
              {PORTAL_MORE.map((item) => (
                <Link
                  key={item.to}
                  to={{ pathname: item.to, search }}
                  className="block min-h-10 py-2 text-sm text-foreground hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
      </header>
      <main className="mx-auto max-w-xl px-4 py-8 sm:max-w-2xl">{children}</main>
    </div>
  );
}
