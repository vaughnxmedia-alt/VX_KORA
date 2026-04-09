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
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Settings } from "lucide-react";
import {
  getSidebarPermissionTabDefinitions,
  type SidebarPermissionTabDef,
} from "@/lib/dashboardNav";

interface TabPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, edit this user only (Users page row menu). */
  fixedUserId?: string | null;
  fixedUserLabel?: string | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
}

const ALL_TABS: SidebarPermissionTabDef[] = getSidebarPermissionTabDefinitions();

function groupLabel(tabs: SidebarPermissionTabDef[]): { group: string; tabs: SidebarPermissionTabDef[] }[] {
  const map = new Map<string, SidebarPermissionTabDef[]>();
  for (const t of tabs) {
    const g = t.group;
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(t);
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, tabs: items }));
}

export function TabPermissionsDialog({
  open,
  onOpenChange,
  fixedUserId,
  fixedUserLabel,
}: TabPermissionsDialogProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [tabVisibility, setTabVisibility] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (open && fixedUserId) {
      setSelectedUserId(fixedUserId);
    }
    if (open && !fixedUserId) {
      setSelectedUserId("");
    }
  }, [open, fixedUserId]);

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users-for-permissions"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id, role");

      if (rolesError) throw rolesError;

      const adminUserIds = roles?.filter((r) => r.role === "admin").map((r) => r.user_id) || [];
      return profiles?.filter((p) => !adminUserIds.includes(p.id)) as UserProfile[];
    },
    enabled: open && !fixedUserId,
  });

  const { data: userPermissions, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["user-tab-permissions-edit", selectedUserId],
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

  useEffect(() => {
    if (selectedUserId && userPermissions) {
      const visibility: Record<string, boolean> = {};
      ALL_TABS.forEach((tab) => {
        visibility[tab.key] = !tab.adminOnly;
      });
      userPermissions.forEach((perm) => {
        visibility[perm.tab_key] = perm.is_visible;
      });
      setTabVisibility(visibility);
      setHasChanges(false);
    }
  }, [selectedUserId, userPermissions]);

  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("No user selected");

      const permissions = Object.entries(tabVisibility).map(([tab_key, is_visible]) => ({
        user_id: selectedUserId,
        tab_key,
        is_visible,
      }));

      await supabase.from("user_tab_permissions").delete().eq("user_id", selectedUserId);

      const { error } = await supabase.from("user_tab_permissions").insert(permissions);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-tab-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["user-tab-permissions-edit"] });
      toast.success("Sidebar permissions saved");
      setHasChanges(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to save permissions: " + error.message);
    },
  });

  const handleToggle = (tabKey: string, checked: boolean) => {
    setTabVisibility((prev) => ({ ...prev, [tabKey]: checked }));
    setHasChanges(true);
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    ALL_TABS.forEach((tab) => {
      next[tab.key] = true;
    });
    setTabVisibility(next);
    setHasChanges(true);
  };

  const handleDeselectAll = () => {
    const next: Record<string, boolean> = {};
    ALL_TABS.forEach((tab) => {
      next[tab.key] = false;
    });
    setTabVisibility(next);
    setHasChanges(true);
  };

  const grouped = groupLabel(ALL_TABS);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {fixedUserLabel ? `Sidebar access — ${fixedUserLabel}` : "Sidebar access"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose which dashboard pages this user can open.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {!fixedUserId && (
            <div className="space-y-2">
              <Label htmlFor="user-select">Team member</Label>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner className="w-5 h-5" />
                </div>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users && users.length > 0 ? (
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || "Unnamed User"}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">No users</div>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {selectedUserId && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm font-medium">Pages</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                    Select all
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleDeselectAll}>
                    Clear all
                  </Button>
                </div>
              </div>

              {isLoadingPermissions ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="w-6 h-6" />
                </div>
              ) : (
                <div className="space-y-6">
                  {grouped.map(({ group, tabs }) => (
                    <div key={group} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                        {tabs.map((tab) => (
                          <label
                            key={tab.key}
                            className="flex cursor-pointer items-start gap-3 rounded-md py-1.5 pr-2 hover:bg-muted/40"
                          >
                            <Checkbox
                              checked={tabVisibility[tab.key] ?? !tab.adminOnly}
                              onCheckedChange={(c) => handleToggle(tab.key, c === true)}
                              className="mt-0.5"
                            />
                            <span className="flex flex-1 flex-col gap-0.5">
                              <span className="text-sm font-medium leading-none">{tab.title}</span>
                              <span className="text-[11px] text-muted-foreground font-mono">{tab.key}</span>
                              {tab.adminOnly ? (
                                <span className="text-[10px] text-primary">Admin-only route by default</span>
                              ) : null}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end border-t pt-4">
                <Button
                  type="button"
                  onClick={() => savePermissionsMutation.mutate()}
                  disabled={!hasChanges || savePermissionsMutation.isPending}
                >
                  {savePermissionsMutation.isPending ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Saving…
                    </>
                  ) : (
                    "Save permissions"
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
