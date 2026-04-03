# K.O.R.A - Knowledge Oriented Retrieval Agents

**By VaughnX Technology LLC**

K.O.R.A is an AI-powered marketing intelligence platform that automates content strategy, market research, and campaign creation through a network of specialized agents.

**Single repository:** the public marketing site, Mission Control admin UI, shared packages, Supabase (under `apps/web`), and workers all live in this repo (`VX_KORA`). There is no separate Mission Control repo.

## Project structure

```
VX_KORA/
├── apps/
│   ├── web/                 # Main marketing site + customer dashboard (Vite/React)
│   │   ├── src/
│   │   └── supabase/        # Edge functions, migrations (shared backend surface)
│   └── mission-control/     # Mission Control internal admin (Vite/React; npm package name: kora-admin)
├── packages/                # Shared libraries (e.g. kora-sdk, publishing-*)
├── services/
│   └── telegram-bot/        # Telegram / insights tooling (workspace package)
└── workers/
    └── agents/              # Agent TypeScript sources (not an npm workspace; no package.json here)
```

**Important:** Mission Control is **`apps/mission-control`**, not `workers/ingest/kora-admin`. That old path was removed when the app was moved into `apps/`; Vercel and any scripts must use `apps/mission-control`.

## Applications

### Main web app (`apps/web`)

The primary JahKnowsPR / KORA marketing surface and app shell: blog, strategy session booking, dashboard areas, PR assistant, Supabase client, etc.

**Tech stack:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase

**Local dev:** `npm run dev:web` (from repo root) or `cd apps/web && npm run dev`

### Mission Control (`apps/mission-control`)

Internal admin dashboard (package name **`kora-admin`** in `package.json` only). Same repo as the main site.

**Tech stack:** React, TypeScript, Vite, Tailwind CSS, Radix/shadcn-style UI

**Local dev:** `npm run dev:admin` (from repo root) or `cd apps/mission-control && npm run dev`

## Deployment (Vercel)

Create **two Vercel projects** (or more) from **this same GitHub repo**, each with the correct **Root Directory**:

| Vercel project        | Root Directory           | Framework |
|-----------------------|--------------------------|-----------|
| Main site             | `apps/web`               | Vite      |
| Mission Control       | `apps/mission-control`   | Vite      |

**Output directory:** `dist` (Vite default) for both.  
**Do not** set Root Directory to `workers/ingest/kora-admin` — that folder is not in this repository.

## Getting started

### Prerequisites

- Node.js 18+
- npm
- Supabase account (for full app behavior)

### Install

From the repository root:

```bash
npm install
```

### Environment variables

Create `.env` files as needed. See each app’s `.env.example` where present.

## Architecture

K.O.R.A uses a multi-agent architecture:

1. **Core Intelligence Agent** - Global data ingestion, enrichment, and RAG updates
2. **Intake Clarifier Agent** - Processes user intake forms into structured profiles
3. **Content Strategy Agent** - Generates content strategies from market insights
4. **Campaign Assembly Agent** - Creates executable campaigns with assets

## License

Proprietary - VaughnX Technology LLC
