import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { WORKSHOP_SLUG } from "@/features/workshops/api";
import { useHqAuth } from "../HqAuth";
import { toCsv, workshopMissingRequirements } from "@/lib/workshop-payments";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Pacific/Honolulu",
  "UTC",
];

type EventRow = {
  id: string;
  title: string;
  starts_at: string | null;
  timezone: string | null;
  capacity: number | null;
  price_cents: number | null;
  cancellation_terms: string | null;
  preparation_notes: string | null;
  zoom_url: string | null;
  registration_open: boolean;
};

type RegistrationRow = {
  id: string;
  full_name: string;
  email: string;
  business_name: string;
  business_type: string;
  misunderstanding: string;
  marketing_consent: boolean;
  status: string;
  square_payment_id: string | null;
  confirmation_email_status: string;
  amount_cents: number;
  created_at: string;
};

function localInputValue(startsAt: string | null, timezone: string): string {
  if (!startsAt) return "";
  const zoned = DateTime.fromISO(startsAt, { zone: "utc" }).setZone(timezone);
  return zoned.isValid ? zoned.toFormat("yyyy-LL-dd'T'HH:mm") : "";
}

const SETUP_STEPS = [
  ["a future date and time", "Date and time"],
  ["a time zone", "Time zone"],
  ["a capacity of at least 1", "Capacity"],
  ["a price", "Ticket price"],
  ["cancellation terms", "Cancellation terms"],
  ["an https Zoom link", "Zoom link"],
] as const;

export default function HqWorkshopPage() {
  const { can, isLoading: authLoading } = useHqAuth();
  const queryClient = useQueryClient();
  const eventQuery = useQuery({
    queryKey: ["hq", "workshop", WORKSHOP_SLUG],
    enabled: can("workshops"),
    queryFn: async () => {
      const { data, error } = await supabase.from("workshop_events").select("*").eq("slug", WORKSHOP_SLUG).maybeSingle();
      if (error) throw error;
      return data as EventRow | null;
    },
  });
  const registrationQuery = useQuery({
    queryKey: ["hq", "workshop-registrations", eventQuery.data?.id],
    enabled: can("workshops") && Boolean(eventQuery.data?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workshop_registrations")
        .select("id,full_name,email,business_name,business_type,misunderstanding,marketing_consent,status,square_payment_id,confirmation_email_status,amount_cents,created_at")
        .eq("event_id", eventQuery.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RegistrationRow[];
    },
  });

  if (authLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading workshop setup…</div>;
  }

  if (!can("workshops")) {
    return <div className="p-6"><h1 className="font-serif text-2xl">Workshop access required</h1><p className="mt-2 text-sm text-muted-foreground">Only an owner or strategist can set up this workshop.</p></div>;
  }

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-dark">Workshop setup</p>
        <h1 className="font-serif text-3xl font-bold">Make Your Business Make Sense</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Fill in the date, price, cancellation terms, and Zoom link, then save. Tickets stay off until you open registration. The Zoom link is emailed after payment and is not shown on the public page.
        </p>
      </div>
      {eventQuery.isLoading ? <p className="text-sm">Loading event…</p> : null}
      {eventQuery.data ? (
        <EventSettings
          key={`${eventQuery.data.id}-${eventQuery.data.starts_at ?? ""}-${eventQuery.data.registration_open}`}
          event={eventQuery.data}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ["hq", "workshop"] });
            void queryClient.invalidateQueries({ queryKey: ["hq", "workshop-registrations"] });
          }}
        />
      ) : eventQuery.isFetched ? (
        <p className="text-sm">The event record is not in the database yet. Apply the workshop migration first.</p>
      ) : null}
      <RegistrationList
        rows={registrationQuery.data ?? []}
        confirmed={(registrationQuery.data ?? []).filter((row) => row.status === "confirmed").length}
        onChanged={() => void queryClient.invalidateQueries({ queryKey: ["hq", "workshop-registrations"] })}
      />
    </div>
  );
}

function EventSettings({ event, onSaved }: { event: EventRow; onSaved: () => void }) {
  const [timezone, setTimezone] = useState(event.timezone || "America/Chicago");
  const [startsLocal, setStartsLocal] = useState(localInputValue(event.starts_at, event.timezone || "America/Chicago"));
  const [capacity, setCapacity] = useState(String(event.capacity ?? 12));
  const [price, setPrice] = useState(((event.price_cents ?? 4900) / 100).toFixed(2));
  const [terms, setTerms] = useState(event.cancellation_terms ?? "");
  const [preparation, setPreparation] = useState(event.preparation_notes ?? "");
  const [zoomUrl, setZoomUrl] = useState(event.zoom_url ?? "");
  const [open, setOpen] = useState(event.registration_open);
  const startsAt = useMemo(() => {
    if (!startsLocal) return null;
    const parsed = DateTime.fromISO(startsLocal, { zone: timezone });
    return parsed.isValid ? parsed.toUTC().toISO() : null;
  }, [startsLocal, timezone]);
  const priceCents = Math.round(Number(price) * 100);
  const missing = workshopMissingRequirements({
    startsAt,
    timezone,
    capacity: Number(capacity),
    priceCents: Number.isFinite(priceCents) ? priceCents : null,
    cancellationTerms: terms,
    zoomUrl,
  });

  const save = useMutation({
    mutationFn: async (registrationOpen: boolean) => {
      const { error } = await supabase.from("workshop_events").update({
        starts_at: startsAt,
        timezone,
        capacity: Number(capacity),
        price_cents: priceCents,
        cancellation_terms: terms.trim(),
        preparation_notes: preparation.trim(),
        zoom_url: zoomUrl.trim() || null,
        registration_open: missing.length === 0 && registrationOpen,
      }).eq("id", event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event settings saved");
      onSaved();
    },
    onError: (error: Error) => {
      toast.error(error.message.includes("registration_closed_until_configured")
        ? "Registration cannot open until every required detail is set."
        : "Could not save the event.");
    },
  });

  return (
    <form
      className="grid max-w-2xl gap-4 rounded-lg border border-border bg-background p-4"
      onSubmit={(formEvent) => {
        formEvent.preventDefault();
        void save.mutateAsync(open);
      }}
    >
      <h2 className="font-serif text-2xl">Set up the workshop</h2>
      <ul className="grid gap-2 text-sm sm:grid-cols-2">
        {SETUP_STEPS.map(([needle, label]) => {
          const done = !missing.some((item) => item === needle);
          return (
            <li key={needle} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <span className={done ? "text-primary" : "text-muted-foreground"}>{done ? "Ready" : "Needed"}</span>
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workshop-when">Date and time</Label>
          <Input id="workshop-when" type="datetime-local" value={startsLocal} onChange={(input) => setStartsLocal(input.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workshop-zone">Time zone</Label>
          <select id="workshop-zone" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={timezone} onChange={(input) => setTimezone(input.target.value)}>
            {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="workshop-capacity">Capacity</Label>
          <Input id="workshop-capacity" type="number" min={1} max={500} value={capacity} onChange={(input) => setCapacity(input.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workshop-price">Price (USD)</Label>
          <Input id="workshop-price" inputMode="decimal" value={price} onChange={(input) => setPrice(input.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="workshop-terms">Cancellation terms</Label>
        <Textarea id="workshop-terms" value={terms} onChange={(input) => setTerms(input.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="workshop-prep">Preparation notes</Label>
        <Textarea id="workshop-prep" value={preparation} onChange={(input) => setPreparation(input.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="workshop-zoom">Zoom link</Label>
        <Input id="workshop-zoom" type="url" value={zoomUrl} onChange={(input) => setZoomUrl(input.target.value)} placeholder="https://" autoComplete="off" />
        <p className="text-xs text-muted-foreground">Stored for confirmation emails only. It is not included on the public page.</p>
      </div>
      {missing.length ? <p className="text-sm text-muted-foreground">Still needed before registration can open: {missing.join(", ")}.</p> : null}
      <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
        <span className="text-sm">Open paid registration</span>
        <Switch checked={open} disabled={missing.length > 0} onCheckedChange={setOpen} />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={save.isPending}>{open && missing.length === 0 ? "Save and open registration" : "Save setup"}</Button>
        <Button
          type="button"
          variant="outline"
          disabled={save.isPending || !event.registration_open}
          onClick={() => {
            setOpen(false);
            void save.mutateAsync(false);
          }}
        >
          Close registration
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Save setup keeps tickets off. Turn on Open paid registration only when the checklist is ready and you want to start selling.{" "}
        <Link className="underline underline-offset-2" to="/experiences/make-your-business-make-sense" target="_blank">
          View the public page
        </Link>
      </p>
    </form>
  );
}

function RegistrationList({ rows, confirmed, onChanged }: { rows: RegistrationRow[]; confirmed: number; onChanged: () => void }) {
  const exportCsv = () => {
    const csv = toCsv(rows, [
      { key: "full_name", header: "Full name" },
      { key: "email", header: "Email" },
      { key: "business_name", header: "Business name" },
      { key: "business_type", header: "Business type" },
      { key: "misunderstanding", header: "What people misunderstand" },
      { key: "status", header: "Payment status" },
      { key: "square_payment_id", header: "Square payment id" },
      { key: "confirmation_email_status", header: "Email status" },
      { key: "marketing_consent", header: "Marketing consent" },
      { key: "created_at", header: "Created" },
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "make-your-business-make-sense-registrations.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const resend = async (registrationId: string) => {
    const { error } = await supabase.functions.invoke("workshop-resend-confirmation", { body: { registrationId } });
    if (error) {
      toast.error("Could not resend the confirmation.");
      return;
    }
    toast.success("Confirmation resent");
    onChanged();
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-2xl">Registrations</h2>
        <div className="flex items-center gap-3">
          <p className="text-sm">Confirmed seats: {confirmed}</p>
          <Button type="button" variant="outline" onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Misunderstanding</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.id} className="border-b border-border/70 align-top">
                <td className="px-3 py-2">{row.full_name}</td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">{row.business_name}<div className="text-xs text-muted-foreground">{row.business_type}</div></td>
                <td className="max-w-xs px-3 py-2">{row.misunderstanding}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.confirmation_email_status}</td>
                <td className="px-3 py-2">
                  {row.status === "confirmed" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void resend(row.id)}>Resend</Button>
                  ) : null}
                </td>
              </tr>
            )) : (
              <tr><td className="px-3 py-4 text-muted-foreground" colSpan={7}>No registrations yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
