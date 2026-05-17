# KORA Closed-Loop Intelligence Phase 1 Production Rollout

This document is an operations-only rollout guide for Phase 1.

- Scope: migrations, deploy sequencing, validation, smoke tests, rollback.
- Non-scope: app logic changes, new features, dashboards, new tables (unless emergency risk patch).

## 0) Prerequisites

- Code branch includes:
  - `apps/web/supabase/migrations/20260517101500_audience_buyer_intelligence.sql`
  - `apps/web/supabase/migrations/20260517114500_closed_loop_intelligence_phase1.sql`
- Supabase CLI installed and authenticated.
- Access to production Supabase project and secrets.
- Square production/sandbox credentials configured for target environment.

---

## 1) Migration Apply Order

## Required Order

Run older migrations before `20260517114500_closed_loop_intelligence_phase1.sql`, especially:

1. `20260330120000_payment_transactions_strategy_session.sql`
2. `20260428015100_kora_learning_log_system.sql`
3. `20260428030000_lls_closed_loop_enforcement.sql`
4. `20260501150500_kora_first_party_analytics.sql`
5. `20260501171000_multi_client_campaigns.sql`
6. `20260517101500_audience_buyer_intelligence.sql`
7. `20260517114500_closed_loop_intelligence_phase1.sql`

## Migration Commands (Exact)

