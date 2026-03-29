import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, CalendarIcon, Link2, Image, Video, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Platform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
}

const PLATFORMS: Platform[] = [
  { id: "instagram", name: "Instagram", icon: "📸", connected: false },
  { id: "facebook", name: "Facebook", icon: "📘", connected: false },
  { id: "twitter", name: "Twitter/X", icon: "🐦", connected: false },
  { id: "threads", name: "Threads", icon: "🧵", connected: false },
  { id: "linkedin", name: "LinkedIn", icon: "💼", connected: false },
  { id: "tiktok", name: "TikTok", icon: "🎵", connected: false },
];

interface NewPostDialogProps {
  onPostCreated?: (post: any) => void;
}

export function NewPostDialog({ onPostCreated }: NewPostDialogProps) {
  const [open, setOpen] = useState(false);
  const [platforms, setPlatforms] = useState<Platform[]>(PLATFORMS);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("12:00");
  const [caption, setCaption] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [platformSettings, setPlatformSettings] = useState<Record<string, any>>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
      toast({
        title: "Files uploaded",
        description: `${newFiles.length} file(s) added successfully.`,
      });
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const connectPlatform = (platformId: string) => {
    setPlatforms(prev =>
      prev.map(p =>
        p.id === platformId ? { ...p, connected: true } : p
      )
    );
    toast({
      title: "Platform Connected",
      description: `${platforms.find(p => p.id === platformId)?.name} has been connected successfully.`,
    });
  };

  const updatePlatformSetting = (platformId: string, key: string, value: any) => {
    setPlatformSettings(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        [key]: value,
      },
    }));
  };

  const handleSubmit = () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No content uploaded",
        description: "Please upload at least one image or video.",
        variant: "destructive",
      });
      return;
    }

    // Platform selection is now optional for testing purposes
    // if (selectedPlatforms.length === 0) {
    //   toast({
    //     title: "No platforms selected",
    //     description: "Please select at least one platform to publish to.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    if (!scheduledDate) {
      toast({
        title: "No date selected",
        description: "Please select a date and time to schedule your post.",
        variant: "destructive",
      });
      return;
    }

    const post = {
      id: crypto.randomUUID(),
      files: uploadedFiles,
      platforms: selectedPlatforms,
      caption,
      scheduledDate,
      scheduledTime,
      platformSettings,
      status: "scheduled",
    };

    onPostCreated?.(post);
    toast({
      title: "Post Scheduled",
      description: `Your post has been scheduled for ${format(scheduledDate, "PPP")} at ${scheduledTime}.`,
    });

    // Reset form
    setUploadedFiles([]);
    setSelectedPlatforms([]);
    setCaption("");
    setScheduledDate(undefined);
    setScheduledTime("12:00");
    setPlatformSettings({});
    setOpen(false);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (file.type.startsWith("video/")) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Publish New Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Upload Content</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                id="content-upload"
                className="hidden"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,video/mp4,video/mov,video/avi"
                onChange={handleFileUpload}
              />
              <label htmlFor="content-upload" className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, GIF, WEBP, MP4, MOV, AVI
                </p>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {uploadedFiles.map((file, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="gap-2 py-1.5 px-3"
                  >
                    {getFileIcon(file)}
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption" className="text-base font-semibold">Caption</Label>
            <Textarea
              id="caption"
              placeholder="Write your caption here..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Schedule Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Schedule Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-base font-semibold">Time</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select Platforms</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {platforms.map((platform) => (
                <div
                  key={platform.id}
                  className={cn(
                    "relative border rounded-lg p-3 cursor-pointer transition-all",
                    selectedPlatforms.includes(platform.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  {platform.connected ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedPlatforms.includes(platform.id)}
                        onCheckedChange={() => togglePlatform(platform.id)}
                      />
                      <span className="text-lg">{platform.icon}</span>
                      <span className="text-sm font-medium">{platform.name}</span>
                    </label>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 opacity-50">
                        <span className="text-lg">{platform.icon}</span>
                        <span className="text-sm font-medium">{platform.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs gap-1"
                        onClick={() => connectPlatform(platform.id)}
                      >
                        <Link2 className="w-3 h-3" />
                        Connect
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Platform-Specific Settings */}
          {selectedPlatforms.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Platform Settings</Label>
              <Accordion type="multiple" className="w-full">
                {selectedPlatforms.map((platformId) => {
                  const platform = platforms.find(p => p.id === platformId);
                  if (!platform) return null;

                  return (
                    <AccordionItem key={platformId} value={platformId}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span>{platform.icon}</span>
                          <span>{platform.name} Settings</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        {platformId === "instagram" && (
                          <>
                            <div className="space-y-2">
                              <Label>Post Type</Label>
                              <Select
                                value={platformSettings.instagram?.postType || "feed"}
                                onValueChange={(value) => updatePlatformSetting("instagram", "postType", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select post type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="feed">Feed Post</SelectItem>
                                  <SelectItem value="story">Story</SelectItem>
                                  <SelectItem value="reel">Reel</SelectItem>
                                  <SelectItem value="carousel">Carousel</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>First Comment</Label>
                              <Textarea
                                placeholder="Add hashtags or additional text as first comment..."
                                value={platformSettings.instagram?.firstComment || ""}
                                onChange={(e) => updatePlatformSetting("instagram", "firstComment", e.target.value)}
                              />
                            </div>
                          </>
                        )}

                        {platformId === "facebook" && (
                          <>
                            <div className="space-y-2">
                              <Label>Post To</Label>
                              <Select
                                value={platformSettings.facebook?.destination || "page"}
                                onValueChange={(value) => updatePlatformSetting("facebook", "destination", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select destination" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="page">Page</SelectItem>
                                  <SelectItem value="group">Group</SelectItem>
                                  <SelectItem value="story">Story</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="fb-boost"
                                checked={platformSettings.facebook?.boost || false}
                                onCheckedChange={(checked) => updatePlatformSetting("facebook", "boost", checked)}
                              />
                              <Label htmlFor="fb-boost">Boost this post</Label>
                            </div>
                          </>
                        )}

                        {platformId === "twitter" && (
                          <>
                            <div className="space-y-2">
                              <Label>Thread</Label>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="tw-thread"
                                  checked={platformSettings.twitter?.isThread || false}
                                  onCheckedChange={(checked) => updatePlatformSetting("twitter", "isThread", checked)}
                                />
                                <Label htmlFor="tw-thread">Post as thread</Label>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Reply Settings</Label>
                              <Select
                                value={platformSettings.twitter?.replySettings || "everyone"}
                                onValueChange={(value) => updatePlatformSetting("twitter", "replySettings", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Who can reply" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="everyone">Everyone</SelectItem>
                                  <SelectItem value="following">People you follow</SelectItem>
                                  <SelectItem value="mentioned">Only mentioned</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        {platformId === "threads" && (
                          <div className="space-y-2">
                            <Label>Reply Settings</Label>
                            <Select
                              value={platformSettings.threads?.replySettings || "everyone"}
                              onValueChange={(value) => updatePlatformSetting("threads", "replySettings", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Who can reply" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="everyone">Everyone</SelectItem>
                                <SelectItem value="following">Profiles you follow</SelectItem>
                                <SelectItem value="mentioned">Mentioned only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {platformId === "linkedin" && (
                          <>
                            <div className="space-y-2">
                              <Label>Post To</Label>
                              <Select
                                value={platformSettings.linkedin?.destination || "profile"}
                                onValueChange={(value) => updatePlatformSetting("linkedin", "destination", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select destination" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="profile">Personal Profile</SelectItem>
                                  <SelectItem value="company">Company Page</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Visibility</Label>
                              <Select
                                value={platformSettings.linkedin?.visibility || "public"}
                                onValueChange={(value) => updatePlatformSetting("linkedin", "visibility", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select visibility" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="connections">Connections Only</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        {platformId === "tiktok" && (
                          <>
                            <div className="space-y-2">
                              <Label>Privacy</Label>
                              <Select
                                value={platformSettings.tiktok?.privacy || "public"}
                                onValueChange={(value) => updatePlatformSetting("tiktok", "privacy", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select privacy" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="friends">Friends</SelectItem>
                                  <SelectItem value="private">Private</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="tt-comments"
                                checked={platformSettings.tiktok?.allowComments !== false}
                                onCheckedChange={(checked) => updatePlatformSetting("tiktok", "allowComments", checked)}
                              />
                              <Label htmlFor="tt-comments">Allow comments</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="tt-duet"
                                checked={platformSettings.tiktok?.allowDuet !== false}
                                onCheckedChange={(checked) => updatePlatformSetting("tiktok", "allowDuet", checked)}
                              />
                              <Label htmlFor="tt-duet">Allow duet</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id="tt-stitch"
                                checked={platformSettings.tiktok?.allowStitch !== false}
                                onCheckedChange={(checked) => updatePlatformSetting("tiktok", "allowStitch", checked)}
                              />
                              <Label htmlFor="tt-stitch">Allow stitch</Label>
                            </div>
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Schedule Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
