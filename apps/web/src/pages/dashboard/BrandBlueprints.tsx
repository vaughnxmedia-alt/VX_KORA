import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Shield, 
  Target, 
  Heart, 
  MessageSquare, 
  Sparkles,
  Users,
  ChevronRight,
  ArrowLeft,
  Clock,
  Download,
  Send
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { PipelineProgressCard } from "@/components/dashboard/PipelineProgressCard";
import {
  ContentStrategyReportSections,
  type ContentStrategyRecord,
} from "@/components/dashboard/ContentStrategyReportSections";
import { fetchCustomerIdsWithBrandIdentity } from "@/lib/brandIdentityScope";

interface BrandBlueprint {
  id: string;
  client_id: string;
  business_name: string;
  business_type: string | null;
  mission: string | null;
  vision: string | null;
  core_values: { value: string; explanation: string }[];
  unique_value_proposition: string | null;
  brand_personality: string[];
  brand_voice: string | null;
  avoid_perceptions: string[];
  brand_story: string | null;
  positioning_statement: string | null;
  generated_at: string;
  created_at: string;
}

interface Client {
  id: string;
  business_name: string;
}

function BlueprintCard({ 
  blueprint, 
  onSelect 
}: { 
  blueprint: BrandBlueprint; 
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
            <CardTitle className="text-lg font-semibold">{blueprint.business_name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {blueprint.business_type || "Brand Identity"}
            </CardDescription>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
            Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {blueprint.brand_personality?.slice(0, 3).map((trait) => (
            <Badge key={trait} variant="outline" className="text-xs">
              {trait}
            </Badge>
          ))}
          {blueprint.brand_personality?.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{blueprint.brand_personality.length - 3} more
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            <span>{blueprint.core_values?.length || 0} Core Values</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{new Date(blueprint.generated_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center text-primary text-sm font-medium">
          View identity <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function BlueprintDetail({ 
  blueprint, 
  onBack 
}: { 
  blueprint: BrandBlueprint; 
  onBack: () => void;
}) {
  const [brandStrategy, setBrandStrategy] = useState<ContentStrategyRecord | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadStrategy() {
      setStrategyLoading(true);
      // Table exists in DB; regenerate Supabase types to drop `as any`.
      const { data, error } = await (supabase as any)
        .from("content_strategies")
        .select("*")
        .eq("client_id", blueprint.client_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Error loading content strategy:", error);
        setBrandStrategy(null);
      } else {
        setBrandStrategy((data as ContentStrategyRecord) ?? null);
      }
      setStrategyLoading(false);
    }
    void loadStrategy();
    return () => {
      cancelled = true;
    };
  }, [blueprint.client_id]);

  const hasStrategyContent = useMemo(() => {
    if (!brandStrategy) return false;
    return Boolean(
      brandStrategy.content_pillars?.length ||
        brandStrategy.growth_strategy ||
        (brandStrategy.key_tips?.length ?? 0) > 0 ||
        (brandStrategy.platform_strategy?.length ?? 0) > 0,
    );
  }, [brandStrategy]);

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
          <h1 className="text-2xl font-bold text-primary">{blueprint.business_name}</h1>
          <p className="text-muted-foreground mt-1">{blueprint.business_type}</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {blueprint.positioning_statement && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Target className="w-5 h-5" />
              <span className="font-semibold">Positioning Statement</span>
            </div>
            <p className="text-lg italic">{blueprint.positioning_statement}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="foundation" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="foundation">Foundation</TabsTrigger>
          <TabsTrigger value="values">Values</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
          <TabsTrigger value="story">Story</TabsTrigger>
        </TabsList>

        <TabsContent value="foundation">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {blueprint.mission || "No mission statement defined."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {blueprint.vision || "No vision statement defined."}
                </p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Unique Value Proposition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {blueprint.unique_value_proposition || "No UVP defined."}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="values">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Core Values</CardTitle>
              <CardDescription>The foundational principles guiding your brand</CardDescription>
            </CardHeader>
            <CardContent>
              {blueprint.core_values && blueprint.core_values.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {blueprint.core_values.map((cv, i) => (
                    <div key={i} className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-red-500" />
                        <h4 className="font-semibold">{cv.value}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{cv.explanation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No core values defined.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Brand Voice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {blueprint.brand_voice || "No brand voice defined."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Brand Personality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {blueprint.brand_personality?.map((trait) => (
                    <Badge key={trait} variant="secondary" className="text-sm">
                      {trait}
                    </Badge>
                  )) || <p className="text-muted-foreground">No personality traits defined.</p>}
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">What to Avoid</CardTitle>
                <CardDescription>Perceptions and associations to steer clear of</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {blueprint.avoid_perceptions?.map((avoid) => (
                    <Badge key={avoid} variant="outline" className="text-sm border-red-200 text-red-700 dark:border-red-800 dark:text-red-400">
                      {avoid}
                    </Badge>
                  )) || <p className="text-muted-foreground">No avoidances defined.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="story">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Brand Story
              </CardTitle>
              <CardDescription>Your origin story and brand narrative</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {blueprint.brand_story || "No brand story defined."}
                </p>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {strategyLoading ? (
        <p className="text-muted-foreground text-sm py-4">Loading brand strategy…</p>
      ) : hasStrategyContent && brandStrategy ? (
        <ContentStrategyReportSections strategy={brandStrategy} />
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
          Brand strategy details will appear here once the content strategy step has finished generating.
        </div>
      )}
    </div>
  );
}

export default function BrandBlueprints() {
  const { role, user } = useAuth();
  const [blueprints, setBlueprints] = useState<BrandBlueprint[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [selectedBlueprint, setSelectedBlueprint] = useState<BrandBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const fetchBlueprints = useCallback(async () => {
    setLoading(true);
    try {
      if (role === "admin") {
        const identityIds = await fetchCustomerIdsWithBrandIdentity();
        if (identityIds.length === 0) {
          setClients([]);
        } else {
          const { data: clientsData } = await supabase
            .from("customers")
            .select("id, business_name")
            .in("id", identityIds)
            .order("business_name");
          setClients(clientsData || []);
        }
      }

      let query = supabase
        .from("brand_blueprints")
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
          // Filter blueprints by all customer IDs belonging to this user
          query = (query as any).in("client_id", customerIds);
        } else {
          // No customer record found - return empty
          console.log("No customer records found for user:", user.id);
          setBlueprints([]);
          setLoading(false);
          return;
        }
      }

      const { data: blueprintsData, error } = await query;
      
      if (error) {
        console.error("Error fetching blueprints:", error);
      } else {
        const parsed = (blueprintsData || []).map((bp: any) => ({
          ...bp,
          core_values: typeof bp.core_values === "string" ? JSON.parse(bp.core_values) : bp.core_values || [],
          brand_personality: typeof bp.brand_personality === "string" ? JSON.parse(bp.brand_personality) : bp.brand_personality || [],
          avoid_perceptions: typeof bp.avoid_perceptions === "string" ? JSON.parse(bp.avoid_perceptions) : bp.avoid_perceptions || [],
        }));
        setBlueprints(parsed);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  const filteredBlueprints = selectedClientId === "all" 
    ? blueprints 
    : blueprints.filter(bp => bp.client_id === selectedClientId);

  if (selectedBlueprint) {
    return (
      <BlueprintDetail 
        blueprint={selectedBlueprint} 
        onBack={() => setSelectedBlueprint(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Progress Card - shows when research is in progress */}
      {role !== "admin" && customerId && (
        <PipelineProgressCard 
          customerId={customerId}
          onComplete={fetchBlueprints}
        />
      )}

      <div className="flex items-start justify-between">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            {role === "admin" ? "All brand identities" : "Brand identities"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {role === "admin" 
              ? "Brand Identity reports for each client (foundation + brand strategy when available)." 
              : "Your Brand Identity report from KORA—including strategy when it has been generated."}
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
      ) : filteredBlueprints.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No identities yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {role === "admin" 
                ? "No Brand Identity reports yet. They appear after intake and processing (Strategy Session data and/or Telegram)." 
                : "Complete intake and processing to generate your Brand Identity report. You can also start via Telegram (@koranewstrategy)."}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Send className="w-4 h-4" />
              <span>Type <code className="bg-muted px-1 rounded">@koranewstrategy</code> in Telegram</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBlueprints.map((blueprint) => (
            <BlueprintCard
              key={blueprint.id}
              blueprint={blueprint}
              onSelect={() => setSelectedBlueprint(blueprint)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
