import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Link2, Trash2, Instagram, Facebook, Linkedin, Twitter, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { LeadCard } from "@/components/dashboard/LeadCard";
import { cn } from "@/lib/utils";

interface SocialMediaLink {
  platform: string;
  url: string;
}

type ClientStatus = 'lead_captured' | 'strategy_session_pending' | 'meeting_scheduled' | 'contract_sent' | 'second_meeting' | 'active_client' | 'inactive';

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  business_name: string | null;
  client_status: ClientStatus | null;
  created_at: string | null;
  user_id: string;
}

interface Meeting {
  id: string;
  customer_id: string | null;
  meeting_date: string;
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

const STATUS_CONFIG: Record<ClientStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  lead_captured: {
    label: "Lead Captured",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    description: "No Meeting Set"
  },
  strategy_session_pending: {
    label: "Strategy Session",
    color: "text-amber-800 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    description: "Booked — confirm email & promote"
  },
  meeting_scheduled: {
    label: "Meeting Scheduled",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    description: "Discovery call on calendar"
  },
  second_meeting: {
    label: "Second Meeting",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    description: "Clarification needed"
  },
  contract_sent: {
    label: "Contract Sent",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    description: "Awaiting decision"
  },
  active_client: {
    label: "Active Client",
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    description: "Contract signed"
  },
  inactive: {
    label: "Inactive",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-900/30",
    borderColor: "border-gray-200 dark:border-gray-700",
    description: "Lost or paused"
  }
};

const STATUS_ORDER: ClientStatus[] = ['lead_captured', 'strategy_session_pending', 'meeting_scheduled', 'second_meeting', 'contract_sent', 'active_client', 'inactive'];

