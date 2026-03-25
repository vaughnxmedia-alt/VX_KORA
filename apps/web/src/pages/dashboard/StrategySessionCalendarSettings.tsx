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
import { formatStrategyHostListLabel } from "@/features/strategy-session/formatHostListLabel";

type HostRow = {
  user_id: string;
  display_name: string;
  reference_code: string;
  is_default_public: boolean;
  can_view_all_meetings: boolean;
  list_subtitle: string | null;
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
  const [newReferenceCode, setNewReferenceCode] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newHostUserId, setNewHostUserId] = useState("");
  const [newHostIsDefault, setNewHostIsDefault] = useState(false);
  const [newListSubtitle, setNewListSubtitle] = useState("");
  const [canViewAllMeetings, setCanViewAllMeetings] = useState(false);
  const [hostListSubtitle, setHostListSubtitle] = useState("");

  const { data: hosts, isLoading: hostsLoading } = useQuery({
    queryKey: ["strategy-session-hosts-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategy_session_hosts")
        .select(
          "user_id, display_name, reference_code, is_default_public, can_view_all_meetings, list_subtitle",
        )
        .eq("active", true)
        .order("display_name");
      if (error) throw error;
      return data as HostRow[];
    },
  });

  const { data: profilePickList } = useQuery({
    queryKey: ["profiles-for-strategy-host-add"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "author"]);
      if (error) throw error;
      const ids = [...new Set((roles ?? []).map((r) => r.user_id as string))];
      if (ids.length === 0) return [];
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids)
        .order("full_name");
      if (pErr) throw pErr;
      return profs ?? [];
    },
    enabled: role === "admin",
  });

  const addHostMutation = useMutation({
    mutationFn: async () => {
      const code = newReferenceCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 2 || code.length > 32) {
        throw new Error("Reference code must be 2–32 letters or numbers.");
      }
      if (!newDisplayName.trim()) throw new Error("Display name is required.");
      if (!newHostUserId) throw new Error("Choose a team member (auth profile).");
      const taken = hosts?.some((h) => h.reference_code === code);
      if (taken) throw new Error("That reference code is already in use.");
      if (hosts?.some((h) => h.user_id === newHostUserId)) {
        throw new Error("That person is already a strategy session host.");
      }
      if (newHostIsDefault) {
        const { error: u0 } = await supabase
          .from("strategy_session_hosts")
          .update({ is_default_public: false })
          .eq("is_default_public", true);
        if (u0) throw u0;
      }
      const { error: ins } = await supabase.from("strategy_session_hosts").insert({
        reference_code: code,
        user_id: newHostUserId,
        display_name: newDisplayName.trim(),
        list_subtitle: newListSubtitle.trim() || null,
        is_default_public: newHostIsDefault,
        active: true,
      });
      if (ins) throw ins;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy-session-hosts-admin"] });
      queryClient.invalidateQueries({ queryKey: ["strategy-session-hosts"] });
      setNewReferenceCode("");
      setNewDisplayName("");
      setNewListSubtitle("");
      setNewHostUserId("");
      setNewHostIsDefault(false);
      toast.success("Strategist added — set their hours below.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add host"),
  });

  useEffect(() => {
    if (!hostUserId && hosts?.[0]?.user_id) {
      setHostUserId(hosts[0].user_id);
    }
  }, [hosts, hostUserId]);

  useEffect(() => {
    const h = hosts?.find((x) => x.user_id === hostUserId);
    if (h) {
      setCanViewAllMeetings(!!h.can_view_all_meetings);
      setHostListSubtitle(h.list_subtitle ?? "");
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

      const { error: hostOvErr } = await supabase
        .from("strategy_session_hosts")
        .update({
          can_view_all_meetings: canViewAllMeetings,
          list_subtitle: hostListSubtitle.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", hostUserId);
      if (hostOvErr) throw hostOvErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy-session-host-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["strategy-session-hosts-admin"] });
      queryClient.invalidateQueries({ queryKey: ["strategy-session-hosts"] });
      queryClient.invalidateQueries({ queryKey: ["my-strategy-host-flags"] });
      queryClient.invalidateQueries({ queryKey: ["strategy-session-hosts-meetings-filter"] });
      toast.success("Strategy session calendar saved");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Save failed");
    },
  });

  const selectedHostLabel = useMemo(() => {
    const h = hosts?.find((x) => x.user_id === hostUserId);
    return h ? formatStrategyHostListLabel(h) : "";
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
          <CardTitle>Strategists and referral codes</CardTitle>
          <CardDescription>
            Public booking with no code uses the host marked <strong>default</strong>. Each row maps a referral code
            (business card) to a team member. Add admins or authors who take Strategy Sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-ref-code">Reference code</Label>
              <Input
                id="new-ref-code"
                placeholder="e.g. ALEX"
                value={newReferenceCode}
                onChange={(e) => setNewReferenceCode(e.target.value.toUpperCase())}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-display">Display name</Label>
              <Input
                id="new-display"
                placeholder="Name on booking UI"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-subtitle">Brand or nickname (optional)</Label>
            <Input
              id="new-subtitle"
              placeholder="e.g. Jahknowspr or Juss — shown in parentheses, not the referral code"
              value={newListSubtitle}
              onChange={(e) => setNewListSubtitle(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label>Team member</Label>
            <Select value={newHostUserId || undefined} onValueChange={setNewHostUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose profile (admin/author)" />
              </SelectTrigger>
              <SelectContent>
                {(profilePickList ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {(p.full_name || "No name") + ` · ${p.id.slice(0, 8)}…`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="new-default" checked={newHostIsDefault} onCheckedChange={setNewHostIsDefault} />
            <Label htmlFor="new-default">Default host (no referral code on public booking)</Label>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={addHostMutation.isPending}
            onClick={() => addHostMutation.mutate()}
          >
            {addHostMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding…
              </>
            ) : (
              "Add strategist"
            )}
          </Button>
        </CardContent>
      </Card>

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
                        {formatStrategyHostListLabel(h)}
                        {h.is_default_public ? " · default" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hostUserId && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="host-list-subtitle">Brand or nickname (optional)</Label>
                    <Input
                      id="host-list-subtitle"
                      placeholder="e.g. Jahknowspr or Juss"
                      value={hostListSubtitle}
                      onChange={(e) => setHostListSubtitle(e.target.value)}
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown in parentheses next to the display name in Meetings and booking. Referral code stays separate.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <Switch
                      id="can-view-all-meetings"
                      checked={canViewAllMeetings}
                      onCheckedChange={setCanViewAllMeetings}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="can-view-all-meetings">Owner: view all team meetings</Label>
                      <p className="text-xs text-muted-foreground">
                        Enables the Meetings dashboard filter for every strategist (bookings stay on each host; default
                        host counts like any other).
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
