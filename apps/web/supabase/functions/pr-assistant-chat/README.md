# pr-assistant-chat

Supabase Edge Function for **K.O.R.A** chat.

- **Creative Hub** (`userMessage` + `context.page_context === "creative_hub"`): OpenAI **Responses** API, JSON `{ responseId, text }`, persists `content_plans.openai_response_chain_id` when `content_plan_id` is in context.
- **PR Assistant** (`messages` array): OpenAI **Chat Completions** streaming (`text/event-stream`).

Secrets and deploy notes are in the [`index.ts`](./index.ts) file header.

## Before you test (checklist)

1. **Database** — Apply pending migrations so `content_plans.openai_response_chain_id` exists, e.g. from `apps/web`:
   - `supabase link --project-ref <ref>` (once)
   - `supabase db push`
   Or run the SQL from `supabase/migrations/20260411120000_content_plans_openai_response_chain.sql` in the SQL editor if you do not use the CLI.

2. **Edge secrets** — In Supabase → Edge Functions → **pr-assistant-chat** → Secrets:
   - `OPENAI_API_KEY` (required)
   - Optional: `OPENAI_RESPONSES_MODEL` (default in code is `gpt-5.4` if unset)
   - Optional: `OPENAI_CHAT_MODEL` (default `gpt-4o` for the PR Assistant stream path)

3. **Model access** — In the OpenAI dashboard (or `GET https://api.openai.com/v1/models`), confirm your project can use the model you set. If `gpt-5.4` is not available, set `OPENAI_RESPONSES_MODEL` to a model your key can use (for example `gpt-5.4-mini` or another supported id).

4. **Deploy** — From `apps/web` (or repo root with correct config path):
   - `supabase functions deploy pr-assistant-chat`

5. **App config** — Ensure the web app points at the same Supabase project (`VITE_SUPABASE_URL` / keys in `apps/web/.env`).

6. **Smoke tests**
   - **Creative Hub**: Open a content plan, send a message in K.O.R.A; expect a full reply (non-streaming) and that a second message still has context (`previous_response_id` chain).
   - **PR Assistant** (dashboard widget): Send a message; expect token streaming as before.
