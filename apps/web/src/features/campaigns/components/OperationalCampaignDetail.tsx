import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export type OperationalCampaignRow = {
  id: string;
  name: string;
  objective: string | null;
  primary_platform: string | null;
  status: string;
  logistics_status: string;
  live_at: string | null;
  first_published_at: string | null;
  published_post_count: number;
  scheduled_post_count: number;
  content_plan_id: string | null;
  created_at: string;
  updated_at: string;
};

function logisticsLabel(status: string) {
  switch (status) {
    case "created":
      return "Created";
    case "needed":
      return "Needed";
    case "not_needed_now":
      return "Not needed right now";
    default:
      return "Not set";
  }
}

interface OperationalCampaignDetailProps {
  campaign: OperationalCampaignRow;
}

export function OperationalCampaignDetail({ campaign }: OperationalCampaignDetailProps) {
  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
        <p className="text-muted-foreground mt-1">Operational campaign (Supabase)</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="capitalize">
          {campaign.status}
        </Badge>
        <Badge variant="outline">Logistics: {logisticsLabel(campaign.logistics_status)}</Badge>
        {campaign.live_at && (
          <Badge className="gap-1">
            <Sparkles className="h-3 w-3" />
            Live
          </Badge>
        )}
        <Badge variant="outline">Published: {campaign.published_post_count}</Badge>
        <Badge variant="outline">Scheduled rows: {campaign.scheduled_post_count}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
          <CardDescription>Objective and platform from Creative Hub conversion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Objective: </span>
            {campaign.objective || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Primary platform: </span>
            {campaign.primary_platform || "—"}
          </div>
          {campaign.first_published_at && (
            <div>
              <span className="text-muted-foreground">First published: </span>
              {new Date(campaign.first_published_at).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to={`/dashboard/logistics?campaignId=${encodeURIComponent(campaign.id)}`}>
            Logistics
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/dashboard/calendar">Content calendar</Link>
        </Button>
        {campaign.content_plan_id && (
          <Button variant="outline" asChild>
            <Link to="/dashboard/creative-hub">Creative Hub</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
