# JahKnowsPR web (apps/web)

Public marketing site and signed-in dashboard for **JahKnowsPR** — brand intelligence, PR, Creative Hub, and K.O.R.A.

## Local development

From the monorepo root:

```sh
npm install
npm run dev:web
```

Vite serves the app (see `vite.config.ts` for host/port). Copy `apps/web/.env.example` to `apps/web/.env` and set Supabase keys from **Project Settings → API**.

## Build

```sh
npm run build:web
```

## Supabase

Migrations and Edge Functions live under `apps/web/supabase/`. Deploy functions and run migrations against your Supabase project with the Supabase CLI (see repo root `package.json` `supabase` script).

## Site URL

Production canonical URLs use **https://jahknowspr.com**. For Edge Functions that build absolute links (e.g. `og-meta`), set the **`SITE_URL`** secret to your public origin if it differs.
