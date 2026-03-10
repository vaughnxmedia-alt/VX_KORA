import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Lightbulb, 
  Layers, 
  Calendar, 
  Hash, 
  ChevronRight,
  ArrowLeft,
  Clock,
  Download,
  Send,
  BarChart,
  Target,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface ContentPillar {
  name: string;
  purpose: string;
  examples: string[];
  percentage: number;
}

interface PostingSchedule {
  frequency: string;
  recommended_times: string[];
  consistency_tips: string[];
}

interface PlatformStrategy {
  platform: string;
  priority: "primary" | "secondary" | "experimental";
  content_style: string;
  audience_behavior: string;
  best_practices: string[];
}

interface ContentMix {
  educational: number;
  relatable: number;
  commentary: number;
  promotional: number;
}

interface ExampleWeekContent {
  day: string;
  content_type: string;
  topic_idea: string;
  pillar: string;
}

interface ContentStrategy {
  id: string;
  client_id: string;
  content_pillars: ContentPillar[];
  posting_schedule: PostingSchedule | null;
  platform_strategy: PlatformStrategy[];
  content_mix: ContentMix | null;
  example_week: ExampleWeekContent[];
  hashtag_bank: string[];
  growth_strategy: string | null;
  key_tips: string[];
  generated_at: string;
  created_at: string;
}

interface Client {
  id: string;
  business_name: string;
}

