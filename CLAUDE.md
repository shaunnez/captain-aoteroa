# Caption Aotearoa

Live captioning web app for NZ community events. Streams audio to Azure Speech-to-text, translates captions into NZ census languages, and broadcasts to audience phones — no app install needed.

## Monorepo structure

pnpm workspace with two apps and one shared package:

- `apps/api` — Express + Socket.IO backend. Handles WebSocket sessions, Azure Speech and Translator integration, event management.
- `apps/web` — React frontend. Organiser dashboard (create/manage events), presenter view (mic capture), and audience view (live captions + language picker).
- `packages/shared` — Types and constants shared between api and web (e.g. `NZ_LANGUAGES`, `Event` interface).

## Dev

```bash
pnpm install          # install all workspaces
pnpm --filter api dev
pnpm --filter web dev
```

## No worktrees

Do not use git worktrees on this project.

## Hard Rules

1. **Te reo TTS must use OpenAI, never Azure** — Azure quality is unacceptable for Māori. `OpenAiTtsService` only for `mi-NZ` segments.
2. **caption_segments stored row-per-language** — JSONB consolidation was tried and reverted. Don't revisit without explicit instruction.
3. **Typecheck + tests + build must all pass before declaring done** — run all six commands (see Verification below). After completing any feature, also run `pnpm test:integration` (requires `.env` with real API keys).
4. **No unsolicited scope expansion** — especially when resuming after a token/context reset: state the remaining scope and confirm before acting.
5. **Strict TypeScript** — no `as any` without a comment. `noUnusedLocals` is on in web; unused imports are type errors.
6. **BCP-47 locale codes everywhere** — `en-NZ`, `mi-NZ`, not `en` or `mi`. Short codes only in specific Azure/Papa Reo API params.
7. **Engineering planning skill** — Before implementing any feature or fixing bugs, invoke the `engineering-planning` skill. Scale rigor to complexity: trivial 1-2 file fixes can use a lighter touch, but anything touching shared services, the DB, or multiple files gets the full process.
8. **Harness for long-running work** — For plans with 3+ Work Packages or full-stack features, use the `/harness` skill. Separates generation from evaluation with per-WP context resets. Never let a generator self-evaluate.
9. **UI evaluation via Playwright** — After frontend changes, use `/evaluate-ui` to interact with the running app via Playwright MCP. Grade against brand, accessibility, responsiveness, and functionality criteria. Mobile-first (375px) since audiences use phones.

## Architecture

```
Presenter browser
  → mic audio (PCM) via Socket.IO
  → API: SocketHandler routes to AzureSession (en) or PapaReoSession (mi)
  → STT text → Azure Translator (only languages with active viewers) → NZ language variants
  → caption_segments rows inserted (one per language, only demanded languages)
  → TTS: OpenAiTtsService (mi-NZ) or TtsService/Azure (all others, only for audio subscribers)
  → broadcast via Socket.IO room keyed by event code
  → Audience browser: EventPage → language picker → live captions
```

Key services: `SocketHandler` (400+ LOC, orchestrates everything), `EventManager`, `TranscriptProcessor`, `AzureSession`, `PapaReoSession`, `TtsService`, `OpenAiTtsService`, `CaptionSubscriptionManager`, `AudioSubscriptionManager`.

Auth: JWT via `middleware/auth.ts`. MVP uses `PRESENTER_SECRET` env var. Supabase RLS separates public reads from service-role writes.

## Verification

Run all six before marking work complete:

```bash
pnpm --filter api tsc --noEmit
pnpm --filter web tsc --noEmit
pnpm --filter api test
pnpm --filter web test
pnpm --filter api build
pnpm --filter web build
```

Integration tests (requires real API keys in `apps/api/.env`):

```bash
pnpm test:integration
```

Covers the full STT→translate→TTS pipeline for all 6 source/target language combos. **Run after completing any feature** before declaring done. Must pass before merging speech-processing changes.

