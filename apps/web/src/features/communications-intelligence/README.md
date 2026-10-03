# Communications Intelligence

Concierge MVP for JahKnowsPR HQ + `/portal` client surface.

## Phase 1 — Schema

- Up: `apps/web/supabase/migrations/20261002200000_communications_intelligence_v1.sql`
- Down (manual): `apps/web/supabase/migrations/down/20261002200000_communications_intelligence_v1_down.sql`
- Verify: `apps/web/supabase/tests/communications_intelligence_v1_verify.sql`

Apply after HQ V1 (`is_hq_staff`, `hq_clients`).

### Tenant model

```
auth.users
    ↑
ci_organization_members (invite-only; status must be active)
    ↑
ci_organizations ──optional──► hq_clients
    ↑
ci_* domain tables + ci_admin_notes (staff only)
```

Portal access is **not** granted by `user_roles.role = client`.

## Phase 2 — Admin Organizations + Overview/Notes

HQ routes (staff only via `/hq` + `CiModuleGate`):

| Route | Page |
|-------|------|
| `/hq/intelligence` | Redirects to organizations |
| `/hq/intelligence/organizations` | Org list + create |
| `/hq/intelligence/organizations/:orgId` | Workspace Overview |
| `/hq/intelligence/organizations/:orgId/notes` | Internal notes |

## Phase 3 — Intelligence items + client portal summaries

| Route | Audience |
|-------|----------|
| `/hq/intelligence/organizations/:orgId/intelligence` | Admin create/edit/dismiss items |
| `/portal` | Invite-only members; read-only dashboard |

Portal cards and lists are derived from **active** `ci_intelligence_items` (`new`, `reviewed`, `in_progress`). Clients cannot write items.

## Phase 4 — Health Check + Messaging Library

| Route | Audience |
|-------|----------|
| `/hq/intelligence/organizations/:orgId/health` | Admin write assessments for six categories |
| `/hq/intelligence/organizations/:orgId/messaging` | Admin create/edit/hide approved language |
| `/portal/health` | Members, read-only |
| `/portal/messaging` | Members, published entries only |

Health scores are optional and staff-only. Clients see status, assessment, and recommended improvement.

Messaging statuses: Draft (staff only), Approved (portal), Archived (hidden). Internal notes live on `ci_admin_notes` so clients cannot read them.

## Phase 5 — Opportunity Center + Action Center

- Up: `apps/web/supabase/migrations/20261002240000_ci_opportunities_actions_phase5.sql`
- Verify: `apps/web/supabase/tests/ci_opportunities_actions_phase5_verify.sql`

| Route | Audience |
|-------|----------|
| `/hq/intelligence/organizations/:orgId/opportunities` | Admin create/edit opportunities; Create Action from an opportunity |
| `/hq/intelligence/organizations/:orgId/actions` | Admin create/edit actions; link to opportunities or intelligence |
| `/portal/opportunities` | Members; view + Interested/Passed only |
| `/portal/actions` | Members; view + Not Started / In Progress / Completed |

Clients cannot create opportunities or rewrite strategic fields. Action drafts from opportunities or intelligence require admin review before save.

## Phase 6 — Ask JahKnowsPR / Strategic Counsel

- Up: `apps/web/supabase/migrations/20261002250000_ci_counsel_requests_phase6.sql`
- Verify: `apps/web/supabase/tests/ci_counsel_requests_phase6_verify.sql`

Client-facing responses live in `ci_counsel_responses` and are readable only after status is `response_ready` or `closed`. Internal notes stay on `ci_admin_notes` (`entity_type = counsel_request`). Unpublished `response` columns on `ci_counsel_requests` are revoked from authenticated SELECT.

| Route | Audience |
|-------|----------|
| `/portal/counsel` | Members; list own organization's requests |
| `/portal/counsel/new` | Members; submit a request for counsel |
| `/portal/counsel/:requestId` | Members; view submission + published response |
| `/hq/intelligence/counsel` | Staff inbox with filters |
| `/hq/intelligence/counsel/:requestId` | Staff request detail |
| `/hq/intelligence/organizations/:orgId/counsel` | Staff org workspace tab |
| `/hq/intelligence/organizations/:orgId/counsel/:requestId` | Staff request detail in workspace |

Clients cannot update requests, read internal notes, or see a response before Response Ready. Related intelligence/opportunity/action IDs must belong to the same organization.

## Phase 7 — Onboarding, invites, and pilot polish

- Up: `apps/web/supabase/migrations/20261002225417_ci_onboarding_invites_phase7.sql`
- Verify: `apps/web/supabase/tests/ci_onboarding_invites_phase7_verify.sql`
- Security: `apps/web/supabase/tests/ci_onboarding_invites_phase7_security.sql`
- Pilot checklist: `COMMUNICATIONS_INTELLIGENCE_PILOT.md`
- Demo seed (manual, fictional): `apps/web/supabase/seeds/ci_demo_organization.sql`

| Route | Audience |
|-------|----------|
| `/hq/intelligence` | Staff operations dashboard |
| `/hq/intelligence/organizations/:orgId` | Staff invite / resend / revoke |
| `/join/:token` | Accept an organization invitation |
| `/portal/onboarding` | First-login organization profile |

Invitations store a SHA-256 token hash only, expire in 7 days, bind email + organization, and cannot be reused after accept. Staff copy the `/join/...` link; there is no dedicated CI mailer yet. Incomplete onboarding gates owners, admins, and members before the portal dashboard. Existing organizations were marked complete so current members are not blocked.

## Phase 8 — Pilot operations, reporting, and learning

- Up: `apps/web/supabase/migrations/20261003010000_ci_pilot_operations_phase8.sql`
- Verify: `apps/web/supabase/tests/ci_pilot_operations_phase8_verify.sql`
- Security: `apps/web/supabase/tests/ci_pilot_operations_phase8_security.sql`
- Learnings log: `COMMUNICATIONS_INTELLIGENCE_LEARNINGS.md`

| Route | Audience |
|-------|----------|
| `/hq/intelligence/pilot` | Staff pilot roster and follow-up |
| `/hq/intelligence/learning` | Staff-only product-learning counts |
| `/hq/intelligence/organizations/:orgId/pilot` | Enroll, milestones, activity, feedback |
| `/hq/intelligence/organizations/:orgId/outcomes` | Admin-managed communications outcomes |
| `/hq/intelligence/organizations/:orgId/reports` | Monthly summaries + weekly briefs |
| `/portal/progress` | This-month progress + documented wins |
| `/portal/reports` | Published monthly summaries |
| `/portal/reports/:reportId` | Published report + print/PDF layout |
| `/portal/feedback` | Short pilot feedback form |

Activity events are written only through `ci_record_activity` (12-hour dedupe). Clients cannot read event logs, unpublished reports, internal outcome notes, or the learning dashboard. No session replay, keystrokes, or device fingerprinting.
