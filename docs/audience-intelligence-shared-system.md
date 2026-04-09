# Audience Intelligence Shared System Architecture

## System model
- Main site and Mission Control are two interfaces over one shared audience intelligence domain.
- Shared source records: audience profiles, segments, personas, psychology, messaging, platform activation specs, analysis runs, approvals, and custom versions.

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
- Request analysis runs
- Create custom audiences
- Review strategic summaries
- Approve or request revision
- Monitor activation readiness

### Mission Control
- Work queue for run processing
- Source input inspection
- Agent output review and refinement
- Approval operations
- Platform activation and sync logging

## Shared workflow
1. Main site action creates/updates `audience_profiles` and creates `audience_analysis_runs(status=queued)`.
2. Mission Control queue reads queued runs.
3. Agents process and write outputs into shared records and new/updated `custom_audience_versions`.
4. Runs move to `needs_review` or `complete`.
5. Approval can happen in either interface via one `approval_requests` record.
6. Activation specs progress through `activation_ready -> synced` with logs.

## Agent chain
- Audience Intelligence Agent: core profile + segments + personas
- Psychology Agent: motivations/fears/trust/barriers
- Messaging Agent: hooks, language, CTA, positioning
- Activation Agent: platform specs for Meta/TikTok/LinkedIn and sync metadata

## Route surfaces

### Main site
- `/dashboard/audience`
- `/dashboard/audience/new`
- `/dashboard/audience/:audienceId`

### Mission Control
- `/audience/queue`
- `/audience/runs/:runId`

