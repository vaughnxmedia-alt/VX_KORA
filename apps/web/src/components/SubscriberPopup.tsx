import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  parseSubscriberPopupState,
  writeSubscriberPopupState,
  suppressSubscriberPopupAsSignedUp,
  hasBriefEmailSignupMarker,
  SUBSCRIBER_POPUP_MAX_IMPRESSIONS,
} from "@/lib/subscriber-popup-storage";

const POPUP_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const clearTimer = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const startIntervalIfNeeded = () => {
      const state = parseSubscriberPopupState();
      if (state.subscribed || state.count >= SUBSCRIBER_POPUP_MAX_IMPRESSIONS) {
        return;
      }

      intervalRef.current = setInterval(() => {
        const currentState = parseSubscriberPopupState();
        if (currentState.subscribed || currentState.count >= SUBSCRIBER_POPUP_MAX_IMPRESSIONS) {
          clearTimer();
          return;
        }
        writeSubscriberPopupState({ ...currentState, count: currentState.count + 1 });
        setOpen(true);
      }, POPUP_INTERVAL_MS);
    };

    const syncSuppressionFromSignup = async () => {
      if (hasBriefEmailSignupMarker()) {
        suppressSubscriberPopupAsSignedUp();
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const emailAddr = user?.email?.trim().toLowerCase();
        if (!emailAddr) return;

        const { data: row } = await supabase.from("subscribers").select("id").eq("email", emailAddr).maybeSingle();
        if (!cancelled && row) {
          suppressSubscriberPopupAsSignedUp();
        }
      } catch {
        // non-fatal — popup may still show
      }
    };

    void (async () => {
      await syncSuppressionFromSignup();
      if (cancelled) return;
      startIntervalIfNeeded();
    })();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, []);

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
      const { data: existing } = await supabase
        .from("subscribers")
        .select("id")
        .eq("email", result.data.email.toLowerCase())
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already subscribed",
          description: "This email is already on our list.",
        });
        suppressSubscriberPopupAsSignedUp();
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

      suppressSubscriberPopupAsSignedUp();
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
            Join our curated list for strategic insights on brand intelligence and public relations — and occasional
            updates you can use for your brand.
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
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
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
