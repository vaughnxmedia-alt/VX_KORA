# KORA Closed-Loop Intelligence System Architecture

## System model
- KORA remains a closed-loop system.
- The loop is not limited to audits; it operates around the larger business goal:
  help JahKnowsPR and its clients identify, understand, reach, convert, and retain the right target audience.
- Main site and Mission Control are two interfaces over one shared closed-loop intelligence domain.

## Intelligence hierarchy

```text
KORA Closed-Loop Intelligence System
├── Audience Intelligence
├── Buyer Intelligence
├── Offer Intelligence
├── Campaign Intelligence
├── Lead Magnet Intelligence
├── Revenue Intelligence
└── Learning Log System
```

## Intelligence goals

### 1) Audience Intelligence
- Understand who the audience is, where they are, what they care about, what pain points they have, and what signals show buying intent.

### 2) Buyer Intelligence
- Understand who actually takes action, submits forms, books sessions, purchases offers, subscribes, upgrades, or becomes a long-term client.

### 3) Offer Intelligence
- Understand which offers work for which audiences, which offers are ignored, which offers create paid trust, and which offers lead to long-term contracts.

### 4) Campaign Intelligence
- Understand which campaigns, platforms, ad sets, creatives, keywords, content angles, and messages attract the right audience.

### 5) Lead Magnet Intelligence
- Understand which lead magnets attract, qualify, and convert serious prospects.
- This includes free audits, paid strategy sessions, downloads, The Brief subscriptions, webinars, and other entry points.

### 6) Revenue Intelligence
- Understand which audience, offer, message, campaign, and lead magnet combinations create revenue.

### 7) Learning Log System
- Turn observed patterns into approved strategic learning that improves future recommendations.

## Core closed loop language

```text
Audience hypothesis
↓
Campaign, content, or lead magnet
↓
Audience response
↓
Lead capture
↓
Nurture or strategy session
↓
Offer presented
↓
Purchase or no purchase
↓
Revenue attribution
↓
Learning log
↓
Improved audience, message, offer, and campaign strategy
```

## Clarifications for system framing
- Free audit is a lead magnet and diagnostic data source.
- Strategy session is a paid trust builder and qualification step.
- Long-term client contract is the main business conversion goal.
- PDF audit reports and audio explanations are deliverables, not the center of the system.
- Original intake answers are valuable because they capture what the prospect believes before KORA analyzes them.
- KORA compares original belief, analyzed diagnosis, campaign behavior, buyer behavior, and revenue outcome.
- KORA learns from both buyers and non-buyers.
- KORA improves audience targeting, messaging, offer strategy, campaign strategy, and sales follow-up over time.

## Shared lifecycle statuses
- draft
- queued
- in_progress
- needs_review
- complete
- approved
- activation_ready
- synced
- failed

## Interface responsibilities

### Main site
- Capture audience hypotheses and lead magnet responses
- Collect intake/original answers and conversion signals
- Review strategic summaries and recommendations
- Approve or request revision
- Monitor activation readiness and outcomes

### Mission Control
- Work queue for run processing
- Source input inspection and quality control
- Agent output review and refinement
- Approval operations
- Campaign activation and sync logging
- Revenue and learning-log operations

## Shared workflow
1. Main site actions create/update intelligence records and queue analysis runs.
2. Mission Control queue reads queued runs.
3. Agents process signals across audience, buyer, offer, campaign, lead magnet, and revenue layers.
4. Runs move to `needs_review` or `complete`.
5. Approval can happen in either interface via one `approval_requests` record.
6. Learning decisions are promoted to the Learning Log System.
7. Recommendations are fed back into audience/message/offer/campaign strategy.

## Agent chain
- Audience Intelligence Agent: audience profile + segments + motivations
- Buyer Intelligence Agent: behavioral signals + conversion/no-conversion paths
- Offer Intelligence Agent: offer fit + trust-building + contract progression
- Campaign Intelligence Agent: platform/adset/creative/keyword/message performance
- Lead Magnet Intelligence Agent: entry-point quality and qualification outcomes
- Revenue Intelligence Agent: conversion and monetization attribution across journeys
- Learning Log Agent: approved strategic learning and enforcement

## Route surfaces

### Main site
- `/dashboard/audience`
- `/dashboard/audience/new`
- `/dashboard/audience/:audienceId`

### Mission Control
- `/audience/queue`
- `/audience/runs/:runId`

## Implemented data foundation (May 2026)

### New tables
- `industry_audience_clusters`: cross-client library of audience clusters grouped by `industry_key`.
- `client_offer_catalog`: canonical offer map per client so different checkout labels can still resolve to one `offer_id`.
- `buyer_purchase_attribution`: normalized purchase fact table linking buyer activity to client + industry + audience + offer.

### Extended analytics/revenue fields
- Added to `analytics_events` and `revenue_attribution`:
  - `industry_key`
  - `audience_cluster_id`
  - `adset_id`
  - `creative_id`
  - `buyer_key`

### Purchase pipeline contract
1. Frontend emits `purchase_complete` via `/api/kora/analytics/track`.
2. Endpoint writes full row to `analytics_events`.
3. Endpoint writes monetization record to `revenue_attribution`.
4. Endpoint writes normalized purchase fact to `buyer_purchase_attribution` with source linkage:
   - `source_event_id` -> `analytics_events.id`
   - `source_revenue_attribution_id` -> `revenue_attribution.id`

### Event payload contract (required + high-value optional)
- Required:
  - `event_name`, `site_id`, `brand_id`, `anonymous_visitor_id`, `session_id`
- Strongly recommended for buyer intelligence:
  - `client_id`, `industry_key`, `audience_cluster_id`, `offer_id`
- Recommended for ad optimization:
  - `campaign_id`, `adset_id`, `creative_id`, `funnel_id`
- Recommended for buyer stitching (non-PII):
  - `buyer_key` (stable hash/token), `metadata.order_id`, `metadata.payment_provider`
- Revenue:
  - `revenue_value`, `currency`

### URL param autofill now supported by tracker
- The frontend tracker auto-maps these query params into event payloads:
  - `client_id` or `k_client`
  - `industry_key` or `k_industry`
  - `audience_cluster_id` or `k_audience_cluster` or `k_audience`
  - `audience_pool_id` or `k_audience_pool`
  - `offer_id` or `k_offer`
  - `campaign_id` or `k_campaign`
  - `adset_id` or `k_adset`
  - `creative_id` or `k_creative`
  - `buyer_key` or `k_buyer`

### Ready-to-use rollup view
- `client_audience_offer_purchase_summary` answers:
  - Which audiences buy most for each client?
  - Which offers convert in each industry?
  - How many unique buyers and orders are attached to each segment?

