# KORA Agent Builder Onboarding Brief

## Purpose
Help new team members quickly understand what KORA does and how to design, prompt, and ship high-quality agents inside the platform.

## What KORA Is
KORA (Knowledge Oriented Retrieval Agents) is an AI-powered marketing intelligence platform that combines:
- Public-facing experiences (marketing pages, strategy session booking, events, blog)
- Authenticated dashboard workflows for campaign and content operations
- Multi-agent capabilities for intake, strategy, campaign assembly, and ongoing optimization

The main product surface runs in `apps/web` and includes:
- Public pages (`/`, `/kora`, `/strategy-session`, `/the-brief`, `/events`)
- Auth and onboarding (`/auth`, email/signup confirmation flows)
- Role-gated dashboard (`/dashboard/*`) for strategy, audience intelligence, content calendar, creative hub, campaigns, reports, logistics, and admin controls

## Why Agents Matter In This Platform
Agents are used to turn scattered marketing inputs into actionable outputs:
- Intake -> structured business context
- Research and retrieval -> usable market and audience insight
- Strategy generation -> campaign and content plans
- Assembly and execution support -> assets, scheduling, and operational handoffs

## Role-Specific Focus

### Designer (Agent UX + Interaction Design)
Primary objective: make agent workflows feel clear, trustworthy, and fast.

Focus areas:
- Map user journeys for high-value tasks (campaign creation, audience analysis, content planning)
- Define interaction states (empty, loading, partial success, failure, retry)
- Standardize response components (insight cards, suggested actions, confidence cues, citations)
- Improve handoff points where humans review/edit agent output before publish

Deliverables for week 1:
- 1 workflow map for a dashboard agent flow
- 1 wireframe set for an "agent output to human approval" loop
- 1 UI checklist for trust and clarity (tone, risk flags, source visibility)

### Prompt Engineer (Agent Behavior + Quality)
Primary objective: make agent responses consistently useful, grounded, and production-safe.

Focus areas:
- Define prompt templates by agent job (intake clarifier, strategy, campaign, creative support)
- Separate system rules, task instructions, and output schema
- Add guardrails for hallucination, unsupported claims, and unsafe recommendations
- Create evaluation prompts and scorecards (accuracy, actionability, brevity, brand fit)

Deliverables for week 1:
- 3 prompt templates tied to real dashboard tasks
- 1 shared output schema for strategy/campaign responses
- 1 evaluation rubric with pass/fail thresholds

## Shared Working Model
Use this loop for every new agent capability:
1. Define job to be done and success metric
2. Design input contract (required context + optional context)
3. Design output contract (sections, tone, structured fields)
4. Prototype in sandbox with 5-10 realistic examples
5. Review with product + operations stakeholders
6. Ship behind clear UI affordances and fallback paths
7. Measure quality and iterate weekly

## Quality Bar (Minimum)
- Grounded outputs (no fabricated facts)
- Clear next actions for users
- Editable outputs before final use
- Role-appropriate visibility and permissions
- Failure modes that are explicit and recoverable

## First Platform Tour (90 Minutes)
1. Open public routes: `/`, `/kora`, `/strategy-session`, `/the-brief`
2. Review auth flow at `/auth`
3. Review dashboard surfaces:
   - `/dashboard/overview`
   - `/dashboard/creative-hub`
   - `/dashboard/campaigns`
   - `/dashboard/audience`
   - `/dashboard/calendar`
   - `/dashboard/reports`
4. Identify one agent opportunity per surface (problem, expected output, risk)

## Definition of Ready for New Agent Work
Before implementation starts, each proposed agent includes:
- User problem statement
- Required context sources
- Prompt/system contract draft
- Output format + UX presentation sketch
- QA checklist and rollout plan
