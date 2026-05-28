/**
 * Strategy Session — pay $150 via Square Web Payments SDK + Edge Function (SQUARE_ACCESS_TOKEN on server only).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type StrategySessionBookingDraft,
  readDraftFromStorage,
  writeDraftToStorage,
  writePaymentProofToStorage,
} from "@/features/strategy-session/strategySessionDraft";
import { isComplimentaryStrategySessionPromo } from "@/features/strategy-session/strategySessionPromo";
import { processSquareStrategySessionPayment } from "@/features/strategy-session/api";
import {
  getSquareClientIds,
  isSquareClientConfigured,
  loadSquarePaymentsSdk,
  preloadSquarePaymentsSdk,
} from "@/lib/squarePaymentsSdk";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SUPPORT_ERROR_MESSAGE = "Something went wrong. Please contact support.";

export default function StrategySessionPayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState<StrategySessionBookingDraft | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const cardMountedRef = useRef(false);
  const cardRef = useRef<{ destroy(): Promise<void> } | null>(null);
  const containerId = "square-card-container-strategy-session";

  const { applicationId, locationId } = getSquareClientIds();
  const squareConfigured = isSquareClientConfigured();

  useEffect(() => {
    if (squareConfigured) preloadSquarePaymentsSdk();
  }, [squareConfigured]);

  useEffect(() => {
    const fromNav = location.state as StrategySessionBookingDraft | null;
    if (fromNav?.values && fromNav?.selectedSlotIso && fromNav?.timezone) {
      writeDraftToStorage(fromNav);
      if (isComplimentaryStrategySessionPromo(fromNav.values.promoCode)) {
        navigate("/strategy-session/thank-you", { replace: true });
        return;
      }
      setDraft(fromNav);
      return;
    }
    const stored = readDraftFromStorage();
    if (stored?.values && stored?.selectedSlotIso && stored?.timezone) {
      if (isComplimentaryStrategySessionPromo(stored.values.promoCode)) {
        navigate("/strategy-session/thank-you", { replace: true });
        return;
      }
      setDraft(stored);
      return;
    }
    navigate("/strategy-session", { replace: true });
  }, [location.state, navigate]);

  const mountCard = useCallback(async () => {
    if (!squareConfigured || !window.Square) return;
    const el = document.getElementById(containerId);
    if (!el) return;
    if (cardMountedRef.current && cardRef.current) {
      try {
        await cardRef.current.destroy();
      } catch {
        /* ignore */
      }
      cardRef.current = null;
      cardMountedRef.current = false;
    }
    const payments = await window.Square.payments(applicationId, locationId);
    const card = await payments.card();
    await card.attach(`#${containerId}`);
    cardRef.current = card;
    cardMountedRef.current = true;
  }, [applicationId, locationId, squareConfigured]);

  useEffect(() => {
    if (!draft || !squareConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        await loadSquarePaymentsSdk();
        if (cancelled) return;
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        if (cancelled) return;
        await mountCard();
        if (!cancelled) setSdkReady(true);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          toast.error(SUPPORT_ERROR_MESSAGE);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (cardRef.current) {
        cardRef.current.destroy().catch(() => {});
        cardRef.current = null;
      }
      cardMountedRef.current = false;
    };
  }, [draft, mountCard, squareConfigured]);

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

  const handlePay = async () => {
    if (!draft || !cardRef.current || !squareConfigured) return;
    setPaying(true);
    try {
      const tokenResult = await cardRef.current.tokenize();
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        toast.error(SUPPORT_ERROR_MESSAGE);
        return;
      }
      const idempotencyKey = crypto.randomUUID();
      const res = await processSquareStrategySessionPayment({
        sourceId: tokenResult.token,
        idempotencyKey,
        buyerEmail: draft.values.email,
      });
      if (!res.ok || !res.squarePaymentId) {
        console.error("Strategy session payment failed:", res.error || "Unknown payment error");
        toast.error(SUPPORT_ERROR_MESSAGE);
        return;
      }
      writePaymentProofToStorage({ squarePaymentId: res.squarePaymentId });
      toast.success("Payment received");
      navigate("/strategy-session/thank-you", { replace: true });
    } catch (e) {
      console.error("Strategy session payment exception:", e);
      toast.error(SUPPORT_ERROR_MESSAGE);
    } finally {
      setPaying(false);
    }
  };

  if (!draft) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="sticky top-0 z-40 border-b border-border bg-background shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 sm:py-4">
          <Button variant="ghost" size="sm" asChild className="w-fit shrink-0">
            <Link to="/strategy-session">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to scheduling
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Strategy Session · Payment</span>
          </div>
        </div>
      </div>

      <section className="relative px-4 pt-8 pb-16 scroll-mt-20">
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"
          aria-hidden
        />
        <div className="max-w-lg mx-auto relative z-10 space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="px-4 py-1.5 border-gold/40 bg-gold/10 text-gold-dark tracking-wide uppercase font-semibold">
              Secure checkout
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold font-serif tracking-tight text-foreground">
              Complete your <span className="text-gold">session</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Pay the $150 Strategy Session fee securely. After payment we&apos;ll save your booking request and email when
              your time is confirmed.
            </p>
          </div>

          <Card className="border border-gold/15 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Order summary
              </CardTitle>
              <CardDescription>Review details, then enter your card below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="space-y-3 text-sm rounded-lg border bg-muted/30 p-4">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="text-right font-medium text-foreground">{draft.values.fullName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="text-right font-medium text-foreground">{draft.values.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Requested time</dt>
                  <dd className="text-right font-medium text-foreground">{whenLabel}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-3 mt-1">
                  <dt className="font-semibold text-foreground">Total</dt>
                  <dd className="font-semibold tabular-nums text-foreground">$150.00 USD</dd>
                </div>
              </dl>

              {!squareConfigured ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive space-y-2">
                  <p className="font-medium">Card payment is temporarily unavailable.</p>
                  <p className="text-muted-foreground">
                    Your session details are still saved on this device. Please try again in a few minutes, or email{" "}
                    <a
                      href="mailto:montcitynetwork@gmail.com?subject=Strategy%20Session%20checkout%20help"
                      className="text-primary underline underline-offset-2"
                    >
                      montcitynetwork@gmail.com
                    </a>{" "}
                    and we will send you a link to complete payment.
                  </p>
                  {import.meta.env.DEV ? (
                    <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
                      Dev: set <code className="text-xs">VITE_SQUARE_APPLICATION_ID</code> and{" "}
                      <code className="text-xs">VITE_SQUARE_LOCATION_ID</code> in <code className="text-xs">apps/web/.env</code>,
                      then restart the dev server.
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      <Lock className="h-3.5 w-3.5" />
                      Card (PCI-compliant form)
                    </div>
                    <div
                      id={containerId}
                      className={cn(
                        "min-h-[140px] rounded-lg border border-input bg-background p-3 transition-opacity",
                        !sdkReady && "opacity-60 pointer-events-none",
                      )}
                      aria-busy={!sdkReady}
                      aria-live="polite"
                    />
                    {!sdkReady ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                        Loading secure payment fields…
                      </p>
                    ) : null}
                  </div>

                  <Button
                    variant="hero"
                    className="w-full"
                    size="lg"
                    disabled={!sdkReady || paying}
                    onClick={() => void handlePay()}
                  >
                    {paying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Pay $150 &amp; confirm booking
                      </>
                    )}
                  </Button>
                </>
              )}

              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                All Strategy Sessions are non-refundable. Payments are processed by Square.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
