import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Filter, 
  Plus, 
  X, 
  Sparkles, 
  Target, 
  Ban, 
  Globe2,
  Rss,
  Save,
  RefreshCw,
  Info
} from "lucide-react";

export default function IntelligenceFilters() {
  const [lookingFor, setLookingFor] = useState<string[]>([
    "creators",
    "influencers",
    "viral marketing",
    "brand controversies",
    "PR crises",
    "creator economy",
    "social media trends"
  ]);
  const [avoiding, setAvoiding] = useState<string[]>([
    "corporate earnings",
    "internal agency hires",
    "boring acquisitions",
    "unrelated finance news"
  ]);
  const [platforms, setPlatforms] = useState<string[]>([
    "Instagram",
    "TikTok",
    "YouTube",
    "LinkedIn",
    "X"
  ]);
  const [sourceTypes, setSourceTypes] = useState<string[]>([
    "rss",
    "youtube",
    "social",
    "web"
  ]);
  const [autoLearn, setAutoLearn] = useState(true);

  const [newTopic, setNewTopic] = useState("");
  const [newAvoid, setNewAvoid] = useState("");

  const addTopic = () => {
    if (newTopic.trim() && !lookingFor.includes(newTopic.trim())) {
      setLookingFor([...lookingFor, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const removeTopic = (topic: string) => {
    setLookingFor(lookingFor.filter(t => t !== topic));
  };

  const addAvoid = () => {
    if (newAvoid.trim() && !avoiding.includes(newAvoid.trim())) {
      setAvoiding([...avoiding, newAvoid.trim()]);
      setNewAvoid("");
    }
  };

  const removeAvoid = (topic: string) => {
    setAvoiding(avoiding.filter(t => t !== topic));
  };

  const togglePlatform = (platform: string) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  const toggleSourceType = (type: string) => {
    if (sourceTypes.includes(type)) {
      setSourceTypes(sourceTypes.filter(t => t !== type));
    } else {
      setSourceTypes([...sourceTypes, type]);
    }
  };

  const allPlatforms = ["Instagram", "TikTok", "YouTube", "LinkedIn", "X", "Facebook", "Threads"];
  const allSourceTypes = [
    { value: "rss", label: "RSS Feeds" },
    { value: "youtube", label: "YouTube" },
    { value: "social", label: "Social Media" },
    { value: "web", label: "Web Articles" },
    { value: "search", label: "Search Results" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Intelligence Filters</h1>
        <p className="text-muted-foreground">
          Tell KORA what to look for and what to avoid when gathering industry intelligence.
        </p>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">How Intelligence Filters Work</p>
              <p className="text-sm text-blue-700 mt-1">
                KORA uses these filters to search, score, and prioritize content from your configured sources. 
                Topics you're looking for boost relevance scores, while topics to avoid lower them. 
                This helps KORA surface the most valuable intelligence for your business.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What to Look For */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            What should KORA look for?
          </CardTitle>
          <CardDescription>
            Topics, keywords, and themes that are relevant to your business.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {lookingFor.map((topic) => (
              <Badge 
                key={topic} 
                variant="secondary"
                className="bg-green-100 text-green-700 hover:bg-green-200 py-1.5 px-3 text-sm"
              >
                {topic}
                <button 
                  onClick={() => removeTopic(topic)}
                  className="ml-2 hover:text-green-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a topic or keyword..."
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTopic()}
              className="max-w-sm"
            />
            <Button variant="outline" onClick={addTopic}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* What to Avoid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-500" />
            What should KORA avoid?
          </CardTitle>
          <CardDescription>
            Topics and keywords that aren't relevant or useful to you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {avoiding.map((topic) => (
              <Badge 
                key={topic} 
                variant="secondary"
                className="bg-red-100 text-red-700 hover:bg-red-200 py-1.5 px-3 text-sm"
              >
                {topic}
                <button 
                  onClick={() => removeAvoid(topic)}
                  className="ml-2 hover:text-red-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a topic to avoid..."
              value={newAvoid}
              onChange={(e) => setNewAvoid(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAvoid()}
              className="max-w-sm"
            />
            <Button variant="outline" onClick={addAvoid}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Platform Focus */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-blue-500" />
            Which platforms matter most?
          </CardTitle>
          <CardDescription>
            Select the social platforms KORA should prioritize when analyzing trends.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {allPlatforms.map((platform) => (
              <button
                key={platform}
                onClick={() => togglePlatform(platform)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  platforms.includes(platform)
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "bg-muted border-muted-foreground/20 text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Source Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rss className="h-5 w-5 text-orange-500" />
            Which source types matter most?
          </CardTitle>
          <CardDescription>
            Select the types of content sources KORA should monitor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {allSourceTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => toggleSourceType(type.value)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  sourceTypes.includes(type.value)
                    ? "bg-orange-100 border-orange-300 text-orange-700"
                    : "bg-muted border-muted-foreground/20 text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Auto-Learning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Automatic Learning
          </CardTitle>
          <CardDescription>
            Let KORA learn from your approvals and rejections to improve future recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="text-base">Auto-learn from approvals</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, KORA will adjust its filters based on what you approve or reject in Telegram.
              </p>
            </div>
            <Switch
              checked={autoLearn}
              onCheckedChange={setAutoLearn}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" className="text-muted-foreground">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Filters
        </Button>
      </div>
    </div>
  );
}
