import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWorkshopStatus, WORKSHOP_PATH, type WorkshopRegistrationStatus } from "@/features/workshops/api";
import { googleCalendarLink } from "@/lib/workshop-payments";

function money(cents?: number, currency = "USD"): string {
  if (!cents) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default function WorkshopConfirmationPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [record, setRecord] = useState<WorkshopRegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Workshop registration | JahKnowsPR";
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setRecord({ ok: false, code: "not_found" });
      return;
    }
    let cancelled = false;
    const load = () => fetchWorkshopStatus(token).then((data) => {
      if (!cancelled) {
        setRecord(data);
        setLoading(false);
      }
      return data;
    }).catch(() => {
      if (!cancelled) {
        setRecord({ ok: false, code: "unavailable" });
        setLoading(false);
      }
      return null;
    });
    void load();
    const timer = window.setInterval(() => {
      void load().then((data) => {
        if (data?.status && data.status !== "pending_payment") window.clearInterval(timer);
      });
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  const event = record?.event;
  const when = event?.starts_at && event.timezone
    ? new Intl.DateTimeFormat("en-US", {
      timeZone: event.timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(event.starts_at))
    : null;
  const calendar = event?.starts_at && event.timezone
    ? googleCalendarLink({
      title: event.title || "Make Your Business Make Sense",
      startsAtIso: event.starts_at,
      durationMinutes: event.duration_minutes || 120,
      timezone: event.timezone,
      details: "Zoom access is in your JahKnowsPR confirmation email. This live workshop does not include a recording.",
    })
    : null;

  let heading = "Registration status";
  let body = "We could not find this registration.";
  if (record?.status === "confirmed") {
    heading = "You're registered.";
    body = record.confirmation_email_status === "sent"
      ? "Your confirmation email has the Zoom link, how to prepare, and the event details. Forwarding that email shares the Zoom link."
      : "Your seat is confirmed. The confirmation email is still on its way and includes the Zoom link. If it does not arrive, JahKnowsPR can resend it.";
  } else if (record?.status === "pending_payment") {
    heading = "Payment is processing.";
    body = "The seat is not confirmed yet. This page updates when Square finishes the payment. You can leave it open.";
  } else if (record?.status === "failed" || record?.status === "canceled") {
    heading = "Payment was not completed.";
    body = "No seat was reserved. You can return to the workshop page and try again.";
  } else if (record?.status === "refunded") {
    heading = "This payment was refunded.";
    body = "The seat has been released.";
  } else if (record?.status === "paid_unseated") {
    heading = "Payment received.";
    body = "The payment went through, but a seat could not be confirmed. Contact JahKnowsPR and we will follow up. The Zoom link is not on this page.";
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking payment…</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-dark">Make Your Business Make Sense</p>
          <h1 className="font-serif text-4xl font-bold text-primary">{heading}</h1>
          <p className="leading-relaxed text-foreground/85">{body}</p>
          {when ? <p className="text-sm">When: {when}</p> : null}
          {record?.amount_cents ? <p className="text-sm">Amount: {money(record.amount_cents, record.currency)}</p> : null}
          {record?.status === "confirmed" && calendar ? (
            <Button variant="outline" asChild>
              <a href={calendar}>Add to calendar</a>
            </Button>
          ) : null}
          <div>
            <Button variant="ghost" asChild>
              <Link to={WORKSHOP_PATH}>Back to the workshop</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
