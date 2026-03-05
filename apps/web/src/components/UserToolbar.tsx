import { Button } from "@/components/ui/button";
import { LayoutDashboard, User, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./AuthProvider";

const UserToolbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return null;
  }

  // Don't show on dashboard page to avoid redundancy
  if (location.pathname === '/dashboard') {
    return null;
  }

  return (
    <div className="bg-muted/50 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Welcome back, {user.user_metadata.first_name || user.email}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserToolbar;