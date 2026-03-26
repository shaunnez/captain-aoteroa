# Caption Aotearoa

Live captioning web app for NZ community events. Streams audio to Azure Speech-to-text, translates captions into NZ census languages, and broadcasts to audience phones — no app install needed.

## Architecture

pnpm monorepo with:

- `apps/api` — Express + Socket.IO backend (Azure Speech, Translator, Supabase, transcript processing)
- `apps/web` — React frontend (organiser dashboard, presenter view, audience view)
- `packages/shared` — Shared types and constants

## Quick Start

```bash
pnpm install
pnpm --filter @caption-aotearoa/shared build
pnpm dev:api   # starts API on :3002
pnpm dev:web   # starts frontend on :5173
```

Copy `apps/api/.env.example` to `apps/api/.env` and fill in values.

## Environment Variables

### API (`apps/api/.env`)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `AZURE_SPEECH_KEY` — Azure Cognitive Services key
- `AZURE_SPEECH_REGION` — Azure region (e.g. `australiaeast`)
- `CLIENT_URL` — Frontend URL for CORS (e.g. `http://localhost:5173`)
- `ANTHROPIC_API_KEY` — (Optional) For transcript post-processing

### Web (`apps/web/.env`)
- `VITE_API_URL` — API URL (default `http://localhost:3002`)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

## Testing

```bash
pnpm test        # API + web unit tests
pnpm test:api    # API tests only
pnpm test:web    # Web tests only
pnpm test:e2e    # Playwright E2E tests
pnpm test:all    # Everything
```

Use `AZURE_MOCK=true` for cost-free testing without real Azure credentials.

## Claude Code Skills

This project uses Claude Code skills and hooks for structured engineering workflows:

| Skill | Trigger | Purpose |
|-------|---------|---------|
| Engineering Planning | `/engineering-planning` | Investigation-driven planning with sub-agent waves |
| Harness | `/harness` | Generator-evaluator execution for multi-WP plans |
| Evaluate UI | `/evaluate-ui` | Playwright-based UI verification against design criteria |
| Verify | `/verify` | Six-command gate: typecheck + tests + build (both apps) |

Hooks (`.claude/settings.json`) enforce session handoffs on stop, edit reminders, and output checking. Sprint contracts and handoff artifacts live in `docs/superpowers/contracts/`.

## Database

Supabase migration files are in `supabase/migrations/`. Apply them in order to set up the database schema.
