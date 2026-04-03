import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Share2, Download, FileText } from "lucide-react";
import { useMockAuth } from "../context/MockAuthContext";
import { useCampaignsStore } from "../store/CampaignsStore";
import { CampaignRightPanel } from "../components/CampaignRightPanel";
import { TemplatesDrawer } from "../components/TemplatesDrawer";
import { AccessRestricted } from "./AccessRestricted";
import { FoundationTab } from "../components/tabs/FoundationTab";
import { PositioningTab } from "../components/tabs/PositioningTab";
import { AssetsTab } from "../components/tabs/AssetsTab";
import { DistributionTab } from "../components/tabs/DistributionTab";
import { TimelineTab } from "../components/tabs/TimelineTab";
import { BudgetTab } from "../components/tabs/BudgetTab";
import { AnalyticsTab } from "../components/tabs/AnalyticsTab";
import { OptimizationTab } from "../components/tabs/OptimizationTab";
import { PRTab } from "../components/tabs/PRTab";
import type { Campaign, CampaignStatus, WhiteboardConnection } from "../types";
import { OperationalCampaignDetail } from "../components/OperationalCampaignDetail";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_OPTIONS: CampaignStatus[] = [
  "Draft",
  "In Production",
  "Live",
  "Optimizing",
  "Completed",
];

function getFoundationConnections(fromBoardId?: string | null): WhiteboardConnection[] {
  if (!fromBoardId) return [];
  return [
    { id: "conn-1", title: "Messaging Notes", boardId: fromBoardId },
    { id: "conn-2", title: "Visual Moodboard", boardId: fromBoardId },
    { id: "conn-3", title: "Audience Research", boardId: fromBoardId },
  ];
}

export function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { currentUser, isAdmin } = useMockAuth();
  const { getCampaignById, updateCampaign } = useCampaignsStore();
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const isUuid = campaignId ? UUID_RE.test(campaignId) : false;

  const { data: opCampaign, isLoading: opLoading } = useQuery({
    queryKey: ["operational-campaign", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("id", campaignId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId && isUuid,
  });

  if (campaignId && isUuid && opLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (campaignId && isUuid && opCampaign) {
    return <OperationalCampaignDetail campaign={opCampaign} />;
  }

  if (campaignId && isUuid && !opCampaign) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Campaign not found.</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/dashboard/campaigns">Back to Campaigns</Link>
        </Button>
      </div>
    );
  }

  const campaign = campaignId ? getCampaignById(campaignId) : undefined;

  const canAccess =
    campaign &&
    (isAdmin || campaign.assignedUserIds.includes(currentUser.id));

  const connections = useMemo(
    () => getFoundationConnections(campaign?.fromBoardId),
    [campaign?.fromBoardId]
  );

  if (!campaignId || !campaign) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Campaign not found.</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/dashboard/campaigns">Back to Campaigns</Link>
        </Button>
      </div>
    );
  }

  if (!canAccess) {
    return <AccessRestricted />;
  }

  const handleUpdate = (updates: Partial<Campaign>) => {
    updateCampaign(campaign.id, updates);
  };

  const showPRTab = campaign.type === "PR" || campaign.type === "Hybrid";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="border-b bg-card px-6 py-4 shrink-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard/campaigns">Campaigns</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{campaign.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between gap-4 mt-3">
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <Select
                value={campaign.status}
                onValueChange={(v) => handleUpdate({ status: v as CampaignStatus })}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary">{campaign.status}</Badge>
            )}
            <TemplatesDrawer
              currentTemplate={campaign.templateType}
              onSelectTemplate={(t) => handleUpdate({ templateType: t })}
              trigger={
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Templates
                </Button>
              }
            />
            <Button variant="outline" size="sm" disabled title="Stub">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" disabled title="Stub">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 overflow-auto p-6">
          <p className="text-muted-foreground mb-4">
            Plan your next project. Use the tabs below to build and optimize your campaign.
          </p>
          <Tabs defaultValue="foundation" className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="foundation">Foundation</TabsTrigger>
              <TabsTrigger value="positioning">Positioning</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="optimization">Optimization</TabsTrigger>
              {showPRTab && <TabsTrigger value="pr">PR</TabsTrigger>}
            </TabsList>
            <TabsContent value="foundation" className="mt-4">
              <FoundationTab
                foundation={campaign.foundation}
                onChange={(f) => handleUpdate({ foundation: f })}
                connections={connections}
                fromBoardId={campaign.fromBoardId}
              />
            </TabsContent>
            <TabsContent value="positioning" className="mt-4">
              <PositioningTab
                positioning={campaign.positioning}
                onChange={(p) => handleUpdate({ positioning: p })}
              />
            </TabsContent>
            <TabsContent value="assets" className="mt-4">
              <AssetsTab
                assets={campaign.assets}
                onChange={(a) => handleUpdate({ assets: a })}
              />
            </TabsContent>
            <TabsContent value="distribution" className="mt-4">
              <DistributionTab
                channels={campaign.channels}
                onChange={(c) => handleUpdate({ channels: c })}
              />
            </TabsContent>
            <TabsContent value="timeline" className="mt-4">
              <TimelineTab
                timeline={campaign.timeline}
                onChange={(t) => handleUpdate({ timeline: t })}
              />
            </TabsContent>
            <TabsContent value="budget" className="mt-4">
              <BudgetTab
                budget={campaign.budget}
                onChange={(b) => handleUpdate({ budget: b })}
              />
            </TabsContent>
            <TabsContent value="analytics" className="mt-4">
              <AnalyticsTab
                analytics={campaign.analytics}
                onChange={(a) => handleUpdate({ analytics: a })}
              />
            </TabsContent>
            <TabsContent value="optimization" className="mt-4">
              <OptimizationTab
                optimization={campaign.optimization}
                onChange={(o) => handleUpdate({ optimization: o })}
              />
            </TabsContent>
            {showPRTab && (
              <TabsContent value="pr" className="mt-4">
                <PRTab pr={campaign.pr} onChange={(p) => handleUpdate({ pr: p })} />
              </TabsContent>
            )}
          </Tabs>
        </div>
        <CampaignRightPanel
          collapsed={rightPanelCollapsed}
          onCollapsedChange={setRightPanelCollapsed}
          connections={connections}
          fromBoardId={campaign.fromBoardId}
        />
      </div>
    </div>
  );
}
