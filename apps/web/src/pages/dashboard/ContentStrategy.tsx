/**
 * Content Strategy Page
 * 
 * Displays list of content strategies, allows generating new strategies,
 * and shows detailed view for individual strategies.
 */

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Calendar,
  Target,
  MessageSquare,
  Hash,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Layers,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import {
  useContentStrategies,
  useContentStrategy,
  useRequestContentStrategy,
  type ContentStrategyOutput,
  type ContentPillar,
} from "@/lib/kora";

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "X (Twitter)" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
];

const GOALS = [
  { id: "brand_awareness", label: "Brand Awareness" },
  { id: "engagement", label: "Engagement" },
  { id: "lead_generation", label: "Lead Generation" },
  { id: "sales", label: "Sales" },
  { id: "community_building", label: "Community Building" },
  { id: "thought_leadership", label: "Thought Leadership" },
];

const WINDOW_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
    case "processing":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Processing</Badge>;
    case "requested":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Requested</Badge>;
    case "failed":
      return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function StrategyCard({ 
  strategy, 
  onSelect 
}: { 
  strategy: ContentStrategyOutput; 
  onSelect: () => void;
}) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{strategy.title}</CardTitle>
            <CardDescription className="line-clamp-2">{strategy.summary}</CardDescription>
          </div>
          {getStatusBadge(strategy.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {strategy.platforms.map((platform) => (
            <Badge key={platform} variant="outline" className="text-xs">
              {platform}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{strategy.window.days} day window</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{format(new Date(strategy.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center text-primary text-sm font-medium">
          View details <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function StrategyDetail({ 
  strategy, 
  onBack 
}: { 
  strategy: ContentStrategyOutput; 
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
          <h1 className="text-2xl font-bold text-primary">{strategy.title}</h1>
          <p className="text-muted-foreground mt-1">{strategy.summary}</p>
        </div>
        {getStatusBadge(strategy.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Window</span>
            </div>
            <p className="text-lg font-semibold">{strategy.window.days} days</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Layers className="w-4 h-4" />
              <span className="text-sm">Platforms</span>
            </div>
            <p className="text-lg font-semibold">{strategy.platforms.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm">Goals</span>
            </div>
            <p className="text-lg font-semibold">{strategy.goals.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Posts/Week</span>
            </div>
            <p className="text-lg font-semibold">{strategy.post_cadence?.posts_per_week || "N/A"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pillars" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pillars">Content Pillars</TabsTrigger>
          <TabsTrigger value="themes">Weekly Themes</TabsTrigger>
          <TabsTrigger value="cadence">Post Cadence</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtag Strategy</TabsTrigger>
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
                  {strategy.content_pillars.map((pillar: ContentPillar) => (
                    <div key={pillar.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{pillar.name}</h4>
                        <Badge variant="secondary">{pillar.percentage}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{pillar.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {pillar.example_topics.map((topic, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Content pillars will appear here once the strategy is complete.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="themes">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Themes</CardTitle>
              <CardDescription>Planned themes for each week of your strategy</CardDescription>
            </CardHeader>
            <CardContent>
              {strategy.weekly_themes && strategy.weekly_themes.length > 0 ? (
                <div className="space-y-3">
                  {strategy.weekly_themes.map((week) => (
                    <div key={week.week_number} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        W{week.week_number}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{week.theme}</h4>
                        <p className="text-sm text-muted-foreground">Focus: {week.focus_pillar}</p>
                      </div>
                      {week.key_dates && week.key_dates.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {week.key_dates.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Weekly themes will appear here once the strategy is complete.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cadence">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Post Cadence</CardTitle>
              <CardDescription>Recommended posting schedule</CardDescription>
            </CardHeader>
            <CardContent>
              {strategy.post_cadence ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">Posts per Week: {strategy.post_cadence.posts_per_week}</h4>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Platform Breakdown</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(strategy.post_cadence.platform_breakdown).map(([platform, count]) => (
                        <Badge key={platform} variant="secondary">
                          {platform}: {count} posts
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Best Posting Times</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {Object.entries(strategy.post_cadence.best_posting_times).map(([platform, times]) => (
                        <div key={platform} className="p-3 border rounded-lg">
                          <p className="font-medium capitalize">{platform}</p>
                          <p className="text-sm text-muted-foreground">{times.join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Post cadence will appear here once the strategy is complete.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hashtags">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hashtag Strategy</CardTitle>
              <CardDescription>Recommended hashtags organized by category</CardDescription>
            </CardHeader>
            <CardContent>
              {strategy.hashtag_strategy ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Branded
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {strategy.hashtag_strategy.branded.map((tag, i) => (
                        <Badge key={i} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Industry
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {strategy.hashtag_strategy.industry.map((tag, i) => (
                        <Badge key={i} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Trending
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {strategy.hashtag_strategy.trending_relevant.map((tag, i) => (
                        <Badge key={i} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Niche
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {strategy.hashtag_strategy.niche.map((tag, i) => (
                        <Badge key={i} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Hashtag strategy will appear here once the strategy is complete.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {strategy.key_messages && strategy.key_messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Key Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {strategy.key_messages.map((message, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 mt-1 text-amber-500" />
                  <span>{message}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ContentStrategy() {
  const { strategies, loading, error, refetch } = useContentStrategies();
  const { request, loading: requesting } = useRequestContentStrategy();
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Generate form state
  const [windowDays, setWindowDays] = useState<number>(30);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [tone, setTone] = useState("");
  const [constraints, setConstraints] = useState("");

  const selectedStrategy = strategies.find((s) => s.id === selectedStrategyId);

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }
    if (selectedGoals.length === 0) {
      toast.error("Please select at least one goal");
      return;
    }

    try {
      await request({
        window: { days: windowDays as 7 | 14 | 30 | 60 | 90 },
        platforms: selectedPlatforms,
        goals: selectedGoals,
        tone: tone || undefined,
        constraints: constraints || undefined,
      });
      
      toast.success("Content strategy request submitted. KORA is generating your strategy.");
      setShowGenerateModal(false);
      resetForm();
      refetch();
    } catch (err) {
      toast.error("Failed to submit request. Please try again.");
    }
  };

  const resetForm = () => {
    setWindowDays(30);
    setSelectedPlatforms([]);
    setSelectedGoals([]);
    setTone("");
    setConstraints("");
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId)
        ? prev.filter((g) => g !== goalId)
        : [...prev, goalId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-lg font-medium">Failed to load content strategies</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (selectedStrategy) {
    return (
      <StrategyDetail 
        strategy={selectedStrategy} 
        onBack={() => setSelectedStrategyId(null)} 
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Content Strategy</h1>
          <p className="text-muted-foreground">
            Generate and manage AI-powered content strategies tailored to your brand.
          </p>
        </div>
        <Button onClick={() => setShowGenerateModal(true)} className="gap-2">
          <Sparkles className="w-4 h-4" />
          Generate Strategy
        </Button>
      </div>

      {strategies.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No content strategies yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Generate your first content strategy using KORA. It will create a customized plan based on your brand, audience, and goals.
            </p>
            <Button onClick={() => setShowGenerateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Generate Your First Strategy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              onSelect={() => setSelectedStrategyId(strategy.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Content Strategy
            </DialogTitle>
            <DialogDescription>
              KORA will create a personalized content strategy using your brand profile, target audience data, and industry insights.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Strategy Window</Label>
                <Select value={windowDays.toString()} onValueChange={(v) => setWindowDays(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {WINDOW_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How far ahead should the strategy plan for?
                </p>
              </div>

              <div className="space-y-2">
                <Label>Platforms</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((platform) => (
                    <div
                      key={platform.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`platform-${platform.id}`}
                        checked={selectedPlatforms.includes(platform.id)}
                        onCheckedChange={() => togglePlatform(platform.id)}
                      />
                      <Label
                        htmlFor={`platform-${platform.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {platform.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Goals</Label>
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`goal-${goal.id}`}
                        checked={selectedGoals.includes(goal.id)}
                        onCheckedChange={() => toggleGoal(goal.id)}
                      />
                      <Label
                        htmlFor={`goal-${goal.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {goal.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Brand Tone (optional)</Label>
                <Input
                  id="tone"
                  placeholder="e.g., Professional yet approachable"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="constraints">Constraints or Notes (optional)</Label>
                <Textarea
                  id="constraints"
                  placeholder="Any specific requirements, topics to avoid, or additional context..."
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={requesting} className="gap-2">
              {requesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Strategy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
