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
import { isAppOwner, isSuperOpsUser } from "@/lib/super-ops";

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
  const isDashboardOwner = isAppOwner(user?.email ?? null);
  const hasFullNavAccess =
    isDashboardOwner ||
    isSuperOpsUser(user?.email ?? null, currentUserProfile?.full_name ?? null);

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
    if (hasFullNavAccess) return true;
    if (itemKey === ADMIN_TAB_KEY) return canSeeAdminTab;

    const isAdminLike = role === "admin" || role === "author";
    const permission = userPermissions?.find((p) => p.tab_key === itemKey);

    if (permission?.is_visible === false) return false;
    if (permission?.is_visible === true) return true;

    // Admin/author users should see new dashboard tabs (e.g. Sponsor Hub) even when
    // their saved sidebar permissions predate those routes.
    if (isAdminLike) return true;

    const hasExplicitTabPolicy = (userPermissions?.length ?? 0) > 0;
    if (hasExplicitTabPolicy) {
      if (adminOnly && ADMIN_ONLY_KEYS.includes(itemKey)) return false;
      return true;
    }

    if (adminOnly && ADMIN_ONLY_KEYS.includes(itemKey)) return false;
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
    hasFullNavAccess,
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
