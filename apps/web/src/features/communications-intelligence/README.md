# Communications Intelligence

Concierge MVP for JahKnowsPR HQ + future `/portal` client surface.

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

Disabled workspace tabs (placeholders for later): Intelligence, Health Check, Messaging, Opportunities, Actions, Counsel Requests.

Client portal (`/portal`) is **not** built yet.