export default function Leads() {
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [newLead, setNewLead] = useState({
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
  const [newSocialLink, setNewSocialLink] = useState({
    platform: "",
    url: "",
  });

  // Generate time options
  const timeOptions = [];
  for (let h = 8; h <= 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      timeOptions.push(`${hour}:${minute}`);
    }
  }
  const queryClient = useQueryClient();
  const {
    data: customers,
    isLoading
  } = useQuery({
    queryKey: ["customers-pipeline"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("customers").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data as Customer[];
    }
  });
  const {
    data: meetings
  } = useQuery({
    queryKey: ["meetings-for-pipeline"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("meetings").select("id, customer_id, meeting_date").order("meeting_date", {
        ascending: false
      });
      if (error) throw error;
      return data as Meeting[];
    }
  });

  const { data: strategyMeetings } = useQuery({
    queryKey: ["strategy-session-meetings-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, customer_id, confirmation_status, created_at, service_name")
        .eq("service_name", "Strategy Session")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const strategyMeetingByCustomer = useMemo(() => {
    const map = new Map<string, { id: string; confirmation_status: string | null }>();
    for (const m of strategyMeetings ?? []) {
      const cid = m.customer_id as string | null;
      if (cid && !map.has(cid)) {
        map.set(cid, {
          id: m.id as string,
          confirmation_status: (m.confirmation_status as string | null) ?? null,
        });
      }
    }
    return map;
  }, [strategyMeetings]);

  const getLatestMeetingDate = (customerId: string): string | null => {
    const customerMeetings = meetings?.filter(m => m.customer_id === customerId);
    if (customerMeetings && customerMeetings.length > 0) {
      return customerMeetings[0].meeting_date;
    }
    return null;
  };
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      customerId,
      status
    }: {
      customerId: string;
      status: ClientStatus;
    }) => {
      const {
        error
      } = await supabase.from("customers").update({
        client_status: status
      }).eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customers-pipeline"]
      });
      queryClient.invalidateQueries({
        queryKey: ["customers"]
      });
      toast.success("Status updated successfully");
    },
    onError: error => {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  });

  const promoteStrategySessionMutation = useMutation({
    mutationFn: async ({
      customerId,
      meetingId,
    }: {
      customerId: string;
      meetingId: string;
    }) => {
      const { error: e1 } = await supabase
        .from("meetings")
        .update({
          admin_confirmed_at: new Date().toISOString(),
          booking_status: "confirmed",
        })
        .eq("id", meetingId);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("customers")
        .update({ client_status: "active_client" })
        .eq("id", customerId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-active"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings-for-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["strategy-session-meetings-pipeline"] });
      toast.success("Client added to Clients tab");
    },
    onError: () => toast.error("Could not complete promotion"),
  });

  const scheduleMeetingMutation = useMutation({
    mutationFn: async ({
      customerId,
      date,
      title
    }: {
      customerId: string;
      date: Date;
      title: string;
    }) => {
      // Get the current user
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the meeting
      const {
        error: meetingError
      } = await supabase.from("meetings").insert({
        customer_id: customerId,
        meeting_date: date.toISOString(),
        title,
        created_by: user.id,
        status: 'scheduled'
      });
      if (meetingError) throw meetingError;

      // Update customer status to meeting_scheduled
      const {
        error: statusError
      } = await supabase.from("customers").update({
        client_status: 'meeting_scheduled'
      }).eq("id", customerId);
      if (statusError) throw statusError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customers-pipeline"]
      });
      queryClient.invalidateQueries({
        queryKey: ["meetings"]
      });
      queryClient.invalidateQueries({
        queryKey: ["meetings-for-pipeline"]
      });
      toast.success("Meeting scheduled successfully");
    },
    onError: error => {
      console.error("Error scheduling meeting:", error);
      toast.error("Failed to schedule meeting");
    }
  });
  const rescheduleMeetingMutation = useMutation({
    mutationFn: async ({
      customerId,
      date
    }: {
      customerId: string;
      date: Date;
    }) => {
      // Find the most recent meeting for this customer and update it
      const {
        data: existingMeetings,
        error: fetchError
      } = await supabase.from("meetings").select("id").eq("customer_id", customerId).order("meeting_date", {
        ascending: false
      }).limit(1);
      if (fetchError) throw fetchError;
      if (existingMeetings && existingMeetings.length > 0) {
        const {
          error: updateError
        } = await supabase.from("meetings").update({
          meeting_date: date.toISOString()
        }).eq("id", existingMeetings[0].id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["meetings"]
      });
      queryClient.invalidateQueries({
        queryKey: ["meetings-for-pipeline"]
      });
      toast.success("Meeting rescheduled successfully");
    },
    onError: error => {
      console.error("Error rescheduling meeting:", error);
      toast.error("Failed to reschedule meeting");
    }
  });

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: typeof newLead) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create customer as lead
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .insert({
          first_name: leadData.first_name,
          last_name: leadData.last_name,
          email: leadData.email,
          phone_number: leadData.phone_number,
          business_name: leadData.business_name,
          website: leadData.website,
          social_media_links: JSON.parse(JSON.stringify(leadData.social_media_links)),
          user_id: user.id,
          client_status: leadData.meeting_date ? 'meeting_scheduled' : 'lead_captured',
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Create meeting if date is set
      if (leadData.meeting_date) {
        const [hours, minutes] = leadData.meeting_time.split(':').map(Number);
        const meetingDateTime = new Date(leadData.meeting_date);
        meetingDateTime.setHours(hours, minutes, 0, 0);

        const { error: meetingError } = await supabase
          .from("meetings")
          .insert({
            customer_id: customerData.id,
            title: `Initial Consultation - ${leadData.first_name} ${leadData.last_name}`,
            description: `Initial meeting with ${leadData.business_name}`,
            meeting_date: meetingDateTime.toISOString(),
            duration_minutes: 60,
            created_by: user.id,
          });

        if (meetingError) throw meetingError;
      }

      return { customer: customerData, hasMeeting: !!leadData.meeting_date };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings-for-pipeline"] });
      toast.success("Lead added successfully");
      setIsLeadDialogOpen(false);
      setNewLead({
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
    },
    onError: (error) => {
      toast.error("Failed to add lead: " + error.message);
    },
  });

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.first_name || !newLead.email || !newLead.phone_number || !newLead.business_name) {
      toast.error("First name, email, phone number, and business name are required");
      return;
    }
    createLeadMutation.mutate(newLead);
  };

  const addSocialMediaLink = () => {
    if (!newSocialLink.platform || !newSocialLink.url) {
      toast.error("Please select a platform and enter a URL");
      return;
    }
    setNewLead({
      ...newLead,
      social_media_links: [...newLead.social_media_links, newSocialLink],
    });
    setNewSocialLink({ platform: "", url: "" });
  };

  const removeSocialMediaLink = (index: number) => {
    setNewLead({
      ...newLead,
      social_media_links: newLead.social_media_links.filter((_, i) => i !== index),
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

  const getCustomersByStatus = (status: ClientStatus) => {
    return customers?.filter(c => (c.client_status || 'lead_captured') === status) || [];
  };

  const handleScheduleMeeting = (customerId: string, date: Date, title: string) => {
    scheduleMeetingMutation.mutate({
      customerId,
      date,
      title
    });
  };

  const handleRescheduleMeeting = (customerId: string, date: Date) => {
    rescheduleMeetingMutation.mutate({
      customerId,
      date
    });
  };

  const handleUpdateStatus = (customerId: string, status: ClientStatus) => {
    updateStatusMutation.mutate({
      customerId,
      status
    });
  };
  if (isLoading) {
    return <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>;
  }
  return <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your client journey from lead to active client
          </p>
        </div>
        <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Lead Manually
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
              <DialogDescription>
                Enter the lead's information and optionally schedule an initial meeting.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLeadSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={newLead.first_name}
                      onChange={(e) =>
                        setNewLead({ ...newLead, first_name: e.target.value })
                      }
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={newLead.last_name}
                      onChange={(e) =>
                        setNewLead({ ...newLead, last_name: e.target.value })
                      }
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newLead.email}
                    onChange={(e) =>
                      setNewLead({ ...newLead, email: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    value={newLead.phone_number}
                    onChange={(e) =>
                      setNewLead({ ...newLead, phone_number: e.target.value })
                    }
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={newLead.business_name}
                    onChange={(e) =>
                      setNewLead({ ...newLead, business_name: e.target.value })
                    }
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={newLead.website}
                    onChange={(e) =>
                      setNewLead({ ...newLead, website: e.target.value })
                    }
                    placeholder="https://example.com"
                  />
                </div>

                {/* Social Media Links Section */}
                <div className="space-y-3">
                  <Label>Social Media Links</Label>
                  
                  {newLead.social_media_links.length > 0 && (
                    <div className="space-y-2">
                      {newLead.social_media_links.map((link, index) => {
                        const Icon = getPlatformIcon(link.platform);
                        return (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{getPlatformLabel(link.platform)}</span>
                            <span className="text-sm text-muted-foreground truncate flex-1">{link.url}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSocialMediaLink(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Select
                      value={newSocialLink.platform}
                      onValueChange={(value) =>
                        setNewSocialLink({ ...newSocialLink, platform: value })
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <SelectItem key={platform.value} value={platform.value}>
                            <div className="flex items-center gap-2">
                              <platform.icon className="w-4 h-4" />
                              {platform.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={newSocialLink.url}
                      onChange={(e) =>
                        setNewSocialLink({ ...newSocialLink, url: e.target.value })
                      }
                      placeholder="https://instagram.com/username"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addSocialMediaLink}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addSocialMediaLink}
                    className="w-full"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Add Social Media Link
                  </Button>
                </div>

                {/* Meeting Scheduler Section */}
                <div className="space-y-3 border-t pt-4 mt-2">
                  <Label className="text-base font-semibold">Schedule Initial Meeting (Optional)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Meeting Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newLead.meeting_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newLead.meeting_date ? (
                              format(newLead.meeting_date, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newLead.meeting_date || undefined}
                            onSelect={(date) =>
                              setNewLead({ ...newLead, meeting_date: date || null })
                            }
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Meeting Time</Label>
                      <Select
                        value={newLead.meeting_time}
                        onValueChange={(value) =>
                          setNewLead({ ...newLead, meeting_time: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {newLead.meeting_date && (
                    <p className="text-sm text-muted-foreground">
                      Meeting will be scheduled for {format(newLead.meeting_date, "PPPP")} at {newLead.meeting_time}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLeadDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createLeadMutation.isPending}>
                  {createLeadMutation.isPending ? "Adding..." : "Add Lead"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {STATUS_ORDER.map(status => {
        const config = STATUS_CONFIG[status];
        const count = getCustomersByStatus(status).length;
        return <Card key={status} className={`${config.bgColor} ${config.borderColor} border-2`}>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${config.color}`}>{count}</div>
                <div className={`text-xs font-medium ${config.color}`}>{config.label}</div>
              </CardContent>
            </Card>;
      })}
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        {STATUS_ORDER.map(status => {
        const config = STATUS_CONFIG[status];
        const statusCustomers = getCustomersByStatus(status);
        return <div key={status} className="space-y-3">
              
              
              <div className="space-y-3 min-h-[200px]">
                {statusCustomers.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    No leads
                  </div> : statusCustomers.map(customer => <LeadCard key={customer.id} customer={customer} status={status} meetingDate={getLatestMeetingDate(customer.id)} onScheduleMeeting={handleScheduleMeeting} onRescheduleMeeting={handleRescheduleMeeting} onUpdateStatus={handleUpdateStatus} isUpdating={updateStatusMutation.isPending || scheduleMeetingMutation.isPending || rescheduleMeetingMutation.isPending || promoteStrategySessionMutation.isPending} strategySessionMeeting={status === "strategy_session_pending" ? strategyMeetingByCustomer.get(customer.id) ?? null : null} onPromoteStrategySession={handlePromoteStrategySession} />)}
              </div>
            </div>;
      })}
      </div>
    </div>;
}