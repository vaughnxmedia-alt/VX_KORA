 import { useEffect, useState, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { format } from "date-fns";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Calendar } from "@/components/ui/calendar";
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from "@/components/ui/popover";
 import { cn } from "@/lib/utils";
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
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from "@/components/ui/dialog";
 import { Input } from "@/components/ui/input";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
 import { useToast } from "@/components/ui/use-toast";
 import { Badge } from "@/components/ui/badge";
 import { Checkbox } from "@/components/ui/checkbox";
 import {
   Plus,
   Search,
   Calendar as CalendarIcon,
   MapPin,
   Edit3,
   Trash2,
   Eye,
   EyeOff,
   Sparkles,
   ExternalLink,
 } from "lucide-react";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import { MoreHorizontal } from "lucide-react";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { ImageUploader } from "@/components/blog/ImageUploader";
 
 type Event = {
   id?: string;
   title: string;
   description: string | null;
   event_date: string;
   end_date: string | null;
   location: string | null;
   cover_image_url: string | null;
   registration_url: string | null;
   category: string | null;
   is_featured: boolean;
   is_published: boolean;
   created_at?: string;
 };
 
 const EVENT_CATEGORIES = [
   "Workshop",
   "Speaking Engagement",
   "Networking",
   "Conference",
   "Webinar",
   "Masterclass",
   "Other",
 ];
 
 // Generate time options
 const TIME_OPTIONS: string[] = [];
 for (let h = 0; h < 24; h++) {
   for (let m = 0; m < 60; m += 30) {
     const hour = h.toString().padStart(2, "0");
     const minute = m.toString().padStart(2, "0");
     TIME_OPTIONS.push(`${hour}:${minute}`);
   }
 }
 
 const EventsManagement = () => {
   const [events, setEvents] = useState<Event[]>([]);
   const [isDialogOpen, setIsDialogOpen] = useState(false);
   const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
   const [searchTerm, setSearchTerm] = useState("");
   const { toast } = useToast();
   const [isSaving, setIsSaving] = useState(false);
 
   // Form state
   const [title, setTitle] = useState("");
   const [description, setDescription] = useState("");
   const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
   const [eventTime, setEventTime] = useState("10:00");
   const [location, setLocation] = useState("");
   const [coverImageUrl, setCoverImageUrl] = useState("");
   const [registrationUrl, setRegistrationUrl] = useState("");
   const [category, setCategory] = useState("");
   const [isFeatured, setIsFeatured] = useState(false);
   const [isPublished, setIsPublished] = useState(false);
 
   const fetchEvents = useCallback(async () => {
     const { data, error } = await supabase
       .from("events")
       .select("*")
       .order("event_date", { ascending: true });
 
     if (error) {
       toast({
         title: "Error",
         description: "Could not fetch events.",
         variant: "destructive",
       });
     } else {
       setEvents(data as Event[]);
     }
   }, [toast]);
 
   useEffect(() => {
     fetchEvents();
   }, [fetchEvents]);
 
   const resetForm = () => {
     setTitle("");
     setDescription("");
     setEventDate(undefined);
     setEventTime("10:00");
     setLocation("");
     setCoverImageUrl("");
     setRegistrationUrl("");
     setCategory("");
     setIsFeatured(false);
     setIsPublished(false);
     setSelectedEvent(null);
   };
 
   const openNewEventDialog = () => {
     resetForm();
     setIsDialogOpen(true);
   };
 
   const handleEdit = (event: Event) => {
     setSelectedEvent(event);
     setTitle(event.title);
     setDescription(event.description || "");
     const date = new Date(event.event_date);
     setEventDate(date);
     setEventTime(format(date, "HH:mm"));
     setLocation(event.location || "");
     setCoverImageUrl(event.cover_image_url || "");
     setRegistrationUrl(event.registration_url || "");
     setCategory(event.category || "");
     setIsFeatured(event.is_featured);
     setIsPublished(event.is_published);
     setIsDialogOpen(true);
   };
 
   const handleDelete = async (eventId: string) => {
     if (window.confirm("Are you sure you want to delete this event?")) {
       const { error } = await supabase.from("events").delete().match({ id: eventId });
 
       if (error) {
         toast({ title: "Error", description: error.message, variant: "destructive" });
       } else {
         toast({ title: "Success", description: "Event deleted." });
         fetchEvents();
       }
     }
   };
 
   const handleTogglePublished = async (event: Event) => {
     const { error } = await supabase
       .from("events")
       .update({ is_published: !event.is_published })
       .match({ id: event.id });
 
     if (error) {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     } else {
       toast({ title: "Success", description: `Event ${event.is_published ? "unpublished" : "published"}.` });
       fetchEvents();
     }
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
 
     if (!title || !eventDate) {
       toast({ title: "Error", description: "Title and date are required.", variant: "destructive" });
       return;
     }
 
     setIsSaving(true);
 
     const [hours, minutes] = eventTime.split(":").map(Number);
     const fullDate = new Date(eventDate);
     fullDate.setHours(hours, minutes, 0, 0);
 
     const eventData = {
       title,
       description: description || null,
       event_date: fullDate.toISOString(),
       location: location || null,
       cover_image_url: coverImageUrl || null,
       registration_url: registrationUrl || null,
       category: category || null,
       is_featured: isFeatured,
       is_published: isPublished,
     };
 
     let error;
     if (selectedEvent?.id) {
       const { error: updateError } = await supabase
         .from("events")
         .update(eventData)
         .match({ id: selectedEvent.id });
       error = updateError;
     } else {
       const { data: { user } } = await supabase.auth.getUser();
       const { error: insertError } = await supabase
         .from("events")
         .insert({ ...eventData, created_by: user?.id });
       error = insertError;
     }
 
     if (error) {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     } else {
       toast({ title: "Success", description: `Event ${selectedEvent ? "updated" : "created"}.` });
       setIsDialogOpen(false);
       resetForm();
       fetchEvents();
     }
     setIsSaving(false);
   };
 
   const filteredEvents = events.filter((event) =>
     event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     event.category?.toLowerCase().includes(searchTerm.toLowerCase())
   );
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
         <div>
           <h1 className="text-3xl font-bold tracking-tight text-primary">Events Management</h1>
           <p className="text-muted-foreground">Create and manage your upcoming events</p>
         </div>
         <Button onClick={openNewEventDialog}>
           <Plus className="h-4 w-4 mr-2" />
           Create Event
         </Button>
       </div>
 
       {/* Stats */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card>
           <CardContent className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-muted-foreground text-sm font-medium">Total Events</p>
                 <p className="text-2xl font-bold text-primary">{events.length}</p>
               </div>
               <CalendarIcon className="h-8 w-8 text-primary/20" />
             </div>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-muted-foreground text-sm font-medium">Published</p>
                 <p className="text-2xl font-bold text-primary">{events.filter((e) => e.is_published).length}</p>
               </div>
               <Eye className="h-8 w-8 text-primary/20" />
             </div>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-muted-foreground text-sm font-medium">Featured</p>
                 <p className="text-2xl font-bold text-primary">{events.filter((e) => e.is_featured).length}</p>
               </div>
               <Sparkles className="h-8 w-8 text-primary/20" />
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Search */}
       <div className="relative max-w-md">
         <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
         <Input
           placeholder="Search events..."
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="pl-10"
         />
       </div>
 
       {/* Table */}
       <Card>
         <CardContent className="p-0">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Event</TableHead>
                 <TableHead>Date & Time</TableHead>
                 <TableHead>Location</TableHead>
                 <TableHead>Category</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead className="w-[60px]"></TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {filteredEvents.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                     No events found
                   </TableCell>
                 </TableRow>
               ) : (
                 filteredEvents.map((event) => (
                   <TableRow key={event.id}>
                     <TableCell>
                       <div className="flex items-center gap-3">
                         {event.cover_image_url ? (
                           <img src={event.cover_image_url} alt="" className="w-12 h-12 rounded object-cover" />
                         ) : (
                           <div className="w-12 h-12 rounded bg-muted" />
                         )}
                         <div>
                           <div className="font-medium flex items-center gap-2">
                             {event.title}
                             {event.is_featured && <Sparkles className="w-3 h-3 text-gold" />}
                           </div>
                         </div>
                       </div>
                     </TableCell>
                     <TableCell>
                       <div className="text-sm">
                         {format(new Date(event.event_date), "MMM d, yyyy")}
                       </div>
                       <div className="text-xs text-muted-foreground">
                         {format(new Date(event.event_date), "h:mm a")}
                       </div>
                     </TableCell>
                     <TableCell>
                       {event.location ? (
                         <div className="flex items-center gap-1 text-sm">
                           <MapPin className="w-3 h-3" />
                           <span className="truncate max-w-[150px]">{event.location}</span>
                         </div>
                       ) : (
                         <span className="text-muted-foreground">—</span>
                       )}
                     </TableCell>
                     <TableCell>
                       {event.category ? (
                         <Badge variant="outline">{event.category}</Badge>
                       ) : (
                         <span className="text-muted-foreground">—</span>
                       )}
                     </TableCell>
                     <TableCell>
                       <Badge variant={event.is_published ? "default" : "secondary"}>
                         {event.is_published ? "Published" : "Draft"}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="sm">
                             <MoreHorizontal className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleEdit(event)}>
                             <Edit3 className="w-4 h-4 mr-2" />
                             Edit
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleTogglePublished(event)}>
                             {event.is_published ? (
                               <>
                                 <EyeOff className="w-4 h-4 mr-2" />
                                 Unpublish
                               </>
                             ) : (
                               <>
                                 <Eye className="w-4 h-4 mr-2" />
                                 Publish
                               </>
                             )}
                           </DropdownMenuItem>
                           <DropdownMenuItem
                             onClick={() => event.id && handleDelete(event.id)}
                             className="text-destructive"
                           >
                             <Trash2 className="w-4 h-4 mr-2" />
                             Delete
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     </TableCell>
                   </TableRow>
                 ))
               )}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
 
       {/* Event Dialog */}
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>{selectedEvent ? "Edit Event" : "Create Event"}</DialogTitle>
           </DialogHeader>
           <form onSubmit={handleSubmit} className="space-y-6">
             <div className="space-y-2">
               <Label htmlFor="title">Event Title *</Label>
               <Input
                 id="title"
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 placeholder="Brand Strategy Workshop"
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="description">Description</Label>
               <Textarea
                 id="description"
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 placeholder="What will attendees learn?"
                 rows={4}
               />
             </div>
 
             <div className="grid sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Event Date *</Label>
                 <Popover>
                   <PopoverTrigger asChild>
                     <Button
                       variant="outline"
                       className={cn("w-full justify-start text-left", !eventDate && "text-muted-foreground")}
                     >
                       <CalendarIcon className="mr-2 h-4 w-4" />
                       {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto p-0">
                     <Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus />
                   </PopoverContent>
                 </Popover>
               </div>
               <div className="space-y-2">
                 <Label>Event Time</Label>
                 <Select value={eventTime} onValueChange={setEventTime}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {TIME_OPTIONS.map((time) => (
                       <SelectItem key={time} value={time}>
                         {format(new Date(`2000-01-01T${time}:00`), "h:mm a")}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="location">Location</Label>
               <Input
                 id="location"
                 value={location}
                 onChange={(e) => setLocation(e.target.value)}
                 placeholder="Virtual / Address"
               />
             </div>
 
             <div className="space-y-2">
               <Label>Category</Label>
               <Select value={category} onValueChange={setCategory}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select category" />
                 </SelectTrigger>
                 <SelectContent>
                   {EVENT_CATEGORIES.map((cat) => (
                     <SelectItem key={cat} value={cat}>
                       {cat}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="registration_url">Registration Link</Label>
               <Input
                 id="registration_url"
                 value={registrationUrl}
                 onChange={(e) => setRegistrationUrl(e.target.value)}
                 placeholder="https://..."
               />
             </div>
 
             <div className="space-y-2">
               <Label>Cover Image</Label>
               <ImageUploader
                 value={coverImageUrl}
                 onChange={setCoverImageUrl}
                 bucket="blog-images"
               />
             </div>
 
             <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                 <Checkbox
                   id="is_featured"
                   checked={isFeatured}
                   onCheckedChange={(checked) => setIsFeatured(checked === true)}
                 />
                 <Label htmlFor="is_featured" className="cursor-pointer">Featured Event</Label>
               </div>
               <div className="flex items-center gap-2">
                 <Checkbox
                   id="is_published"
                   checked={isPublished}
                   onCheckedChange={(checked) => setIsPublished(checked === true)}
                 />
                 <Label htmlFor="is_published" className="cursor-pointer">Published</Label>
               </div>
             </div>
 
             <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                 Cancel
               </Button>
               <Button type="submit" disabled={isSaving}>
                 {isSaving ? "Saving..." : selectedEvent ? "Update Event" : "Create Event"}
               </Button>
             </DialogFooter>
           </form>
         </DialogContent>
       </Dialog>
     </div>
   );
 };
 
 export default EventsManagement;