import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/AuthProvider";
import { NewPostDialog } from "@/components/dashboard/NewPostDialog";
import { ChevronLeft, ChevronRight, Settings, Loader2, CheckCircle2, Link2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { uploadToS3 } from "@/lib/s3Upload";
import { useNavigate } from "react-router-dom";

interface ContentCalendar {
  id: string;
  name: string;
  calendar_type: "jahknowspr" | "client";
  customer_id: string | null;
}

interface ScheduledPost {
  id: string;
  caption: string | null;
  platforms: string[];
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  calendar_id: string;
  post_type?: "social" | "blog";
  blog_post_id?: string | null;
  campaign_id?: string | null;
  campaign_name_snapshot?: string | null;
}

interface BlogPostLite {
  id: string;
  title: string;
  published_date: string;
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  facebook: "📘",
  twitter: "🐦",
  threads: "🧵",
  linkedin: "💼",
  tiktok: "🎵",
};

interface ActiveClient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
}

export default function ContentCalendar() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [scheduleBlogOpen, setScheduleBlogOpen] = useState(false);
  const [calendarViewFilter, setCalendarViewFilter] = useState<"all" | "social" | "blog">("all");
  const [selectedBlogPostId, setSelectedBlogPostId] = useState("");
  const [blogScheduleDate, setBlogScheduleDate] = useState("");
  const [blogScheduleTime, setBlogScheduleTime] = useState("12:00");
  const [connectingMeta, setConnectingMeta] = useState(false);

  // Fetch all calendars
  const { data: calendars = [], isLoading: calendarsLoading, refetch: refetchCalendars } = useQuery({
    queryKey: ["content-calendars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_calendars")
        .select("*")
        .order("calendar_type", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as ContentCalendar[];
    },
  });

  // Fetch all active clients
  const { data: activeClients = [] } = useQuery({
    queryKey: ["active-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, first_name, last_name, business_name")
        .eq("client_status", "active_client");

      if (error) throw error;
      return data as ActiveClient[];
    },
  });

  const { data: orgMembership } = useQuery({
    queryKey: ["publishing-org-membership", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("organization_users")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: connectedMetaAccounts = [], refetch: refetchMetaAccounts } = useQuery({
    queryKey: ["connected-meta-accounts", orgMembership?.organization_id],
    queryFn: async () => {
      if (!orgMembership?.organization_id) return [];
      const { data, error } = await supabase
        .from("social_accounts")
        .select("id,account_type,account_name,status,username")
        .eq("organization_id", orgMembership.organization_id)
        .eq("provider", "meta")
        .order("account_type");
      if (error) return [];
      return data || [];
    },
    enabled: !!orgMembership?.organization_id,
  });

  // Create missing calendars for active clients
  useEffect(() => {
    const createMissingCalendars = async () => {
      if (activeClients.length === 0 || calendars.length === 0) return;

      const clientsWithoutCalendar = activeClients.filter(
        client => !calendars.some(cal => cal.customer_id === client.id)
      );

      if (clientsWithoutCalendar.length > 0) {
        const newCalendars = clientsWithoutCalendar.map(client => ({
          customer_id: client.id,
          name: client.business_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed Client',
          calendar_type: 'client' as const,
        }));

        const { error } = await supabase.from("content_calendars").insert(newCalendars);
        if (!error) {
          refetchCalendars();
        }
      }
    };

    createMissingCalendars();
  }, [activeClients, calendars, refetchCalendars]);

  // Set default calendar when calendars load
  useEffect(() => {
    if (calendars.length > 0 && !selectedCalendarId) {
      const jahknowspr = calendars.find(c => c.calendar_type === "jahknowspr");
      setSelectedCalendarId(jahknowspr?.id || calendars[0].id);
    }
  }, [calendars, selectedCalendarId]);

  // Fetch posts for selected calendar
  const { data: scheduledPosts = [], refetch: refetchPosts } = useQuery({
    queryKey: ["scheduled-posts", selectedCalendarId],
    queryFn: async () => {
      if (!selectedCalendarId) return [];
      
      const { data, error } = await supabase
        .from("scheduled_posts")
        .select("*")
        .eq("calendar_id", selectedCalendarId);

      if (error) throw error;
      return data as ScheduledPost[];
    },
    enabled: !!selectedCalendarId,
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ["blog-posts-for-scheduling"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, published_date")
        .order("published_date", { ascending: false });
      if (error) throw error;
      return (data || []) as BlogPostLite[];
    },
  });

  const handlePostCreated = async (post: any) => {
    if (!selectedCalendarId) {
      toast({
        title: "Error",
        description: "Please select a calendar first.",
        variant: "destructive",
      });
      return;
    }

    // Collect all media URLs (images in Supabase Storage, videos in S3)
    const mediaUrls: string[] = [];
    
    if (post.files && post.files.length > 0) {
      try {
        for (const file of post.files) {
          const isVideo = file.type.startsWith("video/");
          const isImage = file.type.startsWith("image/");
          
          if (!isVideo && !isImage) {
            toast({
              title: "Unsupported file type",
              description: `${file.name} is not a supported image or video file.`,
              variant: "destructive",
            });
            continue;
          }

          if (isVideo) {
            // Videos → S3 via Edge Function
            const folder = "scheduled-posts/videos";
            const publicUrl = await uploadToS3({
              file,
              folder,
              fileType: "video",
            });
            mediaUrls.push(publicUrl);
          } else if (isImage) {
            // Images → Supabase Storage (blog-images bucket)
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}-${Math.random()
              .toString(36)
              .substring(2)}.${fileExt}`;
            const filePath = `scheduled-posts/images/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("blog-images")
              .upload(filePath, file);

            if (uploadError) {
              console.error("Image upload error:", uploadError);
              toast({
                title: "Image upload failed",
                description: `Failed to upload ${file.name}: ${uploadError.message}`,
                variant: "destructive",
              });
              continue;
            }

            const {
              data: { publicUrl },
            } = supabase.storage.from("blog-images").getPublicUrl(filePath);

            mediaUrls.push(publicUrl);
          }
        }

        if (mediaUrls.length === 0 && post.files.length > 0) {
          toast({
            title: "Upload failed",
            description: "Failed to upload any files. Please try again.",
            variant: "destructive",
          });
          return;
        }
      } catch (error: any) {
        console.error("Error uploading files:", error);
        toast({
          title: "Upload error",
          description: error.message || "An error occurred while uploading files.",
          variant: "destructive",
        });
        return;
      }
    }

    // Save post to database with media URLs
    const { error } = await supabase.from("scheduled_posts").insert({
      calendar_id: selectedCalendarId,
      caption: post.caption,
      platforms: post.platforms || [], // Allow empty platforms array
      platform_settings: post.platformSettings,
      scheduled_date: post.scheduledDate.toISOString().split("T")[0],
      scheduled_time: post.scheduledTime,
      status: "scheduled",
      media_urls: mediaUrls,
    });

    if (error) {
      console.error("Error saving post:", error);
      toast({
        title: "Error",
        description: `Failed to save post: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Post scheduled",
        description: `Your post has been scheduled${mediaUrls.length > 0 ? ` with ${mediaUrls.length} file(s) uploaded` : ""}.`,
      });
      refetchPosts();
    }
  };

  const getPostsForDate = (date: Date) => {
    const byDay = scheduledPosts.filter((post) =>
      isSameDay(new Date(post.scheduled_date), date)
    );
    if (calendarViewFilter === "all") return byDay;
    return byDay.filter((p) => (p.post_type || "social") === calendarViewFilter);
  };

  const selectedCalendar = calendars.find(c => c.id === selectedCalendarId);
  const jahknowsprCalendar = calendars.find(c => c.calendar_type === "jahknowspr");
  const clientCalendars = calendars.filter(c => c.calendar_type === "client");

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  if (calendarsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connectMeta = async () => {
    if (!orgMembership?.organization_id) {
      toast({
        title: "Organization not found",
        description: "Could not determine your organization for social connections.",
        variant: "destructive",
      });
      return;
    }
    setConnectingMeta(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-oauth-start", {
        body: { provider: "meta", organizationId: orgMembership.organization_id },
      });
      if (error || !data?.authUrl) {
        throw new Error((data && data.error) || error?.message || "Could not start Meta OAuth.");
      }
      window.location.href = data.authUrl as string;
    } catch (e) {
      toast({
        title: "Meta connect failed",
        description: e instanceof Error ? e.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setConnectingMeta(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) return;
    if (window.location.pathname !== "/dashboard/calendar") return;

    const run = async () => {
      const { data, error } = await supabase.functions.invoke("social-oauth-callback", {
        body: { provider: "meta", code, state },
      });
      if (error || data?.error) {
        toast({
          title: "Meta connection failed",
          description: data?.error || error?.message || "OAuth callback could not complete.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Meta connected",
          description: "Facebook Pages and linked Instagram accounts were discovered.",
        });
        refetchMetaAccounts();
        setConnectionsOpen(true);
      }
      const clean = new URL(window.location.href);
      clean.searchParams.delete("code");
      clean.searchParams.delete("state");
      window.history.replaceState({}, "", clean.toString());
    };
    run();
  }, [refetchMetaAccounts]);

  const scheduleBlogPost = async () => {
    if (!selectedCalendarId || !selectedBlogPostId || !blogScheduleDate || !blogScheduleTime) {
      toast({
        title: "Missing details",
        description: "Select a blog post, date, and time.",
        variant: "destructive",
      });
      return;
    }

    const selectedPost = blogPosts.find((p) => p.id === selectedBlogPostId);
    const { error } = await supabase.from("scheduled_posts").insert({
      calendar_id: selectedCalendarId,
      caption: selectedPost ? `Blog: ${selectedPost.title}` : "Blog post",
      platforms: [],
      scheduled_date: blogScheduleDate,
      scheduled_time: blogScheduleTime,
      status: "scheduled",
      post_type: "blog",
      blog_post_id: selectedBlogPostId,
    });

    if (error) {
      toast({
        title: "Could not schedule blog",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Blog scheduled",
      description: "Blog publishing schedule was added to the calendar.",
    });
    setScheduleBlogOpen(false);
    setSelectedBlogPostId("");
    setBlogScheduleDate("");
    setBlogScheduleTime("12:00");
    refetchPosts();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <h1 className="text-3xl font-bold text-primary">Content Calendar</h1>
            <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent>
                {jahknowsprCalendar && (
                  <SelectItem value={jahknowsprCalendar.id}>
                    🏠 JahknowsPR Calendar
                  </SelectItem>
                )}
                {clientCalendars.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Client Calendars
                    </div>
                    {clientCalendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        👤 {calendar.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <p className="text-muted-foreground">
            {selectedCalendar?.calendar_type === "jahknowspr"
              ? "Manage JahknowsPR's social media content schedule."
              : `Manage content calendar for ${selectedCalendar?.name || "client"}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConnectionsOpen(true)}>
            <Settings className="w-4 h-4" />
            Connections
          </Button>
          <Button variant="outline" onClick={() => setScheduleBlogOpen(true)}>
            Schedule Blog
          </Button>
          <NewPostDialog onPostCreated={handlePostCreated} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={calendarViewFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setCalendarViewFilter("all")}
        >
          All
        </Button>
        <Button
          variant={calendarViewFilter === "social" ? "default" : "outline"}
          size="sm"
          onClick={() => setCalendarViewFilter("social")}
        >
          Social
        </Button>
        <Button
          variant={calendarViewFilter === "blog" ? "default" : "outline"}
          size="sm"
          onClick={() => setCalendarViewFilter("blog")}
        >
          Blog
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {emptyDays.map((_, index) => (
                <div key={`empty-${index}`} className="min-h-[100px]" />
              ))}
              {daysInMonth.map((day) => {
                const postsOnDay = getPostsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "min-h-[100px] border rounded-lg p-2 cursor-pointer transition-all hover:border-primary/50",
                      isSelected && "border-primary bg-primary/5",
                      isToday && "bg-accent/50"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isToday && "text-primary"
                    )}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {postsOnDay.slice(0, 3).map((post) => (
                        <div
                          key={post.id}
                          className="text-xs p-1 rounded bg-primary/10 truncate"
                        >
                          {(post.post_type || "social") === "blog" ? (
                            <div className="text-[10px] mb-0.5">📝 Blog</div>
                          ) : (
                            <div className="flex gap-0.5 mb-0.5">
                              {post.platforms.slice(0, 3).map((p) => (
                                <span key={p} className="text-[10px]">
                                  {PLATFORM_ICONS[p]}
                                </span>
                              ))}
                            </div>
                          )}
                          <span className="text-muted-foreground">
                            {post.scheduled_time}
                          </span>
                        </div>
                      ))}
                      {postsOnDay.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{postsOnDay.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar - Selected Day Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate && (
                <>
                  {getPostsForDate(selectedDate).length > 0 ? (
                    <div className="space-y-3">
                      {getPostsForDate(selectedDate).map((post) => (
                        <div
                          key={post.id}
                          className="p-3 border rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {post.scheduled_time}
                            </span>
                            <Badge variant={
                              post.status === "published" ? "default" :
                              post.status === "failed" ? "destructive" : "secondary"
                            }>
                              {post.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {post.caption || "No caption"}
                          </p>
                          {(post.post_type || "social") === "blog" ? (
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">📝 Blog</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/dashboard/blog${post.blog_post_id ? `?postId=${post.blog_post_id}` : ""}`
                                  )
                                }
                              >
                                Open in Blog Management
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {post.platforms.map((platform) => (
                                <Badge
                                  key={platform}
                                  variant="outline"
                                  className="text-xs gap-1"
                                >
                                  {PLATFORM_ICONS[platform]} {platform}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {post.campaign_id && (
                            <div className="pt-1 flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                Campaign: {post.campaign_name_snapshot || "Linked"}
                              </Badge>
                              <Button
                                variant="link"
                                className="h-auto p-0 text-xs"
                                onClick={() =>
                                  navigate(`/dashboard/campaigns/${post.campaign_id}`)
                                }
                              >
                                View campaign
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No posts scheduled for this day.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Scheduled</span>
                <span className="font-semibold">
                  {scheduledPosts.filter(p => p.status === "scheduled").length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Published</span>
                <span className="font-semibold">
                  {scheduledPosts.filter(p => p.status === "published").length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Failed</span>
                <span className="font-semibold text-destructive">
                  {scheduledPosts.filter(p => p.status === "failed").length}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="text-sm text-muted-foreground mb-2">Platforms</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(PLATFORM_ICONS).map(([id, icon]) => (
                    <Badge key={id} variant="outline" className="text-xs">
                      {icon} {scheduledPosts.filter(p => p.platforms.includes(id)).length}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={connectionsOpen} onOpenChange={setConnectionsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Social API Connections</DialogTitle>
            <DialogDescription>
              Connect Meta and select eligible Facebook + Instagram professional accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Meta (Facebook + Instagram)
                </h3>
                <Button onClick={connectMeta} disabled={connectingMeta}>
                  {connectingMeta ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Meta"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Requires a Facebook account, managed Page access, and a linked Instagram professional account for IG publishing.
              </p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="font-medium">Connected Accounts</div>
              {connectedMetaAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Meta accounts connected yet.</p>
              ) : (
                <div className="space-y-2">
                  {connectedMetaAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between rounded-md border p-2">
                      <div>
                        <div className="text-sm font-medium">{account.account_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {account.account_type === "facebook_page" ? "Facebook Page" : "Instagram Professional"}
                          {account.username ? ` · @${account.username}` : ""}
                        </div>
                      </div>
                      <Badge variant={account.status === "connected" ? "default" : "secondary"} className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {account.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectionsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleBlogOpen} onOpenChange={setScheduleBlogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Schedule Blog</DialogTitle>
            <DialogDescription>
              Choose an existing blog post and schedule it in the calendar. Editing remains in Blog Management.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Blog Post</Label>
              <Select value={selectedBlogPostId} onValueChange={setSelectedBlogPostId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select blog post" />
                </SelectTrigger>
                <SelectContent>
                  {blogPosts.map((post) => (
                    <SelectItem key={post.id} value={post.id}>
                      {post.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Publish Date</Label>
                <Input
                  type="date"
                  value={blogScheduleDate}
                  onChange={(e) => setBlogScheduleDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Publish Time</Label>
                <Input
                  type="time"
                  value={blogScheduleTime}
                  onChange={(e) => setBlogScheduleTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleBlogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={scheduleBlogPost}>Save Blog Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
