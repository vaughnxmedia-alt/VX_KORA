import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHqAuth } from "../HqAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { HqRole } from "../types";

export function HqTeamPage() {
  const { hqRole, can } = useHqAuth();
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [role, setRole] = useState<HqRole>("strategist");

  const { data: profiles = [] } = useQuery({
    queryKey: ["hq", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,hq_role")
        .order("full_name");
      if (error) {
        // email may not exist on profiles
        const fallback = await supabase.from("profiles").select("id,full_name").order("full_name");
        if (fallback.error) throw fallback.error;
        return (fallback.data ?? []).map((p) => ({ ...p, email: null, hq_role: null }));
      }
      return data ?? [];
    },
    enabled: can("team"),
  });

  if (!can("team")) {
    return (
      <div className="max-w-lg rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">
        Team management is Owner-only.
      </div>
    );
  }

  const assign = async () => {
    if (!selectedUser) {
      toast.error("Select a user");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ hq_role: role })
      .eq("id", selectedUser);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("HQ role updated");
    void qc.invalidateQueries({ queryKey: ["hq", "profiles"] });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assign HQ roles. Your role: <strong>{hqRole}</strong>
        </p>
      </div>
      <div className="rounded-lg border border-border bg-background p-5 space-y-4">
        <div className="space-y-2">
          <Label>User</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Select profile" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p: { id: string; full_name?: string | null; email?: string | null }) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || p.email || p.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>HQ role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as HqRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="strategist">Strategist</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => void assign()}>Save role</Button>
      </div>
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">HQ role</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p: { id: string; full_name?: string | null; hq_role?: string | null }) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-2">{p.full_name || p.id}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.hq_role || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HqSettingsPage() {
  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="font-serif text-3xl font-bold">Settings</h1>
      <div className="rounded-lg border border-border bg-background p-5 text-sm text-muted-foreground space-y-2">
        <p>JahKnowsPR HQ Version 1 uses your existing Supabase project and authentication.</p>
        <p>
          Apply migration <code className="text-xs">20261002180000_jahknowspr_hq_v1.sql</code> if you have not
          already.
        </p>
        <p>Public site URL and Square keys remain configured for the marketing app—no new env vars required for HQ V1.</p>
      </div>
    </div>
  );
}
