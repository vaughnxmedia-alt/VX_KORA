import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BookingConfirmationEmailDialog,
  type PendingBookingForDialog,
} from "@/components/dashboard/BookingConfirmationEmailDialog";
import { ShareLeadMagnetLinksDialog } from "@/components/dashboard/ShareLeadMagnetLinksDialog";
import { confirmStrategySessionBooking } from "@/features/strategy-session/api";
import {
  BOOKING_KINDS,
  BOOKING_KIND_LABEL,
  type BookingKind,
  normalizeBookingKind,
} from "@/features/leads/bookingKinds";

interface PendingBookingRow {
  id: string;
  customer_id: string | null;
  meeting_date: string;
  timezone: string | null;
  session_type: string | null;
  in_person_location: string | null;
  employee_reference_code: string | null;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  booking_kind: string;
  host_profile: { full_name: string | null } | null;
  customer: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    business_name: string | null;
  } | null;
}

export default function Leads() {
  const [kindFilter, setKindFilter] = useState<BookingKind | "all">("all");
  const [leadFilter, setLeadFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedForCompose, setSelectedForCompose] = useState<PendingBookingRow | null>(null);

  const queryClient = useQueryClient();

  const { data: pendingRows, isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-booking-confirmations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select(
          `
          id,
          customer_id,
          meeting_date,
          timezone,
          session_type,
          in_person_location,
          employee_reference_code,
          full_name,
          business_name,
          email,
          phone,
          booking_kind,
          host_profile:profiles!meetings_host_user_id_fkey ( full_name ),
          customer:customer_id ( id, first_name, last_name, email, business_name )
        `,
        )
        .eq("service_name", "Strategy Session")
        .eq("confirmation_status", "pending")
        .eq("booking_status", "pending")
        .order("meeting_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PendingBookingRow[];
    },
  });

  const leadFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of pendingRows ?? []) {
      const c = row.customer;
      if (!c?.id) continue;
      const label =
        [c.first_name, c.last_name].filter(Boolean).join(" ").trim() ||
        c.business_name ||
        c.email ||
        c.id;
      map.set(c.id, label);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [pendingRows]);

  const filteredRows = useMemo(() => {
    let list = pendingRows ?? [];
    const q = search.trim().toLowerCase();
    if (kindFilter !== "all") {
      list = list.filter((r) => normalizeBookingKind(r.booking_kind) === kindFilter);
    }
    if (leadFilter !== "all") {
      list = list.filter((r) => r.customer_id === leadFilter);
    }
    if (q) {
      list = list.filter((r) => {
        const blob = [
          r.full_name,
          r.business_name,
          r.email,
          r.phone,
          r.customer?.first_name,
          r.customer?.last_name,
          r.customer?.email,
          r.customer?.business_name,
          r.host_profile?.full_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
    }
    return list;
  }, [pendingRows, kindFilter, leadFilter, search]);

  const confirmStrategySessionMutation = useMutation({
    mutationFn: async ({
      meetingId,
      guestHtml,
      guestSubject,
    }: {
      meetingId: string;
      guestHtml: string;
      guestSubject: string;
    }) => {
      const res = await confirmStrategySessionBooking(meetingId, { guestHtml, guestSubject });
      if (!res.ok) {
        throw new Error(res.error || "Confirmation failed");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-booking-confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings-for-pipeline"] });
      toast.success("Emails sent — meeting confirmed and visible on the Meetings tab.");
      setComposeOpen(false);
      setSelectedForCompose(null);
    },
    onError: (err: Error) => toast.error(err.message || "Could not confirm booking"),
  });

  const openCompose = (row: PendingBookingRow) => {
    setSelectedForCompose(row);
    setComposeOpen(true);
  };

  const toDialogMeeting = (row: PendingBookingRow): PendingBookingForDialog => ({
    id: row.id,
    meeting_date: row.meeting_date,
    timezone: row.timezone,
    session_type: row.session_type,
    full_name: row.full_name,
    business_name: row.business_name,
    email: row.email,
    host_profile: row.host_profile,
  });

  const whenParts = (row: PendingBookingRow) => {
    const d = new Date(row.meeting_date);
    const tz = row.timezone || "America/New_York";
    const dateLine = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(d);
    const timeLine = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
    const where =
      row.session_type === "in_person"
        ? row.in_person_location?.trim() || "In person — location TBD"
        : "Zoom — link before session";
    return { dateLine, timeLine, where, tz };
  };

  if (pendingLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        </div>
        <ShareLeadMagnetLinksDialog />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Booking type</Label>
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as BookingKind | "all")}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {BOOKING_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {BOOKING_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Lead</Label>
          <Select value={leadFilter} onValueChange={setLeadFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All leads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All leads</SelectItem>
              {leadFilterOptions.map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, business…"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Hosts</TableHead>
              <TableHead className="min-w-[200px]">Date · Where · Time</TableHead>
              <TableHead className="w-[140px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  No bookings awaiting confirmation.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => {
                const kind = normalizeBookingKind(row.booking_kind);
                const hostName = row.host_profile?.full_name?.trim() || "—";
                const w = whenParts(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="align-top">
                      <Badge variant="secondary" className="font-normal">
                        {BOOKING_KIND_LABEL[kind]}
                      </Badge>
                      <div className="mt-2 space-y-0.5 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">{row.full_name || "—"}</div>
                        {row.business_name ? <div>{row.business_name}</div> : null}
                        {row.email ? <div className="font-mono">{row.email}</div> : null}
                        {row.phone ? <div>{row.phone}</div> : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="font-medium">{hostName}</div>
                      {row.employee_reference_code ? (
                        <div className="text-xs text-muted-foreground">Ref · {row.employee_reference_code}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      <dl className="space-y-1.5">
                        <div>
                          <dt className="text-xs font-medium text-muted-foreground">Date</dt>
                          <dd>{w.dateLine}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-muted-foreground">Where</dt>
                          <dd>{w.where}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium text-muted-foreground">Time</dt>
                          <dd>
                            {w.timeLine}{" "}
                            <span className="text-muted-foreground">({w.tz})</span>
                          </dd>
                        </div>
                      </dl>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Button type="button" size="sm" onClick={() => openCompose(row)}>
                        Review email
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <BookingConfirmationEmailDialog
        open={composeOpen}
        onOpenChange={(o) => {
          setComposeOpen(o);
          if (!o) setSelectedForCompose(null);
        }}
        meeting={selectedForCompose ? toDialogMeeting(selectedForCompose) : null}
        isSending={confirmStrategySessionMutation.isPending}
        onSend={async ({ guestHtml, guestSubject }) => {
          if (!selectedForCompose) return;
          await confirmStrategySessionMutation.mutateAsync({
            meetingId: selectedForCompose.id,
            guestHtml,
            guestSubject,
          });
        }}
      />
    </div>
  );
}
