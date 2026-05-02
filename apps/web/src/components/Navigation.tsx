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
  SearchCheck,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { Logo } from "@/components/Logo";
import { AccountNavigation } from "./AccountNavigation";
import { trackCtaClick, trackEvent } from "@/lib/kora-analytics";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  
  // Smart navigation context detection
  const navigationContext = useMemo(() => {
    const path = location.pathname;
    
    if (path === '/' || path === '/home') return 'landing';
    if (path.startsWith('/dashboard')) return 'app';
    if (
      path.startsWith('/answers') ||
      path.startsWith('/locations') ||
      [
        '/about',
        '/work-with-me',
        '/answers',
        '/the-brief',
        '/auth',
        '/brand-strategy-session',
        '/free-audit',
        '/free-audit/thank-you',
        '/privacy',
        '/terms',
        '/data-deletion',
      ].includes(path)
    )
      return 'public';
    
    return 'landing'; // default
  }, [location.pathname]);

  // Dynamic navigation items based on context
  const navigationItems = useMemo(() => {
    const baseItems = [
      { name: "Home", icon: Home, route: "/home", type: "route" as const },
      { name: "FREE", icon: SearchCheck, route: "/free-audit", type: "route" as const },
      { name: "Services", icon: Briefcase, route: "/work-with-me", type: "route" as const },
      { name: "The Brief", icon: BookText, route: "/the-brief", type: "route" as const },
    ];

    const landingItems = [
      ...baseItems,
    ];

    const appItems = [
      { name: "Home", icon: Home, route: "/home", type: "route" as const },
      { name: "The Brief", icon: BookText, route: "/the-brief", type: "route" as const },
    ];

    const publicItems = [...baseItems];

    switch (navigationContext) {
      case 'app': return appItems;
      case 'public': return publicItems;
      default: return landingItems;
    }
  }, [navigationContext]);

  const handleNavClick = (item: { name: string; route?: string; id?: string; type: 'route' | 'scroll' }) => {
    trackEvent("nav_click", {
      cta_label: item.name,
      cta_id: item.route || item.id || item.name.toLowerCase().replace(/\s+/g, "_"),
      button_text: item.name,
      page_path: location.pathname,
      metadata: { navigation_context: navigationContext, item_type: item.type },
    });

    if (item.type === 'route' && item.route) {
      navigate(item.route);
    } else if (item.type === 'scroll' && item.id) {
      if (location.pathname !== '/' && location.pathname !== '/home') {
        navigate('/home', { state: { scrollTo: item.id } });
      } else {
        const element = document.getElementById(item.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
    setIsOpen(false);
  };

  // Get current page indicator for styling
  const isActiveRoute = (route?: string) => {
    if (!route) return false;
    return location.pathname === route || 
           (route === '/home' && location.pathname === '/');
  };

  return (
    <div className="sticky top-0 z-50">
      <nav className="bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo with context indicator */}
            <div className="flex items-center space-x-3">
              <div 
                className="flex items-center space-x-2 cursor-pointer group" 
                onClick={() => navigate('/')}
              >
                <Logo />
                {navigationContext === 'app' && (
                  <div className="hidden sm:flex items-center ml-3 px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                    <LayoutDashboard className="w-3 h-3 mr-1" />
                    App
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.type === 'route' && isActiveRoute(item.route);
                
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item)}
                    className={`
                      flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                      transition-all duration-200 hover:bg-accent/10 whitespace-nowrap
                      ${isActive 
                        ? 'bg-accent/20 text-accent border border-accent/30' 
                        : 'text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.name}
                  </button>
                );
              })}
              
              {/* User Actions */}
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
                {!isLoading && user && (
                  <AccountNavigation user={user} className="hover:bg-transparent hover:text-foreground" />
                )}
                
                {/* CTA Button - Context Aware */}
                {navigationContext !== 'app' && (
                  <Button
                    variant="hero"
                    size="default"
                    onClick={() => {
                      trackCtaClick({
                        cta_id: "nav_book_strategy_session",
                        cta_label: "Book Strategy Session",
                        button_text: "Book Strategy Session",
                        funnel_id: "strategy_session",
                        funnel_step: "nav_primary_cta",
                        page_path: location.pathname,
                      });
                      navigate("/brand-strategy-session");
                    }}
                    className="shadow-lg hover:shadow-xl transition-shadow whitespace-nowrap"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Book Strategy Session
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center space-x-2">
              {navigationContext === 'app' && (
                <div className="flex items-center px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                  <LayoutDashboard className="w-3 h-3 mr-1" />
                  App
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="relative"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isOpen && (
            <div className="lg:hidden">
              <div className="px-2 pt-6 pb-6 space-y-2 bg-background/98 backdrop-blur-sm border-t border-border">
                {/* Navigation Items */}
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.type === 'route' && isActiveRoute(item.route);
                  
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item)}
                      className={`
                        flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg
                        text-base font-medium transition-all duration-200
                        ${isActive 
                          ? 'bg-accent/20 text-accent border border-accent/30' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
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

                <div className="space-y-3">
                  {navigationContext !== "app" && (
                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full h-12"
                      onClick={() => {
                        navigate("/brand-strategy-session");
                        setIsOpen(false);
                      }}
                    >
                      <CalendarDays className="h-4 w-4" />
                      Book Strategy Session
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
      
    </div>
  );
};

export default Navigation;
