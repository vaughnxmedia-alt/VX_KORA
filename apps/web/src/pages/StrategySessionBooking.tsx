/**
 * Strategy Session ($150) — intake, schedule, confirm. Submits to Edge Function for DB + email.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ArrowLeft, Calendar as CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { fetchAvailability, fetchStrategySessionHosts, type DayDiagnostic } from "@/features/strategy-session/api";
import {
  clearPaymentProofFromStorage,
  writeDraftToStorage,
  type StrategySessionBookingDraft,
} from "@/features/strategy-session/strategySessionDraft";
import { isComplimentaryStrategySessionPromo } from "@/features/strategy-session/strategySessionPromo";
import { formatStrategyHostListLabel } from "@/features/strategy-session/formatHostListLabel";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { supabaseIsConfigured } from "@/integrations/supabase/client";
import { trackBookingClick, trackFormStart, trackFormSubmit, trackStrategySessionView } from "@/lib/kora-analytics";
import { isSquareClientConfigured, preloadSquarePaymentsSdk } from "@/lib/squarePaymentsSdk";
import { scrollAppToTop, scrollFieldIntoViewOnFocus } from "@/lib/scrollAppToTop";
const SUPPORT_ERROR_MESSAGE = "Something went wrong. Please contact support.";

/**
 * Calendar Y/M/D from the picker interpreted as that civil date in `tz` (matches how slot labels use `timezone`).
 * Avoids browser-midnight vs booking-TZ mismatches that hid all time buttons.
 */
function selectedCivilYmdInTz(selected: Date, tz: string): string {
  return DateTime.fromObject(
    {
      year: selected.getFullYear(),
      month: selected.getMonth() + 1,
      day: selected.getDate(),
    },
    { zone: tz },
  ).toFormat("yyyy-MM-dd");
}

function slotStartYmdInTz(iso: string, tz: string): string {
  return DateTime.fromISO(iso, { setZone: true }).setZone(tz).toFormat("yyyy-MM-dd");
}

function sameCalendarDayInTz(iso: string, selected: Date, tz: string): boolean {
  return slotStartYmdInTz(iso, tz) === selectedCivilYmdInTz(selected, tz);
}

