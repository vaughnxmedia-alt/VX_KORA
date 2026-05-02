# KORA First-Party Analytics Setup

## What this is

KORA first-party analytics is JahKnowsPR's in-house analytics system for website, content, funnel, offer, audit, and revenue signals. It replaces external web analytics dependency as the primary source of insight.

External platforms remain optional connectors.

## Core flow

Frontend tracking (`src/lib/kora-analytics.ts`)
→ internal API (`/api/kora/analytics/track`)
→ Supabase tables (`analytics_*`, `content_performance`, `funnel_*`, `revenue_attribution`)
→ rollup API (`/api/kora/analytics/rollup`)
→ Gemini findings API (`/api/kora/analytics/generate-findings`)
→ `kora_analytics_findings`
→ JahKnowsPR Dashboard Analytics + Mission Control review

## Environment variables

Required:

- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `GEMINI_API_KEY` (for findings generation)

Optional:

- `KORA_ANALYTICS_MODEL` (default: `gemini-1.5-pro`)
- `VITE_KORA_PUBLIC_URL` (if/when separate KORA public domain is live)

## Database tables

Migration: `apps/web/supabase/migrations/20260501150500_kora_first_party_analytics.sql`

Creates:

- `analytics_events`
- `analytics_sessions`
- `analytics_daily_rollups`
- `content_performance`
- `funnel_reports`
- `funnel_steps`
- `revenue_attribution`
- `kora_analytics_findings`

## Tracking implementation

Utility file: `apps/web/src/lib/kora-analytics.ts`

Key helpers:

- `trackEvent(eventName, properties)`
- `trackPageView(...)`
- `trackBlogView(...)`
- `trackAuditPageView(...)`
- `trackStrategySessionView(...)`
- `trackBrandBlueprintView(...)`
- `trackCtaClick(...)`
- `trackFormStart(...)`
- `trackFormSubmit(...)`
- `trackAuditRequestSubmit(...)`
- `trackBookingClick(...)`
- `trackCheckoutStart(...)`
- `trackPurchaseComplete(...)`
- `trackNewsletterSignup(...)`
- `trackVideoPlay(...)`
- `trackOutboundLinkClick(...)`

Privacy behaviors:

- anonymous visitor/session IDs by default
- metadata sanitization and size limits
- no sensitive fields (passwords, payment card data, private notes, message bodies)
- non-blocking delivery (`sendBeacon` + keepalive fallback)
- fail-safe (site continues if tracking fails)

## API endpoints

- `POST /api/kora/analytics/track`
  - validates allowed events
  - sanitizes payload/metadata
  - writes `analytics_events`
  - upserts `analytics_sessions`
  - writes `revenue_attribution` on purchase events

- `POST /api/kora/analytics/rollup`
  - aggregates events into `analytics_daily_rollups`
  - updates `content_performance`
  - rebuilds `funnel_reports`/`funnel_steps`

- `POST /api/kora/analytics/generate-findings`
  - fetches rollups/content/funnels/revenue
  - sends compact context to Gemini
  - validates structured JSON response
  - stores `kora_analytics_findings`

## Mission Control integration

Operational review page:

- `apps/mission-control/src/pages/core/AnalyticsInsights.tsx`

This page surfaces recent analytics events, rollups, and KORA findings before/alongside polished dashboard presentation.

## JahKnowsPR dashboard integration

Main UI:

- `apps/web/src/pages/dashboard/Analytics.tsx`

Primary experience is KORA first-party analytics. Includes:

- status
- executive snapshot
- funnel overview
- page/content performance
- revenue attribution
- KORA findings with review action
- optional external analytics connector status section
- mock fallback when no real data exists

## Local testing

1. Run app normally.
2. Visit public pages (`/`, `/the-brief/*`, `/free-audit`, `/strategy-session`, `/brand-blueprint`).
3. Trigger tracked actions (CTA clicks, starts/submits, booking/payment flow steps).
4. Verify `analytics_events` and `analytics_sessions` rows in Supabase.
5. Run rollup:
   - call `POST /api/kora/analytics/rollup` (browser fetch, Postman, or curl)
6. Generate findings:
   - call `POST /api/kora/analytics/generate-findings`
7. Verify dashboard:
   - `/dashboard/analytics`
8. Verify Mission Control:
   - `core/analytics` route

## Future optional connectors (not core)

- Meta
- TikTok
- LinkedIn
- X

These should augment KORA analytics, not replace it.
