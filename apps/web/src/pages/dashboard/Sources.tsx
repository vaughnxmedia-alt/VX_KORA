import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  MoreHorizontal, 
  Plus, 
  Search, 
  Filter,
  ExternalLink,
  Play,
  BookOpen,
  Users,
  Youtube,
  Instagram,
  Linkedin,
  Globe,
  Rss,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
  Sparkles,
  Send,
  Database,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============================================================================
// TYPES
// ============================================================================

type SourceClass = "read" | "watch" | "follow";
type SourceStatus = "suggested" | "reviewing" | "approved" | "trusted" | "subscribed" | "rejected" | "inactive";
type TranscriptStatus = "pending" | "fetching" | "available" | "transcribing" | "transcribed" | "unavailable" | "error";

interface IntelSource {
  id: string;
  tenant_id: string;
  source_class: SourceClass;
  source_type: string;
  platform: string | null;
  name: string;
  url: string | null;
  handle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  author_name: string | null;
  relevance_score: number | null;
  viability_score: number | null;
  credibility_score: number | null;
  overall_score: number | null;
  status: SourceStatus;
  route_to_telegram: boolean;
  route_to_rag: boolean;
  is_active: boolean;
  last_checked_at: string | null;
  items_ingested: number;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  has_transcript?: boolean;
}

interface YouTubeVideo {
  id: string;
  tenant_id: string;
  video_id: string;
  url: string;
  title: string;
  channel_title: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  view_count: number | null;
  transcript_status: TranscriptStatus;
  processing_status: string;
  overall_score: number | null;
  route_to_telegram: boolean;
  route_to_rag: boolean;
  is_approved: boolean;
  created_at: string;
}

