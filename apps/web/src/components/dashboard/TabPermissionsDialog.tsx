import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  FileText,
  Users,
  Lightbulb,
  Video,
  Briefcase,
  Calendar,
  BarChart3,
  BookText,
  CalendarDays,
  Target,
  Settings,
  LucideIcon,
} from "lucide-react";

interface TabPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TabConfig {
  key: string;
  title: string;
  icon: LucideIcon;
  adminOnly: boolean;
}

const ALL_TABS: TabConfig[] = [
  { key: "blueprints", title: "Brand Blueprints", icon: FileText, adminOnly: false },
  { key: "audience", title: "Target Audience", icon: Users, adminOnly: false },
  { key: "strategy", title: "Brand Strategy", icon: Lightbulb, adminOnly: false },
  { key: "filming", title: "Filming Schedule", icon: Video, adminOnly: false },
  { key: "meetings", title: "Meetings", icon: Briefcase, adminOnly: false },
  { key: "calendar", title: "Content Calendar", icon: Calendar, adminOnly: false },
  { key: "analytics", title: "Analytics", icon: BarChart3, adminOnly: false },
  { key: "blog", title: "Blog Management", icon: BookText, adminOnly: true },
  { key: "events", title: "Events", icon: CalendarDays, adminOnly: true },
  { key: "leads", title: "Leads", icon: Target, adminOnly: true },
  { key: "clients", title: "Admin", icon: Settings, adminOnly: true },
];

interface UserProfile {
  id: string;
  full_name: string | null;
}

export function TabPermissionsDialog({ open, onOpenChange }: TabPermissionsDialogProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [tabVisibility, setTabVisibility] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all users (non-admin)
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users-for-permissions"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Get user roles to filter out admins
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Filter to only show non-admin users
      const adminUserIds = roles?.filter(r => r.role === "admin").map(r => r.user_id) || [];
      return profiles?.filter(p => !adminUserIds.includes(p.id)) as UserProfile[];
    },
    enabled: open,
  });

  // Fetch permissions for selected user
  const { data: userPermissions, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["user-tab-permissions", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      
      const { data, error } = await supabase
        .from("user_tab_permissions")
        .select("tab_key, is_visible")
        .eq("user_id", selectedUserId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUserId && open,
  });

  // Initialize tab visibility when user changes or permissions load
  useEffect(() => {
    if (selectedUserId && userPermissions) {
      const visibility: Record<string, boolean> = {};
      
      // Default all non-admin tabs to visible, admin tabs to hidden
      ALL_TABS.forEach(tab => {
        visibility[tab.key] = !tab.adminOnly;
      });

      // Apply saved permissions
      userPermissions.forEach(perm => {
        visibility[perm.tab_key] = perm.is_visible;
      });

      setTabVisibility(visibility);
      setHasChanges(false);
    }
  }, [selectedUserId, userPermissions]);

  // Save permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("No user selected");

      // Upsert all tab permissions
      const permissions = Object.entries(tabVisibility).map(([tab_key, is_visible]) => ({
        user_id: selectedUserId,
        tab_key,
        is_visible,
      }));

      // Delete existing permissions for user
      await supabase
        .from("user_tab_permissions")
        .delete()
        .eq("user_id", selectedUserId);

      // Insert new permissions
      const { error } = await supabase
        .from("user_tab_permissions")
        .insert(permissions);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-tab-permissions"] });
      toast.success("Tab permissions saved successfully");
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error("Failed to save permissions: " + error.message);
    },
  });

  const handleToggle = (tabKey: string, checked: boolean) => {
    setTabVisibility(prev => ({ ...prev, [tabKey]: checked }));
    setHasChanges(true);
  };

  const handleSelectAll = () => {
    const newVisibility: Record<string, boolean> = {};
    ALL_TABS.forEach(tab => {
      newVisibility[tab.key] = true;
    });
    setTabVisibility(newVisibility);
    setHasChanges(true);
  };

  const handleDeselectAll = () => {
    const newVisibility: Record<string, boolean> = {};
    ALL_TABS.forEach(tab => {
      newVisibility[tab.key] = false;
    });
    setTabVisibility(newVisibility);
    setHasChanges(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Tab Visibility Settings
          </DialogTitle>
          <DialogDescription>
            Manage which dashboard tabs are visible for each team member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user-select">Select Team Member</Label>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Spinner className="w-5 h-5" />
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team member" />
                </SelectTrigger>
                <SelectContent>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || "Unnamed User"}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No team members found
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tab Visibility Controls */}
          {selectedUserId && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Tab Visibility</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                </div>
              </div>

              {isLoadingPermissions ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="w-6 h-6" />
                </div>
              ) : (
                <div className="space-y-3">
                  {ALL_TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <div
                        key={tab.key}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{tab.title}</span>
                          {tab.adminOnly && (
                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                              Admin Default
                            </span>
                          )}
                        </div>
                        <Switch
                          checked={tabVisibility[tab.key] ?? !tab.adminOnly}
                          onCheckedChange={(checked) => handleToggle(tab.key, checked)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={() => savePermissionsMutation.mutate()}
                  disabled={!hasChanges || savePermissionsMutation.isPending}
                >
                  {savePermissionsMutation.isPending ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Permissions"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