```bash
cd apps/web
```

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <PROJECT_REF>
```

```bash
npx supabase migration list --linked
```

```bash
npx supabase db push
```

If your CLI version supports dry run:

```bash
npx supabase db push --dry-run
```

## Dependency Risks

- `payment_transactions`, `meetings`, `customers`, `free_audits`, `analytics_events`, `revenue_attribution`, `lls_outcome_events`, and `lls_funnel_attribution` must already exist.
- `buyer_purchase_attribution` and `client_offer_catalog` must exist from `20260517101500_audience_buyer_intelligence.sql`.
- `public.set_updated_at()` and `public.is_dashboard_operator(auth.uid())` must exist.
- Backfill quality depends on legacy `free_audits.metadata` consistency.

## Safety Notes

- Migration is additive-heavy (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- No `DROP TABLE`, `TRUNCATE`, or `DELETE`.
- It does include:
  - `DROP POLICY IF EXISTS`
  - `DROP TRIGGER IF EXISTS`
  - backfill `INSERT`/`UPDATE`
- Safe for production with staging validation and migration tracking enabled.

## Backfill Duplication Risk

Supabase migration history prevents re-running the same migration in normal flow.

If manually replayed outside migration tracking:

- `audit_intakes`, `audit_intake_original_answers`, `audit_intake_analysis`, `audit_pdf_deliverables`, `audit_audio_deliverables` are mostly guarded by unique keys or left joins.
- `buyer_identity_links` is conflict-safe.
- `buyer_journeys` is conflict-safe.
- `lead_magnet_interactions` backfill inserts can duplicate if replayed manually.

## Idempotency Checks

```sql
select lead_magnet_id, interaction_kind, audit_intake_id, strategy_session_id, count(*)
from public.lead_magnet_interactions
group by 1,2,3,4
having count(*) > 1;
```

```sql
select audit_intake_id, count(*)
from public.audit_pdf_deliverables
group by 1
having count(*) > 1;
```

```sql
select audit_intake_id, count(*)
from public.audit_audio_deliverables
group by 1
having count(*) > 1;
```

---

## 2) Function Deploy Order (Safest)

Deploy after migration is applied.

```bash
cd apps/web
```

```bash
npx supabase functions deploy lls-record-outcome
npx supabase functions deploy free-audit-complete --no-verify-jwt
npx supabase functions deploy send-free-audit-report
npx supabase functions deploy generate-audit-audio
npx supabase functions deploy strategy-session-admin-confirm
npx supabase functions deploy square-strategy-session-payment --no-verify-jwt
npx supabase functions deploy square-telegram-subscription-payment --no-verify-jwt
npx supabase functions deploy strategy-session-book --no-verify-jwt
npx supabase functions deploy free-audit-submit --no-verify-jwt
```

Rationale:

- `lls-record-outcome` first to accept expanded dimensional payloads.
- Payment and booking sequencing avoids broken references during rollout.
- Highest-traffic public intake (`free-audit-submit`) deployed last.

---

## 3) Frontend Deploy Order

Files in scope:

- `apps/web/src/lib/freeAuditAttribution.ts`
- `apps/web/src/lib/kora-analytics-types.ts`
- `apps/web/src/lib/kora-analytics.ts`
- `apps/web/src/pages/FreeAudit.tsx`
- `apps/web/src/pages/StrategySessionBooking.tsx`

Deploy order:

1. Database migration
2. Supabase Edge functions
3. Frontend/web API deploy

Reason: frontend emits richer attribution fields and expects backend/storage paths to already exist.

---

## 4) Environment Variable / Secret Checks

## Supabase (Edge Functions)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## Email / Notifications

- `RESEND_API_KEY`
- `PUBLIC_SITE_URL`
- `FREE_AUDIT_FROM_EMAIL`
- `AUDIT_NOTIFICATION_EMAILS`
- `STRATEGY_SESSION_FROM_EMAIL`
- `STRATEGY_SESSION_OPS_EMAIL`
- `TELEGRAM_SUBSCRIPTION_FROM_EMAIL`

## Square

- `SQUARE_ACCESS_TOKEN`
- `SQUARE_LOCATION_ID`
- `SQUARE_ENVIRONMENT`
- `SQUARE_SUBSCRIPTION_PLAN_VARIATION_ID`

## Strategy Session

- `STRATEGY_SESSION_FREE_PROMO`
- `STRATEGY_SESSION_DEFAULT_HOST_USER_ID`

## OpenAI / Audio / LLM

- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL`
- `OPENAI_TTS_MODEL`
- `OPENAI_TTS_VOICE`
- `AUDIT_SCRIPT_LLM_ENABLED`
- `AUDIT_SCRIPT_LLM_MODEL`
- `AUDIT_PDF_OPENAI_MODEL`
- `GEMINI_API_KEY`
- `AUDIT_PDF_GEMINI_MODEL`
- `AUDIO_TTS_PROVIDER`
- `AUDIO_TTS_ALLOW_OPENAI_FALLBACK`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_MODEL_ID`
- `ELEVENLABS_OUTPUT_FORMAT`
- `ELEVENLABS_SPEED`
- `ELEVENLABS_STABILITY`
- `ELEVENLABS_SIMILARITY_BOOST`
- `ELEVENLABS_STYLE`
- `ELEVENLABS_SPEAKER_BOOST`
- `ELEVENLABS_VOICE_WOMAN`
- `ELEVENLABS_VOICE_MAN`
- `ELEVENLABS_VOICE_ALT_1`
- `ELEVENLABS_VOICE_ALT_2`
- `ELEVENLABS_VOICE_ALT_3`
- `ELEVENLABS_VOICE_FEMININE_POOL`
- `ELEVENLABS_VOICE_MASCULINE_POOL`
- `ELEVENLABS_VOICE_NEUTRAL_POOL`

## Frontend App Env

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)
- `VITE_SQUARE_APPLICATION_ID`
- `VITE_SQUARE_LOCATION_ID`
- `VITE_PUBLIC_SITE_URL`

---

## 5) Database Verification SQL

## A. New Tables Exist

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
and table_name in (
  'buyer_identity_links',
  'buyer_journeys',
  'lead_magnets',
  'lead_magnet_interactions',
  'offer_presentations',
  'contract_attribution',
  'audit_intakes',
  'audit_intake_original_answers',
  'audit_intake_analysis',
  'audit_pdf_deliverables',
  'audit_audio_deliverables'
)
order by table_name;
```

## B. Seeded Lead Magnets Exist

```sql
select id, label, kind, is_paid, is_active
from public.lead_magnets
where id in ('free_audit', 'strategy_session', 'the_brief', 'download', 'webinar', 'other')
order by id;
```

## C. Insert Tests (Transactional)

```sql
begin;

insert into public.buyer_identity_links (
  canonical_buyer_key, identity_type, identity_value, site_id, brand_id, client_id, metadata
)
values (
  'qa_buyer_rollout_001', 'buyer_key', 'qa_buyer_rollout_001', 'jahknowspr_web', 'jahknowspr', 'qa_client', '{"qa": true}'::jsonb
)
returning *;

rollback;
```

