/**
 * Campaign Generator Page
 * 
 * Allows users to generate campaigns from content strategies using KORA.
 * Shows campaign history and details.
 */

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Plus,
  Calendar as CalendarIcon,
  Target,
  Image,
  Video,
  FileText,
  Clock,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Hash,
  MessageSquare,
  Megaphone,
  Link2,
} from "lucide-react";
import {
  useContentStrategies,
  useCampaigns,
  useCampaign,
  useRequestCampaign,
  SOCIAL_INTEGRATION_PROVIDERS,
  type CampaignOutput,
  type CampaignPost,
  type ContentStrategyOutput,
  type CampaignObjective,
  type CampaignLength,
} from "@/lib/kora";
import { CalendarConnectionsDialog } from "@/components/dashboard/CalendarConnectionsDialog";

const OBJECTIVES: { id: CampaignObjective; label: string; description: string }[] = [
  { id: "awareness", label: "Awareness", description: "Increase brand visibility and reach" },
  { id: "engagement", label: "Engagement", description: "Drive likes, comments, and shares" },
  { id: "traffic", label: "Traffic", description: "Send visitors to your website" },
  { id: "leads", label: "Leads", description: "Generate leads and sign-ups" },
  { id: "sales", label: "Sales", description: "Drive conversions and purchases" },
  { id: "retention", label: "Retention", description: "Keep existing customers engaged" },
];

