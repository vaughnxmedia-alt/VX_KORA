import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Briefcase, Calendar, Clock, User, ChevronLeft, ChevronRight, List, CalendarDays } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  duration_minutes: number;
  status: string;
  created_at: string;
  service_name: string | null;
  session_type: string | null;
  confirmation_status: string | null;
  booking_status: string | null;
  admin_confirmed_at: string | null;
  timezone: string | null;
  customer: {
    first_name: string | null;
    last_name: string | null;
    business_name: string | null;
  } | null;
  host_user_id: string | null;
  employee_reference_code: string | null;
  host_profile: { full_name: string | null } | null;
}

export default function Meetings() {
  const { role, user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hostScope, setHostScope] = useState<"all" | "mine">("all");

  const { data: meetings, isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select(`
          *,
          customer:customer_id (
            first_name,
            last_name,
            business_name
          ),
          host_profile:profiles!meetings_host_user_id_fkey (
            full_name
          )
        `)
        .order("meeting_date", { ascending: true });

      if (error) throw error;
      return data as Meeting[];
    },
  });

  const visibleMeetings = useMemo(() => {
    const list = meetings ?? [];
    if (role !== "admin" || hostScope === "all") return list;
    return list.filter((m) => m.host_user_id === user?.id);
  }, [meetings, role, hostScope, user?.id]);

  const sortedMeetings = [...visibleMeetings].sort(
    (a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime()
  );

  const upcomingMeetings = sortedMeetings.filter(
    (m) => new Date(m.meeting_date) >= new Date() && m.status === "scheduled"
  );

  const pastMeetings = sortedMeetings.filter(
    (m) => new Date(m.meeting_date) < new Date() || m.status !== "scheduled"
  );

  const getStatusBadge = (status: string, meetingDate: string) => {
    const isPast = new Date(meetingDate) < new Date();
    if (isPast && status === "scheduled") {
      return <Badge variant="secondary">Completed</Badge>;
    }
    switch (status) {
      case "scheduled":
        return <Badge className="bg-primary">Scheduled</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week the month starts on (0 = Sunday)
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);

  const getMeetingsForDay = (date: Date) => {
    return visibleMeetings.filter((m) => isSameDay(new Date(m.meeting_date), date));
  };

  const selectedDayMeetings = selectedDate ? getMeetingsForDay(selectedDate) : [];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const renderMeetingRow = (meeting: Meeting, isPast: boolean = false) => (
    <TableRow key={meeting.id} className={isPast ? "opacity-70" : ""}>
      <TableCell className="font-medium">{meeting.title}</TableCell>
      <TableCell>
        {meeting.customer ? (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-muted-foreground" />
            <span>
              {meeting.customer.first_name} {meeting.customer.last_name}
            </span>
            {meeting.customer.business_name && (
              <span className="text-muted-foreground">
                ({meeting.customer.business_name})
              </span>
            )}
          </div>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-xs">
        {meeting.host_profile?.full_name
          ? meeting.host_profile.full_name
          : meeting.employee_reference_code
            ? meeting.employee_reference_code
            : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          {format(new Date(meeting.meeting_date), "PPP")}
          <span className="text-muted-foreground ml-2">
            {format(new Date(meeting.meeting_date), "p")}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          {meeting.duration_minutes} min
        </div>
      </TableCell>
      <TableCell>
        {getStatusBadge(meeting.status, meeting.meeting_date)}
      </TableCell>
      <TableCell className="text-xs">
        {meeting.service_name ? (
          <Badge variant="outline" className="font-normal">
            {meeting.service_name}
          </Badge>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-xs capitalize">{meeting.session_type || "—"}</TableCell>
      <TableCell className="text-xs">
        {meeting.confirmation_status ? (
          <Badge
            variant={meeting.confirmation_status === "sent" ? "default" : "secondary"}
            className="font-normal"
          >
            {meeting.confirmation_status}
          </Badge>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-xs">
        {meeting.admin_confirmed_at ? (
          <Badge variant="outline" className="font-normal">
            Confirmed
          </Badge>
        ) : (
          "—"
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4">
          {role === 'admin' ? 'Global Meetings' : 'Meetings'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {role === 'admin' 
            ? "Internal and client meetings in one place."
            : "All meetings, notes, follow-ups, and reminders related to your account."}
        </p>
        {role === "admin" && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Strategy hosts</span>
            <ToggleGroup
              type="single"
              value={hostScope}
              onValueChange={(v) => v && setHostScope(v as "all" | "mine")}
            >
              <ToggleGroupItem value="all" aria-label="All hosts">
                All hosts
              </ToggleGroupItem>
              <ToggleGroupItem value="mine" aria-label="My meetings only">
                Mine
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-8 h-8" />
        </div>
      ) : (
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              List
            </TabsTrigger>
          </TabsList>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    {format(currentMonth, "MMMM yyyy")}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(null); }}>
                      Today
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                  {/* Day Headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                  
                  {/* Empty cells for days before month starts */}
                  {emptyDays.map((_, index) => (
                    <div key={`empty-${index}`} className="bg-background p-2 min-h-[100px]" />
                  ))}
                  
                  {/* Calendar Days */}
                  {daysInMonth.map((day) => {
                    const dayMeetings = getMeetingsForDay(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const hasUpcoming = dayMeetings.some(m => m.status === 'scheduled' && new Date(m.meeting_date) >= new Date());
                    
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "bg-background p-2 min-h-[100px] cursor-pointer transition-colors hover:bg-accent/50",
                          isSelected && "ring-2 ring-primary ring-inset",
                          isToday(day) && "bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "text-sm font-medium mb-1",
                          !isSameMonth(day, currentMonth) && "text-muted-foreground",
                          isToday(day) && "text-primary font-bold"
                        )}>
                          {format(day, "d")}
                        </div>
                        
                        {/* Meeting indicators */}
                        <div className="space-y-1">
                          {dayMeetings.slice(0, 3).map((meeting) => (
                            <div
                              key={meeting.id}
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded truncate",
                                meeting.status === 'scheduled' && new Date(meeting.meeting_date) >= new Date()
                                  ? "bg-primary/20 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                              title={meeting.title}
                            >
                              {format(new Date(meeting.meeting_date), "h:mm a")} - {meeting.title}
                            </div>
                          ))}
                          {dayMeetings.length > 3 && (
                            <div className="text-xs text-muted-foreground px-1">
                              +{dayMeetings.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected Day Details */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    <Badge variant="outline" className="ml-2">
                      {selectedDayMeetings.length} meeting{selectedDayMeetings.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDayMeetings.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDayMeetings.map((meeting) => (
                        <div key={meeting.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card">
                          <div className="flex-shrink-0 text-center">
                            <div className="text-lg font-bold text-primary">
                              {format(new Date(meeting.meeting_date), "h:mm")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(meeting.meeting_date), "a")}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{meeting.title}</h4>
                              {getStatusBadge(meeting.status, meeting.meeting_date)}
                            </div>
                            {meeting.customer && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <User className="w-3 h-3" />
                                {meeting.customer.first_name} {meeting.customer.last_name}
                                {meeting.customer.business_name && ` (${meeting.customer.business_name})`}
                              </div>
                            )}
                            {meeting.description && (
                              <p className="text-sm text-muted-foreground mt-1">{meeting.description}</p>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                              <Clock className="w-3 h-3" />
                              {meeting.duration_minutes} minutes
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No meetings scheduled for this day.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="space-y-6">
            {/* Upcoming Meetings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Upcoming Meetings ({upcomingMeetings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingMeetings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Admin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingMeetings.map((meeting) => renderMeetingRow(meeting))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Upcoming Meetings</h3>
                    <p className="text-muted-foreground">
                      Meetings scheduled with clients will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past Meetings */}
            {pastMeetings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                    Past Meetings ({pastMeetings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Admin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastMeetings.map((meeting) => renderMeetingRow(meeting, true))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
