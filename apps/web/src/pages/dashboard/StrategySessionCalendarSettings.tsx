import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { TIMEZONES } from "@/features/strategy-session/schema";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";

type HostRow = {
  user_id: string;
  display_name: string;
  reference_code: string;
};

const ISO_DAYS: { n: number; label: string }[] = [
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
  { n: 6, label: "Sat" },
  { n: 7, label: "Sun" },
];

export default function StrategySessionCalendarSettings() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [timezone, setTimezone] = useState("America/New_York");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4]);
  const [dayStart, setDayStart] = useState("09:00");
  const [dayEnd, setDayEnd] = useState("18:00");
  const [slotDuration, setSlotDuration] = useState(60);
  const [blockedText, setBlockedText] = useState("");
  const [overridesJson, setOverridesJson] = useState("[]");

  const { data: hosts, isLoading: hostsLoading } = useQuery({
    queryKey: ["strategy-session-hosts-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategy_session_hosts")
        .select("user_id, display_name, reference_code")
        .eq("active", true)
        .order("display_name");
      if (error) throw error;
      return data as HostRow[];
    },
  });

  useEffect(() => {
    if (!hostUserId && hosts?.[0]?.user_id) {
      setHostUserId(hosts[0].user_id);
    }
  }, [hosts, hostUserId]);

  const scheduleQuery = useQuery({
    queryKey: ["strategy-session-host-schedule", hostUserId],
    queryFn: async () => {
      if (!hostUserId) return null;
      const [sch, blocks, ovs] = await Promise.all([
        supabase.from("strategy_session_host_schedule").select("*").eq("host_user_id", hostUserId).maybeSingle(),
        supabase
          .from("strategy_session_schedule_block")
          .select("block_date")
          .eq("host_user_id", hostUserId)
          .order("block_date"),
        supabase.from("strategy_session_schedule_override").select("*").eq("host_user_id", hostUserId),
      ]);
      if (sch.error) throw sch.error;
      if (blocks.error) throw blocks.error;
      if (ovs.error) throw ovs.error;
      return {
        schedule: sch.data,
        blocks: blocks.data ?? [],
        overrides: ovs.data ?? [],
      };
    },
    enabled: !!hostUserId,
  });

  useEffect(() => {
    const d = scheduleQuery.data;
    if (!d || !hostUserId) return;
    if (d.schedule) {
      setActive(!!d.schedule.active);
      setTimezone(String(d.schedule.timezone ?? "America/New_York"));
      const wd = d.schedule.weekdays as number[] | null;
      setWeekdays(
        Array.isArray(wd) && wd.length ? wd.map((n) => Number(n)) : [1, 2, 3, 4],
      );
      const ds = String(d.schedule.day_start ?? "09:00").slice(0, 5);
      const de = String(d.schedule.day_end ?? "18:00").slice(0, 5);
      setDayStart(ds);
      setDayEnd(de);
      setSlotDuration(Number(d.schedule.slot_duration_minutes) || 60);
    } else {
      setActive(true);
      setTimezone("America/New_York");
      setWeekdays([1, 2, 3, 4]);
      setDayStart("09:00");
      setDayEnd("18:00");
      setSlotDuration(60);
    }
    setBlockedText(
      (d.blocks as { block_date: string }[]).map((b) => String(b.block_date).slice(0, 10)).join("\n"),
    );
    setOverridesJson(
      JSON.stringify(
        (d.overrides as Record<string, unknown>[]).map((o) => ({
          on_date: String(o.on_date).slice(0, 10),
          is_closed: !!o.is_closed,
          time_windows: o.time_windows ?? null,
        })),
        null,
        2,
      ),
    );
  }, [scheduleQuery.data, hostUserId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!hostUserId) throw new Error("Pick a strategist");
      let overrides: { on_date: string; is_closed: boolean; time_windows: unknown }[] = [];
      try {
        const parsed = JSON.parse(overridesJson || "[]");
        if (!Array.isArray(parsed)) throw new Error("Overrides must be a JSON array");
        overrides = parsed.map((row: Record<string, unknown>) => ({
          on_date: String(row.on_date),
          is_closed: !!row.is_closed,
          time_windows: row.time_windows ?? null,
        }));
      } catch {
        throw new Error("Invalid overrides JSON");
      }

      const blockLines = blockedText
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const { error: upErr } = await supabase.from("strategy_session_host_schedule").upsert(
        {
          host_user_id: hostUserId,
          active,
          timezone,
          weekdays,
          day_start: dayStart,
          day_end: dayEnd,
          slot_duration_minutes: slotDuration,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "host_user_id" },
      );
      if (upErr) throw upErr;

      const { error: delB } = await supabase
        .from("strategy_session_schedule_block")
        .delete()
        .eq("host_user_id", hostUserId);
      if (delB) throw delB;

      if (blockLines.length) {
        const { error: insB } = await supabase.from("strategy_session_schedule_block").insert(
          blockLines.map((block_date) => ({ host_user_id: hostUserId, block_date })),
        );
        if (insB) throw insB;
      }

      const { error: delO } = await supabase
        .from("strategy_session_schedule_override")
        .delete()
        .eq("host_user_id", hostUserId);
      if (delO) throw delO;

      if (overrides.length) {
        const { error: insO } = await supabase.from("strategy_session_schedule_override").insert(
          overrides.map((o) => ({
            host_user_id: hostUserId,
            on_date: o.on_date,
            is_closed: o.is_closed,
            time_windows: o.time_windows,
          })),
        );
        if (insO) throw insO;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy-session-host-schedule"] });
      toast.success("Strategy session calendar saved");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Save failed");
    },
  });

  const selectedHostLabel = useMemo(() => {
    const h = hosts?.find((x) => x.user_id === hostUserId);
    return h ? `${h.display_name} (${h.reference_code})` : "";
  }, [hosts, hostUserId]);

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Strategy Session calendar</h1>
          <p className="text-muted-foreground text-sm">
            Open hours, blocks, and overrides feed the public booking Edge Function (source of truth).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Host schedule</CardTitle>
          <CardDescription>
            Without a row here, bookings use the code fallback (Mon–Thu 9–6 America/New_York). Saving creates or
            updates the row for the selected strategist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hostsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading strategists…
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Strategist</Label>
                <Select
                  value={hostUserId ?? ""}
                  onValueChange={(v) => {
                    setHostUserId(v || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose host" />
                  </SelectTrigger>
                  <SelectContent>
                    {(hosts ?? []).map((h) => (
                      <SelectItem key={h.user_id} value={h.user_id}>
                        {h.display_name} — {h.reference_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hostUserId && (
                <>
                  {scheduleQuery.isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Switch id="sched-active" checked={active} onCheckedChange={setActive} />
                        <Label htmlFor="sched-active">Scheduling active</Label>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Timezone</Label>
                          <Select value={timezone} onValueChange={setTimezone}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              {TIMEZONES.map((tz) => (
                                <SelectItem key={tz} value={tz}>
                                  {tz.replace(/_/g, " ")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Slot length (minutes)</Label>
                          <Input
                            type="number"
                            min={15}
                            max={240}
                            step={15}
                            value={slotDuration}
                            onChange={(e) => setSlotDuration(Number(e.target.value) || 60)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Open weekdays</Label>
                        <div className="flex flex-wrap gap-3">
                          {ISO_DAYS.map((d) => (
                            <label key={d.n} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={weekdays.includes(d.n)}
                                onCheckedChange={(c) => {
                                  if (c === true) {
                                    setWeekdays([...new Set([...weekdays, d.n])].sort((a, b) => a - b));
                                  } else {
                                    setWeekdays(weekdays.filter((w) => w !== d.n));
                                  }
                                }}
                              />
                              {d.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Day start (local)</Label>
                          <Input value={dayStart} onChange={(e) => setDayStart(e.target.value)} placeholder="09:00" />
                        </div>
                        <div className="space-y-2">
                          <Label>Day end (exclusive)</Label>
                          <Input value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} placeholder="18:00" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Blocked dates (YYYY-MM-DD, one per line)</Label>
                        <Textarea
                          rows={4}
                          value={blockedText}
                          onChange={(e) => setBlockedText(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Overrides (JSON array)</Label>
                        <p className="text-xs text-muted-foreground">
                          Example:{" "}
                          <code className="text-xs">{`[{"on_date":"2026-12-25","is_closed":true}]`}</code>
                          or custom windows:{" "}
                          <code className="text-xs">
                            {`[{"on_date":"2026-06-01","is_closed":false,"time_windows":[["10:00","14:00"]]}]`}
                          </code>
                        </p>
                        <Textarea
                          rows={6}
                          value={overridesJson}
                          onChange={(e) => setOverridesJson(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>

                      <Button
                        type="button"
                        disabled={saveMutation.isPending || weekdays.length === 0}
                        onClick={() => saveMutation.mutate()}
                      >
                        {saveMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          `Save for ${selectedHostLabel || "host"}`
                        )}
                      </Button>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
