import React from "react";
import { Outlet } from "react-router-dom";
import { MockAuthProvider } from "./context/MockAuthContext";
import { CampaignsStoreProvider } from "./store/CampaignsStore";

/** Wraps campaigns routes with mock auth and in-memory campaign store. TODO: Replace with real auth + Supabase. */
export function CampaignsLayout() {
  return (
    <MockAuthProvider>
      <CampaignsStoreProvider>
        <Outlet />
      </CampaignsStoreProvider>
    </MockAuthProvider>
  );
}
