import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, RefreshCw, Copy, Pencil } from "lucide-react";
import { audienceProfilesMock } from "@/features/audience-intelligence/mockData";
import { loadCustomAudienceProfiles } from "@/features/audience-intelligence/store";
import { mapAudienceAnalysisToProfile } from "@/features/audience-intelligence/mappers";
import type { AudienceProfile } from "@/features/audience-intelligence/types";
import { useToast } from "@/hooks/use-toast";

function formatGeneratedByLabel(s: string) {
  if (s === "Audience Intelligence Agent") return "Audiences";
  return s;
}

function SectionList({ title, items, emptyMessage }: { title: string; items: string[]; emptyMessage: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {items.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function AudienceIntelligenceDetail() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { audienceId } = useParams();
  const [profile, setProfile] = useState<AudienceProfile | null>(null);
  const [isQueueingRefresh, setIsQueueingRefresh] = useState(false);

  const queueRefreshRun = async () => {
    if (!profile) return;
    setIsQueueingRefresh(true);
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
        trigger_source: "main_site",
        requested_by: user?.id ?? null,
      });
      if (error) throw error;
      toast({
        title: "Refresh queued",
        description: "Audiences run created and shared with Mission Control queue.",
      });
    } catch (error: any) {
      toast({
        title: "Unable to queue refresh",
        description: error?.message || "Please check permissions and try again.",
        variant: "destructive",
      });
    } finally {
      setIsQueueingRefresh(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      const local = loadCustomAudienceProfiles().find((item) => item.id === audienceId);
      if (local) {
        setProfile(local);
        return;
      }

      const { data: allClients } = await supabase.from("customers").select("id, business_name, user_id");
      const clientRows = (allClients || []) as Array<{ id: string; business_name: string; user_id: string | null }>;
      const allowedClientIds =
        role === "admin"
          ? clientRows.map((c) => c.id)
          : clientRows.filter((c) => c.user_id === user?.id).map((c) => c.id);

      const { data } = await supabase.from("audience_analyses").select("*").eq("id", audienceId).maybeSingle();
      if (data && allowedClientIds.includes(data.client_id)) {
        const clientName = clientRows.find((c) => c.id === data.client_id)?.business_name || "Unknown Client";
        setProfile(mapAudienceAnalysisToProfile(data, clientName));
        return;
      }

      const fallback = audienceProfilesMock.find((item) => item.id === audienceId);
      setProfile(fallback || null);
    };

    loadProfile();
  }, [audienceId, role, user?.id]);

  const snapshot = useMemo(() => {
    if (!profile) return [];
    return [
      { label: "Segments", value: profile.segments.length },
      { label: "Personas", value: profile.personas.length },
      { label: "Platforms", value: profile.platformIntelligence.length },
      { label: "Motivations", value: profile.psychology.motivations.length },
      { label: "Pain points", value: profile.coreProfile.painPoints ? 1 : 0 },
      { label: "Buying triggers", value: profile.coreProfile.buyingTriggers ? 1 : 0 },
      { label: "Confidence", value: `${profile.confidenceScore}%` },
      { label: "Last agent run", value: new Date(profile.analysisRun.lastRunAt).toLocaleDateString() },
    ];
  }, [profile]);

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">Audience not found.</p>
          <Button className="mt-4" asChild><Link to="/dashboard/audience">Back to Audiences</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/audience")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Audiences
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-2xl text-primary">{profile.audienceName}</CardTitle>
              <CardDescription>{profile.clientName} - {profile.linkedAssetType}: {profile.linkedAsset}</CardDescription>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{profile.audienceType.replace("_", " ")}</Badge>
                <Badge variant="outline">{profile.status.replace("_", " ")}</Badge>
                <Badge variant="outline">Confidence {profile.confidenceScore}%</Badge>
                <Badge variant="outline">Updated {new Date(profile.updatedAt).toLocaleDateString()}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={queueRefreshRun} disabled={isQueueingRefresh}><RefreshCw className="w-4 h-4 mr-2" />{isQueueingRefresh ? "Queuing..." : "Refresh Analysis"}</Button>
              <Button variant="outline" onClick={() => toast({ title: "Edit mode", description: "Direct edits for AI audiences should create a Hybrid profile." })}><Pencil className="w-4 h-4 mr-2" />Edit Audience</Button>
              <Button variant="outline" onClick={() => toast({ title: "Duplicate queued", description: "A duplicate draft will be added in a follow-up backend task." })}><Copy className="w-4 h-4 mr-2" />Duplicate</Button>
              <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export PDF</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {snapshot.map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-semibold mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Core Audience Profile</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
          <div><p className="font-medium">Demographics</p><p className="text-muted-foreground">{profile.coreProfile.demographics || "Not available yet."}</p></div>
          <div><p className="font-medium">Psychographics</p><p className="text-muted-foreground">{profile.coreProfile.psychographics || "Not available yet."}</p></div>
          <div><p className="font-medium">Behaviors</p><p className="text-muted-foreground">{profile.coreProfile.behaviors || "Not available yet."}</p></div>
          <div><p className="font-medium">Motivations</p><p className="text-muted-foreground">{profile.coreProfile.motivations || "Not available yet."}</p></div>
          <div><p className="font-medium">Pain points</p><p className="text-muted-foreground">{profile.coreProfile.painPoints || "Not available yet."}</p></div>
          <div><p className="font-medium">Objections</p><p className="text-muted-foreground">{profile.coreProfile.objections || "Not available yet."}</p></div>
          <div><p className="font-medium">Buying triggers</p><p className="text-muted-foreground">{profile.coreProfile.buyingTriggers || "Not available yet."}</p></div>
          <div><p className="font-medium">Desired transformation</p><p className="text-muted-foreground">{profile.coreProfile.desiredTransformation || "Not available yet."}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Segments</CardTitle></CardHeader>
        <CardContent>
          {profile.segments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No segments yet. Run audience analysis or add segment guidance manually.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {profile.segments.map((segment) => (
                <Card key={segment.id} className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-base">{segment.name}</CardTitle>
                    <CardDescription>{segment.description || "No description yet."}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p><span className="font-medium text-foreground">Pain point:</span> {segment.painPoint || "-"}</p>
                    <p><span className="font-medium text-foreground">Why they follow:</span> {segment.whyTheyFollow || "-"}</p>
                    <p><span className="font-medium text-foreground">Why they hesitate:</span> {segment.whyTheyHesitate || "-"}</p>
                    <p><span className="font-medium text-foreground">Buying motivation:</span> {segment.buyingMotivation || "-"}</p>
                    <p><span className="font-medium text-foreground">Best content angle:</span> {segment.bestContentAngle || "-"}</p>
                    <p><span className="font-medium text-foreground">Best CTA:</span> {segment.bestCta || "-"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Personas</CardTitle></CardHeader>
        <CardContent>
          {profile.personas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No personas yet. Run deeper analysis or add a custom persona.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {profile.personas.map((persona) => (
                <Card key={persona.id} className="border-border/60">
                  <CardHeader><CardTitle className="text-base">{persona.name}</CardTitle></CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p><span className="font-medium text-foreground">Role:</span> {persona.roleTitle || "-"}</p>
                    <p><span className="font-medium text-foreground">Stage:</span> {persona.stageOfBusiness || "-"}</p>
                    <p><span className="font-medium text-foreground">Offer fit:</span> {persona.offerFit || "-"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionList title="Platform Intelligence" items={profile.platformIntelligence.map((p) => `${p.platform}: ${p.bestContentType} (${p.relevanceScore}%)`) } emptyMessage="No platform intelligence yet. This audience needs more source data to generate platform guidance." />
        <SectionList title="Psychology" items={[...profile.psychology.motivations, ...profile.psychology.fears]} emptyMessage="No psychology insights yet. Refresh analysis." />
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <SectionList title="Hooks" items={profile.contentInsights.hooks} emptyMessage="No hooks yet." />
        <SectionList title="Story Angles" items={profile.contentInsights.storyAngles} emptyMessage="No story angles yet." />
        <SectionList title="Educational Themes" items={profile.contentInsights.educationalThemes} emptyMessage="No educational themes yet." />
        <SectionList title="Trust-Building Content" items={profile.contentInsights.trustBuilding} emptyMessage="No trust-building content yet." />
        <SectionList title="Conversion Content" items={profile.contentInsights.conversionContent} emptyMessage="No conversion content yet." />
        <SectionList title="Content to Avoid" items={profile.contentInsights.contentToAvoid} emptyMessage="No content warnings yet." />
      </div>

      <Card>
        <CardHeader><CardTitle>Messaging Guidance</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
          <div><p className="font-medium">Language that resonates</p><p className="text-muted-foreground">{profile.messagingGuidance.resonantLanguage.join(", ") || "Not available yet."}</p></div>
          <div><p className="font-medium">Words they trust</p><p className="text-muted-foreground">{profile.messagingGuidance.trustedWords.join(", ") || "Not available yet."}</p></div>
          <div><p className="font-medium">Language that turns them off</p><p className="text-muted-foreground">{profile.messagingGuidance.turnOffLanguage.join(", ") || "Not available yet."}</p></div>
          <div><p className="font-medium">Tone direction</p><p className="text-muted-foreground">{profile.messagingGuidance.toneDirection || "Not available yet."}</p></div>
          <div className="md:col-span-2"><p className="font-medium">Positioning notes</p><p className="text-muted-foreground">{profile.messagingGuidance.positioningNotes || "Not available yet."}</p></div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader><CardTitle>Agent Metadata</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 text-sm">
          <p><span className="font-medium">Generated by:</span> {formatGeneratedByLabel(profile.analysisRun.generatedBy)}</p>
          <p><span className="font-medium">Triggered by:</span> {profile.analysisRun.triggeredBy.replace("_", " ")}</p>
          <p><span className="font-medium">Source inputs:</span> {profile.analysisRun.sourceInputsUsed.join(", ") || "Not available"}</p>
          <p><span className="font-medium">Analysis date:</span> {new Date(profile.analysisRun.analysisDate).toLocaleString()}</p>
          <p><span className="font-medium">Human edited:</span> {profile.analysisRun.humanEdited ? "Yes" : "No"}</p>
          <p><span className="font-medium">Needs review:</span> {profile.analysisRun.needsReview ? "Yes" : "No"}</p>
          <p><span className="font-medium">Confidence level:</span> {profile.analysisRun.confidenceLevel}%</p>
          <p><span className="font-medium">Report version:</span> v{profile.analysisRun.runVersion}</p>
        </CardContent>
      </Card>
    </div>
  );
}
