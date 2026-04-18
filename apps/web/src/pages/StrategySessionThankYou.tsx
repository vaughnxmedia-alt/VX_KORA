import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { submitStrategySessionBooking } from "@/features/strategy-session/api";
import {
  clearStrategySessionBookingStorage,
  readDraftFromStorage,
  readPaymentProofFromStorage,
  type StrategySessionBookingDraft,
} from "@/features/strategy-session/strategySessionDraft";
import { isComplimentaryStrategySessionPromo } from "@/features/strategy-session/strategySessionPromo";

type Status = "loading" | "success" | "error" | "missing" | "missing_payment";
const SUPPORT_ERROR_MESSAGE = "Something went wrong. Please contact support.";

export default function StrategySessionThankYou() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [meetingId, setMeetingId] = useState<string | undefined>();
  const [bookedWithPromo, setBookedWithPromo] = useState(false);
  const ran = useRef(false);

  /** Logged-in team (admin/author) lands on Leads to confirm the booking; public guests stay on thank-you. */
  useEffect(() => {
    if (status !== "success") return;
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user?.id) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const rs = (roles ?? []).map((r) => r.role);
      if (rs.includes("admin") || rs.includes("author")) {
        navigate("/dashboard/leads", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, navigate]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let cancelled = false;

    (async () => {
      const draft: StrategySessionBookingDraft | null = readDraftFromStorage();
      const proof = readPaymentProofFromStorage();
      if (!draft?.values || !draft.selectedSlotIso || !draft.timezone) {
        if (!cancelled) setStatus("missing");
        return;
      }
      const complimentary = isComplimentaryStrategySessionPromo(draft.values.promoCode);
      if (!proof?.squarePaymentId && !complimentary) {
        if (!cancelled) setStatus("missing_payment");
        return;
      }

      try {
        if (complimentary) setBookedWithPromo(true);
        const res = await submitStrategySessionBooking(
          draft.values,
          draft.selectedSlotIso,
          draft.timezone,
          complimentary
            ? {
                promoCode: (draft.values.promoCode ?? "").trim(),
                ...(draft.bookingKind ? { bookingKind: draft.bookingKind } : {}),
              }
            : {
                squarePaymentId: proof!.squarePaymentId,
                ...(draft.bookingKind ? { bookingKind: draft.bookingKind } : {}),
              },
        );
        if (cancelled) return;
        if (!res.ok && !res.meetingId) {
          setStatus("error");
          console.error("Strategy session booking save failed:", res.error || "Unknown booking error");
          return;
        }
        clearStrategySessionBookingStorage();
        setMeetingId(res.meetingId);
        setStatus("success");
      } catch (e) {
        if (!cancelled) {
          console.error("Strategy session booking exception:", e);
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Saving your session request…</p>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">No booking data found. Start from the Strategy Session form.</p>
        <Button asChild>
          <Link to="/strategy-session">Book a Strategy Session</Link>
        </Button>
      </div>
    );
  }

  if (status === "missing_payment") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <p className="text-muted-foreground">
          We couldn&apos;t find your completed payment for this session. Return to the payment step, finish checkout, and
          you&apos;ll be brought back here automatically.
        </p>
        <Button asChild>
          <Link to="/strategy-session/payment">Back to payment</Link>
        </Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <p className="text-destructive font-medium">{SUPPORT_ERROR_MESSAGE}</p>
        <Button asChild variant="outline">
          <Link to="/strategy-session">Try again</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/30 px-4 py-16">
      <div className="mx-auto max-w-lg text-center space-y-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Thank you</h1>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p className="text-foreground font-medium">
            {bookedWithPromo
              ? "Your complimentary session request was received — please wait for our email confirmation for your Strategy Session time."
              : "Payment received — please wait for our email confirmation for your Strategy Session time."}
          </p>
          <p className="text-sm">
            We&apos;ll confirm your slot and send details from our team. If you don&apos;t see an email within 24 hours,
            check spam or reach out with your reference below.
          </p>
        </div>
        {meetingId ? (
          <p className="text-xs text-muted-foreground font-mono">Reference: {meetingId}</p>
        ) : null}
        <Button variant="outline" asChild>
          <Link to="/work-with-me">Back to Services</Link>
        </Button>
      </div>
    </div>
  );
}
