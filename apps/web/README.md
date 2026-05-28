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

## Square checkout (Strategy Session & Telegram)

Card forms use the **Square Web Payments SDK** in the browser. Vite bakes public IDs into the JS bundle at **build time**.

| Where | Variables |
|-------|-----------|
| **Vercel → Production** | `VITE_SQUARE_APPLICATION_ID`, `VITE_SQUARE_LOCATION_ID` (Production app credentials from Square Developer) |
| **Supabase → Edge secrets** | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID` (same location ID; token is server-only) |

If only Supabase is configured, checkout shows “card payment unavailable” because the deployed bundle has empty Square IDs. After adding Vercel vars, **trigger a new production deploy**.

Use **Production** Square Application ID on the live site (sandbox IDs will not work against production charges).

## Video storage (AWS S3)

Dashboard **video** uploads use the **`upload-to-s3`** Edge Function (presigned URL → direct browser **PUT** to S3), same as the **content calendar**:

- **Scheduled posts:** `scheduled-posts/videos/` (`S3_VIDEO_FOLDERS.contentCalendar`)
- **Blog editor uploads:** `blog/videos/` (`S3_VIDEO_FOLDERS.blog`)
- **Get Inspired (video files only):** `inspired/videos/` (`S3_VIDEO_FOLDERS.inspired`); images still use Supabase `inspired-assets`.

Configure **AWS_ACCESS_KEY_ID**, **AWS_SECRET_ACCESS_KEY**, **AWS_S3_BUCKET**, **AWS_REGION** (or equivalent) on the Edge Function per your existing setup.

### Brand Strategy Session landing (public page)

The PR vs. marketing mp4 is **not in git** (`apps/web/.gitignore`). Upload it to the **same bucket** under **`site/videos/`**, then set **`VITE_PR_VS_MARKETING_VIDEO_URL`** on Vercel to the object’s public **HTTPS** URL. Locally you can still use `public/videos/pr-vs-marketing.mp4`.
