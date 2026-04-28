import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Mail, Palette, SearchCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  AuditHeroVisual,
  InsightVisual,
  ScoreBreakdownVisual,
} from "@/features/audit-visuals/components";
import { buildAuditVisualInput } from "@/features/audit-visuals/mapper";

type AuditRow = {
  id: string;
  lead_key: string;
  lead_email_lower: string | null;
  contact_name: string | null;
  phone: string | null;
  business_name: string | null;
  website_link: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  other_socials: string | null;
  growth_goal: string | null;
  current_blocker: string | null;
  target_audience_belief: string | null;
  intent: string | null;
  readiness_level: string | null;
  follow_up_status: string;
  audience_segment: string | null;
  correlation_id: string | null;
  lead_source: string | null;
  audit_angle: string;
  completion_status: string;
  score_summary: Json;
  actual_outcome: Json;
  metadata: Json;
  created_at: string;
  completed_at: string | null;
};

type AestheticSignal = {
  audit_id: string;
  detected_industry: string | null;
  detected_aesthetic: string | null;
  recommended_vibe: string | null;
  confidence: number;
  signals: Json;
};

const FOLLOW_UP_STATUSES = [
  "new",
  "reviewed",
  "audit_sent",
  "follow_up_needed",
  "booked_strategy_session",
  "converted",
  "not_ready",
];

