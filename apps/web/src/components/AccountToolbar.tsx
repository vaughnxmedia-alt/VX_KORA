import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Rss, BarChart3, Target, ChevronLeft, ChevronRight, FileText, Search, TrendingUp, ClipboardList, ShoppingCart, LayoutDashboard } from "lucide-react";
import { useLocation } from "react-router-dom";

interface AccountSidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isMinimized?: boolean;
  setIsMinimized?: (minimized: boolean) => void;
}

const AccountSidebar = ({ 
  activeTab: externalActiveTab, 
  setActiveTab: externalSetActiveTab,
  isMinimized: externalIsMinimized,
  setIsMinimized: externalSetIsMinimized
}: AccountSidebarProps = {}) => {
  const [internalActiveTab, setInternalActiveTab] = useState("Dashboard");
  const [internalIsMinimized, setInternalIsMinimized] = useState(true);
  const location = useLocation();

  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = externalSetActiveTab || setInternalActiveTab;
  const isMinimized = externalIsMinimized !== undefined ? externalIsMinimized : internalIsMinimized;
  const setIsMinimized = externalSetIsMinimized || setInternalIsMinimized;

  // Show on dashboard page
  if (location.pathname !== '/dashboard') {
    return null;
  }

  const sidebarItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Business Information", icon: Users },
    { name: "Press", icon: FileText },
    { name: "Branding", icon: Target },
    { name: "Audiences", icon: Users },
    { name: "Content Marketing", icon: BarChart3 },
    { name: "SEO", icon: Search },
    { name: "Analytics", icon: TrendingUp },
    { name: "Reports", icon: ClipboardList },
  ];

  return (
    <div className={`fixed left-0 top-20 h-[calc(100vh-5rem)] bg-background border-r border-border z-40 transition-all duration-300 ease-out ${
      isMinimized ? 'w-16' : 'w-64'
    }`}>
      {/* Toggle Button */}
      <div className="absolute -right-3 top-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(!isMinimized)}
          className="w-6 h-6 p-0 rounded-full bg-background border shadow-md hover-scale"
        >
          {isMinimized ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </Button>
      </div>

      {/* Sidebar Content */}
      <div className="p-4 space-y-2">
        {!isMinimized && (
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 animate-fade-in">
            Account Navigation
          </h3>
        )}
        
        {sidebarItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.name;
          
          return (
            <Button
              key={item.name}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveTab(item.name);
                // Auto-collapse sidebar after tab selection
                if (!isMinimized) {
                  setIsMinimized(true);
                }
              }}
              className={`w-full justify-start transition-all duration-200 ${
                isMinimized ? 'px-2' : 'px-3'
              } ${isActive ? 'shadow-sm' : ''}`}
              title={isMinimized ? item.name : undefined}
            >
              <IconComponent className={`w-4 h-4 ${isMinimized ? '' : 'mr-3'}`} />
              {!isMinimized && (
                <span className="animate-fade-in">{item.name}</span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Content Preview */}
      {!isMinimized && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-muted/20 animate-fade-in">
          <div className="text-xs text-muted-foreground">
            <strong>{activeTab}</strong> section
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Content coming soon...
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSidebar;