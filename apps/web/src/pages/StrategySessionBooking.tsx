/**
 * Strategy Session ($150) — intake, schedule, confirm. Submits to Edge Function for DB + email.
 */
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ArrowLeft, Calendar as CalendarIcon, Check, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { intakeSchema, TIMEZONES, type IntakeValues } from "@/features/strategy-session/schema";
import {
  fetchAvailability,
  fetchStrategySessionHosts,
  submitStrategySessionBooking,
  type DayDiagnostic,
} from "@/features/strategy-session/api";
import { toast } from "sonner";

function ymdInTimeZone(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Noon on the picker cell’s local civil day — avoids zone-boundary midnight shifting the date. */
function localNoonFromPickerDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

/** Luxon ISO weekday Mon=1 .. Sun=7 for the calendar grid (react-day-picker is browser-local). */
function localLuxonWeekday(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function slotCalendarYmdInTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Same civil day in the booking timezone (must match slot filtering). */
function sameCalendarDayInTz(iso: string, selected: Date, tz: string): boolean {
  return (
    slotCalendarYmdInTz(iso, tz) === ymdInTimeZone(localNoonFromPickerDate(selected), tz)
  );
}

function todayYmdInBookingTz(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isPickerDayBeforeBookingToday(date: Date, timeZone: string): boolean {
  return (
    ymdInTimeZone(localNoonFromPickerDate(date), timeZone) <
    todayYmdInBookingTz(timeZone)
  );
}

/** First local calendar day on or after `from` whose column weekday matches `openWeekdays` (server uses same Mon=1..Sun=7). */
function nextOpenDayOnOrAfter(from: Date, openWeekdays: number[]): Date {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  for (let i = 0; i < 21; i++) {
    const c = addDays(d, i);
    if (openWeekdays.includes(localLuxonWeekday(c))) return c;
  }
  return d;
}

const DEFAULT_OPEN_WEEKDAYS = [1, 2, 3, 4];

function describeEmptyDayDiagnostic(d: DayDiagnostic | undefined): string {
  if (!d) {
    return "No open times in the loaded range, or times may not match your timezone. Try another day or change month.";
  }
  const r = d.reasons;
  if (r.includes("WEEKDAY_CLOSED")) {
    return "Closed: this weekday is not on the strategist’s open schedule.";
  }
  if (r.includes("DATE_BLOCKED")) {
    return "Blocked: this calendar date is marked unavailable.";
  }
  if (r.includes("OVERRIDE_CLOSED")) {
    return "Closed: a custom override removed this date.";
  }
  if (r.includes("ALL_PAST")) {
    return "Every slot on this day was already in the past when we loaded availability.";
  }
  if (r.includes("ALL_BOOKED")) {
    return "Every open slot on this day is already booked.";
  }
  if (r.includes("ALL_PAST_OR_BOOKED")) {
    return "No slots left today — remaining times were in the past or already booked.";
  }
  if (r.includes("SCHEDULE_INACTIVE")) {
    return "Scheduling is turned off for this strategist.";
  }
  return "No matching open times. Try another day or confirm your timezone.";
}

export default function StrategySessionBooking() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [timezone, setTimezone] = useState<string>("America/New_York");
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  /** Drives API range so navigating the calendar (e.g. April 2026) loads slots for that month. */
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ meetingId?: string; emailOk: boolean } | null>(null);

  const form = useForm<IntakeValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      fullName: "",
      businessName: "",
      email: "",
      phone: "",
      websiteOrSocial: "",
      industry: "",
      offerSummary: "",
      targetAudience: "",
      currentChallenge: "",
      sessionGoal: "",
      sessionType: "zoom",
      inPersonLocation: "",
      additionalNotes: "",
      employeeReferenceCode: "",
    },
  });

  const employeeReferenceCode = form.watch("employeeReferenceCode");
  const hostCodeForAvailability = useMemo(() => {
    const t = employeeReferenceCode?.trim();
    return t ? t.toUpperCase() : undefined;
  }, [employeeReferenceCode]);

  /** One month before through two months after the month the user is viewing (inclusive). */
  const rangeStart = format(startOfMonth(subMonths(calendarMonth, 1)), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(addMonths(calendarMonth, 2)), "yyyy-MM-dd");

  const { data: hostDirectory } = useQuery({
    queryKey: ["strategy-session-hosts"],
    queryFn: fetchStrategySessionHosts,
    staleTime: 600_000,
  });

  const {
    data: availability,
    isLoading: slotsLoading,
    isError: slotsError,
    error: slotsErrorObj,
  } = useQuery({
    queryKey: [
      "strategy-session-availability",
      format(calendarMonth, "yyyy-MM"),
      rangeStart,
      rangeEnd,
      timezone,
      hostCodeForAvailability ?? "",
    ],
    queryFn: () =>
      fetchAvailability({
        start: rangeStart,
        end: rangeEnd,
        timezone,
        hostCode: hostCodeForAvailability,
        includeDiagnostics: true,
      }),
    enabled: step >= 2,
    staleTime: 60_000,
  });

  const openWeekdays = availability?.schedule?.weekdays?.length
    ? availability.schedule.weekdays
    : DEFAULT_OPEN_WEEKDAYS;

  const slotsForDay = useMemo(() => {
    if (!availability?.slots || !selectedDay) return [];
    return availability.slots.filter((s) => sameCalendarDayInTz(s.start, selectedDay, timezone));
  }, [availability?.slots, selectedDay, timezone]);

  useEffect(() => {
    if (step !== 2 || !availability?.schedule?.weekdays?.length || !selectedDay) return;
    if (!availability.schedule.active) return;
    const wd = localLuxonWeekday(selectedDay);
    if (availability.schedule.weekdays.includes(wd)) return;
    const next = nextOpenDayOnOrAfter(selectedDay, availability.schedule.weekdays);
    setSelectedDay(next);
    setCalendarMonth(startOfMonth(next));
    setSelectedSlotIso(null);
  }, [
    step,
    selectedDay,
    availability?.schedule?.weekdays,
    availability?.schedule?.active,
    timezone,
    hostCodeForAvailability,
  ]);

  const selectedDayDiag = useMemo(() => {
    if (!selectedDay || !availability?.clientDayDiagnostics) return undefined;
    return availability.clientDayDiagnostics[
      ymdInTimeZone(localNoonFromPickerDate(selectedDay), timezone)
    ];
  }, [selectedDay, availability?.clientDayDiagnostics, timezone]);

  const scheduleBlurb = useMemo(() => {
    const s = availability?.schedule;
    if (!s?.weekdays?.length) {
      return "Pick an open day, then a time. Each strategist can have their own hours (set in the dashboard).";
    }
    const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const days = s.weekdays
      .slice()
      .sort((a, b) => a - b)
      .map((n) => names[n - 1])
      .join(", ");
    return `${days} · ${s.dayStart}–${s.dayEnd} (${availability?.timezone ?? "host timezone"}) · ${s.slotDurationMinutes} min slots. Times below show in your selected timezone.`;
  }, [availability?.schedule, availability?.timezone]);

  const onIntakeNext = form.handleSubmit(() => {
    const firstOpen = nextOpenDayOnOrAfter(new Date(), DEFAULT_OPEN_WEEKDAYS);
    if (!selectedDay) {
      setSelectedDay(firstOpen);
      setCalendarMonth(startOfMonth(firstOpen));
    } else {
      setCalendarMonth(startOfMonth(selectedDay));
    }
    setStep(2);
  });

  const onConfirmBooking = async () => {
    const values = form.getValues();
    if (!selectedSlotIso) {
      toast.error("Choose a time slot");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitStrategySessionBooking(values, selectedSlotIso, timezone);
      if (res.error && !res.meetingId) {
        toast.error(res.error);
        return;
      }
      setDone({
        meetingId: res.meetingId,
        emailOk: res.confirmationStatus === "sent" && res.ok !== false,
      });
      if (res.confirmationStatus === "failed" || res.ok === false) {
        toast.message("Booking saved", {
          description: res.error || "Confirmation email could not be sent. We’ll follow up manually.",
        });
      } else {
        toast.success("Request received — check your email for next steps.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-16 px-4">
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Thank you</h1>
          <p className="text-muted-foreground leading-relaxed">
            {done.emailOk
              ? "We received your Strategy Session ($150) request. We emailed you with next steps; a team member will confirm your meeting time."
              : "Your request was saved. Our team will reach out shortly — we couldn’t send the automated email just now."}
          </p>
          {done.meetingId && (
            <p className="text-xs text-muted-foreground font-mono">Reference: {done.meetingId}</p>
          )}
          <Button variant="outline" onClick={() => navigate("/work-with-me")}>
            Back to Services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => (step === 1 ? navigate(-1) : setStep((s) => (s - 1) as 1 | 2 | 3))}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 1 ? "Back" : "Previous"}
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Strategy Session — $150</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Book your Strategy Session
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A paid strategic planning session for founders and brands — before backend software, Telegram access, or
            retainers. We’ll qualify fit and map your next move.
          </p>
        </div>

        <div className="flex justify-center gap-2 text-sm">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={cn(
                "h-2 w-8 rounded-full transition-colors",
                step >= n ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Business intake</CardTitle>
              <CardDescription>Short answers — we use this to prepare for your session.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onIntakeNext} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jordan Lee" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business name</FormLabel>
                          <FormControl>
                            <Input placeholder="Studio / brand name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 …" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="websiteOrSocial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website or social link</FormLabel>
                        <FormControl>
                          <Input placeholder="https://…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="offerSummary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What do you offer?</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetAudience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Who is your target audience?</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currentChallenge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biggest business, brand, or visibility challenge right now</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sessionGoal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are you hoping to gain from this session?</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sessionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col gap-2 sm:flex-row sm:gap-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="zoom" id="zoom" />
                              <Label htmlFor="zoom">Zoom</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="in_person" id="in_person" />
                              <Label htmlFor="in_person">In person</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inPersonLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred meeting location (in person)</FormLabel>
                        <FormControl>
                          <Input placeholder="City / neighborhood" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="additionalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional notes</FormLabel>
                        <FormControl>
                          <Textarea rows={2} placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full sm:w-auto" size="lg">
                    Continue to scheduling
                  </Button>
                </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Choose date & time</CardTitle>
              <CardDescription>{scheduleBlurb}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="employeeReferenceCode"
                  render={({ field }) => (
                    <FormItem className="max-w-md">
                      <FormLabel>Employee reference code (optional)</FormLabel>
                      <FormControl>
                        <Input
                          autoCapitalize="characters"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setSelectedSlotIso(null);
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {hostDirectory?.length
                          ? `Team: ${hostDirectory
                              .map((h) =>
                                h.is_default_public
                                  ? `${h.display_name} (default)`
                                  : `${h.display_name} — ${h.reference_code}`,
                              )
                              .join(" · ")}`
                          : "Each strategist has their own calendar. Enter their code if you were given one."}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <div className="space-y-2 max-w-xs">
                <Label>Timezone</Label>
                <Select
                  value={timezone}
                  onValueChange={(v) => {
                    setTimezone(v);
                    setSelectedSlotIso(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="mb-2 block">Date</Label>
                  <Calendar
                    mode="single"
                    month={calendarMonth}
                    onMonthChange={(d) => {
                      setCalendarMonth(startOfMonth(d));
                      setSelectedSlotIso(null);
                    }}
                    selected={selectedDay}
                    onSelect={(d) => {
                      if (d) setCalendarMonth(startOfMonth(d));
                      setSelectedDay(d);
                      setSelectedSlotIso(null);
                    }}
                    disabled={(date) =>
                      isPickerDayBeforeBookingToday(date, timezone) ||
                      !openWeekdays.includes(localLuxonWeekday(date))
                    }
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <Label className="mb-2 block flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Available times
                  </Label>
                  {slotsError ? (
                    <p className="text-sm text-destructive py-4 leading-relaxed">
                      Could not load open times:{" "}
                      {slotsErrorObj instanceof Error ? slotsErrorObj.message : "Unknown error"}
                      {slotsErrorObj instanceof Error &&
                      !/deploy|NOT_FOUND|not found/i.test(slotsErrorObj.message) ? (
                        <>
                          {" "}
                          If loads still fail after deploy, set a default{" "}
                          <code className="text-xs">strategy_session_hosts</code> row or{" "}
                          <code className="text-xs">STRATEGY_SESSION_DEFAULT_HOST_USER_ID</code> on the functions.
                        </>
                      ) : null}
                    </p>
                  ) : slotsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading slots…
                    </div>
                  ) : !selectedDay ? (
                    <p className="text-sm text-muted-foreground py-4">Pick a date.</p>
                  ) : !availability?.schedule?.active ? (
                    <p className="text-sm text-destructive py-4 leading-relaxed">
                      This strategist’s session calendar is currently closed. Please try again later or contact the
                      team.
                    </p>
                  ) : slotsForDay.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 leading-relaxed space-y-2">
                      <p>{describeEmptyDayDiagnostic(selectedDayDiag)}</p>
                      {selectedDayDiag && (
                        <p className="text-xs font-mono opacity-80">
                          Debug: {selectedDayDiag.reasons.join(", ")} · candidates{" "}
                          {selectedDayDiag.candidateSlots}, past {selectedDayDiag.removedPast}, booked{" "}
                          {selectedDayDiag.removedBooked}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slotsForDay.map((s) => (
                        <Button
                          key={s.start}
                          type="button"
                          variant={selectedSlotIso === s.start ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSlotIso(s.start)}
                        >
                          {new Intl.DateTimeFormat("en-US", {
                            timeZone: timezone,
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(s.start))}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Button
                type="button"
                size="lg"
                disabled={!selectedSlotIso}
                onClick={() => setStep(3)}
              >
                Review and request
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Review your request</CardTitle>
              <CardDescription>
                $150 Strategy Session — submit your preferred time. A team member will confirm the meeting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium text-right">{form.getValues("fullName")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Business</dt>
                  <dd className="font-medium text-right">{form.getValues("businessName")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">When</dt>
                  <dd className="font-medium text-right">
                    {selectedSlotIso
                      ? new Intl.DateTimeFormat("en-US", {
                          timeZone: timezone,
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(selectedSlotIso))
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium text-right">
                    {form.getValues("sessionType") === "zoom" ? "Zoom" : "In person"}
                  </dd>
                </div>
              </dl>
              <Button type="button" size="lg" className="w-full sm:w-auto" disabled={submitting} onClick={onConfirmBooking}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking…
                  </>
                ) : (
                  "Submit request"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </Form>
  );
}
