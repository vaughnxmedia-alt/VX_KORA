# JahKnowsPR HQ (Version 1)

Private internal operations system for the strategic communications consultancy.

## Access

- URL: `/hq` (same Vite app as the public site; not a separate subdomain yet)
- Auth: existing Supabase Auth (`/auth?next=/hq`)
- Gate: `profiles.hq_role` in (`owner`, `strategist`, `creative`, `intern`) **or** dashboard `user_roles.role = admin`

## Apply database migration

Run in Supabase SQL editor (or `supabase db push`):

`apps/web/supabase/migrations/20261002180000_jahknowspr_hq_v1.sql`

This creates:

- `profiles.hq_role`
- `hq_leads`, `hq_clients`, `hq_tasks`, `hq_activity_log`
- `blog_posts.content_type`, `seo_title`, `seo_description`, `hq_client_id`
- RLS + `is_hq_staff()` / `get_hq_role()` / `hq_log_activity()`

Existing admins are auto-seeded as HQ **owner**.

## Modules

| Module | Route |
|--------|--------|
| Today | `/hq` |
| CRM | `/hq/crm`, `/hq/crm/:id` |
| Clients | `/hq/clients`, `/hq/clients/:id` |
| Tasks | `/hq/tasks` |
| Journeys | `/hq/journeys`, `/hq/journeys/:id` |
| Journey templates | `/hq/settings/services` and `/hq/journeys/templates` (Owner edits; other staff can preview) |
| Client portal | `/hq/intelligence`, `/hq/intelligence/organizations`, `/hq/intelligence/pilot`, `/hq/intelligence/learning`, `/hq/intelligence/counsel`, org tabs for intelligence, health, messaging, opportunities, actions, counsel, outcomes, reports, and pilot |
| The Brief | `/hq/content`, `/hq/content/:id` — SPAM Report is a filter. PR Court is hidden for now. `/insights/spam-report` and `/the-brief/:slug` stay in place |
| Internal case studies | `/hq/case-studies` — drafts tied to engagements. Public `/work` is unchanged |
| Team | `/hq/team` (Owner) |
| Settings | `/hq/settings` |

## Content → public site

Published posts use `blog_posts` with `publication_status = live` and `content_type`:

- `the-brief` → `/the-brief` (and `/insights/the-brief`)
- `spam-report` → `/insights/spam-report`
- `pr-court` → `/insights/pr-court` (hidden from public listings and the HQ library for now; the URL still resolves)
- `case-study` / `firm-news` → listed in HQ; public surfaces expand later

Drafts remain private via existing blog RLS (staff-only for unpublished).

## Client journeys

Apply `apps/web/supabase/migrations/20261015220000_hq_client_journeys.sql`, then `20261015233000_hq_journey_template_builder.sql`.

One `hq_clients` row stays the permanent client. Each service is an `hq_engagements` row copied from a versioned journey template. Services live in `hq_services`. Owners edit master templates from Settings → Services. If a template already has engagements, the next edit forks a new version and leaves the open journey unchanged. Stages, tasks, deliverables, assignment rules, due-date rules, and completion requirements are stored on the template and copied onto the engagement.

Owners approve stages and deliverables. Strategists open, customize, and reassign engagements. Other HQ staff see only engagements they own, are assigned to, or have tasks on. Notes, communications, and the activity log cannot be edited or deleted. Templates are archived, not deleted.

Opening an engagement creates an internal case-study draft. Closing the engagement requires that draft. Copying it writes an unpublished `blog_posts` row. Public `/work` is still the static case-study site.

Apply `apps/web/supabase/migrations/20261016010000_hq_operating_reset.sql` after the journey migrations.

## Not in V1

Media contacts, pitches, placements, revenue, invoicing.
