import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  BookText,
  Home,
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  FolderKanban,
  Lightbulb,
  UserRound,
  Mail,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Logo } from "@/components/Logo";
import { AccountNavigation } from "./AccountNavigation";
import { trackCtaClick, trackEvent } from "@/lib/kora-analytics";
import { publicNavLinks, SESSION_CTA_LABEL, SESSION_CTA_PATH } from "@/content/firm";

type NavItem = {
  name: string;
  icon: typeof Home;
  route: string;
  type: "route";
};

const iconByHref: Record<string, typeof Home> = {
  "/": Home,
  "/work-with-us": Briefcase,
  "/work": FolderKanban,
  "/insights": Lightbulb,
  "/about": UserRound,
  "/contact": Mail,
};

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();

  const navigationContext = useMemo(() => {
    const path = location.pathname;
    if (path === "/" || path === "/home") return "landing";
    if (path.startsWith("/dashboard")) return "app";
    return "public";
  }, [location.pathname]);

  const navigationItems: NavItem[] = useMemo(() => {
    const marketingItems: NavItem[] = publicNavLinks.map((link) => ({
      name: link.label,
      icon: iconByHref[link.href] ?? Home,
      route: link.href === "/" ? "/home" : link.href,
      type: "route",
    }));

    const appItems: NavItem[] = [
      { name: "Home", icon: Home, route: "/home", type: "route" },
      { name: "Insights", icon: Lightbulb, route: "/insights", type: "route" },
      { name: "The Brief", icon: BookText, route: "/insights/the-brief", type: "route" },
    ];

    if (navigationContext === "app") return appItems;
    return marketingItems;
  }, [navigationContext]);

  const handleNavClick = (item: NavItem) => {
    trackEvent("nav_click", {
      cta_label: item.name,
      cta_id: item.route.replace(/\//g, "_") || "home",
      button_text: item.name,
      page_path: location.pathname,
      metadata: { navigation_context: navigationContext, item_type: item.type },
    });
    navigate(item.route);
    setIsOpen(false);
  };

  const isStrategySessionFlow =
    location.pathname.startsWith("/strategy-session") ||
    location.pathname.startsWith("/brand-strategy-session");

  const isActiveRoute = (route?: string) => {
    if (!route) return false;
    const path = location.pathname;
    if (route === "/home") return path === "/" || path === "/home";
    if (route === "/insights") return path === "/insights" || path.startsWith("/insights/");
    return path === route || path.startsWith(`${route}/`);
  };

  const bookSession = () => {
    trackCtaClick({
      cta_id: "nav_book_session",
      cta_label: SESSION_CTA_LABEL,
      button_text: SESSION_CTA_LABEL,
      funnel_id: "strategy_session",
      funnel_step: "nav_primary_cta",
      page_path: location.pathname,
    });
    navigate(SESSION_CTA_PATH);
    setIsOpen(false);
  };

  return (
    <div className="sticky top-0 z-50">
      <nav
        className={
          isStrategySessionFlow
            ? "bg-background border-b border-border shadow-sm"
            : "bg-background/95 backdrop-blur-sm border-b border-border shadow-sm"
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div
                className="flex items-center space-x-2 cursor-pointer group"
                onClick={() => navigate("/")}
              >
                <Logo />
                {navigationContext === "app" && (
                  <div className="hidden sm:flex items-center ml-3 px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                    <LayoutDashboard className="w-3 h-3 mr-1" />
                    App
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.route);
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item)}
                    className={`
                      flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                      transition-all duration-200 hover:bg-accent/10 whitespace-nowrap
                      ${
                        isActive
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.name}
                  </button>
                );
              })}

              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
                {!isLoading && user && (
                  <AccountNavigation user={user} className="hover:bg-transparent hover:text-foreground" />
                )}
                {navigationContext !== "app" && (
                  <Button
                    variant="hero"
                    size="default"
                    onClick={bookSession}
                    className="shadow-lg hover:shadow-xl transition-shadow whitespace-nowrap"
                  >
                    <CalendarDays className="h-4 w-4" />
                    {SESSION_CTA_LABEL}
                  </Button>
                )}
              </div>
            </div>

            <div className="lg:hidden flex items-center space-x-2">
              {navigationContext === "app" && (
                <div className="flex items-center px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                  <LayoutDashboard className="w-3 h-3 mr-1" />
                  App
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} className="relative">
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {isOpen && (
            <div className="lg:hidden">
              <div className="px-2 pt-6 pb-6 space-y-2 bg-background/98 backdrop-blur-sm border-t border-border">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.route);
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item)}
                      className={`
                        flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg
                        text-base font-medium transition-all duration-200
                        ${
                          isActive
                            ? "bg-accent/20 text-accent border border-accent/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </button>
                  );
                })}

                {user && (
                  <>
                    <div className="border-t border-border my-4" />
                    <div className="px-1">
                      <AccountNavigation
                        user={user}
                        align="start"
                        showUserDetails
                        onLinkClick={() => setIsOpen(false)}
                        className="h-auto min-h-11 w-full justify-start rounded-lg border border-border px-3 py-2.5 hover:bg-accent/10"
                      />
                    </div>
                  </>
                )}

                <div className="border-t border-border my-4" />
                {navigationContext !== "app" && (
                  <Button variant="hero" size="lg" className="w-full h-12" onClick={bookSession}>
                    <CalendarDays className="h-4 w-4" />
                    {SESSION_CTA_LABEL}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navigation;