```sql
begin;

insert into public.buyer_journeys (
  journey_key, site_id, brand_id, client_id, canonical_buyer_key, buyer_key, lead_key, journey_status, latest_lead_magnet_id, latest_offer_id, metadata
)
values (
  'qa_site:qa_brand:qa_client:qa_buyer_rollout_001',
  'jahknowspr_web',
  'jahknowspr',
  'qa_client',
  'qa_buyer_rollout_001',
  'qa_buyer_rollout_001',
  'qa@example.com',
  'lead_captured',
  'free_audit',
  'free_audit',
  '{"qa": true}'::jsonb
)
returning *;

rollback;
```

```sql
begin;

with j as (
  insert into public.buyer_journeys (
    journey_key, site_id, brand_id, client_id, canonical_buyer_key, buyer_key, journey_status
  )
  values (
    'qa_site:qa_brand:qa_client:qa_interaction_buyer',
    'jahknowspr_web',
    'jahknowspr',
    'qa_client',
    'qa_interaction_buyer',
    'qa_interaction_buyer',
    'audit_submitted'
  )
  returning id
)
insert into public.lead_magnet_interactions (
  lead_magnet_id, interaction_kind, interaction_status, site_id, brand_id, client_id, buyer_journey_id,
  canonical_buyer_key, buyer_key, offer_id, offer_stage, metadata
)
select
  'free_audit', 'submit', 'success', 'jahknowspr_web', 'jahknowspr', 'qa_client', j.id,
  'qa_interaction_buyer', 'qa_interaction_buyer', 'free_audit', 'free', '{"qa": true}'::jsonb
from j
returning *;

rollback;
```

## D. Backfill Coverage

```sql
select
  (select count(*) from public.free_audits) as free_audits,
  (select count(*) from public.audit_intakes) as audit_intakes,
  (select count(*) from public.audit_intake_original_answers) as original_answers,
  (select count(*) from public.audit_intake_analysis) as intake_analysis,
  (select count(*) from public.audit_pdf_deliverables) as pdf_deliverables,
  (select count(*) from public.audit_audio_deliverables) as audio_deliverables;
```

```sql
select f.id
from public.free_audits f
left join public.audit_intakes ai on ai.free_audit_id = f.id
where ai.id is null
limit 50;
```

## E. PDF and Audio Persistence

```sql
select audit_intake_id, free_audit_id, delivery_status, report_filename, sent_at, created_at
from public.audit_pdf_deliverables
order by created_at desc
limit 20;
```

```sql
select audit_intake_id, free_audit_id, delivery_status, audio_public_url, script_version, word_count, created_at
from public.audit_audio_deliverables
order by created_at desc
limit 20;
```

## F. Revenue + LLS Dimensional Writes

```sql
select
  id, created_at, client_id, brand_id, lead_magnet_id, offer_id, offer_stage, buyer_key, buyer_journey_id,
  campaign_id, adset_id, creative_id, amount, currency, payment_provider, order_id
from public.revenue_attribution
order by created_at desc
limit 30;
```

```sql
select
  id, created_at, client_id, brand_id, lead_magnet_id, offer_id, offer_stage, buyer_key, buyer_journey_id,
  amount, currency, source_event_id, source_revenue_attribution_id
from public.buyer_purchase_attribution
order by created_at desc
limit 30;
```

```sql
select
  id, occurred_at, subject_kind, action, business_goal, buyer_key, buyer_journey_id,
  audit_intake_id, strategy_session_id, lead_magnet_id, campaign_id, offer_id, offer_stage, revenue_attribution_id
from public.lls_outcome_events
order by occurred_at desc
limit 30;
```

---

## 6) Manual Smoke Tests

## 1. Anonymous site visit tracking

1. Open incognito.
2. Visit `/free-audit?k_campaign=qa_rollout&k_lead_magnet=free_audit&k_offer=free_audit&k_offer_stage=free`.
3. Confirm `/api/kora/analytics/track` returns 200.
4. Verify new event row includes lead magnet/offer fields.

## 2. Free audit submission

