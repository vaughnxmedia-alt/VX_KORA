import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import {
  ADMIN_ONLY_KEYS,
  ADMIN_TAB_KEY,
  DASHBOARD_NAV_GROUPS,
  type NavGroup,
  type NavItem,
} from "@/lib/dashboardNav";
import { isAppOwnerJustice } from "@/lib/super-ops";

export type VisibleNavGroup = {
  label: string;
  items: NavItem[];
};

export function useDashboardNav() {
  const { user, role } = useAuth();

  const { data: currentUserProfile } = useQuery({
    queryKey: ["current-user-profile-sidebar"],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const ALLOWED_ADMIN_TAB_USERS = ["Justice Vaughn", "Jocelyn Vaughn"];
  const canSeeAdminTab = ALLOWED_ADMIN_TAB_USERS.includes(currentUserProfile?.full_name || "");
  const isDashboardOwner = isAppOwnerJustice(user?.email ?? null);

  const { data: userPermissions } = useQuery({
    queryKey: ["user-tab-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_tab_permissions")
        .select("tab_key, is_visible")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const isItemVisible = (itemKey: string, adminOnly?: boolean) => {
    if (isDashboardOwner) return true;
    if (itemKey === ADMIN_TAB_KEY) return canSeeAdminTab;

    const hasExplicitTabPolicy = (userPermissions?.length ?? 0) > 0;
    if (hasExplicitTabPolicy) {
      const permission = userPermissions?.find((p) => p.tab_key === itemKey);
      const allowed = permission
        ? permission.is_visible
        : !ADMIN_ONLY_KEYS.includes(itemKey);
      if (!allowed) return false;
      if (role === "client" && adminOnly && ADMIN_ONLY_KEYS.includes(itemKey)) {
        return false;
      }
      return true;
    }

    if (role === "admin" || role === "author") return true;
    if (adminOnly && ADMIN_ONLY_KEYS.includes(itemKey)) return false;
    const permission = userPermissions?.find((p) => p.tab_key === itemKey);
    if (permission) return permission.is_visible;
    return !ADMIN_ONLY_KEYS.includes(itemKey);
  };

  const visibleNavGroups: VisibleNavGroup[] = DASHBOARD_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => isItemVisible(item.key, item.adminOnly)),
  })).filter((group) => group.items.length > 0);

  return {
    visibleNavGroups,
    isItemVisible,
    isDashboardOwner,
    canSeeAdminTab,
    user,
  };
}

export function isNavItemActive(pathname: string, item: NavItem) {
  if (item.url === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/overview";
  }
  return pathname === item.url || pathname.startsWith(`${item.url}/`);
}

export function flattenVisibleNavItems(groups: VisibleNavGroup[]): NavItem[] {
  return groups.flatMap((group) => group.items);
}

export type { NavGroup, NavItem };
