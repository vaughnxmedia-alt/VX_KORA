import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMockAuth } from "../context/MockAuthContext";
import { useCampaignsStore } from "../store/CampaignsStore";
import { NewCampaignModal } from "../components/NewCampaignModal";
import { CampaignsLeftSidebar } from "../components/CampaignsLeftSidebar";
import { MOCK_ACCOUNTS } from "../mockAccounts";
import { Plus } from "lucide-react";
import type { Campaign } from "../types";

export function CampaignsIndexPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAdmin, users } = useMockAuth();
  const { visibleCampaignsForUser, campaigns } = useCampaignsStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(currentUser.orgId);

  const searchParams = new URLSearchParams(location.search);
  const fromBoardIdParam = searchParams.get("fromBoardId") ?? undefined;

  useEffect(() => {
    if (location.pathname.endsWith("/new") || fromBoardIdParam) {
      setModalOpen(true);
    }
  }, [location.pathname, fromBoardIdParam]);

  const visible = useMemo(
    () => visibleCampaignsForUser(currentUser),
    [visibleCampaignsForUser, currentUser]
  );

  const visibleForAccount = useMemo(
    () => visible.filter((c) => c.orgId === selectedAccountId),
    [visible, selectedAccountId]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return visibleForAccount;
    const q = searchQuery.toLowerCase();
    return visibleForAccount.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
    );
  }, [visibleForAccount, searchQuery]);

  const { createCampaign } = useCampaignsStore();

  const handleCreate = (params: {
    name: string;
    type: Campaign["type"];
    templateType: Campaign["templateType"];
    fromBoardId?: string;
    assignedUserIds: string[];
  }) => {
    const newCampaign = createCampaign({
      name: params.name,
      type: params.type,
      templateType: params.templateType,
      fromBoardId: params.fromBoardId,
      assignedUserIds: params.assignedUserIds,
      orgId: selectedAccountId,
    });
    navigate(`/dashboard/campaigns/${newCampaign.id}`);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const assigneeNames = (c: Campaign) => {
    return c.assignedUserIds
      .map((id) => users.find((u) => u.id === id)?.name ?? id)
      .filter(Boolean)
      .join(", ") || "—";
  };

  const timelineDisplay = (c: Campaign) => {
    const start = c.foundation.timelineStart;
    const end = c.foundation.timelineEnd;
    if (!start && !end) return "—";
    return [start, end].filter(Boolean).join(" – ");
  };

  return (
    <div className="flex h-full min-h-0">
      <CampaignsLeftSidebar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <div className="flex-1 flex flex-col min-w-0 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Plan, build, launch, and optimize campaigns using your Brand Blueprint + Get Inspired
              boards.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Account / Client" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_ACCOUNTS.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Owner / Assignees</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    {visible.length === 0
                      ? "No campaigns assigned to you. Ask an admin to add you to a campaign."
                      : visibleForAccount.length === 0
                        ? "No campaigns for this account."
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
                    <TableCell>{c.type}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.status}</Badge>
                    </TableCell>
                    <TableCell>{timelineDisplay(c)}</TableCell>
                    <TableCell className="text-muted-foreground">{assigneeNames(c)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.updatedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NewCampaignModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open && (location.pathname.endsWith("/new") || fromBoardIdParam)) {
            navigate("/dashboard/campaigns", { replace: true });
          }
        }}
        fromBoardId={fromBoardIdParam ?? null}
        onCreate={handleCreate}
        users={users}
      />
    </div>
  );
}
