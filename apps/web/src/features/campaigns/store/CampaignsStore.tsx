import React, { createContext, useContext, useCallback, useState } from "react";
import type { Campaign } from "../types";
import type { MockUser } from "../context/MockAuthContext";
import { createDefaultCampaign } from "./defaultCampaign";

interface CampaignsStoreValue {
  campaigns: Campaign[];
  createCampaign: (params: {
    name: string;
    type: Campaign["type"];
    templateType: Campaign["templateType"];
    fromBoardId?: string;
    assignedUserIds: string[];
    orgId?: string;
  }) => Campaign;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  getCampaignById: (id: string) => Campaign | undefined;
  /** Campaigns visible to this user (admin: all; others: assigned only). */
  visibleCampaignsForUser: (user: MockUser) => Campaign[];
}

const CampaignsStoreContext = createContext<CampaignsStoreValue | null>(null);

/** Seed data for demo. TODO: Replace with Supabase fetch on load. */
const SEED_CAMPAIGNS: Campaign[] = (() => {
  const c1 = createDefaultCampaign({
    id: "campaign-1",
    name: "Q1 Brand Awareness",
    type: "Marketing",
    assignedUserIds: ["user-justice", "user-jocelyn", "user-intern"],
    templateType: "Full Campaign Launch Blueprint",
  });
  const c2 = createDefaultCampaign({
    id: "campaign-2",
    name: "Product Launch War Room",
    type: "Hybrid",
    assignedUserIds: ["user-justice", "user-vendor"],
    templateType: "Product Launch War Room",
  });
  const c3 = createDefaultCampaign({
    id: "campaign-3",
    name: "Content Series: Spring",
    type: "Marketing",
    assignedUserIds: ["user-intern"],
    templateType: "Content Series Builder",
  });
  const c4 = createDefaultCampaign({
    id: "campaign-4",
    name: "Client A Launch",
    type: "Marketing",
    orgId: "org-2",
    assignedUserIds: ["user-justice"],
    templateType: "Full Campaign Launch Blueprint",
  });
  return [c1, c2, c3, c4];
})();

export function CampaignsStoreProvider({ children }: { children: React.ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(SEED_CAMPAIGNS);

  const createCampaign = useCallback(
    (params: {
      name: string;
      type: Campaign["type"];
      templateType: Campaign["templateType"];
      fromBoardId?: string;
      assignedUserIds: string[];
      orgId?: string;
    }) => {
      const campaign = createDefaultCampaign({
        name: params.name,
        type: params.type,
        templateType: params.templateType,
        fromBoardId: params.fromBoardId,
        assignedUserIds: params.assignedUserIds,
        orgId: params.orgId,
      });
      setCampaigns((prev) => [...prev, campaign]);
      return campaign;
    },
    []
  );

  const updateCampaign = useCallback((id: string, updates: Partial<Campaign>) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...updates, updatedAt: new Date().toISOString() }
          : c
      )
    );
  }, []);

  const getCampaignById = useCallback(
    (id: string) => campaigns.find((c) => c.id === id),
    [campaigns]
  );

  const visibleCampaignsForUser = useCallback(
    (user: MockUser) => {
      const isAdmin = user.role === "admin";
      if (isAdmin) return [...campaigns].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return campaigns
        .filter((c) => c.assignedUserIds.includes(user.id))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    [campaigns]
  );

  const value: CampaignsStoreValue = {
    campaigns,
    createCampaign,
    updateCampaign,
    getCampaignById,
    visibleCampaignsForUser,
  };

  return (
    <CampaignsStoreContext.Provider value={value}>
      {children}
    </CampaignsStoreContext.Provider>
  );
}

export function useCampaignsStore(): CampaignsStoreValue {
  const ctx = useContext(CampaignsStoreContext);
  if (!ctx) throw new Error("useCampaignsStore must be used within CampaignsStoreProvider");
  return ctx;
}
