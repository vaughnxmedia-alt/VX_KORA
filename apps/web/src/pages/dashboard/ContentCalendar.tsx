import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/AuthProvider";
import { NewPostDialog } from "@/components/dashboard/NewPostDialog";
import { PRAssistantChat } from "@/components/dashboard/PRAssistantChat";
import { ChevronLeft, ChevronRight, Settings, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { uploadToS3 } from "@/lib/s3Upload";

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
  const { role } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");

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
    return scheduledPosts.filter(post => 
      isSameDay(new Date(post.scheduled_date), date)
    );
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
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
          <NewPostDialog onPostCreated={handlePostCreated} />
        </div>
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
                          <div className="flex gap-0.5 mb-0.5">
                            {post.platforms.slice(0, 3).map((p) => (
                              <span key={p} className="text-[10px]">
                                {PLATFORM_ICONS[p]}
                              </span>
                            ))}
                          </div>
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

      {/* K.O.R.A Assistant */}
      <Card className="h-[600px] flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <PRAssistantChat />
        </div>
      </Card>
    </div>
  );
}
