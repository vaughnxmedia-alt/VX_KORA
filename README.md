# K.O.R.A - Knowledge Oriented Retrieval Agents

**By VaughnX Technology LLC**

K.O.R.A is an AI-powered marketing intelligence platform that automates content strategy, market research, and campaign creation through a network of specialized agents.

## Project Structure

```
VX_KORA/
├── apps/
│   └── web/                    # Main marketing site and dashboard
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── pages/          # Page routes
│       │   └── integrations/   # Supabase client
│       └── supabase/           # Edge functions and migrations
│
├── packages/
│   └── kora-sdk/               # Shared SDK and utilities
│
├── services/                   # Microservices (future)
│
└── workers/
    ├── ingest/                 # Data ingestion pipeline
    │   ├── kora-admin/         # Mission Control dashboard
    │   ├── kora-rag-service/   # RAG embeddings and chat
    │   ├── src/                # RSS feed ingestion agent
    │   └── supabase/           # Database migrations
    │
    └── intake-recorder/        # Client intake processing
```

## Applications

### Main Web App (`apps/web`)
The primary KORA marketing platform with:
- User dashboard
- Blog system
- AI PR assistant chat
- Brief management
- File uploads to S3

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase

### Mission Control (`apps/mission-control`)
Internal admin dashboard for monitoring and controlling:
- Global RSS ingestion
- Tenant distribution and routing
- Event queue processing
- RAG knowledge base updates
- Content strategy generation

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account

### Development

**Run the main web app:**
```bash
cd apps/web
npm install
npm run dev
```

**Run Mission Control:**
```bash
cd apps/mission-control
npm install
npm run dev
```

### Environment Variables

Create `.env` files in each project directory. See `.env.example` files for required variables.

## Architecture

K.O.R.A uses a multi-agent architecture:

1. **Core Intelligence Agent** - Global data ingestion, enrichment, and RAG updates
2. **Intake Clarifier Agent** - Processes user intake forms into structured profiles
3. **Content Strategy Agent** - Generates content strategies from market insights
4. **Campaign Assembly Agent** - Creates executable campaigns with assets

## License

Proprietary - VaughnX Technology LLC
