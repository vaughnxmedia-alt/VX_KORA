# Mission Control — real trial runs

Mock/demo data has been **cleared**. Lists and dashboards show **empty states** until you wire Supabase (or other APIs).

## Justice & Jocelyn Telegram test runs

**Option A — Terminal**

```bash
cd VX_KORA
npm run send-insights
```

**Option B — Mission Control “Trigger Run”**

1. In one terminal (leave running):

   ```bash
   cd VX_KORA
   npm run insights:trigger-server
   ```

2. Open Mission Control → **Core → Ingest Runs** → click **Trigger Run**.

Same job as `send-insights` (both users in `send-deep-insights.ts`). Each run is written to Supabase **`kora_ingest_runs`**; click **Refresh** on Ingest Runs after the job finishes (or wait for auto-refresh). Optional: `TRIGGER_RUN_SECRET` in `telegram-bot/.env` and `VITE_TRIGGER_RUN_SECRET` in kora-admin `.env` for the button to send the header.

Sign in as a **Mission Control admin** so RLS allows reading `kora_ingest_runs` and `customers`.

## Clients (Juss & Jocelyn)

Apply migration `20260318120000_seed_insights_telegram_clients.sql` or run the SQL in **`docs/TELEGRAM_CLIENTS_SEED.md`**. Then **Clients** lists them and the Ingest Runs client filter can match runs to each person.

## After links go out

- New Telegram users still depend on bot + DB fixes (UUID customers, etc.) per the main product plan.
