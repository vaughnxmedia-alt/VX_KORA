import { useQuery } from "@tanstack/react-query";
import { Sparkles, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { cleanupAuthState } from "@/lib/auth-utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AccountNavigation } from "@/components/AccountNavigation";
import { Logo } from "@/components/Logo";
import {
  DASHBOARD_NAV_GROUPS,
  ADMIN_ONLY_KEYS,
  ADMIN_TAB_KEY,
} from "@/lib/dashboardNav";

export function DashboardSidebar() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch (err) {
        console.log("Global signout failed, continuing with cleanup");
      }
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      window.location.href = "/";
    }
  };

  const ALLOWED_ADMIN_TAB_USERS = ["Justice Vaughn", "Jocelyn Vaughn"];

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

  const canSeeAdminTab = ALLOWED_ADMIN_TAB_USERS.includes(
    currentUserProfile?.full_name || ""
  );

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
    if (itemKey === ADMIN_TAB_KEY) return canSeeAdminTab;
    if (role === "admin" || role === "author") return true;
    if (adminOnly && ADMIN_ONLY_KEYS.includes(itemKey)) return false;
    const permission = userPermissions?.find((p) => p.tab_key === itemKey);
    if (permission) return permission.is_visible;
    return !ADMIN_ONLY_KEYS.includes(itemKey);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div
          className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-sidebar-accent/50 rounded-lg transition-colors"
          onClick={() => navigate("/dashboard")}
        >
          <Logo showText={false} className="h-8 w-8" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">JahKnowsPR</span>
            <span className="truncate text-xs">Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {DASHBOARD_NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) =>
            isItemVisible(item.key, item.adminOnly)
          );
          if (visibleItems.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          item.url === "/dashboard"
                            ? location.pathname === "/dashboard" ||
                              location.pathname === "/dashboard/overview"
                            : location.pathname === item.url
                        }
                        tooltip={item.title}
                      >
                        <a
                          href={item.url}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(item.url);
                          }}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/dashboard/get-inspired"}
              tooltip="Get Inspired (KORA)"
            >
              <a
                href="/dashboard/get-inspired"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/dashboard/get-inspired");
                }}
              >
                <Sparkles className="text-amber-400/90" />
                <span>KORA</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/dashboard/settings"}
              tooltip="Settings"
            >
              <a
                href="/dashboard/settings"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/dashboard/settings");
                }}
              >
                <Settings />
                <span>Settings</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            {user && (
              <AccountNavigation
                user={user}
                align="end"
                showUserDetails={true}
                className="hover:bg-transparent hover:text-foreground"
              />
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
