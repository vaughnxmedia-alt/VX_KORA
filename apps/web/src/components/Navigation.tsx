import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  X, 
  LogOut, 
  BookText, 
  Home, 
  MessageCircle,
  LayoutDashboard,
  User as UserIcon,
  Settings,
  Briefcase,
  CalendarDays,
  Sparkles
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { cleanupAuthState } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { AccountNavigation } from "./AccountNavigation";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, hasTheBriefAccess } = useAuth();
  const { toast } = useToast();
  
  // Smart navigation context detection
  const navigationContext = useMemo(() => {
    const path = location.pathname;
    
    if (path === '/' || path === '/home') return 'landing';
    if (path.startsWith('/dashboard')) return 'app';
    if (['/about', '/work-with-me', '/the-brief', '/auth'].includes(path)) return 'public';
    
    return 'landing'; // default
  }, [location.pathname]);

  // Dynamic navigation items based on context
  const navigationItems = useMemo(() => {
    const baseItems = [
      { name: "Home", icon: Home, route: "/home", type: "route" as const },
      { name: "Services", icon: Briefcase, route: "/work-with-me", type: "route" as const },
      { name: "The Brief", icon: BookText, route: "/events", type: "route" as const },
    ];

    const landingItems = [
      ...baseItems,
      { name: "Early Access", icon: Sparkles, route: "/kora", type: "route" as const },
    ];

    const appItems = [
      { name: "Home", icon: Home, route: "/home", type: "route" as const },
      { name: "The Brief", icon: BookText, route: "/events", type: "route" as const },
    ];

    const publicItems = [...baseItems];

    switch (navigationContext) {
      case 'app': return appItems;
      case 'public': return publicItems;
      default: return landingItems;
    }
  }, [navigationContext]);

  const handleNavClick = (item: { name: string; route?: string; id?: string; type: 'route' | 'scroll' }) => {
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

  const handleLogout = async () => {
    try {
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // Continue even if this fails
        console.log('Global signout failed, continuing with cleanup');
      }
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
      
      // Force page reload for clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force reload anyway
      window.location.href = '/';
    }
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
                
                {user && (
                  <Button 
                    variant={isActiveRoute("/dashboard") ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => navigate('/dashboard')}
                    className="whitespace-nowrap"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-1.5" />
                    Dashboard
                  </Button>
                )}

                
                {!isLoading && user && (
                  <AccountNavigation user={user} className="hover:bg-transparent hover:text-foreground" />
                )}
                
                {/* CTA Button - Context Aware */}
                {navigationContext !== 'app' && (
                  <Button 
                    variant="hero" 
                    size="default" 
                    onClick={() => {
                      const element = document.getElementById('contact');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="shadow-lg hover:shadow-xl transition-shadow whitespace-nowrap"
                  >
                    Book Consultation
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
              <div className="px-2 pt-2 pb-4 space-y-2 bg-background/98 backdrop-blur-sm border-t border-border">
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
                    <div className="border-t border-border my-3" />
                    <Button 
                      variant={isActiveRoute("/dashboard") ? "secondary" : "ghost"} 
                      size="sm" 
                      className="w-full justify-start" 
                      onClick={() => handleNavClick({ name: "Dashboard", route: "/dashboard", type: "route" })}
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </>
                )}

                {/* Divider */}
                <div className="border-t border-border my-3" />
                
                {/* User Actions */}
                <div className="space-y-2">
                  {!isLoading && !user && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start" 
                      onClick={() => {
                        navigate('/auth');
                        setIsOpen(false);
                      }}
                    >
                      <UserIcon className="w-4 h-4 mr-2" />
                      Log In
                    </Button>
                  )}
                  
                  {!isLoading && user && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start" 
                        onClick={() => {
                          navigate('/dashboard/settings');
                          setIsOpen(false);
                        }}
                      >
                         <Settings className="w-4 h-4 mr-2" />
                         Account Settings
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50" 
                        onClick={() => {
                          handleLogout();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                    </>
                  )}
                  
                  {/* CTA Button */}
                  {navigationContext !== 'app' && (
                      <Button 
                        variant="hero" 
                        size="lg" 
                        className="w-full mt-4" 
                        onClick={() => {
                          const element = document.getElementById('contact');
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                          }
                          setIsOpen(false);
                        }}
                      >
                        Book Consultation
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
