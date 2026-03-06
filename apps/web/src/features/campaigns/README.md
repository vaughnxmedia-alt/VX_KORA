# Campaigns feature (UI/UX only)

Campaigns turn “Get Inspired” boards into structured Marketing or PR campaigns. This module is **UI/UX only**: no Supabase, no real API calls. All data is in-memory and typed for later backend integration.

## Components

- **CampaignsLayout** – Wraps campaigns routes with `MockAuthProvider` and `CampaignsStoreProvider`.
- **CampaignsIndexPage** – List of campaigns (role-filtered), left sidebar search/filter, admin campaign switcher, “New Campaign” button and modal.
- **CampaignDetailPage** – Breadcrumb, status pill (admin: editable), Templates / Share / Export (stubs), collapsible right panel, tabbed workflow (Foundation through PR).
- **NewCampaignModal** – 4-step creation: template, optional board import, assign team, confirm. On Create, adds campaign to store and navigates to detail.
- **CampaignRightPanel** – Collapsible inspector with Connections and Notes tabs; shows whiteboard links and “Linked from board: [boardId]” when `fromBoardId` is set.
- **TemplatesDrawer** – Lists campaign template types; selecting updates `templateType` and shows template checklist copy (UI only).
- **CampaignsLeftSidebar** – Search input and filter buttons with “Drag Me” tooltips (no drag logic).
- **AccessRestricted** – Shown when a non-admin user opens a campaign they are not assigned to.
- **Tab components** (under `components/tabs/`) – FoundationTab, PositioningTab, AssetsTab, DistributionTab, TimelineTab, BudgetTab, AnalyticsTab, OptimizationTab, PRTab. Each edits campaign slice via store `updateCampaign`.

## Mock auth

- **Context:** `src/features/campaigns/context/MockAuthContext.tsx`
- **Roles:** `admin` | `intern` | `vendor` | `client`
- **Current user:** `currentUser: { id, name, orgId, role }`; `setCurrentUser(user)` to switch.
- **Mock users:** Justice (admin), Jocelyn (admin), Example Intern (intern), Example Vendor (vendor).
- **Behavior:** Admin sees all campaigns and campaign switcher; non-admin sees only campaigns where `campaign.assignedUserIds` includes `currentUser.id`. Access to a campaign detail is gated: non-admin + not assigned → Access restricted page.

## Store usage

- **Context:** `src/features/campaigns/store/CampaignsStore.tsx`
- **State:** In-memory `campaigns` array (seed data for demo).
- **API:** `createCampaign(params)`, `updateCampaign(id, updates)`, `getCampaignById(id)`, `visibleCampaignsForUser(user)`.
- No persistence, no localStorage. TODO: Replace with Supabase (campaigns table, RLS, real-time if needed).

## Routing

- `/dashboard/campaigns` – Index (list + New Campaign modal).
- `/dashboard/campaigns/new` – Same index with New Campaign modal open; supports `?fromBoardId=...`.
- `/dashboard/campaigns/:campaignId` – Campaign detail (tabs + right panel).

“Turn Into Campaign” on a Get Inspired board navigates to `/dashboard/campaigns/new?fromBoardId=<boardId>` and opens the modal with that board pre-filled; creating a campaign sets `fromBoardId` and stub whiteboard connections.

## Where to integrate Supabase later

1. **Auth** – Replace `MockAuthProvider` / `useMockAuth()` with real auth (e.g. Supabase Auth + profiles). Keep `role` and `orgId` for RLS and visibility.
2. **CampaignsStore** – On mount, fetch campaigns (e.g. `supabase.from('campaigns').select(...).eq('org_id', orgId)`). Replace `createCampaign` / `updateCampaign` with Supabase insert/update; optionally subscribe to realtime.
3. **Campaign detail** – Load campaign by id from Supabase (or from store populated by route loader). Persist tab edits with `updateCampaign` calling Supabase.
4. **NewCampaignModal** – Step 2 “Import from board”: replace mock board list with real boards from Supabase (e.g. `inspired_boards`). Step 3 assignees: replace `users` with org members from Supabase.
5. **Templates drawer** – Persist `templateType` on campaign; optional “template checklist” and recommendations from DB.
6. **Whiteboard connections** – Replace stub `WhiteboardConnection[]` with real links to Get Inspired boards (e.g. `campaign_boards` or `from_board_id` + related content).
7. **Analytics / Connectors** – Replace disabled Google Analytics, Meta, CRM buttons with real OAuth and sync jobs.
8. **Share / Export** – Implement share permissions and export (e.g. PDF/PNG) using real campaign data.

## Types

All campaign and tab types live in `src/features/campaigns/types.ts`: `Campaign`, `CampaignStatus`, `CampaignType`, `CampaignTemplateType`, channel and tab payloads. Use these for Supabase table shapes and API contracts.