function StrategyCard({ 
  strategy, 
  clientName,
  onSelect 
}: { 
  strategy: ContentStrategy;
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
              Content Strategy with {strategy.content_pillars?.length || 0} Pillars
            </CardDescription>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
            Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {strategy.content_pillars?.slice(0, 3).map((pillar) => (
            <Badge key={pillar.name} variant="outline" className="text-xs">
              {pillar.name}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Layers className="w-4 h-4" />
            <span>{strategy.platform_strategy?.length || 0} Platforms</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{new Date(strategy.generated_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center text-primary text-sm font-medium">
          View Strategy <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function StrategyDetail({ 
  strategy, 
  clientName,
  onBack 
}: { 
  strategy: ContentStrategy;
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
          <p className="text-muted-foreground mt-1">Brand Strategy Document</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {strategy.growth_strategy && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-primary mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Growth Strategy</span>
            </div>
            <p className="text-muted-foreground">{strategy.growth_strategy}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="w-4 h-4" />
              <span className="text-sm">Pillars</span>
            </div>
            <p className="text-2xl font-semibold">{strategy.content_pillars?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm">Platforms</span>
            </div>
            <p className="text-2xl font-semibold">{strategy.platform_strategy?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Example Days</span>
            </div>
            <p className="text-2xl font-semibold">{strategy.example_week?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Hash className="w-4 h-4" />
              <span className="text-sm">Hashtags</span>
            </div>
            <p className="text-2xl font-semibold">{strategy.hashtag_bank?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pillars" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="pillars">Pillars</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="example">Example Week</TabsTrigger>
        </TabsList>

        <TabsContent value="pillars">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Pillars</CardTitle>
              <CardDescription>The foundational themes for your content strategy</CardDescription>
            </CardHeader>
            <CardContent>
              {strategy.content_pillars && strategy.content_pillars.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {strategy.content_pillars.map((pillar, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{pillar.name}</h4>
                        <Badge variant="secondary">{pillar.percentage}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{pillar.purpose}</p>
                      <div className="flex flex-wrap gap-1">
                        {pillar.examples?.map((example, j) => (
                          <Badge key={j} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No content pillars defined.</p>
              )}
            </CardContent>
          </Card>

          {strategy.content_mix && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-primary" />
                  Content Mix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-500">{strategy.content_mix.educational}%</p>
                    <p className="text-sm text-muted-foreground">Educational</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-500">{strategy.content_mix.relatable}%</p>
                    <p className="text-sm text-muted-foreground">Relatable</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-amber-500">{strategy.content_mix.commentary}%</p>
                    <p className="text-sm text-muted-foreground">Commentary</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-500">{strategy.content_mix.promotional}%</p>
                    <p className="text-sm text-muted-foreground">Promotional</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          <div className="grid gap-4 md:grid-cols-2">
            {strategy.posting_schedule && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Posting Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold mb-4">{strategy.posting_schedule.frequency}</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Best Times</p>
                      <div className="flex flex-wrap gap-1">
                        {strategy.posting_schedule.recommended_times?.map((time, i) => (
                          <Badge key={i} variant="outline">{time}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Consistency Tips</p>
                      <ul className="space-y-1">
                        {strategy.posting_schedule.consistency_tips?.map((tip, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                            <span className="text-primary">•</span> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {strategy.key_tips && strategy.key_tips.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    Key Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {strategy.key_tips.map((tip, i) => (
                      <li key={i} className="text-muted-foreground flex items-start gap-2">
                        <span className="text-amber-500 font-bold">{i + 1}.</span> {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {strategy.hashtag_bank && strategy.hashtag_bank.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hash className="w-5 h-5 text-primary" />
                  Hashtag Bank
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {strategy.hashtag_bank.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-sm">
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="platforms">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform Strategy</CardTitle>
              <CardDescription>Tailored approach for each platform</CardDescription>
            </CardHeader>
            <CardContent>
              {strategy.platform_strategy && strategy.platform_strategy.length > 0 ? (
                <div className="space-y-4">
                  {strategy.platform_strategy.map((platform, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{platform.platform}</h4>
                        <Badge 
                          variant={platform.priority === "primary" ? "default" : "secondary"}
                          className={platform.priority === "primary" ? "bg-primary" : ""}
                        >
                          {platform.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{platform.content_style}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-foreground">Audience behavior:</span>
                          <p className="text-muted-foreground">{platform.audience_behavior}</p>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Best practices:</span>
                          <ul className="text-muted-foreground">
                            {platform.best_practices?.slice(0, 3).map((practice, j) => (
                              <li key={j}>• {practice}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No platform strategy defined.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="example">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Example Week</CardTitle>
              <CardDescription>A sample week of content based on your strategy</CardDescription>
            </CardHeader>
            <CardContent>
              {strategy.example_week && strategy.example_week.length > 0 ? (
                <div className="space-y-3">
                  {strategy.example_week.map((day, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="w-20 text-center">
                        <p className="font-semibold text-primary">{day.day}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{day.topic_idea}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{day.content_type}</Badge>
                          <Badge variant="secondary" className="text-xs">{day.pillar}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No example week available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StrategyUpdates() {
  const { role, user } = useAuth();
  const [strategies, setStrategies] = useState<ContentStrategy[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [selectedStrategy, setSelectedStrategy] = useState<ContentStrategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
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
          .from("content_strategies")
          .select("*")
          .order("generated_at", { ascending: false });

        if (role !== "admin" && user?.id) {
          query = query.eq("client_id", user.id);
        }

        const { data: strategiesData, error } = await query;
        
        if (error) {
          console.error("Error fetching strategies:", error);
        } else {
          const parsed = (strategiesData || []).map((s: any) => ({
            ...s,
            content_pillars: typeof s.content_pillars === "string" ? JSON.parse(s.content_pillars) : s.content_pillars || [],
            posting_schedule: typeof s.posting_schedule === "string" ? JSON.parse(s.posting_schedule) : s.posting_schedule,
            platform_strategy: typeof s.platform_strategy === "string" ? JSON.parse(s.platform_strategy) : s.platform_strategy || [],
            content_mix: typeof s.content_mix === "string" ? JSON.parse(s.content_mix) : s.content_mix,
            example_week: typeof s.example_week === "string" ? JSON.parse(s.example_week) : s.example_week || [],
            hashtag_bank: typeof s.hashtag_bank === "string" ? JSON.parse(s.hashtag_bank) : s.hashtag_bank || [],
            key_tips: typeof s.key_tips === "string" ? JSON.parse(s.key_tips) : s.key_tips || [],
          }));
          setStrategies(parsed);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [role, user]);

  const filteredStrategies = selectedClientId === "all" 
    ? strategies 
    : strategies.filter(s => s.client_id === selectedClientId);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.business_name || clientId;
  };

  if (selectedStrategy) {
    return (
      <StrategyDetail 
        strategy={selectedStrategy}
        clientName={getClientName(selectedStrategy.client_id)}
        onBack={() => setSelectedStrategy(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            {role === "admin" ? "All Brand Strategies" : "Brand Strategy"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {role === "admin" 
              ? "View and manage all client content strategies generated via @koranewstrategy." 
              : "Your content strategy generated by KORA."}
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
      ) : filteredStrategies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Strategies Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {role === "admin" 
                ? "No content strategies have been generated yet. Strategies are created when users complete the @koranewstrategy intake via Telegram." 
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
          {filteredStrategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              clientName={getClientName(strategy.client_id)}
              onSelect={() => setSelectedStrategy(strategy)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