function formatDate(value: string | null): string {
  if (!value) return "Not completed";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(value: string | null | undefined): string {
  return String(value ?? "unknown").replace(/_/g, " ");
}

function JsonBlock({ value }: { value: Json }) {
  return (
    <pre className="max-h-56 overflow-auto rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}

export default function Audits() {
  const [search, setSearch] = useState("");
  const [readinessFilter, setReadinessFilter] = useState("all");
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: audits, isLoading } = useQuery({
    queryKey: ["free-audit-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_audits")
        .select(
          "id,lead_key,lead_email_lower,contact_name,phone,business_name,website_link,instagram,facebook,tiktok,other_socials,growth_goal,current_blocker,target_audience_belief,intent,readiness_level,follow_up_status,audience_segment,correlation_id,lead_source,audit_angle,completion_status,score_summary,actual_outcome,metadata,created_at,completed_at",
        )
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const { data: aestheticSignals } = useQuery({
    queryKey: ["audit-aesthetic-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_aesthetic_signals")
        .select("audit_id,detected_industry,detected_aesthetic,recommended_vibe,confidence,signals")
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data ?? []) as AestheticSignal[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ auditId, status }: { auditId: string; status: string }) => {
      const { error } = await supabase
        .from("free_audits")
        .update({ follow_up_status: status })
        .eq("id", auditId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["free-audit-submissions"] });
      toast.success("Audit status updated");
    },
    onError: (error: Error) => toast.error(error.message || "Could not update audit status"),
  });

  const sendReport = useMutation({
    mutationFn: async (auditId: string) => {
      const { data, error } = await supabase.functions.invoke("send-free-audit-report", {
        body: { auditId },
      });
      if (error) {
        let detail = error.message || "Could not send audit report";
        const context = (error as { context?: unknown }).context;
        if (context && typeof context === "object" && "json" in (context as Record<string, unknown>)) {
          try {
            const payload = await (context as { json: () => Promise<unknown> }).json();
            const parsed = payload as { error?: string; message?: string };
            detail = parsed.error || parsed.message || detail;
          } catch {
            // keep default detail
          }
        }
        throw new Error(detail);
      }
      return data as { ok?: boolean; to?: string };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["free-audit-submissions"] });
      toast.success(`Audit report sent${result?.to ? ` to ${result.to}` : ""}`);
    },
    onError: (error: Error) => toast.error(error.message || "Could not send audit report"),
  });

  const filteredAudits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (audits ?? []).filter((audit) => {
      const readinessMatch = readinessFilter === "all" || audit.readiness_level === readinessFilter;
      if (!readinessMatch) return false;
      if (!q) return true;
      return [
        audit.contact_name,
        audit.business_name,
        audit.lead_email_lower,
        audit.phone,
        audit.lead_source,
        audit.audit_angle,
        audit.growth_goal,
        audit.current_blocker,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [audits, readinessFilter, search]);

  const selectedAudit = filteredAudits.find((audit) => audit.id === selectedAuditId) ?? filteredAudits[0] ?? null;
  const selectedAestheticSignal = selectedAudit
    ? (aestheticSignals ?? []).find((signal) => signal.audit_id === selectedAudit.id) ?? null
    : null;
  const selectedVisualInput = selectedAudit ? buildAuditVisualInput(selectedAudit) : null;
  const stats = useMemo(() => {
    const rows = audits ?? [];
    return {
      total: rows.length,
      hot: rows.filter((row) => row.readiness_level === "HOT").length,
      warm: rows.filter((row) => row.readiness_level === "WARM").length,
      cold: rows.filter((row) => row.readiness_level === "COLD").length,
      needsFollowUp: rows.filter((row) => row.follow_up_status === "follow_up_needed").length,
    };
  }, [audits]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">Growth</p>
          <h1 className="text-3xl font-bold">Audit Submissions</h1>
          <p className="text-muted-foreground">Review Free Audit submissions, lead readiness, and diagnostic answers.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/audits/templates">
            <Upload className="mr-2 h-4 w-4" />
            Templates
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          ["Total", stats.total],
          ["Hot", stats.hot],
          ["Warm", stats.warm],
          ["Cold", stats.cold],
          ["Follow-up", stats.needsFollowUp],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="rounded-2xl border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
            <Input
              placeholder="Search audits..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="md:max-w-sm"
            />
            <Select value={readinessFilter} onValueChange={setReadinessFilter}>
              <SelectTrigger className="md:w-44">
                <SelectValue placeholder="Readiness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All readiness</SelectItem>
                <SelectItem value="HOT">Hot</SelectItem>
                <SelectItem value="WARM">Warm</SelectItem>
                <SelectItem value="COLD">Cold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading audits...</TableCell>
                </TableRow>
              ) : filteredAudits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No audit submissions found.</TableCell>
                </TableRow>
              ) : (
                filteredAudits.map((audit) => (
                  <TableRow
                    key={audit.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedAuditId(audit.id)}
                  >
                    <TableCell>
                      <div className="font-medium">{audit.business_name || audit.contact_name || audit.lead_email_lower}</div>
                      <div className="text-xs text-muted-foreground">{audit.lead_email_lower || audit.lead_key}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={audit.readiness_level === "HOT" ? "default" : "secondary"}>
                        {audit.readiness_level ?? "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>{statusLabel(audit.follow_up_status)}</TableCell>
                    <TableCell>{audit.lead_source ?? "direct"}</TableCell>
                    <TableCell>{formatDate(audit.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <aside className="rounded-2xl border bg-card p-5">
          {selectedAudit ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Selected Audit</p>
                  <h2 className="text-xl font-semibold">{selectedAudit.business_name || selectedAudit.contact_name || "Unnamed lead"}</h2>
                  <p className="text-sm text-muted-foreground">{selectedAudit.lead_email_lower}</p>
                </div>
                <SearchCheck className="h-6 w-6 text-gold" />
              </div>

              <Select
                value={selectedAudit.follow_up_status}
                onValueChange={(status) => updateStatus.mutate({ auditId: selectedAudit.id, status })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Follow-up status" />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="w-full"
                onClick={() => sendReport.mutate(selectedAudit.id)}
                disabled={sendReport.isPending}
              >
                <Mail className="mr-2 h-4 w-4" />
                {sendReport.isPending ? "Sending PDF..." : "Send PDF Diagnosis"}
              </Button>

              <div className="grid gap-3 text-sm">
                <div>
                  <p className="font-medium">Trying to grow</p>
                  <p className="text-muted-foreground">{selectedAudit.growth_goal || "Not provided"}</p>
                </div>
                <div>
                  <p className="font-medium">Not working</p>
                  <p className="text-muted-foreground">{selectedAudit.current_blocker || "Not provided"}</p>
                </div>
                <div>
                  <p className="font-medium">Believed audience</p>
                  <p className="text-muted-foreground">{selectedAudit.target_audience_belief || "Not provided"}</p>
                </div>
              </div>

              <div className="grid gap-2 text-sm">
                <p className="font-medium">Presence</p>
                {[selectedAudit.website_link, selectedAudit.instagram, selectedAudit.facebook, selectedAudit.tiktok, selectedAudit.other_socials]
                  .filter(Boolean)
                  .map((value) => (
                    <p key={value} className="truncate text-muted-foreground">{value}</p>
                  ))}
              </div>

              <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <Palette className="h-4 w-4 text-gold" />
                  Aesthetic Intelligence
                </div>
                {selectedAestheticSignal ? (
                  <div className="space-y-2 text-muted-foreground">
                    <p><span className="font-medium text-foreground">Industry:</span> {statusLabel(selectedAestheticSignal.detected_industry)}</p>
                    <p><span className="font-medium text-foreground">Aesthetic:</span> {selectedAestheticSignal.detected_aesthetic ?? "Unknown"}</p>
                    <p><span className="font-medium text-foreground">Recommended vibe:</span> {selectedAestheticSignal.recommended_vibe ?? "Use JahKnowsPR premium editorial rules"}</p>
                    <p><span className="font-medium text-foreground">Confidence:</span> {Math.round(selectedAestheticSignal.confidence * 100)}%</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No scan captured yet. New submissions will scan automatically when website or social context is available.</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4" />
                  Diagnostics
                </div>
                <JsonBlock value={selectedAudit.score_summary} />
                <JsonBlock value={selectedAudit.actual_outcome} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select an audit to see diagnostic details.</p>
          )}
        </aside>
      </div>

      {selectedVisualInput ? (
        <section className="space-y-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">Visual Intelligence</p>
            <h2 className="text-2xl font-bold">Brand Diagnosis Visual System</h2>
            <p className="text-sm text-muted-foreground">
              Data-to-visual translation engine for premium, client-specific audit artifacts.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <AuditHeroVisual data={selectedVisualInput} />
            <ScoreBreakdownVisual data={selectedVisualInput} />
          </div>
          <InsightVisual data={selectedVisualInput} />
        </section>
      ) : null}
    </div>
  );
}