/** Luxon ISO weekday Mon=1 .. Sun=7 for the calendar grid (react-day-picker is browser-local). */
function localLuxonWeekday(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
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
  return selectedCivilYmdInTz(date, timeZone) < todayYmdInBookingTz(timeZone);
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

/** Tue–Thu (matches server Luxon weekdays 2–4) */
const DEFAULT_OPEN_WEEKDAYS = [2, 3, 4];

function describeEmptyDayDiagnostic(d: DayDiagnostic | undefined): string {
  if (!d) {
    return "No open times for this day. Choose another Tuesday–Thursday in this month, or use the arrows to load a different month.";
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const strategyPrefillApplied = useRef(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [timezone, setTimezone] = useState<string>("America/Chicago");
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  /** Drives API range so navigating the calendar (e.g. April 2026) loads slots for that month. */
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const schedulingRef = useRef<HTMLDivElement>(null);

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
      promoCode: "",
    },
  });

  /** e.g. /strategy-session?code=JUSTICE prefills referral from business cards */
  useEffect(() => {
    const code = searchParams.get("code")?.trim();
    if (code) {
      form.setValue("employeeReferenceCode", code.toUpperCase());
    }
  }, [searchParams, form]);

  /** Prefill from short consultation pages via navigate(..., { state: { strategySessionPrefill } }) */
  useEffect(() => {
    if (strategyPrefillApplied.current) return;
    const st = location.state as { strategySessionPrefill?: Partial<IntakeValues> } | null;
    if (!st?.strategySessionPrefill || typeof st.strategySessionPrefill !== "object") return;
    strategyPrefillApplied.current = true;
    const p = st.strategySessionPrefill;
    (Object.keys(p) as (keyof IntakeValues)[]).forEach((key) => {
      const val = p[key];
      if (val !== undefined && val !== null && String(val).length > 0) {
        form.setValue(key, val as never);
      }
    });
  }, [location.state, form]);

  const employeeReferenceCode = form.watch("employeeReferenceCode");
  const hostCodeForAvailability = useMemo(() => {
    const t = employeeReferenceCode?.trim();
    return t ? t.toUpperCase() : undefined;
  }, [employeeReferenceCode]);

  /** e.g. ?kind=creative_consultation — stored on meetings.booking_kind for Leads filters */
  const bookingKindFromUrl = useMemo(() => {
    const k = searchParams.get("kind")?.trim().toLowerCase();
    if (
      k === "full_program_sales" ||
      k === "creative_consultation" ||
      k === "telegram" ||
      k === "strategy_session" ||
      k === "campaign_retainer"
    ) {
      return k;
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    trackStrategySessionView({
      page_path: "/strategy-session",
      funnel_id: "strategy_session",
      funnel_step: "landing",
      offer_id: "strategy_session",
      lead_magnet_id: "strategy_session",
      offer_stage: "paid_trust_builder",
      metadata: { booking_kind: bookingKindFromUrl ?? null },
    });
  }, [bookingKindFromUrl]);

  useEffect(() => {
    if (isSquareClientConfigured()) preloadSquarePaymentsSdk();
  }, []);

  useEffect(() => {
    scrollAppToTop();
    if (step === 2) {
      window.setTimeout(() => {
        schedulingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 50);
    }
  }, [step]);

  useEffect(() => {
    if (step !== 1) return;
    trackFormStart({
      page_path: "/strategy-session",
      form_id: "strategy-session-intake",
      form_name: "Strategy Session Intake",
      funnel_id: "strategy_session",
      funnel_step: "intake_start",
      offer_id: "strategy_session",
      lead_magnet_id: "strategy_session",
      offer_stage: "paid_trust_builder",
    });
  }, [step]);

  /** One month before through two months after the month the user is viewing (inclusive). */
  const rangeStart = format(startOfMonth(subMonths(calendarMonth, 1)), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(addMonths(calendarMonth, 2)), "yyyy-MM-dd");

  const { data: hostDirectory } = useQuery({
    queryKey: ["strategy-session-hosts"],
    queryFn: fetchStrategySessionHosts,
    staleTime: 600_000,
    enabled: supabaseIsConfigured,
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
    enabled: supabaseIsConfigured && step >= 2,
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
    return availability.clientDayDiagnostics[selectedCivilYmdInTz(selectedDay, timezone)];
  }, [selectedDay, availability?.clientDayDiagnostics, timezone]);

  const onIntakeNext = form.handleSubmit(() => {
    trackFormSubmit({
      page_path: "/strategy-session",
      form_id: "strategy-session-intake",
      form_name: "Strategy Session Intake",
      funnel_id: "strategy_session",
      funnel_step: "intake_complete",
      offer_id: "strategy_session",
      lead_magnet_id: "strategy_session",
      offer_stage: "paid_trust_builder",
    });
    const firstOpen = nextOpenDayOnOrAfter(new Date(), DEFAULT_OPEN_WEEKDAYS);
    if (!selectedDay) {
      setSelectedDay(firstOpen);
      setCalendarMonth(startOfMonth(firstOpen));
    } else {
      setCalendarMonth(startOfMonth(selectedDay));
    }
    setStep(2);
    scrollAppToTop();
  });

  const handleBookSession = () => {
    if (!selectedSlotIso) {
      toast.error("Choose a time slot");
      return;
    }
    const values = form.getValues();
    trackBookingClick({
      page_path: "/strategy-session",
      funnel_id: "strategy_session",
      funnel_step: "slot_selected",
      offer_id: "strategy_session",
      lead_magnet_id: "strategy_session",
      offer_stage: "paid_trust_builder",
      cta_id: "book_strategy_session",
      cta_label: "Book Session",
      metadata: { timezone, selected_slot_iso: selectedSlotIso, booking_kind: bookingKindFromUrl ?? null },
    });
    const draft: StrategySessionBookingDraft = {
      values,
      selectedSlotIso,
      timezone,
      ...(bookingKindFromUrl ? { bookingKind: bookingKindFromUrl } : {}),
    };
    try {
      clearPaymentProofFromStorage();
      writeDraftToStorage(draft);
    } catch {
      toast.error("Could not save your session. Allow storage or try another browser.");
      return;
    }
    if (isComplimentaryStrategySessionPromo(values.promoCode)) {
      navigate("/strategy-session/thank-you", { replace: true });
      return;
    }
    preloadSquarePaymentsSdk();
    scrollAppToTop();
    navigate("/strategy-session/payment", { state: draft });
  };

  return (
    <Form {...form}>
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="sticky top-0 z-40 border-b border-border bg-background shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 sm:py-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit shrink-0"
            onClick={() => (step === 1 ? navigate(-1) : setStep((s) => (s - 1) as 1 | 2))}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 1 ? "Back" : "Previous"}
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Strategy Session — $150</span>
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
          {[1, 2].map((n) => (
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
                <form onSubmit={onIntakeNext} className="space-y-4" onFocusCapture={scrollFieldIntoViewOnFocus}>
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
                  <FormField
                    control={form.control}
                    name="promoCode"
                    render={({ field }) => (
                      <FormItem className="max-w-md">
                        <FormLabel>Promo code (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Complimentary session code, if you have one"
                            autoComplete="off"
                            {...field}
                          />
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
          <Card ref={schedulingRef} className="border shadow-sm scroll-mt-28">
            <CardHeader>
              <CardTitle>Choose date & time</CardTitle>
              <CardDescription>All Strategy sessions will be Tue-Thur 9am-5pm.</CardDescription>
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
                    <p className="text-sm text-destructive py-4 leading-relaxed">{SUPPORT_ERROR_MESSAGE}</p>
                  ) : slotsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading slots…
                    </div>
                  ) : !selectedDay ? (
                    <p className="text-sm text-muted-foreground py-4">Pick a date.</p>
                  ) : slotsForDay.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {slotsForDay.map((s) => (
                        <Button
                          key={s.start}
                          type="button"
                          variant={selectedSlotIso === s.start ? "default" : "outline"}
                          size="sm"
                          className="min-h-11 w-full justify-center font-medium tabular-nums"
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
                  ) : (
                    <div className="text-sm text-muted-foreground py-4 leading-relaxed space-y-2">
                      <p>{describeEmptyDayDiagnostic(selectedDayDiag)}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Button type="button" size="lg" disabled={!selectedSlotIso} onClick={handleBookSession}>
                  Book Session
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </Form>
  );
}
