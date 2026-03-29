/**
 * Strategy Session — pay $150 via Lemon Squeezy, then redirect to thank-you (configured in LS dashboard).
 * Do not put API secrets here; use VITE_LEMONSQUEEZY_CHECKOUT_URL (shareable checkout link).
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type StrategySessionBookingDraft,
  buildLemonCheckoutUrl,
  readDraftFromStorage,
  writeDraftToStorage,
} from "@/features/strategy-session/strategySessionDraft";

/** Public checkout link; override with VITE_LEMONSQUEEZY_CHECKOUT_URL (e.g. staging product). */
const DEFAULT_CHECKOUT_URL =
  "https://jahknowsprfirm.lemonsqueezy.com/checkout/buy/bc1598a5-eee5-47c4-be7a-4811289f31c5";

const CHECKOUT_URL =
  (import.meta.env.VITE_LEMONSQUEEZY_CHECKOUT_URL as string | undefined)?.trim() || DEFAULT_CHECKOUT_URL;

export default function StrategySessionPayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState<StrategySessionBookingDraft | null>(null);

  useEffect(() => {
    const fromNav = location.state as StrategySessionBookingDraft | null;
    if (fromNav?.values && fromNav?.selectedSlotIso && fromNav?.timezone) {
      writeDraftToStorage(fromNav);
      setDraft(fromNav);
      return;
    }
    const stored = readDraftFromStorage();
    if (stored?.values && stored?.selectedSlotIso && stored?.timezone) {
      setDraft(stored);
      return;
    }
    navigate("/strategy-session", { replace: true });
  }, [location.state, navigate]);

  const payUrl = useMemo(() => {
    if (!draft || !CHECKOUT_URL) return "";
    return buildLemonCheckoutUrl(CHECKOUT_URL, draft.values.email);
  }, [draft]);

  const whenLabel = useMemo(() => {
    if (!draft?.selectedSlotIso) return "—";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: draft.timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(draft.selectedSlotIso));
  }, [draft]);

  if (!draft) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/20 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/strategy-session">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to scheduling
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Complete payment</CardTitle>
            <CardDescription>
              Strategy Session — $150. After payment you&apos;ll return here to confirm your booking request; we&apos;ll
              email you when your time is confirmed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="text-right font-medium">{draft.values.fullName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-right font-medium">{draft.values.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Requested time</dt>
                <dd className="text-right font-medium">{whenLabel}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-2">
                <dt className="font-medium">Total</dt>
                <dd className="font-semibold tabular-nums">$150.00 USD</dd>
              </div>
            </dl>

            <Button
              className="w-full"
              size="lg"
              disabled={!payUrl}
              onClick={() => {
                if (payUrl) window.location.href = payUrl;
              }}
            >
              <CreditCard className="h-4 w-4" />
              Pay $150 &amp; continue
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              All Strategy Sessions are non-refundable.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
