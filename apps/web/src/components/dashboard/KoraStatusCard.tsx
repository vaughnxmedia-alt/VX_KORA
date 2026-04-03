/**
 * KORA Status Card
 * 
 * Displays the current status of KORA content strategies and campaigns
 * for the dashboard overview.
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Sparkles,
  Layers,
  Wand2,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { useContentStrategies, useCampaigns, type ContentStrategyOutput, type CampaignOutput } from "@/lib/kora";
import { format } from "date-fns";

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "processing":
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    case "requested":
      return <Clock className="w-4 h-4 text-amber-600" />;
    case "failed":
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    default:
      return null;
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "completed":
      return "Ready";
    case "processing":
      return "Processing";
    case "requested":
      return "Queued";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function KoraStatusCard() {
  const navigate = useNavigate();
  const { strategies, loading: strategiesLoading } = useContentStrategies();
  const { campaigns, loading: campaignsLoading } = useCampaigns();

  const loading = strategiesLoading || campaignsLoading;

  // Get the latest strategy and campaigns
  const latestStrategy = strategies[0];
  const recentCampaigns = campaigns.slice(0, 3);
  
  // Count by status
  const processingStrategies = strategies.filter((s) => s.status === "processing").length;
  const processingCampaigns = campaigns.filter((c) => c.status === "processing").length;
  const completedStrategies = strategies.filter((s) => s.status === "completed").length;
  const completedCampaigns = campaigns.filter((c) => c.status === "completed").length;

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            KORA AI Status
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner className="w-6 h-6" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            KORA AI Status
          </CardTitle>
          {(processingStrategies > 0 || processingCampaigns > 0) && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Content Strategies</span>
            </div>
            <p className="text-lg font-semibold">{completedStrategies}</p>
            {processingStrategies > 0 && (
              <p className="text-xs text-blue-600">{processingStrategies} processing</p>
            )}
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Wand2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Campaigns</span>
            </div>
            <p className="text-lg font-semibold">{completedCampaigns}</p>
            {processingCampaigns > 0 && (
              <p className="text-xs text-blue-600">{processingCampaigns} processing</p>
            )}
          </div>
        </div>

        {/* Latest Strategy */}
        {latestStrategy && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Latest Strategy</p>
            <div 
              className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/dashboard/creative-hub")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(latestStrategy.status)}
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {latestStrategy.title}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {getStatusText(latestStrategy.status)} • {format(new Date(latestStrategy.created_at), "MMM d")}
              </p>
            </div>
          </div>
        )}

        {/* Recent Campaigns */}
        {recentCampaigns.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent Campaigns</p>
            <div className="space-y-2">
              {recentCampaigns.map((campaign) => (
                <div 
                  key={campaign.id}
                  className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate("/dashboard/campaigns")}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(campaign.status)}
                    <span className="text-sm truncate max-w-[180px]">{campaign.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {campaign.platform}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {strategies.length === 0 && campaigns.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Generate your first content strategy to get started with KORA.
            </p>
            <Button 
              size="sm" 
              onClick={() => navigate("/dashboard/creative-hub")}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate Strategy
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        {(strategies.length > 0 || campaigns.length > 0) && (
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => navigate("/dashboard/creative-hub")}
            >
              <Layers className="w-4 h-4 mr-1" />
              Strategies
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => navigate("/dashboard/campaigns")}
            >
              <Wand2 className="w-4 h-4 mr-1" />
              Campaigns
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
