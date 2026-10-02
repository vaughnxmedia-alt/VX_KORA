import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cleanupAuthState } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Settings, LogOut, User as UserIcon, Building2 } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface AccountNavigationProps {
  user: User;
  align?: "start" | "center" | "end";
  className?: string;
  onLinkClick?: () => void;
  showUserDetails?: boolean;
}

export const AccountNavigation: React.FC<AccountNavigationProps> = ({ user, align = "end", className, onLinkClick, showUserDetails = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const dashboardActive =
    location.pathname === "/dashboard" ||
    (location.pathname.startsWith("/dashboard/") && !location.pathname.startsWith("/dashboard/settings"));

  const handleLogout = async () => {
    try {
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout failed, continuing with cleanup');
      }
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/';
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`relative h-auto p-2 rounded-lg w-full flex items-center gap-2 ${className}`}>
          <Avatar className="h-10 w-10 rounded-lg">
            <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name} />
            <AvatarFallback className="rounded-lg">
              <UserIcon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          {showUserDetails && (
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user?.user_metadata?.first_name} {user?.user_metadata?.last_name}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.user_metadata?.first_name} {user.user_metadata?.last_name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleNavigation("/dashboard")}
          className={dashboardActive ? "bg-accent text-accent-foreground" : undefined}
        >
          <LayoutDashboard className="w-4 h-4 mr-2" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleNavigation("/hq")}
          className={location.pathname.startsWith("/hq") ? "bg-accent text-accent-foreground" : undefined}
        >
          <Building2 className="w-4 h-4 mr-2" />
          JahKnowsPR HQ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation("/dashboard/settings")}>
          <Settings className="w-4 h-4 mr-2" />
          Account Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
