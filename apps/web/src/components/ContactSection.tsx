import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { MessageSquare, Send, Plus, Link2, Trash2, Instagram, Facebook, Linkedin, Twitter, CalendarIcon } from "lucide-react";
import { HugeiconsIcon } from '@hugeicons/react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SOCIALS } from "@/constants";

interface SocialMediaLink {
  platform: string;
  url: string;
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

// Generate time options from 8am to 6pm
const TIME_OPTIONS = [];
for (let h = 8; h <= 18; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hour = h.toString().padStart(2, '0');
    const minute = m.toString().padStart(2, '0');
    TIME_OPTIONS.push(`${hour}:${minute}`);
  }
}

const ContactSection = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    business_name: "",
    website: "",
    social_media_links: [] as SocialMediaLink[],
  });
  const [newSocialLink, setNewSocialLink] = useState({
    platform: "",
    url: "",
  });

  const addSocialMediaLink = () => {
    if (!newSocialLink.platform || !newSocialLink.url) {
      toast.error("Please select a platform and enter a URL");
      return;
    }
    setFormData({
      ...formData,
      social_media_links: [...formData.social_media_links, newSocialLink],
    });
    setNewSocialLink({ platform: "", url: "" });
  };

  const removeSocialMediaLink = (index: number) => {
    setFormData({
      ...formData,
      social_media_links: formData.social_media_links.filter((_, i) => i !== index),
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

  const handleRequestConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.email || !formData.phone_number || !formData.business_name) {
      toast.error("First name, email, phone number, and business name are required");
      return;
    }

    // Open calendar dialog for scheduling
    setIsCalendarOpen(true);
  };

  const handleScheduleAndSubmit = async () => {
    if (!selectedDate) {
      toast.error("Please select a date for your consultation");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the meeting datetime
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const meetingDateTime = new Date(selectedDate);
      meetingDateTime.setHours(hours, minutes, 0, 0);

      // Insert customer with meeting_scheduled status
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .insert({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number,
          business_name: formData.business_name,
          website: formData.website,
          social_media_links: JSON.parse(JSON.stringify(formData.social_media_links)),
          client_status: 'meeting_scheduled',
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Insert meeting
      const { error: meetingError } = await supabase
        .from("meetings")
        .insert({
          customer_id: customerData.id,
          title: `Initial Consultation - ${formData.first_name} ${formData.last_name}`,
          description: `Initial consultation with ${formData.business_name}`,
          meeting_date: meetingDateTime.toISOString(),
          duration_minutes: 60,
          status: 'scheduled',
        });

      if (meetingError) throw meetingError;

      toast.success("Consultation scheduled! We'll see you soon.");
      
      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        business_name: "",
        website: "",
        social_media_links: [],
      });
      setSelectedDate(undefined);
      setSelectedTime("10:00");
      setIsCalendarOpen(false);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 px-6 bg-background border-t border-border/40">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-4 px-4 py-1 text-sm border-primary/20 bg-primary/5 text-primary tracking-wide uppercase font-semibold">
            Get In Touch
          </Badge>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
            Ready to Build Your Empire?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Stop guessing and start growing. Whether you need a full brand overhaul or a strategic consultation, we're here to help you dominate your market.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Lead Capture Form (Left - 7 cols) */}
          <div className="lg:col-span-7">
            <Card className="border-0 shadow-lg bg-slate-50 dark:bg-slate-900/50">
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-serif font-bold">Direct Consultation</h3>
                </div>
                
                <form onSubmit={handleRequestConsultation} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input 
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="Jane" 
                        className="bg-background border-border/60 focus:border-primary h-12" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input 
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Doe" 
                        className="bg-background border-border/60 focus:border-primary h-12" 
                      />
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input 
                        id="email"
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="jane@company.com" 
                        className="bg-background border-border/60 focus:border-primary h-12" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input 
                        id="phone"
                        type="tel"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        placeholder="+1 (555) 000-0000" 
                        className="bg-background border-border/60 focus:border-primary h-12" 
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="business">Business Name *</Label>
                      <Input 
                        id="business"
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        placeholder="Your Company LLC" 
                        className="bg-background border-border/60 focus:border-primary h-12" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input 
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://yoursite.com" 
                        className="bg-background border-border/60 focus:border-primary h-12" 
                      />
                    </div>
                  </div>

                  {/* Social Media Links */}
                  <div className="space-y-4">
                    <Label>Social Media Links</Label>
                    
                    {formData.social_media_links.length > 0 && (
                      <div className="space-y-2">
                        {formData.social_media_links.map((link, index) => {
                          const IconComponent = getPlatformIcon(link.platform);
                          return (
                            <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                              <IconComponent className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{getPlatformLabel(link.platform)}</span>
                              <span className="text-sm text-muted-foreground truncate flex-1">{link.url}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSocialMediaLink(index)}
                                className="h-8 w-8 p-0"
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
                        onValueChange={(value) => setNewSocialLink({ ...newSocialLink, platform: value })}
                      >
                        <SelectTrigger className="w-[140px] bg-background">
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
                        onChange={(e) => setNewSocialLink({ ...newSocialLink, url: e.target.value })}
                        placeholder="Profile URL"
                        className="flex-1 bg-background"
                      />
                      <Button type="button" variant="outline" onClick={addSocialMediaLink}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit"
                    size="lg" 
                    className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20"
                  >
                    Request Consultation
                    <CalendarIcon className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Social Links (Right - 5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {SOCIALS.map((social) => (
              <a 
                key={social.label} 
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-6 rounded-xl bg-background border border-border hover:border-primary/50 hover:shadow-lg transition-all group flex-1"
              >
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <HugeiconsIcon icon={social.icon} size={28} />
                </div>
                <div>
                  <div className="font-bold text-lg">{social.label}</div>
                  <div className="text-sm text-muted-foreground">{social.handle}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Scheduling Calendar Dialog */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Schedule Your Consultation</DialogTitle>
            <DialogDescription>
              Select a date and time that works best for you. We'll confirm your appointment shortly.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                className={cn("rounded-md border pointer-events-auto")}
                initialFocus
              />
            </div>

            {selectedDate && (
              <div className="space-y-2">
                <Label>Select Time</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {format(new Date(`2000-01-01T${time}:00`), 'h:mm a')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedDate && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium text-primary">
                  <CalendarIcon className="w-4 h-4 inline mr-2" />
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {format(new Date(`2000-01-01T${selectedTime}:00`), 'h:mm a')}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCalendarOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleScheduleAndSubmit} 
              disabled={!selectedDate || isSubmitting}
            >
              {isSubmitting ? "Scheduling..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ContactSection;
