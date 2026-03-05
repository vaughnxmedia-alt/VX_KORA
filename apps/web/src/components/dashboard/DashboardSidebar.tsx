import { useQuery } from "@tanstack/react-query";
import {
  BookText,
  FileText,
  Users,
  Calendar,
  Video,
  Briefcase,
  Lightbulb,
  BarChart3,
  LogOut,
  User,
  Settings,
  Target,
  LucideIcon,
  CalendarDays,
} from "lucide-react";
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
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { cleanupAuthState } from "@/lib/auth-utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AccountNavigation } from "@/components/AccountNavigation";

import { Logo } from "@/components/Logo";

interface SidebarItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
  key: string;
}

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

  // Allowed users who can see the Admin tab
  const ALLOWED_ADMIN_TAB_USERS = ["Justice Vaughn", "Jocelyn Vaughn"];

  // Fetch current user's profile name
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

  const canSeeAdminTab = ALLOWED_ADMIN_TAB_USERS.includes(currentUserProfile?.full_name || "");

  // Fetch user-specific tab permissions
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

  // All available tabs with their keys
  const allTabs: SidebarItem[] = [
    { key: "calendar", title: "Content Calendar", url: "/dashboard/calendar", icon: Calendar },
    { key: "blueprints", title: "Brand Blueprints", url: "/dashboard/blueprints", icon: FileText },
    { key: "audience", title: "Target Audience", url: "/dashboard/audience", icon: Users },
    { key: "strategy", title: "Brand Strategy", url: "/dashboard/strategy", icon: Lightbulb },
    { key: "filming", title: "Filming Schedule", url: "/dashboard/filming", icon: Video },
    { key: "meetings", title: "Meetings", url: "/dashboard/meetings", icon: Briefcase },
    { key: "analytics", title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { key: "blog", title: "Blog Management", url: "/dashboard/blog", icon: BookText },
    { key: "events", title: "Events", url: "/dashboard/events", icon: CalendarDays },
    { key: "subscribers", title: "Subscribers", url: "/dashboard/subscribers", icon: Users },
    { key: "leads", title: "Leads", url: "/dashboard/leads", icon: Target },
    { key: "clients", title: "Admin", url: "/dashboard/clients", icon: Settings },
  ];

  // Admin-only tab keys
  const adminOnlyKeys = ["blog", "events", "subscribers", "leads", "clients"];

  // Filter tabs based on role and permissions
  const items = allTabs.filter(tab => {
    // Special handling for Admin tab - only Justice and Jocelyn can see it
    if (tab.key === "clients") {
      return canSeeAdminTab;
    }

    // Admins/authors see all other tabs
    if (role === "admin" || role === "author") {
      return true;
    }

    // Check if there are custom permissions for this user
    const permission = userPermissions?.find(p => p.tab_key === tab.key);
    
    if (permission) {
      // Use the saved permission
      return permission.is_visible;
    }
    
    // Default: non-admin tabs are visible, admin tabs are hidden
    return !adminOnlyKeys.includes(tab.key);
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-sidebar-accent/50 rounded-lg transition-colors" onClick={() => navigate('/dashboard')}>
           <Logo showText={false} className="h-8 w-8" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">JahKnowsPR</span>
            <span className="truncate text-xs">Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <a href={item.url} onClick={(e) => { e.preventDefault(); navigate(item.url); }}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      {item.badge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {user && (
              <AccountNavigation user={user} align="end" showUserDetails={true}  className="hover:bg-transparent hover:text-foreground"/>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