const LENGTHS: { id: CampaignLength; label: string; posts: string }[] = [
  { id: "single_post", label: "Single Post", posts: "1 post" },
  { id: "series_3", label: "Mini Series", posts: "3 posts" },
  { id: "series_5", label: "Standard Series", posts: "5 posts" },
  { id: "series_7", label: "Extended Series", posts: "7 posts" },
  { id: "full_campaign", label: "Full Campaign", posts: "10+ posts" },
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

function getObjectiveLabel(objective: CampaignObjective): string {
  return OBJECTIVES.find((o) => o.id === objective)?.label || objective;
}

function CampaignCard({
  campaign,
  onSelect,
}: {
  campaign: CampaignOutput;
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
            <CardTitle className="text-lg font-semibold">{campaign.title}</CardTitle>
            <CardDescription>
              {campaign.platform} • {getObjectiveLabel(campaign.objective)}
            </CardDescription>
          </div>
          {getStatusBadge(campaign.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>{campaign.posts?.length || 0} posts</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{format(new Date(campaign.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center text-primary text-sm font-medium">
          View details <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function PostCard({ post, index }: { post: CampaignPost; index: number }) {
  const [copied, setCopied] = useState(false);

  const copyCaption = () => {
    navigator.clipboard.writeText(post.caption);
    setCopied(true);
    toast.success("Caption copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {index + 1}
            </div>
            <div>
              <CardTitle className="text-base">Post {index + 1}</CardTitle>
              {post.scheduled_date && (
                <CardDescription>
                  {format(new Date(post.scheduled_date), "EEEE, MMM d, yyyy")}
                </CardDescription>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={copyCaption}>
            <Copy className="w-4 h-4 mr-1" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Caption</Label>
          <p className="text-sm mt-1 whitespace-pre-wrap">{post.caption}</p>
        </div>

        {post.hashtags && post.hashtags.length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Hashtags
            </Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {post.hashtags.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {post.media_suggestions && post.media_suggestions.length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Image className="w-3 h-3" />
              Media Suggestions
            </Label>
            <div className="space-y-2 mt-1">
              {post.media_suggestions.map((media, i) => (
                <div key={i} className="p-2 bg-muted/50 rounded-md text-sm">
                  <div className="flex items-center gap-2">
                    {media.type === "video" || media.type === "reel" ? (
                      <Video className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Image className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium capitalize">{media.type}</span>
                    {media.dimensions && (
                      <Badge variant="secondary" className="text-xs">
                        {media.dimensions}
                      </Badge>
                    )}
                    {media.duration_seconds && (
                      <Badge variant="secondary" className="text-xs">
                        {media.duration_seconds}s
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{media.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {post.cta && (
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" />
              Call to Action
            </Label>
            <p className="text-sm mt-1">{post.cta}</p>
          </div>
        )}

        {post.notes && (
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Notes
            </Label>
            <p className="text-sm text-muted-foreground mt-1">{post.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CampaignDetail({
  campaign,
  onBack,
}: {
  campaign: CampaignOutput;
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
          <h1 className="text-2xl font-bold text-primary">{campaign.title}</h1>
          <p className="text-muted-foreground mt-1">
            {campaign.platform} • {getObjectiveLabel(campaign.objective)} • {campaign.posts?.length || 0} posts
          </p>
        </div>
        {getStatusBadge(campaign.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm">Objective</span>
            </div>
            <p className="text-lg font-semibold capitalize">{getObjectiveLabel(campaign.objective)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Megaphone className="w-4 h-4" />
              <span className="text-sm">Platform</span>
            </div>
            <p className="text-lg font-semibold capitalize">{campaign.platform}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm">Posts</span>
            </div>
            <p className="text-lg font-semibold">{campaign.posts?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {campaign.posts && campaign.posts.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Campaign Posts</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {campaign.posts.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
            <p className="text-muted-foreground">
              KORA is generating your campaign posts. This may take a few moments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CampaignGenerator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedStrategyId = searchParams.get("strategyId");

  const { strategies, loading: strategiesLoading } = useContentStrategies();
  const { campaigns, loading: campaignsLoading, error, refetch } = useCampaigns();
  const { request, loading: requesting } = useRequestCampaign();

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(!!preselectedStrategyId);
  const [connectionsOpen, setConnectionsOpen] = useState(false);

  // Form state
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(preselectedStrategyId || "");
  const [platform, setPlatform] = useState<string>("");
  const [objective, setObjective] = useState<CampaignObjective | "">("");
  const [cta, setCta] = useState("");
  const [length, setLength] = useState<CampaignLength | "">("");
  const [startDate, setStartDate] = useState<Date>();
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [offer, setOffer] = useState("");
  const [constraints, setConstraints] = useState("");

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  const completedStrategies = useMemo(
    () => strategies.filter((s) => s.status === "completed"),
    [strategies]
  );

  const handleGenerate = async () => {
    if (!selectedStrategyId) {
      toast.error("Please select a content strategy");
      return;
    }
    if (!platform) {
      toast.error("Please select a platform");
      return;
    }
    if (!objective) {
      toast.error("Please select an objective");
      return;
    }
    if (!cta) {
      toast.error("Please enter a call to action");
      return;
    }
    if (!length) {
      toast.error("Please select campaign length");
      return;
    }
    if (!startDate && !publishImmediately) {
      toast.error("Please select a start date or enable immediate publishing");
      return;
    }

    try {
      await request({
        content_strategy_id: selectedStrategyId,
        platform,
        objective: objective as CampaignObjective,
        cta,
        length: length as CampaignLength,
        timeline: {
          start_date: startDate ? format(startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
          publish_immediately: publishImmediately,
        },
        offer: offer || undefined,
        constraints: constraints || undefined,
      });

      toast.success("Campaign request submitted. KORA is generating your campaign.");
      setShowGenerateModal(false);
      resetForm();
      refetch();
    } catch (err) {
      toast.error("Failed to submit request. Please try again.");
    }
  };

  const resetForm = () => {
    setSelectedStrategyId("");
    setPlatform("");
    setObjective("");
    setCta("");
    setLength("");
    setStartDate(undefined);
    setPublishImmediately(false);
    setOffer("");
    setConstraints("");
  };

  const loading = strategiesLoading || campaignsLoading;

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
        <p className="text-lg font-medium">Failed to load campaigns</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (selectedCampaign) {
    return (
      <CampaignDetail
        campaign={selectedCampaign}
        onBack={() => setSelectedCampaignId(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      <CalendarConnectionsDialog open={connectionsOpen} onOpenChange={setConnectionsOpen} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Campaign Generator</h1>
          <p className="text-muted-foreground">
            Generate targeted campaigns from your content strategies using KORA.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConnectionsOpen(true)}
            className="gap-2"
          >
            <Link2 className="w-4 h-4" />
            Connections
          </Button>
          <Button
            onClick={() => setShowGenerateModal(true)}
            className="gap-2"
            disabled={completedStrategies.length === 0}
          >
            <Sparkles className="w-4 h-4" />
            Generate Campaign
          </Button>
        </div>
      </div>

      {completedStrategies.length === 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-900">No content strategies available</p>
              <p className="text-sm text-amber-700">
                You need a completed content strategy before generating campaigns.{" "}
                <Button
                  variant="link"
                  className="h-auto p-0 text-amber-700 underline"
                  onClick={() => navigate("/dashboard/content-strategy")}
                >
                  Generate a strategy first
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {campaigns.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Megaphone className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Generate your first campaign from a content strategy. KORA will create platform-specific content ready to publish.
            </p>
            <Button
              onClick={() => setShowGenerateModal(true)}
              className="gap-2"
              disabled={completedStrategies.length === 0}
            >
              <Plus className="w-4 h-4" />
              Generate Your First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onSelect={() => setSelectedCampaignId(campaign.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Campaign
            </DialogTitle>
            <DialogDescription>
              Create a targeted campaign from your content strategy. KORA will generate platform-specific posts ready for publishing.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Content Strategy</Label>
                <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {completedStrategies.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        {strategy.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the content strategy to base your campaign on.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOCIAL_INTEGRATION_PROVIDERS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Campaign Length</Label>
                  <Select value={length} onValueChange={(v) => setLength(v as CampaignLength)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select length" />
                    </SelectTrigger>
                    <SelectContent>
                      {LENGTHS.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.label} ({l.posts})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Objective</Label>
                <div className="grid grid-cols-2 gap-2">
                  {OBJECTIVES.map((obj) => (
                    <div
                      key={obj.id}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-colors",
                        objective === obj.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => setObjective(obj.id)}
                    >
                      <p className="font-medium text-sm">{obj.label}</p>
                      <p className="text-xs text-muted-foreground">{obj.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta">Call to Action</Label>
                <Input
                  id="cta"
                  placeholder="e.g., Shop now, Learn more, Sign up today"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <div className="flex items-center gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                        disabled={publishImmediately}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Switch
                    id="publish-immediately"
                    checked={publishImmediately}
                    onCheckedChange={setPublishImmediately}
                  />
                  <Label htmlFor="publish-immediately" className="text-sm font-normal">
                    Generate for immediate use (no scheduling)
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer">Special Offer (optional)</Label>
                <Input
                  id="offer"
                  placeholder="e.g., 20% off with code SAVE20"
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="constraints">Additional Notes (optional)</Label>
                <Textarea
                  id="constraints"
                  placeholder="Any specific requirements, topics to cover, or constraints..."
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
                  Generate Campaign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
