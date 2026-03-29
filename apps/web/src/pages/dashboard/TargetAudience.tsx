import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Target, 
  Brain, 
  Globe,
  UserCircle,
  Layers,
  ChevronRight,
  ArrowLeft,
  Clock,
  Download,
  Send,
  Sparkles,
  Heart,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { PipelineProgressCard } from "@/components/dashboard/PipelineProgressCard";

interface AudienceSegment {
  name: string;
  age_range: string;
  examples: string[];
  pain_point: string;
  why_they_follow: string;
}

interface PlatformBreakdown {
  platform: string;
  age_range: string;
  audience_description: string;
  what_they_want: string;
  content_style: string;
}

interface PersonalityType {
  name: string;
  age_range: string;
  platforms: string[];
  what_they_want: string;
}

interface ContentAttraction {
  type: string;
  examples: string[];
}

interface AudienceAnalysis {
  id: string;
  client_id: string;
  overview: string | null;
  primary_platforms: string[];
  core_positioning: string | null;
  audience_psychology: string | null;
  audience_segments: AudienceSegment[];
  platform_breakdown: PlatformBreakdown[];
  audience_motivations: string[];
  content_types_that_attract: ContentAttraction[];
  personality_types: PersonalityType[];
  audience_flywheel: string | null;
  generated_at: string;
  created_at: string;
}

interface Client {
  id: string;
  business_name: string;
}

