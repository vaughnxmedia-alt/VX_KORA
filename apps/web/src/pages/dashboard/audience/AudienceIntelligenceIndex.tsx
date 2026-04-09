import { useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Sparkles, PlayCircle, Users, ChevronRight } from "lucide-react";
import type { AudienceFilters, AudienceProfile } from "@/features/audience-intelligence/types";
import { audienceProfilesMock } from "@/features/audience-intelligence/mockData";
import { loadCustomAudienceProfiles } from "@/features/audience-intelligence/store";
import { mapAudienceAnalysisToProfile } from "@/features/audience-intelligence/mappers";
import { useToast } from "@/hooks/use-toast";

interface ClientRow {
  id: string;
  business_name: string;
  user_id?: string | null;
}

const defaultFilters: AudienceFilters = {
  clientId: "all",
  status: "all",
  audienceType: "all",
};

export default function AudienceIntelligenceIndex() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [profiles, setProfiles] = useState<AudienceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [queuingRunId, setQueuingRunId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AudienceFilters>(defaultFilters);

  const queueAudienceRun = async (profile: AudienceProfile, triggerSource: "main_site" | "manual" = "main_site") => {
    setQueuingRunId(profile.id);
    try {
      await (supabase as any).from("audience_profiles").upsert(
        {
          id: profile.id,
          client_id: profile.clientId,
          audience_name: profile.audienceName,
          audience_type: profile.audienceType,
          status: "queued",
          confidence_score: profile.confidenceScore,
          completeness_score: profile.completenessScore,
          last_run_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
          created_by: user?.id ?? null,
        },
        { onConflict: "id" },
      );

      const { error } = await (supabase as any).from("audience_analysis_runs").insert({
        audience_profile_id: profile.id,
        client_id: profile.clientId,
        status: "queued",
        trigger_source: triggerSource,
        requested_by: user?.id ?? null,
      });

      if (error) throw error;
      toast({
        title: "Audience analysis queued",
        description: "Run created in shared queue. Mission Control will pick it up.",
      });
    } catch (error: any) {
      toast({
        title: "Unable to queue analysis",
        description: error?.message || "Please check permissions and try again.",
        variant: "destructive",
      });
    } finally {
      setQueuingRunId(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: allClients } = await supabase.from("customers").select("id, business_name, user_id").order("business_name");
        const clientRows = (allClients || []) as ClientRow[];
        setClients(clientRows);

        const allowedClientIds =
          role === "admin"
            ? clientRows.map((c) => c.id)
            : clientRows.filter((c) => c.user_id === user?.id).map((c) => c.id);

        const { data: analysesData } = await supabase
          .from("audience_analyses")
          .select("*")
          .in("client_id", allowedClientIds.length > 0 ? allowedClientIds : ["00000000-0000-0000-0000-000000000000"])
          .order("generated_at", { ascending: false });

        const clientNameById = new Map(clientRows.map((client) => [client.id, client.business_name]));
        const mapped = (analysesData || []).map((row: any) =>
          mapAudienceAnalysisToProfile(row, clientNameById.get(row.client_id) || "Unknown Client"),
        );

        const customProfiles = loadCustomAudienceProfiles().filter((profile) =>
          role === "admin" ? true : allowedClientIds.includes(profile.clientId),
        );

        const withMockFallback = mapped.length > 0 ? mapped : audienceProfilesMock;
        setProfiles([...customProfiles, ...withMockFallback]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role, user?.id]);

  const filtered = useMemo(() => {
    return profiles.filter((profile) => {
      if (filters.clientId !== "all" && profile.clientId !== filters.clientId) return false;
      if (filters.status !== "all" && profile.status !== filters.status) return false;
      if (filters.audienceType !== "all" && profile.audienceType !== filters.audienceType) return false;
      return true;
    });
  }, [profiles, filters]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Audience Intelligence</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all target audience profiles generated by KORA across offers, products, services, and campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={filtered.length === 0 || Boolean(queuingRunId)}
            onClick={() => filtered[0] && queueAudienceRun(filtered[0])}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Run Audience Analysis
          </Button>
          <Button asChild>
            <Link to="/dashboard/audience/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Custom Audience
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Select value={filters.clientId} onValueChange={(value) => setFilters((prev) => ({ ...prev, clientId: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.business_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(value: any) => setFilters((prev) => ({ ...prev, status: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="activation_ready">Activation Ready</SelectItem>
            <SelectItem value="synced">Synced</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.audienceType} onValueChange={(value: any) => setFilters((prev) => ({ ...prev, audienceType: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Audience type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="ai_generated">AI Generated</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 rounded bg-muted w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">No audience profiles yet</h3>
            <p className="text-muted-foreground">Create a custom audience or run Audience Intelligence from Mission Control to generate one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((profile) => (
            <Card key={profile.id} className="border-border/70">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{profile.audienceName}</CardTitle>
                    <CardDescription>{profile.clientName}</CardDescription>
                  </div>
                  <Badge variant="outline">{profile.audienceType.replace("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground line-clamp-2">{profile.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Linked: <span className="font-medium">{profile.linkedAsset}</span></div>
                  <div>Status: <span className="font-medium">{profile.status.replace("_", " ")}</span></div>
                  <div>Segments: <span className="font-medium">{profile.segments.length}</span></div>
                  <div>Personas: <span className="font-medium">{profile.personas.length}</span></div>
                  <div>Confidence: <span className="font-medium">{profile.confidenceScore}%</span></div>
                  <div>Updated: <span className="font-medium">{new Date(profile.updatedAt).toLocaleDateString()}</span></div>
                </div>
                <Button asChild variant="secondary" className="w-full">
                  <Link to={`/dashboard/audience/${profile.id}`}>
                    View Audience <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={queuingRunId === profile.id}
                  onClick={() => queueAudienceRun(profile)}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {queuingRunId === profile.id ? "Queuing..." : "Run Analysis"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/30 border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> KORA workflow visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Audience analysis is generated by Mission Control (Audience Intelligence Agent). The dashboard triggers runs, tracks status, and presents strategic summaries for clients.
        </CardContent>
      </Card>
    </div>
  );
}