## Gotchas

**JSONB revert:** `caption_segments` had a JSONB consolidation attempted (commit `4583752`) and reverted (`8969bc5`). Row-per-language is the settled design. Don't reopen this.

**Token reset continuation:** If resuming after a token limit, do NOT continue the full original task. State the remaining scope and confirm before acting.

**`noUnusedLocals: true` in web tsconfig** — any unused import fails `tsc --noEmit`. Catches itself in typecheck.

**BCP-47 in `speakerLocale` state** — `PresentPage` stores `'en-NZ'` not `'en'`. `SocketHandler` handles fallback matching, but source state must be BCP-47.

**RLS + service role** — API writes use the service role key. Frontend reads use the anon key. If a write silently fails, check which client is being used.

**Framer-motion mocked in tests** — `apps/web/src/__tests__/setup.ts` provides a global mock registered via `setupFiles` in `vite.config.ts`. Don't add per-file `vi.mock('framer-motion', ...)` — the global mock covers it.

**Translation is demand-filtered** — `SocketHandler` only translates to languages with active viewers (via `CaptionSubscriptionManager` + `AudioSubscriptionManager`), plus English as a permanent fallback. Don't revert to translating all `NZ_LANGUAGES` — that was the pre-optimization path (~$12.70/hr). See `docs/2026-03-25-translation-optimization.md` for full details.

## Quick Reference

| Thing | Location |
|-------|----------|
| Shared types | `packages/shared/src/types.ts` |
| NZ languages list | `packages/shared/src/nzLanguages.ts` |
| Recognition locales | `packages/shared/src/recognitionLocales.ts` |
| Socket orchestration | `apps/api/src/services/SocketHandler.ts` |
| Caption language tracking | `apps/api/src/services/CaptionSubscriptionManager.ts` |
| Audio language tracking | `apps/api/src/services/AudioSubscriptionManager.ts` |
| Te reo TTS | `apps/api/src/services/OpenAiTtsService.ts` |
| DB migrations | `supabase/migrations/` (7 files) |
| Plans / specs | `docs/superpowers/plans/`, `docs/superpowers/specs/` |
| Harness contracts | `docs/superpowers/contracts/` |
| Skills | `.claude/skills/` (engineering-planning, harness, evaluate-ui, verify) |
| Hooks config | `.claude/settings.json` |
| Brand colours | `--color-primary` CSS var, `#493276` purple, `#fdfdf0` sand |
| Env validation | `apps/api/src/config.ts` — throws on missing vars |

## Key Patterns

**Tests:** Vitest. API uses supertest + `vi.mock`. Web uses React Testing Library. Co-located in `__tests__/`. Framer-motion mocked globally via `src/__tests__/setup.ts`.

**Validation:** `requireEnv()` in `config.ts` for env vars. Route handlers return 400 for missing fields.

**Naming:** Classes PascalCase, functions camelCase, DB columns snake_case, constants UPPER_SNAKE_CASE.

**TanStack Query** for data fetching in web. Socket.IO for real-time. No Next.js.

## Claude Code Harness

Hooks in `.claude/settings.json` enforce workflow discipline:
- **Stop hook** — prompts a handoff note (`docs/superpowers/HANDOFF.md`) when a session ends, enabling clean context resets
- **PreToolUse (Edit|Write)** — reminds to run `/verify` after edits
- **PostToolUse (Bash)** — reminds to check command output for errors

Skills in `.claude/skills/`:
- `/engineering-planning` — investigation-driven planning with sub-agent waves
- `/harness` — generator-evaluator execution for multi-WP plans with per-WP context resets and sprint contracts
- `/evaluate-ui` — Playwright-based UI grading against brand, accessibility, responsiveness, functionality
- `/verify` — six-command verification gate (typecheck + tests + build, both apps)

Workflow: `/engineering-planning` to plan, `/harness` to execute (3+ WPs), `/evaluate-ui` for frontend, `/verify` before declaring done.