function AnalysisCard({ 
  analysis, 
  clientName,
  onSelect 
}: { 
  analysis: AudienceAnalysis;
  clientName: string;
  onSelect: () => void;
}) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-800"
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{clientName}</CardTitle>
            <CardDescription className="line-clamp-2">
              {analysis.core_positioning || "Target Audience Analysis"}
            </CardDescription>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
            Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {analysis.primary_platforms?.slice(0, 4).map((platform) => (
            <Badge key={platform} variant="outline" className="text-xs">
              {platform}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{analysis.audience_segments?.length || 0} Segments</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{new Date(analysis.generated_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center text-primary text-sm font-medium">
          View Analysis <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function AnalysisDetail({ 
  analysis, 
  clientName,
  onBack 
}: { 
  analysis: AudienceAnalysis;
  clientName: string;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{clientName}</h1>
          <p className="text-muted-foreground mt-1">Target Audience Analysis</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {analysis.overview && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Target className="w-5 h-5" />
              <span className="font-semibold">Overview</span>
            </div>
            <p className="text-muted-foreground">{analysis.overview}</p>
            {analysis.core_positioning && (
              <p className="mt-3 text-sm italic border-l-2 border-primary pl-3">
                {analysis.core_positioning}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Segments</span>
            </div>
            <p className="text-2xl font-semibold">{analysis.audience_segments?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Globe className="w-4 h-4" />
              <span className="text-sm">Platforms</span>
            </div>
            <p className="text-2xl font-semibold">{analysis.primary_platforms?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <UserCircle className="w-4 h-4" />
              <span className="text-sm">Personas</span>
            </div>
            <p className="text-2xl font-semibold">{analysis.personality_types?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Heart className="w-4 h-4" />
              <span className="text-sm">Motivations</span>
            </div>
            <p className="text-2xl font-semibold">{analysis.audience_motivations?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="segments" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="psychology">Psychology</TabsTrigger>
        </TabsList>

        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audience Segments</CardTitle>
              <CardDescription>The key groups that make up your target audience</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.audience_segments && analysis.audience_segments.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {analysis.audience_segments.map((segment, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{segment.name}</h4>
                        <Badge variant="secondary">{segment.age_range}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">Pain Point:</span> {segment.pain_point}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">Why they follow:</span> {segment.why_they_follow}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {segment.examples?.map((example, j) => (
                          <Badge key={j} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No audience segments defined.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform Breakdown</CardTitle>
              <CardDescription>How your audience behaves on each platform</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.platform_breakdown && analysis.platform_breakdown.length > 0 ? (
                <div className="space-y-4">
                  {analysis.platform_breakdown.map((platform, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{platform.platform}</h4>
                        <Badge variant="secondary">{platform.age_range}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{platform.audience_description}</p>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <span className="font-medium text-foreground">They want:</span>
                          <p className="text-muted-foreground">{platform.what_they_want}</p>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Content style:</span>
                          <p className="text-muted-foreground">{platform.content_style}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No platform breakdown available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personas">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personality Types</CardTitle>
              <CardDescription>The different personas within your audience</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.personality_types && analysis.personality_types.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {analysis.personality_types.map((persona, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <UserCircle className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold">{persona.name}</h4>
                      </div>
                      <Badge variant="outline" className="mb-2">{persona.age_range}</Badge>
                      <p className="text-sm text-muted-foreground mb-3">{persona.what_they_want}</p>
                      <div className="flex flex-wrap gap-1">
                        {persona.platforms?.map((platform, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No personality types defined.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="psychology">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Audience Psychology
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {analysis.audience_psychology || "No psychology insights available."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Motivations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.audience_motivations && analysis.audience_motivations.length > 0 ? (
                  <ul className="space-y-2">
                    {analysis.audience_motivations.map((motivation, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <Sparkles className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
                        <span>{motivation}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No motivations defined.</p>
                )}
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  Audience Flywheel
                </CardTitle>
                <CardDescription>How platforms feed into each other to build your authority</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {analysis.audience_flywheel || "No flywheel strategy defined."}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {analysis.content_types_that_attract && analysis.content_types_that_attract.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Content That Attracts This Audience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {analysis.content_types_that_attract.map((content, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">{content.type}</h4>
                  <ul className="space-y-1">
                    {content.examples?.map((example, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex items-start gap-1">
                        <span className="text-primary">•</span> {example}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function TargetAudience() {
  const { role, user } = useAuth();
  const [analyses, setAnalyses] = useState<AudienceAnalysis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [selectedAnalysis, setSelectedAnalysis] = useState<AudienceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    try {
      if (role === "admin") {
        const { data: clientsData } = await supabase
          .from("customers")
          .select("id, business_name")
          .order("business_name");
        setClients(clientsData || []);
      }

      let query = supabase
        .from("audience_analyses")
        .select("*")
        .order("generated_at", { ascending: false });

      // For non-admin users, find their customer record(s) first
      if (role !== "admin" && user?.id) {
        // Get all customer IDs for this auth user (user may have multiple customer records)
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id);
        
        if (customerError) {
          console.error("Error fetching customer records:", customerError);
        }
        
        if (customerData && customerData.length > 0) {
          const customerIds = customerData.map(c => c.id);
          // Use the first one for pipeline progress tracking
          setCustomerId(customerIds[0]);
          // Filter analyses by all customer IDs belonging to this user
          query = query.in("client_id", customerIds);
        } else {
          // No customer record found - return empty
          console.log("No customer records found for user:", user.id);
          setAnalyses([]);
          setLoading(false);
          return;
        }
      }

      const { data: analysesData, error } = await query;
      
      if (error) {
        console.error("Error fetching analyses:", error);
      } else {
        const parsed = (analysesData || []).map((a: any) => ({
          ...a,
          primary_platforms: typeof a.primary_platforms === "string" ? JSON.parse(a.primary_platforms) : a.primary_platforms || [],
          audience_segments: typeof a.audience_segments === "string" ? JSON.parse(a.audience_segments) : a.audience_segments || [],
          platform_breakdown: typeof a.platform_breakdown === "string" ? JSON.parse(a.platform_breakdown) : a.platform_breakdown || [],
          audience_motivations: typeof a.audience_motivations === "string" ? JSON.parse(a.audience_motivations) : a.audience_motivations || [],
          content_types_that_attract: typeof a.content_types_that_attract === "string" ? JSON.parse(a.content_types_that_attract) : a.content_types_that_attract || [],
          personality_types: typeof a.personality_types === "string" ? JSON.parse(a.personality_types) : a.personality_types || [],
        }));
        setAnalyses(parsed);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const filteredAnalyses = selectedClientId === "all" 
    ? analyses 
    : analyses.filter(a => a.client_id === selectedClientId);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.business_name || clientId;
  };

  if (selectedAnalysis) {
    return (
      <AnalysisDetail 
        analysis={selectedAnalysis}
        clientName={getClientName(selectedAnalysis.client_id)}
        onBack={() => setSelectedAnalysis(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Progress Card - shows when research is in progress */}
      {role !== "admin" && customerId && (
        <PipelineProgressCard 
          customerId={customerId}
          onComplete={fetchAnalyses}
        />
      )}

      <div className="flex items-start justify-between">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            {role === "admin" ? "All Audience Analyses" : "Target Audience Report"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {role === "admin" 
              ? "View and manage all client target audience analyses generated via @koranewstrategy." 
              : "Your target audience analysis generated by KORA."}
          </p>
        </div>
        {role === "admin" && clients.length > 0 && (
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.business_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-2/3"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAnalyses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Audience Analyses Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {role === "admin" 
                ? "No audience analyses have been generated yet. Analyses are created when users complete the @koranewstrategy intake via Telegram." 
                : "Start your brand journey by completing the KORA intake process. Message @koranewstrategy on Telegram to get started."}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Send className="w-4 h-4" />
              <span>Type <code className="bg-muted px-1 rounded">@koranewstrategy</code> in Telegram</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAnalyses.map((analysis) => (
            <AnalysisCard
              key={analysis.id}
              analysis={analysis}
              clientName={getClientName(analysis.client_id)}
              onSelect={() => setSelectedAnalysis(analysis)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
