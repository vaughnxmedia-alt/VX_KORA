import { useState, useEffect, useCallback } from "react";
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
import { RatingPopup } from "@/components/RatingPopup";
import { DashboardMobileQuickNav } from "./DashboardMobileQuickNav";
import { DashboardProfileAlertBanner } from "@/components/dashboard/DashboardProfileAlertBanner";
import { useActiveDay } from "@/hooks/useActiveDay";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export default function DashboardLayout() {
  const location = useLocation();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const { 
    getActiveDaysCount, 
    shouldShowRatingPopup, 
    markRatingShown, 
    markAsRated 
  } = useActiveDay(userId);
  
  const [showRating, setShowRating] = useState(false);
  const [activeDays, setActiveDays] = useState(0);

  useEffect(() => {
    if (userId) {
      const timer = setTimeout(() => {
        if (shouldShowRatingPopup()) {
          setActiveDays(getActiveDaysCount());
          setShowRating(true);
          markRatingShown();
        }
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [userId, shouldShowRatingPopup, getActiveDaysCount, markRatingShown]);

  const handleRatingClose = useCallback(() => {
    setShowRating(false);
  }, []);

  const handleRatingSubmit = useCallback(async (rating: number, feedback: string) => {
    markAsRated();
    
    try {
      await supabase.from("kora_ratings" as any).insert({
        user_id: userId,
        rating,
        feedback: feedback || null,
        active_days_at_rating: activeDays
      });
    } catch (e) {
      console.error("Error saving rating:", e);
    }
  }, [userId, activeDays, markAsRated]);

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    // Custom mapping for breadcrumb titles
    const titleMap: Record<string, string> = {
      dashboard: "Dashboard",
      intake: "Intake",
      blueprints: "Brand Identities",
      identities: "Brand Identities",
      audience: "Audiences",
      calendar: "Content Calendar",
      filming: "Filming Schedule",
      meetings: "Meetings",
      "strategy-session-calendar": "Strategy Session calendar",
      strategy: "Strategy Updates",
      analytics: "Analytics",
      clients: "Telegram users",
      blog: "Blog Management",
      overview: "Overview",
      settings: "Settings",
      subscribers: "Subscribers",
      events: "Events",
      leads: "Leads",
      campaigns: "Campaigns",
      "creative-hub": "Creative Hub",
      logistics: "Logistics",
      "get-inspired": "Get Inspired",
      inspired: "Get Inspired",
      "sponsor-hub": "Sponsor Hub",
      "sponsor-requests": "Sponsor Requests",
      audits: "Audits",
      sources: "Intelligence Sources",
      reports: "Reports",
      links: "Links",
      assets: "Asset Library",
      subscribers: "Subscribers",
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
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4 lg:h-[60px]">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 h-6" />
            <Breadcrumb className="min-w-0 flex-1">
              <BreadcrumbList className="flex-nowrap overflow-hidden">
                <div key="/" className="flex items-center">
                  <BreadcrumbItem className="mr-1">
                    <BreadcrumbLink href={"/"}>
                      <HomeIcon className="w-4 h-4" />
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </div>
                {breadcrumbs.map((item) => (
                  <div key={item.url} className={`flex items-center ${!item.isLast ? "hidden sm:flex" : ""}`}>
                    <BreadcrumbItem className="mr-1 min-w-0">
                      {item.isLast ? (
                        <BreadcrumbPage className="truncate text-muted-foreground/50">
                          {item.title}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.url} className="truncate">
                          {item.title}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!item.isLast && <BreadcrumbSeparator className="hidden sm:block" />}
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <DashboardMobileQuickNav />
          <DashboardProfileAlertBanner />
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      
      <RatingPopup
        open={showRating}
        onClose={handleRatingClose}
        onSubmit={handleRatingSubmit}
        activeDays={activeDays}
      />
    </SidebarProvider>
  );
}
