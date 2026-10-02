import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { HqRole } from "./types";
import { canAccessHqModule } from "./types";

type HqAuthContextValue = {
  hqRole: HqRole | null;
  isHqStaff: boolean;
  isLoading: boolean;
  can: (module: Parameters<typeof canAccessHqModule>[1]) => boolean;
  refresh: () => Promise<void>;
};

const HqAuthContext = createContext<HqAuthContextValue>({
  hqRole: null,
  isHqStaff: false,
  isLoading: true,
  can: () => false,
  refresh: async () => {},
});

function resolveHqRole(
  profileHqRole: string | null | undefined,
  dashboardRole: string | null,
): HqRole | null {
  if (
    profileHqRole === "owner" ||
    profileHqRole === "strategist" ||
    profileHqRole === "creative" ||
    profileHqRole === "intern"
  ) {
    return profileHqRole;
  }
  // Existing admins get Owner until profiles.hq_role is set via migration
  if (dashboardRole === "admin") return "owner";
  if (dashboardRole === "author") return "strategist";
  return null;
}

export function HqAuthProvider({ children }: { children: ReactNode }) {
  const { user, role, isLoading: authLoading } = useAuth();
  const [hqRole, setHqRole] = useState<HqRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setHqRole(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const profileRole = (data as { hq_role?: string | null } | null)?.hq_role;
      setHqRole(resolveHqRole(profileRole, role));
    } catch {
      setHqRole(resolveHqRole(null, role));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role, authLoading]);

  const value = useMemo<HqAuthContextValue>(
    () => ({
      hqRole,
      isHqStaff: Boolean(hqRole),
      isLoading: authLoading || isLoading,
      can: (module) => canAccessHqModule(hqRole, module),
      refresh,
    }),
    [hqRole, authLoading, isLoading],
  );

  return <HqAuthContext.Provider value={value}>{children}</HqAuthContext.Provider>;
}

export function useHqAuth() {
  return useContext(HqAuthContext);
}
