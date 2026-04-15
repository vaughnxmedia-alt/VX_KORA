import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { processSquareTelegramSubscriptionPayment } from "@/features/strategy-session/api";

const SQUARE_SCRIPT = "https://web.squarecdn.com/v1/square.js";
const SUPPORT_ERROR_MESSAGE = "Something went wrong. Please contact support.";

function loadSquareSdk(): Promise<void> {
  if (window.Square) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SQUARE_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Square SDK failed to load")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SQUARE_SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Square SDK failed to load"));
    document.head.appendChild(s);
  });
}

export default function TelegramSubscriptionPayment() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const cardMountedRef = useRef(false);
  const cardRef = useRef<{ destroy(): Promise<void>; tokenize(): Promise<{ status: string; token?: string }> } | null>(
    null,
  );
  const containerId = "square-card-container-telegram-subscription";

  const applicationId = (import.meta.env.VITE_SQUARE_APPLICATION_ID || "").trim();
  const locationId = (import.meta.env.VITE_SQUARE_LOCATION_ID || "").trim();
  const squareConfigured = Boolean(applicationId && locationId);

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
    if (!squareConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        await loadSquareSdk();
        if (cancelled) return;
        await mountCard();
        if (!cancelled) setSdkReady(true);
      } catch (e) {
        console.error("Telegram subscription square sdk error:", e);
        if (!cancelled) toast.error(SUPPORT_ERROR_MESSAGE);
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
  }, [mountCard, squareConfigured]);

  const handleSubscribe = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }
    if (!cardRef.current || !squareConfigured) return;
    setSubscribing(true);
    try {
      const tokenResult = await cardRef.current.tokenize();
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        toast.error(SUPPORT_ERROR_MESSAGE);
        return;
      }
      const idempotencyKey = crypto.randomUUID();
      const res = await processSquareTelegramSubscriptionPayment({
        sourceId: tokenResult.token,
        idempotencyKey,
        email,
        fullName,
      });
      if (!res.ok || !res.squareSubscriptionId) {
        console.error("Telegram subscription create failed:", res.error || "unknown");
        toast.error(SUPPORT_ERROR_MESSAGE);
        return;
      }
      navigate("/kora/telegram-thank-you", { replace: true });
    } catch (e) {
      console.error("Telegram subscription exception:", e);
      toast.error(SUPPORT_ERROR_MESSAGE);
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/work-with-me#telegram">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      <section className="px-4 pt-10 pb-16">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="outline" className="px-4 py-1.5 border-gold/40 bg-gold/10 text-gold-dark tracking-wide uppercase font-semibold">
              Telegram Access
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold font-serif tracking-tight text-foreground">
              KORA Telegram Subscription
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Subscribe for $15/month. After payment, we will email your secure join link for the KORA Telegram bot.
            </p>
          </div>

          <Card className="border border-gold/15 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Checkout
              </CardTitle>
              <CardDescription>Enter your details and billing card.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  type="email"
                />
              </div>

              <dl className="space-y-3 text-sm rounded-lg border bg-muted/30 p-4">
                <div className="flex justify-between gap-4 border-t-0 pt-0">
                  <dt className="font-semibold text-foreground">Plan</dt>
                  <dd className="font-semibold text-foreground">KORA Telegram</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-3 mt-1">
                  <dt className="font-semibold text-foreground">Total</dt>
                  <dd className="font-semibold tabular-nums text-foreground">$15.00 / month</dd>
                </div>
              </dl>

              {!squareConfigured ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  <p className="font-medium">{SUPPORT_ERROR_MESSAGE}</p>
                  <p className="text-muted-foreground mt-1">Support can assist with checkout.</p>
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
                        "min-h-[120px] rounded-lg border border-input bg-background p-3 transition-opacity",
                        !sdkReady && "opacity-50 pointer-events-none",
                      )}
                    />
                    {!sdkReady ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading secure payment fields…
                      </p>
                    ) : null}
                  </div>

                  <Button
                    variant="hero"
                    className="w-full"
                    size="lg"
                    disabled={!sdkReady || subscribing}
                    onClick={() => void handleSubscribe()}
                  >
                    {subscribing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Subscribe for $15/month
                      </>
                    )}
                  </Button>
                </>
              )}

              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                Your subscription is processed by Square. Cancel any time from support.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

