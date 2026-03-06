import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { HomeIcon } from "lucide-react";

export default function DashboardLayout() {
  const location = useLocation();

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    // Custom mapping for breadcrumb titles
    const titleMap: Record<string, string> = {
      dashboard: "Dashboard",
      blueprints: "Brand Blueprints",
      audience: "Target Audience",
      calendar: "Content Calendar",
      filming: "Filming Schedule",
      meetings: "Meetings",
      strategy: "Strategy Updates",
      analytics: "Analytics",
      clients: "Clients",
      blog: "Blog Management",
      overview: "Overview",
      settings: "Settings",
      subscribers: "Subscribers",
      events: "Events",
      leads: "Leads",
      "content-strategy": "Content Strategy",
      campaigns: "Campaign Generator"
    };

    return segments.map((segment, index) => {
      const url = `/${segments.slice(0, index + 1).join('/')}`;
      const isLast = index === segments.length - 1;
      const title = titleMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      return { title, url, isLast };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-svh bg-background">
        <DashboardSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="flex h-14 items-center gap-2 border-b bg-background px-4 lg:h-[60px] sticky top-0 z-10">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6 mx-2" />
            <Breadcrumb>
              <BreadcrumbList>
                <div key="/" className="flex items-center">
                  <BreadcrumbItem className="mr-1">
                    <BreadcrumbLink href={"/"}>
                      <HomeIcon className="w-4 h-4" />
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </div>
                {breadcrumbs.map((item) => (
                  <div key={item.url} className="flex items-center">
                    <BreadcrumbItem className="mr-1">
                      {item.isLast ? (
                        <BreadcrumbPage className="text-muted-foreground/50">
                          {item.title}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.url}>{item.title}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!item.isLast && <BreadcrumbSeparator />}
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
