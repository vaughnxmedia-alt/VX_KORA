import { useEffect } from "react";
import { Gauge, Sparkles } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { AccountNavigation } from "@/components/AccountNavigation";
import { Logo } from "@/components/Logo";
import { isNavItemActive, useDashboardNav } from "@/hooks/useDashboardNav";

function normalizeMissionControlOrigin(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  return trimmed.replace(/^(https?:\/\/127\.0\.0\.1):5173(?=$|[/:])/i, "$1:5174").replace(
    /^(https?:\/\/localhost):5173(?=$|[/:])/i,
    "$1:5174",
  );
}

function resolveMissionControlUrl(): string | undefined {
  const fromEnv = (import.meta.env.VITE_MISSION_CONTROL_URL as string | undefined)?.trim();
  if (fromEnv) return normalizeMissionControlOrigin(fromEnv);
  if (import.meta.env.DEV) return "http://localhost:5174";
  return undefined;
}

export function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  const { visibleNavGroups, isItemVisible, isDashboardOwner, user } = useDashboardNav();
  const missionControlUrl = resolveMissionControlUrl();

  useEffect(() => {
    if (!isMobile || !openMobile) return;
    const timer = window.setTimeout(() => {
      document
        .querySelector('[data-sidebar="menu-button"][data-active="true"]')
        ?.scrollIntoView({ block: "center" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [isMobile, openMobile, location.pathname]);

  const handleNavigate = (url: string) => {
    navigate(url);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="shrink-0">
        <div
          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent/50"
          onClick={() => handleNavigate("/dashboard")}
        >
          <Logo showText={false} className="h-8 w-8" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">JahKnowsPR</span>
            <span className="truncate text-xs">Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="pb-4">
        {visibleNavGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavItemActive(location.pathname, item)}
                      tooltip={item.title}
                    >
                      <a
                        href={item.url}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavigate(item.url);
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
        ))}
      </SidebarContent>
      <SidebarFooter className="shrink-0 pb-4">
        <SidebarMenu>
          {isDashboardOwner && (
            <SidebarMenuItem>
              {missionControlUrl ? (
                <SidebarMenuButton
                  asChild
                  isActive={false}
                  tooltip="Mission Control (opens in new tab)"
                >
                  <a href={missionControlUrl} target="_blank" rel="noopener noreferrer">
                    <Gauge className="text-primary" />
                    <span>Mission Control</span>
                  </a>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  type="button"
                  isActive={false}
                  tooltip="Configure VITE_MISSION_CONTROL_URL on Vercel, then redeploy"
                  onClick={() =>
                    toast({
                      title: "Mission Control URL not set on this deployment",
                      description:
                        "In Vercel → your web project → Settings → Environment Variables, add VITE_MISSION_CONTROL_URL with your Mission Control site origin (no trailing slash), then trigger a new production deploy. Local dev uses http://localhost:5174 automatically.",
                      duration: 14_000,
                    })
                  }
                >
                  <Gauge className="text-primary" />
                  <span>Mission Control</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          )}
          {isItemVisible("get-inspired") && (!isDashboardOwner || !missionControlUrl) && (
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
                    handleNavigate("/dashboard/get-inspired");
                  }}
                >
                  <Sparkles className="text-amber-400/90" />
                  <span>KORA</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
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
