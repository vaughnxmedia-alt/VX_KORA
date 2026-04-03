import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CampaignsLeftSidebar } from "../components/CampaignsLeftSidebar";
import { Plus, Loader2, Sparkles } from "lucide-react";

type OperationalCampaign = {
  id: string;
  name: string;
  status: string;
  logistics_status: string;
  live_at: string | null;
  published_post_count: number;
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

export function CampaignsIndexPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["operational-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, logistics_status, live_at, published_post_count, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as OperationalCampaign[];
    },
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const q = searchQuery.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        c.logistics_status.toLowerCase().includes(q)
    );
  }, [campaigns, searchQuery]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="flex h-full min-h-0">
      <CampaignsLeftSidebar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <div className="flex-1 flex flex-col min-w-0 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Operational campaigns created from Creative Hub — linked to your calendar and logistics.
            </p>
          </div>
          <Button asChild>
            <Link to="/dashboard/creative-hub">
              <Plus className="w-4 h-4 mr-2" />
              Creative Hub
            </Link>
          </Button>
        </div>

        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Logistics</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground inline" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    {campaigns.length === 0
                      ? "No campaigns yet — convert a content plan in Creative Hub."
                      : "No campaigns match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/campaigns/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="capitalize">
                          {c.status}
                        </Badge>
                        {c.live_at && (
                          <Badge className="gap-0.5">
                            <Sparkles className="h-3 w-3" />
                            Live
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {logisticsLabel(c.logistics_status)}
                    </TableCell>
                    <TableCell>{c.published_post_count}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.updated_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