interface FilterState {
  tenant: string;
  sourceClass: string;
  sourceType: string;
  platform: string;
  status: string;
  transcriptStatus: string;
  search: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SOURCE_CLASS_CONFIG = {
  read: { label: "Read", icon: BookOpen, color: "bg-blue-100 text-blue-800" },
  watch: { label: "Watch", icon: Play, color: "bg-purple-100 text-purple-800" },
  follow: { label: "Follow", icon: Users, color: "bg-green-100 text-green-800" },
};

const STATUS_CONFIG: Record<SourceStatus, { label: string; color: string }> = {
  suggested: { label: "Suggested", color: "bg-gray-100 text-gray-800" },
  reviewing: { label: "Reviewing", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", color: "bg-green-100 text-green-800" },
  trusted: { label: "Trusted", color: "bg-purple-100 text-purple-800" },
  subscribed: { label: "Subscribed", color: "bg-blue-100 text-blue-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  inactive: { label: "Inactive", color: "bg-gray-100 text-gray-600" },
};

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  instagram: Instagram,
  linkedin: Linkedin,
  web: Globe,
  rss: Rss,
};

const TRANSCRIPT_STATUS_CONFIG: Record<TranscriptStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-gray-500" },
  fetching: { label: "Fetching", color: "text-yellow-500" },
  available: { label: "Available", color: "text-green-500" },
  transcribing: { label: "Transcribing", color: "text-blue-500" },
  transcribed: { label: "Transcribed", color: "text-green-500" },
  unavailable: { label: "Unavailable", color: "text-red-500" },
  error: { label: "Error", color: "text-red-500" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function Sources() {
  const [sources, setSources] = useState<IntelSource[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sources");
  const [filters, setFilters] = useState<FilterState>({
    tenant: "all",
    sourceClass: "all",
    sourceType: "all",
    platform: "all",
    status: "all",
    transcriptStatus: "all",
    search: "",
  });
  const [selectedSource, setSelectedSource] = useState<IntelSource | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const { toast } = useToast();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchTenants = useCallback(async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, business_name")
      .order("business_name");

    if (!error && data) {
      setTenants(data.map(t => ({ id: t.id, name: t.business_name || "Unknown" })));
    }
  }, []);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    
    try {
      let query = supabase
        .from("intel_sources")
        .select("*")
        .order("overall_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters.tenant !== "all") {
        query = query.eq("tenant_id", filters.tenant);
      }
      if (filters.sourceClass !== "all") {
        query = query.eq("source_class", filters.sourceClass);
      }
      if (filters.sourceType !== "all") {
        query = query.eq("source_type", filters.sourceType);
      }
      if (filters.platform !== "all") {
        query = query.eq("platform", filters.platform);
      }
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query.limit(200);

      if (error) {
        console.error("Error fetching sources:", error);
        toast({
          title: "Error",
          description: "Failed to load sources",
          variant: "destructive",
        });
      } else {
        setSources(data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const fetchVideos = useCallback(async () => {
    let query = supabase
      .from("intel_youtube_videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters.tenant !== "all") {
      query = query.eq("tenant_id", filters.tenant);
    }
    if (filters.transcriptStatus !== "all") {
      query = query.eq("transcript_status", filters.transcriptStatus);
    }

    const { data, error } = await query.limit(200);

    if (!error && data) {
      setVideos(data);
    }
  }, [filters]);

  useEffect(() => {
    fetchTenants();
    fetchSources();
    fetchVideos();
  }, [fetchTenants, fetchSources, fetchVideos]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const updateSourceStatus = async (sourceId: string, status: SourceStatus) => {
    const { error } = await supabase
      .from("intel_sources")
      .update({ 
        status,
        approved_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", sourceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update source status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Source ${status}`,
      });
      fetchSources();
    }
  };

  const updateSourceRouting = async (
    sourceId: string, 
    field: "route_to_telegram" | "route_to_rag", 
    value: boolean
  ) => {
    const { error } = await supabase
      .from("intel_sources")
      .update({ [field]: value })
      .eq("id", sourceId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update routing",
        variant: "destructive",
      });
    } else {
      fetchSources();
    }
  };

  const runDiscovery = async () => {
    if (filters.tenant === "all") {
      toast({
        title: "Select a tenant",
        description: "Please select a specific tenant to run discovery",
        variant: "destructive",
      });
      return;
    }

    setIsDiscovering(true);
    
    // Mock discovery - in production this would call the Source Discovery Agent
    setTimeout(() => {
      toast({
        title: "Discovery Started",
        description: "Source discovery is running in the background",
      });
      setIsDiscovering(false);
    }, 2000);
  };

  const addSourceManually = async () => {
    if (!newSourceUrl.trim()) return;

    // Detect source type from URL
    let sourceClass: SourceClass = "read";
    let sourceType = "article";
    let platform: string | null = "web";

    if (newSourceUrl.includes("youtube.com") || newSourceUrl.includes("youtu.be")) {
      sourceClass = "watch";
      sourceType = "youtube_video";
      platform = "youtube";
    } else if (newSourceUrl.includes("instagram.com")) {
      sourceClass = "follow";
      sourceType = "instagram_account";
      platform = "instagram";
    } else if (newSourceUrl.includes("linkedin.com")) {
      sourceClass = "follow";
      sourceType = "linkedin_creator";
      platform = "linkedin";
    } else if (newSourceUrl.includes("tiktok.com")) {
      sourceClass = "follow";
      sourceType = "tiktok_account";
      platform = "tiktok";
    }

    const { error } = await supabase
      .from("intel_sources")
      .insert({
        tenant_id: filters.tenant === "all" ? tenants[0]?.id : filters.tenant,
        source_class: sourceClass,
        source_type: sourceType,
        platform,
        name: new URL(newSourceUrl).hostname,
        url: newSourceUrl,
        discovered_by: "manual",
        status: "suggested",
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add source",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Source added successfully",
      });
      setNewSourceUrl("");
      setIsAddSourceOpen(false);
      fetchSources();
    }
  };

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredSources = sources.filter(source => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        source.name.toLowerCase().includes(search) ||
        source.url?.toLowerCase().includes(search) ||
        source.handle?.toLowerCase().includes(search) ||
        source.description?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const filteredVideos = videos.filter(video => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        video.title.toLowerCase().includes(search) ||
        video.channel_title?.toLowerCase().includes(search) ||
        video.video_id.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // ============================================================================
  // STATS
  // ============================================================================

  const stats = {
    total: sources.length,
    trusted: sources.filter(s => s.status === "trusted").length,
    approved: sources.filter(s => s.status === "approved" || s.status === "subscribed").length,
    suggested: sources.filter(s => s.status === "suggested").length,
    withTranscript: videos.filter(v => 
      v.transcript_status === "available" || v.transcript_status === "transcribed"
    ).length,
    routedToRag: sources.filter(s => s.route_to_rag).length,
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const renderScoreBar = (score: number | null) => {
    if (score === null) return <span className="text-gray-400">-</span>;
    const percentage = Math.round(score * 100);
    return (
      <div className="flex items-center gap-2">
        <Progress value={percentage} className="w-16 h-2" />
        <span className="text-xs text-muted-foreground">{percentage}%</span>
      </div>
    );
  };

  const renderPlatformIcon = (platform: string | null) => {
    if (!platform) return <Globe className="h-4 w-4" />;
    const Icon = PLATFORM_ICONS[platform.toLowerCase()] || Globe;
    return <Icon className="h-4 w-4" />;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Intelligence Sources</h1>
          <p className="text-muted-foreground">
            Manage READ, WATCH, and FOLLOW sources for tenant intelligence
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={runDiscovery}
            disabled={isDiscovering || filters.tenant === "all"}
          >
            {isDiscovering ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Run Discovery
          </Button>
          <Button onClick={() => setIsAddSourceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Sources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{stats.trusted}</div>
            <div className="text-xs text-muted-foreground">Trusted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-xs text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.suggested}</div>
            <div className="text-xs text-muted-foreground">Suggested</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.withTranscript}</div>
            <div className="text-xs text-muted-foreground">With Transcript</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-indigo-600">{stats.routedToRag}</div>
            <div className="text-xs text-muted-foreground">Feeding RAG</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={filters.tenant}
                onValueChange={(v) => setFilters({ ...filters, tenant: v })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select
              value={filters.sourceClass}
              onValueChange={(v) => setFilters({ ...filters, sourceClass: v })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="watch">Watch</SelectItem>
                <SelectItem value="follow">Follow</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.platform}
              onValueChange={(v) => setFilters({ ...filters, platform: v })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="rss">RSS</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(v) => setFilters({ ...filters, status: v })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="suggested">Suggested</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="trusted">Trusted</SelectItem>
                <SelectItem value="subscribed">Subscribed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.transcriptStatus}
              onValueChange={(v) => setFilters({ ...filters, transcriptStatus: v })}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Transcript" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transcripts</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="transcribed">Transcribed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sources..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({
                tenant: "all",
                sourceClass: "all",
                sourceType: "all",
                platform: "all",
                status: "all",
                transcriptStatus: "all",
                search: "",
              })}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sources" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Sources ({filteredSources.length})
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Youtube className="h-4 w-4" />
            YouTube Videos ({filteredVideos.length})
          </TabsTrigger>
        </TabsList>

        {/* Sources Tab */}
        <TabsContent value="sources">
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : filteredSources.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No sources found. Try adjusting filters or run discovery.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">Class</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Relevance</TableHead>
                      <TableHead>Viability</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Telegram</TableHead>
                      <TableHead className="text-center">RAG</TableHead>
                      <TableHead>Last Checked</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSources.map((source) => {
                      const classConfig = SOURCE_CLASS_CONFIG[source.source_class];
                      const ClassIcon = classConfig.icon;
                      const statusConfig = STATUS_CONFIG[source.status];

                      return (
                        <TableRow key={source.id}>
                          <TableCell>
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${classConfig.color}`}>
                              <ClassIcon className="h-4 w-4" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{source.name}</div>
                              {source.url && (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                >
                                  {source.url.substring(0, 40)}...
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              {source.handle && (
                                <div className="text-xs text-muted-foreground">{source.handle}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {renderPlatformIcon(source.platform)}
                              <span className="text-sm capitalize">{source.platform || "Web"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{renderScoreBar(source.relevance_score)}</TableCell>
                          <TableCell>{renderScoreBar(source.viability_score)}</TableCell>
                          <TableCell>
                            <Badge className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={source.route_to_telegram}
                              onCheckedChange={(v) => updateSourceRouting(source.id, "route_to_telegram", v)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={source.route_to_rag}
                              onCheckedChange={(v) => updateSourceRouting(source.id, "route_to_rag", v)}
                            />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {source.last_checked_at
                              ? format(new Date(source.last_checked_at), "MMM d, HH:mm")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedSource(source);
                                  setIsDetailOpen(true);
                                }}>
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {source.status !== "trusted" && source.status !== "approved" && (
                                  <DropdownMenuItem onClick={() => updateSourceStatus(source.id, "approved")}>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                {source.status === "approved" && (
                                  <DropdownMenuItem onClick={() => updateSourceStatus(source.id, "trusted")}>
                                    <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                                    Promote to Trusted
                                  </DropdownMenuItem>
                                )}
                                {source.status !== "rejected" && (
                                  <DropdownMenuItem onClick={() => updateSourceStatus(source.id, "rejected")}>
                                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                    Reject
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Refresh Now
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos">
          <Card>
            <CardContent className="pt-4">
              {filteredVideos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No YouTube videos found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thumbnail</TableHead>
                      <TableHead>Video</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Transcript</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="text-center">Telegram</TableHead>
                      <TableHead className="text-center">RAG</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVideos.map((video) => {
                      const transcriptConfig = TRANSCRIPT_STATUS_CONFIG[video.transcript_status];

                      return (
                        <TableRow key={video.id}>
                          <TableCell>
                            {video.thumbnail_url ? (
                              <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="w-24 h-14 object-cover rounded"
                              />
                            ) : (
                              <div className="w-24 h-14 bg-muted rounded flex items-center justify-center">
                                <Youtube className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 max-w-xs">
                              <div className="font-medium line-clamp-2">{video.title}</div>
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                              >
                                Watch on YouTube
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{video.channel_title || "-"}</TableCell>
                          <TableCell className="text-sm">{formatDuration(video.duration_seconds)}</TableCell>
                          <TableCell className="text-sm">
                            {video.view_count?.toLocaleString() || "-"}
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1 text-sm ${transcriptConfig.color}`}>
                              {video.transcript_status === "available" || video.transcript_status === "transcribed" ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : video.transcript_status === "fetching" || video.transcript_status === "transcribing" ? (
                                <Clock className="h-4 w-4" />
                              ) : video.transcript_status === "error" || video.transcript_status === "unavailable" ? (
                                <AlertCircle className="h-4 w-4" />
                              ) : (
                                <Clock className="h-4 w-4" />
                              )}
                              {transcriptConfig.label}
                            </div>
                          </TableCell>
                          <TableCell>{renderScoreBar(video.overall_score)}</TableCell>
                          <TableCell className="text-center">
                            {video.route_to_telegram ? (
                              <Send className="h-4 w-4 text-blue-500 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {video.route_to_rag ? (
                              <Database className="h-4 w-4 text-indigo-500 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Transcript
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  View Summary
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reprocess
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Source Dialog */}
      <Dialog open={isAddSourceOpen} onOpenChange={setIsAddSourceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Source URL</Label>
              <Input
                id="url"
                placeholder="https://youtube.com/watch?v=..."
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Paste a YouTube video, channel, blog, or social media URL
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={addSourceManually} disabled={!newSourceUrl.trim()}>
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Source Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedSource?.name}</DialogTitle>
          </DialogHeader>
          {selectedSource && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Class</Label>
                  <div className="font-medium capitalize">{selectedSource.source_class}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <div className="font-medium">{selectedSource.source_type.replace(/_/g, " ")}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Platform</Label>
                  <div className="font-medium capitalize">{selectedSource.platform || "Web"}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={STATUS_CONFIG[selectedSource.status].color}>
                    {STATUS_CONFIG[selectedSource.status].label}
                  </Badge>
                </div>
              </div>

              {selectedSource.url && (
                <div>
                  <Label className="text-xs text-muted-foreground">URL</Label>
                  <a
                    href={selectedSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline break-all"
                  >
                    {selectedSource.url}
                  </a>
                </div>
              )}

              {selectedSource.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm">{selectedSource.description}</p>
                </div>
              )}

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Relevance</Label>
                  {renderScoreBar(selectedSource.relevance_score)}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Viability</Label>
                  {renderScoreBar(selectedSource.viability_score)}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Credibility</Label>
                  {renderScoreBar(selectedSource.credibility_score)}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Overall</Label>
                  {renderScoreBar(selectedSource.overall_score)}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="detail-telegram"
                    checked={selectedSource.route_to_telegram}
                    onCheckedChange={(v) => updateSourceRouting(selectedSource.id, "route_to_telegram", v)}
                  />
                  <Label htmlFor="detail-telegram">Route to Telegram</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="detail-rag"
                    checked={selectedSource.route_to_rag}
                    onCheckedChange={(v) => updateSourceRouting(selectedSource.id, "route_to_rag", v)}
                  />
                  <Label htmlFor="detail-rag">Route to RAG</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            {selectedSource && selectedSource.status === "suggested" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    updateSourceStatus(selectedSource.id, "rejected");
                    setIsDetailOpen(false);
                  }}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    updateSourceStatus(selectedSource.id, "approved");
                    setIsDetailOpen(false);
                  }}
                >
                  Approve
                </Button>
              </>
            )}
            {selectedSource && selectedSource.status === "approved" && (
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  updateSourceStatus(selectedSource.id, "trusted");
                  setIsDetailOpen(false);
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Promote to Trusted
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