1. Submit free audit with unique email.
2. Confirm success response.
3. Verify rows in:
   - `free_audits`
   - `audit_intakes`
   - `audit_intake_original_answers`
   - `audit_intake_analysis`
   - `buyer_identity_links`
   - `buyer_journeys`
   - `lead_magnet_interactions`

## 3. Free audit completion

1. Trigger complete flow.
2. Verify `audit_intake_analysis.completion_status` and `lls_outcome_events` row.

## 4. PDF report delivery

1. Send report from dashboard.
2. Confirm email sent.
3. Verify `audit_pdf_deliverables.delivery_status = 'sent'`.

## 5. Audio generation

1. Generate audio for same audit.
2. Verify storage URL + script fields in `audit_audio_deliverables`.

## 6. Strategy session booking

1. Book using valid payment/promo.
2. Verify `meetings` has `buyer_key`, `buyer_journey_id`, optional `audit_intake_id`.
3. Verify `lead_magnet_interactions` booking row + `offer_presentations` row.

## 7. Square strategy session payment

1. Run sandbox payment.
2. Verify:
   - `payment_transactions`
   - `analytics_events` purchase event
   - `revenue_attribution`
   - `buyer_purchase_attribution`
   - `buyer_journeys.is_buyer = true`

## 8. Telegram subscription payment

1. Run sandbox subscription payment.
2. Verify subscription row + invite email.
3. Verify purchase attribution rows and lead magnet interaction.

## 9. LLS outcome recording

1. Submit test outcome via allowed path.
2. Verify dimensional columns are populated in `lls_outcome_events`.

---

## 7) Rollback Notes

## If migration fails

1. Stop rollout immediately.
2. Check migration state:

```sql
select *
from supabase_migrations.schema_migrations
order by version desc
limit 20;
```

3. If not recorded, assume transactional rollback.
4. Do not manually rerun partial SQL blocks.
5. Patch via new forward migration.

## If function deploy fails

1. Stop remaining function deploys.
2. Redeploy last known-good version of failed function.
3. Re-run targeted smoke tests for that flow only.

## If free audit submissions break

1. Roll back `free-audit-submit` to previous deployment.
2. Keep DB migration in place.
3. Validate legacy `free_audits` writes still function.

## If payment attribution breaks

1. Roll back payment function(s) first.
2. Ensure `payment_transactions` still captures successful charges.
3. Backfill attribution after patching.

## If LLS writes fail

1. Set `LLS_ENABLED=false` (temporary fail-open posture).
2. Roll back affected LLS writer function(s).

## If PDF/audio persistence fails

1. Roll back `send-free-audit-report` and/or `generate-audit-audio`.
2. Continue sending/serving from compatibility metadata paths.
3. Backfill `audit_pdf_deliverables` / `audit_audio_deliverables` later.

---

## 8) Known Risks

- Dual-write paths can partially succeed if one branch fails.
- Manual replay of backfill SQL can duplicate some interaction facts.
- RLS policy behavior depends on `is_dashboard_operator` and user-role data consistency.
- Admin read access may vary by table/policy path.
- Attribution dimensions are nullable by design during transition.
- Anonymous buyer stitching can over-merge if fallback keys collide.
- Payment and booking are separate calls; payment may exist without booking link.
- Legacy `free_audits.metadata` variability may reduce backfill quality.
- Repository-wide lint failures outside edited rollout scope can add CI noise.

---

## 9) Final Production Checklist (Exact Order)

1. Freeze prod deploy window.
2. Confirm branch includes required migrations and function changes.
3. Verify all required secrets/env vars are present.
4. Link Supabase project and inspect pending migrations:

```bash
cd apps/web
npx supabase link --project-ref <PROJECT_REF>
npx supabase migration list --linked
```

5. Apply migrations:

```bash
npx supabase db push
```

6. Run DB verification SQL (tables, seeds, inserts, backfill coverage, attribution rows).
7. Deploy functions in listed safe order.
8. Run backend smoke tests (audit/session/payment/LLS).
9. Deploy frontend.
10. Run full end-to-end smoke tests.
11. Run duplicate/idempotency checks.
12. Monitor errors and logs for 30-60 minutes.
13. If issues occur, execute rollback notes section and re-validate.
