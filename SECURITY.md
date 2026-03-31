# Credential safety

- **Never commit** `.env`, `.env.*` (except `.env.example` templates), PEM/P12 keys, `credentials.json`, or pasted API keys/JWTs in source files.
- **Supabase:** use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in local/CI env (see `apps/web/.env.example`). Service role keys and `INTEGRATION_TOKEN_ENCRYPTION_KEY` belong only in **Supabase Edge secrets** or server env—never in the frontend bundle or git.
- **GitHub:** enable **Secret scanning** and **Push protection** for the repository (Settings → Code security and analysis).
- If a secret is ever pushed, **rotate** it in the provider (Supabase, OAuth apps, etc.) and remove it from git history if needed (`git filter-repo` or GitHub support).
