import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Users, Plus, Mail, Phone, Building, Globe, Shield, User, Link2, Trash2, Instagram, Facebook, Linkedin, Twitter, CalendarIcon, MoreHorizontal, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { TabPermissionsDialog } from "@/components/dashboard/TabPermissionsDialog";
import type { Enums } from "@/integrations/supabase/types";

interface SocialMediaLink {
  platform: string;
  url: string;
}

interface Customer {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  business_name: string | null;
  website: string | null;
  social_media_links: SocialMediaLink[] | null;
  created_at: string | null;
}

interface UserWithRole {
  user_id: string;
  role: Enums<"user_role">;
  full_name: string | null;
  avatar_url: string | null;
}

const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "twitter", label: "Twitter/X", icon: Twitter },
  { value: "tiktok", label: "TikTok", icon: Link2 },
  { value: "youtube", label: "YouTube", icon: Link2 },
  { value: "other", label: "Other", icon: Link2 },
];

export default function Clients() {
  const navigate = useNavigate();
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);

  // Allowed users who can see the settings button
  const ALLOWED_SETTINGS_USERS = ["Justice Vaughn", "Jocelyn Vaughn"];

  // Get current user's profile to check permissions
  const { data: currentUserProfile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const canAccessSettings = ALLOWED_SETTINGS_USERS.includes(currentUserProfile?.full_name || "");
  const [newClient, setNewClient] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    business_name: "",
    website: "",
    social_media_links: [] as SocialMediaLink[],
    meeting_date: null as Date | null,
    meeting_time: "10:00",
  });
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string>("");
  const [newSocialLink, setNewSocialLink] = useState({
    platform: "",
    url: "",
  });
  const [clientToDelete, setClientToDelete] = useState<Customer | null>(null);
  const [adminToRemove, setAdminToRemove] = useState<UserWithRole | null>(null);
  const [clientUserToRemove, setClientUserToRemove] = useState<UserWithRole | null>(null);
  const [clientUserToEdit, setClientUserToEdit] = useState<UserWithRole | null>(null);
  const [adminToEdit, setAdminToEdit] = useState<UserWithRole | null>(null);
  const queryClient = useQueryClient();

  // Fetch users with roles (admins and clients)
  const { data: usersWithRoles, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .order("role");

      if (rolesError) throw rolesError;

      // Fetch profiles for all users with roles
      const userIds = rolesData.map((r) => r.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      return rolesData.map((role) => {
        const profile = profilesData?.find((p) => p.id === role.user_id);
        return {
          user_id: role.user_id,
          role: role.role,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
        };
      }) as UserWithRole[];
    },
  });

  // Fetch all profiles (users with logins)
  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  // Combine all profiles with their roles
  const allUsersWithRoles = allProfiles?.map((profile) => {
    const roleEntry = usersWithRoles?.find((u) => u.user_id === profile.id);
    return {
      user_id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role: roleEntry?.role || null,
    };
  }) || [];

  // Users without any role assigned (available for role assignment)
  const usersWithoutRole = allProfiles?.filter(
    (profile) => !usersWithRoles?.some((u) => u.user_id === profile.id)
  ) || [];

  // Users who are not admins (for adding as admin)
  const nonAdminUsers = [
    ...usersWithoutRole,
    ...(allProfiles?.filter(
      (profile) => usersWithRoles?.some((u) => u.user_id === profile.id && u.role !== "admin")
    ) || []),
  ];

  // Fetch customers - only show active clients in this tab
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("client_status", "active_client")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((item) => ({
        ...item,
        social_media_links: (item.social_media_links as unknown) as SocialMediaLink[] | null,
      })) as Customer[];
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData: typeof newClient) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create customer
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .insert({
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          email: clientData.email,
          phone_number: clientData.phone_number,
          business_name: clientData.business_name,
          website: clientData.website,
          social_media_links: JSON.parse(JSON.stringify(clientData.social_media_links)),
          user_id: user.id,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Create meeting if date is set
      if (clientData.meeting_date) {
        const [hours, minutes] = clientData.meeting_time.split(':').map(Number);
        const meetingDateTime = new Date(clientData.meeting_date);
        meetingDateTime.setHours(hours, minutes, 0, 0);

        const { error: meetingError } = await supabase
          .from("meetings")
          .insert({
            customer_id: customerData.id,
            title: `Initial Consultation - ${clientData.first_name} ${clientData.last_name}`,
            description: `Initial meeting with ${clientData.business_name}`,
            meeting_date: meetingDateTime.toISOString(),
            duration_minutes: 60,
            created_by: user.id,
          });

        if (meetingError) throw meetingError;
      }

      return { customer: customerData, hasMeeting: !!clientData.meeting_date };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["customers-active"] });
      queryClient.invalidateQueries({ queryKey: ["customers-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Client added successfully");
      setIsClientDialogOpen(false);
      setNewClient({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        business_name: "",
        website: "",
        social_media_links: [],
        meeting_date: null,
        meeting_time: "10:00",
      });
      
      // Navigate to meetings if a meeting was scheduled
      if (result.hasMeeting) {
        navigate("/dashboard/meetings");
      }
    },
    onError: (error) => {
      toast.error("Failed to add client: " + error.message);
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers-active"] });
      queryClient.invalidateQueries({ queryKey: ["customers-pipeline"] });
      toast.success("Client removed successfully");
      setClientToDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to remove client: " + error.message);
    },
  });

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.first_name || !newClient.email || !newClient.phone_number || !newClient.business_name) {
      toast.error("First name, email, phone number, and business name are required");
      return;
    }
    createClientMutation.mutate(newClient);
  };

  const addAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role to admin
        const { error } = await supabase
          .from("user_roles")
          .update({ role: "admin" })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        // Insert new admin role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Admin added successfully");
      setIsAdminDialogOpen(false);
      setSelectedAdminUserId("");
    },
    onError: (error) => {
      toast.error("Failed to add admin: " + error.message);
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete the admin role (demotes to no role)
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Admin removed successfully");
      setAdminToRemove(null);
    },
    onError: (error) => {
      toast.error("Failed to remove admin: " + error.message);
    },
  });

  const removeClientUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete the client role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast.success("Client removed successfully");
      setClientUserToRemove(null);
    },
    onError: (error) => {
      toast.error("Failed to remove client: " + error.message);
    },
  });

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminUserId) {
      toast.error("Please select a user");
      return;
    }
    addAdminMutation.mutate(selectedAdminUserId);
  };

  const addSocialMediaLink = () => {
    if (!newSocialLink.platform || !newSocialLink.url) {
      toast.error("Please select a platform and enter a URL");
      return;
    }
    setNewClient({
      ...newClient,
      social_media_links: [...newClient.social_media_links, newSocialLink],
    });
    setNewSocialLink({ platform: "", url: "" });
  };

  const removeSocialMediaLink = (index: number) => {
    setNewClient({
      ...newClient,
      social_media_links: newClient.social_media_links.filter((_, i) => i !== index),
    });
  };

  const getPlatformIcon = (platform: string) => {
    const found = SOCIAL_PLATFORMS.find((p) => p.value === platform);
    return found?.icon || Link2;
  };

  const getPlatformLabel = (platform: string) => {
    const found = SOCIAL_PLATFORMS.find((p) => p.value === platform);
    return found?.label || platform;
  };

  const admins = usersWithRoles?.filter((u) => u.role === "admin") || [];
  const clientUsers = usersWithRoles?.filter((u) => u.role === "client") || [];

  const isLoading = isLoadingUsers || isLoadingCustomers;

  // Generate time options
  const timeOptions = [];
  for (let h = 8; h <= 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push(`${hour}:${minute}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Users</h1>
          <p className="text-muted-foreground">
            Manage all registered users and their roles.
          </p>
        </div>
        {canAccessSettings && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsPermissionsDialogOpen(true)}
            title="Tab Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </div>

      <TabPermissionsDialog 
        open={isPermissionsDialogOpen} 
        onOpenChange={setIsPermissionsDialogOpen} 
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-8 h-8" />
        </div>
      ) : (
        <>
          {/* Admins Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Admins ({admins.length})
              </CardTitle>
              <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>Add New Admin</DialogTitle>
                    <DialogDescription>
                      Select a user to grant admin privileges.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAdminSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin_user">Select User *</Label>
                        <Select
                          value={selectedAdminUserId}
                          onValueChange={setSelectedAdminUserId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {nonAdminUsers.length > 0 ? (
                              nonAdminUsers.map((profile) => (
                                <SelectItem key={profile.id} value={profile.id}>
                                  {profile.full_name || "Unnamed User"}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                No users available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAdminDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={addAdminMutation.isPending || !selectedAdminUserId}>
                        {addAdminMutation.isPending ? "Adding..." : "Add Admin"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {admins.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.user_id}>
                        <TableCell className="font-medium">
                          {admin.full_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-primary">
                            Admin
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setAdminToEdit(admin)}
                              >
                                <User className="w-4 h-4 mr-2" />
                                Edit Information
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setAdminToRemove(admin)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove Admin
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No admins found.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Clients Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground" />
                Clients ({(customers?.length || 0) + clientUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(customers && customers.length > 0) || clientUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Social</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Show registered client users */}
                    {clientUsers.map((client) => (
                      <TableRow key={client.user_id}>
                        <TableCell className="font-medium">
                          {client.full_name || "—"}
                        </TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setClientUserToEdit(client)}
                              >
                                <User className="w-4 h-4 mr-2" />
                                Edit Information
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setClientUserToRemove(client)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Client
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Show customers */}
                    {customers?.map((customer) => {
                      const socialLinks = customer.social_media_links;
                      return (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">
                            {customer.first_name || customer.last_name
                              ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {customer.email ? (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                {customer.email}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {customer.phone_number ? (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                {customer.phone_number}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {customer.business_name ? (
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3 text-muted-foreground" />
                                {customer.business_name}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {customer.website ? (
                              <a
                                href={customer.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <Globe className="w-3 h-3" />
                                Visit
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {socialLinks && socialLinks.length > 0 ? (
                              <div className="flex gap-1">
                                {socialLinks.map((link, idx) => {
                                  const Icon = getPlatformIcon(link.platform);
                                  return (
                                    <a
                                      key={idx}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-primary"
                                      title={getPlatformLabel(link.platform)}
                                    >
                                      <Icon className="w-4 h-4" />
                                    </a>
                                  );
                                })}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {customer.created_at
                              ? new Date(customer.created_at).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setClientToDelete(customer)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Clients Yet</h3>
                  <p className="text-muted-foreground">
                    Add your first client to get started.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Client</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove {clientToDelete?.first_name} {clientToDelete?.last_name} from your clients? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => clientToDelete && deleteClientMutation.mutate(clientToDelete.id)}
                  disabled={deleteClientMutation.isPending}
                >
                  {deleteClientMutation.isPending ? "Removing..." : "Remove"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Admin Removal Confirmation Dialog */}
          <AlertDialog open={!!adminToRemove} onOpenChange={(open) => !open && setAdminToRemove(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Admin</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove admin privileges from {adminToRemove?.full_name || "this user"}? They will no longer have administrative access.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => adminToRemove && removeAdminMutation.mutate(adminToRemove.user_id)}
                  disabled={removeAdminMutation.isPending}
                >
                  {removeAdminMutation.isPending ? "Removing..." : "Remove Admin"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Client User Removal Confirmation Dialog */}
          <AlertDialog open={!!clientUserToRemove} onOpenChange={(open) => !open && setClientUserToRemove(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {clientUserToRemove?.full_name || "this client"}? They will lose access to client features.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => clientUserToRemove && removeClientUserMutation.mutate(clientUserToRemove.user_id)}
                  disabled={removeClientUserMutation.isPending}
                >
                  {removeClientUserMutation.isPending ? "Deleting..." : "Delete Client"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Client User Edit Dialog */}
          <Dialog open={!!clientUserToEdit} onOpenChange={(open) => !open && setClientUserToEdit(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Client Information</DialogTitle>
                <DialogDescription>
                  Update information for {clientUserToEdit?.full_name || "this client"}.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  To edit detailed client information, please update their profile in the user profiles section or contact them to update their account details.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setClientUserToEdit(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Admin Edit Dialog */}
          <Dialog open={!!adminToEdit} onOpenChange={(open) => !open && setAdminToEdit(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Admin Information</DialogTitle>
                <DialogDescription>
                  Update information for {adminToEdit?.full_name || "this admin"}.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  To edit detailed admin information, please update their profile in the user profiles section or contact them to update their account details.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAdminToEdit(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
