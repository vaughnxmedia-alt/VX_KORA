import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const POPUP_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
const MAX_POPUP_COUNT = 5;
const STORAGE_KEY = "subscriber_popup_state";

const subscriberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Please enter a valid email").max(255, "Email must be less than 255 characters"),
});

export function SubscriberPopup() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    const state = getPopupState();
    
    // If already subscribed or max popups reached, don't show
    if (state.subscribed || state.count >= MAX_POPUP_COUNT) {
      return;
    }

    // Show popup after interval
    const timer = setInterval(() => {
      const currentState = getPopupState();
      
      if (currentState.subscribed || currentState.count >= MAX_POPUP_COUNT) {
        clearInterval(timer);
        return;
      }

      // Increment count and show popup
      setPopupState({ ...currentState, count: currentState.count + 1 });
      setOpen(true);
    }, POPUP_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const getPopupState = (): { count: number; subscribed: boolean } => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return { count: 0, subscribed: false };
  };

  const setPopupState = (state: { count: number; subscribed: boolean }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = subscriberSchema.safeParse({ name, email });
    if (!result.success) {
      const fieldErrors: { name?: string; email?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "name") fieldErrors.name = err.message;
        if (err.path[0] === "email") fieldErrors.email = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from("subscribers")
        .select("id")
        .eq("email", result.data.email.toLowerCase())
        .single();

      if (existing) {
        toast({
          title: "Already subscribed",
          description: "This email is already on our list.",
        });
        setPopupState({ count: MAX_POPUP_COUNT, subscribed: true });
        setOpen(false);
        return;
      }

      const { error } = await supabase.from("subscribers").insert({
        name: result.data.name,
        email: result.data.email.toLowerCase(),
      });

      if (error) throw error;

      toast({
        title: "Welcome to The Brief",
        description: "You've been added to our list.",
      });

      setPopupState({ count: MAX_POPUP_COUNT, subscribed: true });
      setOpen(false);
      setName("");
      setEmail("");
    } catch (error) {
      console.error("Subscription error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-primary">
            Stay Informed<span className="text-gold">.</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Join our curated list for strategic insights on brand intelligence and public relations.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="popup-name">Name</Label>
            <Input
              id="popup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="popup-email">Email</Label>
            <Input
              id="popup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Not Now
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Subscribing..." : "Subscribe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
