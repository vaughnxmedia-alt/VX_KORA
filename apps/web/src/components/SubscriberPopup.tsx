import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { readFreeAuditAttribution } from "@/lib/freeAuditAttribution";
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
  const [thankYou, setThankYou] = useState(false);
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
      const leadSource = readFreeAuditAttribution();
      const { data, error } = await supabase.functions.invoke("new-subscriber", {
        body: {
          record: {
            name: result.data.name.trim(),
            email: result.data.email.trim().toLowerCase(),
          },
          leadSource,
        },
      });

      if (error) throw error;

      if (data?.alreadySubscribed) {
        toast({
          title: "Already subscribed",
          description: "This email is already on our list.",
        });
        suppressSubscriberPopupAsSignedUp();
        setOpen(false);
      } else {
        suppressSubscriberPopupAsSignedUp();
        setThankYou(true);
      }

      setName("");
      setEmail("");
    } catch (error) {
      console.error("Subscription error:", error);
      let description = "Please try again later.";
      if (error && typeof error === "object" && "context" in error) {
        const context = (error as { context?: unknown }).context;
        if (context && typeof context === "object" && "error" in context && typeof (context as { error?: unknown }).error === "string") {
          description = (context as { error: string }).error;
        }
      } else if (error instanceof Error && error.message) {
        description = error.message;
      }
      toast({
        title: "Something went wrong",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setThankYou(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setThankYou(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        {thankYou ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-2xl font-serif text-primary">
              Thank you for subscribing<span className="text-gold">.</span>
            </p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Check your inbox for a welcome note from JahKnowsPR. The Brief is live whenever you are ready.
            </p>
            <Button type="button" className="mt-4" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
