# Caption Aotearoa — Codebase Guide

> For someone new to the project. Grounded in actual code, not descriptions of what it "should" do.

---

## What is this app?

Caption Aotearoa is a live captioning system for New Zealand community events. A presenter speaks into a mic; the audience sees captions on their phones in any of the NZ census languages — no app install needed.

**The three user roles:**
1. **Organiser** — creates and manages events, can see Q&A, transcript. Logs in via Supabase email/password.
2. **Presenter** — speaks into mic via the present page (same person as organiser in practice).
3. **Audience** — joins an event by code or URL, picks a language, reads live captions.

---

## Project Structure

pnpm monorepo with three workspaces:

```
apps/api/          Express + Socket.IO backend
apps/web/          React + Vite frontend
packages/shared/   Types and constants shared by both apps
```

The `api` and `web` apps both depend on `@caption-aotearoa/shared` via `workspace:*`. The shared package exposes:
- `NZ_LANGUAGES` — the single source of truth for which languages are supported (`packages/shared/src/nzLanguages.ts`)
- `RECOGNITION_LOCALES` — maps Azure short codes (`'en'`) to BCP-47 STT locales (`'en-NZ'`) (`packages/shared/src/recognitionLocales.ts`)
- Domain interfaces: `Event`, `CaptionSegment`, `CaptionSegmentPayload`, `QaQuestion`
- Socket.IO event type maps: `ServerToClientEvents`, `ClientToServerEvents`

---

## Getting Started

### Prerequisites
- Node 20, pnpm 10
- A hosted Supabase project (no local Supabase setup — the repo connects to a hosted instance)
- Azure Speech + Translator keys
- OpenAI API key (required for te reo Māori TTS)

### Environment variables

Copy `.env.example` in both apps:

**`apps/api/.env`**
| Variable | Purpose |
|---|---|
| `AZURE_SPEECH_KEY` | Azure Cognitive Services STT |
| `AZURE_SPEECH_REGION` | Azure region (default: `australiaeast`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Full DB access — never expose to frontend |
| `PORT` | Express port (default: `3002`) |
| `CLIENT_URL` | CORS origin (default: `http://localhost:5173`) |
| `OPENAI_API_KEY` | OpenAI TTS for te reo Māori |
| `ANTHROPIC_API_KEY` | Claude for post-event transcript cleanup |

**`apps/web/.env`**
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend URL (default: `http://localhost:3002`) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (RLS-gated reads) |

### Running locally

```bash
pnpm install

# Two terminals:
pnpm --filter api dev    # tsx watch on port 3002
pnpm --filter web dev    # Vite on port 5173
```

### Verification (run before marking anything done)

```bash
pnpm --filter api tsc --noEmit
pnpm --filter web tsc --noEmit
pnpm --filter api test
pnpm --filter web test
pnpm --filter api build
pnpm --filter web build
```

---

## Architecture

### The full data flow

```
Presenter browser
  → mic audio captured as PCM (Int16 ArrayBuffer)
  → emits audio:chunk via Socket.IO

API: SocketHandler receives audio:chunk
  → EventManager.pushChunk(code, buffer)
  → active STT session (AzureSession / PapaReoSession) writes to audio stream

Azure Speech SDK fires recognizing (partial) or recognized (final) callback
  → AzureSession.emitSegments() builds CaptionSegmentPayload
  → SocketHandler.onSegment callback fires

onSegment callback (in SocketHandler):
  → immediately broadcasts caption:segment to all room sockets
  → if final: calls translateText() → Azure Translator REST API
  → re-broadcasts enriched caption:segment with all language translations
  → persists one caption_segments row per language to Supabase
  → for subscribed listeners: calls TtsService (Azure) or OpenAiTtsService (te reo)
  → emits audio:tts or audio:tts-stream to subscribed sockets

Audience browser:
  → useCaptions hook accumulates segments in a Map ref
  → displays segments for chosen language via CaptionDisplay
  → useAudioPlayer decodes and plays TTS audio
```

### Key design decisions

**Te reo Māori is treated specially.** Azure's Māori STT quality is poor, so `mi-NZ` routes to Papa Reo (a dedicated te reo API, `PapaReoSession`) or `OpenAiSttSession` if an OpenAI key is set. Azure TTS is also not used for te reo — `OpenAiTtsService` (voice: `coral`) is used instead. **This is a hard rule: never use Azure TTS for `mi-NZ`.**

**Row-per-language in `caption_segments`.** Each final segment produces N rows in the DB — one per language. A JSONB consolidation was attempted (commit `4583752`) and reverted (`8969bc5`). The row-per-language design is settled. Don't revisit.

**Supabase RLS split.** The API uses the service role key (bypasses RLS) for all writes. The web app uses the anon key (RLS-gated) for reads. If a write silently fails, check which client is being used.

---

## Backend Services

All services live in `apps/api/src/services/`.

### SocketHandler (`SocketHandler.ts`)
The orchestration hub (~400 LOC). Owns all Socket.IO event bindings. Performs the auth token presence check. Holds the `onSegment` callback that wires STT output to translation, broadcast, TTS dispatch, and DB writes. Also handles: Q&A flow, emoji reactions, viewer count, caption history on join.

### EventManager (`EventManager.ts`)
Singleton (`module-level`). Manages a `Map<eventCode, SessionEntry>` of active STT sessions. Selects the right STT implementation at runtime. Handles language switching by stopping and recreating sessions. Wires Azure errors to automatic `restart()`.

STT implementation selection logic (`EventManager.ts:51-78`):
- `locale === 'mi-NZ'` → `PapaReoSession` (or `OpenAiSttSession` if OpenAI key present)
- `mode === 'dual'` → `DualAzureSession` (two AzureSessions sharing a sequence counter)
- Otherwise → `AzureSession`

### AzureSession (`AzureSession.ts`)
Wraps Azure Cognitive Services Speech SDK. Creates a `PushAudioInputStream` (16kHz/16-bit/mono PCM). Debounces partial results at 150ms. Sequences segments with a counter (resumes from DB max on reconnect). Emits `CaptionSegmentPayload` via callback. Writes one `caption_segments` row per final segment.

### DualAzureSession (`DualAzureSession.ts`)
Wraps two `AzureSession` instances (en-NZ + mi-NZ) with a shared `SequenceCounter` to prevent conflicts. Both receive identical audio chunks.

### PapaReoSession (`PapaReoSession.ts`)
Te reo Māori STT. POSTs to `{papaReo.apiUrl}/tuhi/create_session` to get a WebSocket URL, then connects `ws.WebSocket`. Messages parsed as `{ text, is_final }`. Final segments persisted to `caption_segments` with `language: 'mi'`.

### TtsService (`TtsService.ts`)
Azure Neural TTS for all non-Māori languages. Looks up a voice from `VOICE_MAP` (37 languages). Returns full MP3 buffer or `null`. Returns `null` for `mi` (intentionally excluded from the voice map).

### OpenAiTtsService (`OpenAiTtsService.ts`)
Te reo Māori TTS via OpenAI `gpt-4o-mini-tts`, voice `coral`, PCM output. Streams chunks via async iteration, calling `onChunk` per chunk for real-time delivery.

### TranscriptProcessor (`TranscriptProcessor.ts`)
Post-event only. Triggered when an event status is set to `'ended'`. Fetches all final `caption_segments`, groups by language, calls Claude (`claude-haiku-4-5-20251001`) via Anthropic API for cleanup, writes results to `transcript_languages`. Skips Claude and stores raw text if no API key.

### translateText (`translateText.ts`)
Stateless function. HTTP POST to Azure Translator REST API, batching up to 25 target languages per request. Returns `Record<langCode, translatedText>`.

### Config (`config.ts`)
All env vars go through this module. Required vars use `requireEnv()` — throws at startup if missing. Optional vars use `process.env.X ?? 'default'`. Access via `config.azure.speechKey`, `config.papaReo.token`, etc.

### HTTP Routes

| Method + Path | Auth | Purpose |
|---|---|---|
| `GET /api/auth/me` | None | Check current session |
| `POST /api/events` | JWT | Create event |
| `GET /api/events` | None | List all events (public) |
| `GET /api/events/mine` | JWT | List organiser's events |
| `GET /api/events/:code` | None | Get event by code |
| `PATCH /api/events/:code` | JWT | Update event metadata |
| `PATCH /api/events/:code/status` | JWT | Start/end event |
| `POST /api/events/:code/transcript/retry` | JWT | Retry transcript generation |
| `GET /api/events/:code/transcript` | None | Fetch transcript |
| `POST /api/translate` | None | Translate text ad hoc |

Error responses always use `{ error: string }` — no `message` key, no envelope.

### Auth

**HTTP routes** use `verifyJWT` middleware (`middleware/auth.ts`): reads `Authorization: Bearer <token>`, calls `supabase.auth.getUser(token)` for full cryptographic verification, attaches user to `req.user`.

**Socket.IO** uses `isAuthorised()` (`SocketHandler.ts:423`): checks that `socket.handshake.auth.token` is a non-empty string only — no cryptographic verification. All organiser events (`session:start`, `session:end`, `session:set-language`, `session:set-mode`, `qa:moderate`) gate on `isAuthorised`.

---

## Frontend Pages

All pages in `apps/web/src/pages/`. Routes are in `apps/web/src/router.tsx`.

| Page | URL | Who | Key behaviour |
|---|---|---|---|
| `HomePage` | `/` | Public | Event listing + search. Debounced 300ms. 30s refetch. |
| `LoginPage` | `/login` | Organiser | Supabase email/password login. |
| `SignupPage` | `/signup` | Organiser | Supabase signup. |
| `DashboardPage` | `/dashboard` | Organiser | Lists their events. 15s refetch. |
| `CreateEventPage` | `/create` | Organiser | Form to create an event. Raw `api.post`, no mutation. |
| `PresentPage` | `/present/:code` | Organiser | Presenter console: audio capture, language/mode selection, inline edit, QR, Q&A moderation, transcript. |
| `EventPage` | `/event/:code` | Audience | Live captions. Language picker. TTS audio toggle. Accessibility sidebar. Q&A and reactions. |

Protected routes (organiser only) use `ProtectedRoute` (`components/ProtectedRoute.tsx`), which redirects to `/login` if not authenticated.

### Key hooks

| Hook | File | Purpose |
|---|---|---|
| `useCaptions` | `hooks/useCaptions.ts` | Connects socket, joins room, accumulates segments in a `Map` ref, re-derives display segments on locale change |
| `useAudioCapture` | `hooks/useAudioCapture.ts` | Captures mic audio as PCM, emits `audio:chunk` |
| `useAudioPlayer` | `hooks/useAudioPlayer.ts` | Subscribes to TTS events, decodes and plays audio |
| `useQA` | `hooks/useQA.ts` | Q&A question state — history + new/update events |
| `useReactions` | `hooks/useReactions.ts` | Sends and displays floating emoji reactions |
| `useViewerCount` | `hooks/useViewerCount.ts` | Listens to `viewer:count` event |
| `useAccessibility` | `hooks/useAccessibility.ts` | Font size, spacing, contrast, dyslexia font — persisted to `localStorage` |

### State management

- **No global store** (no Redux, Zustand). All state is local to hooks/components.
- **TanStack Query** is the source of truth for server data (event metadata, lists, transcript status).
- **Socket events** drive captions, viewer count, reactions, Q&A — held in hook-local `useState`.
- **Accessibility prefs** persist to `localStorage` under `caption-a11y-prefs`.
- **Dark mode** managed by `DarkModeContext`, persists to `localStorage` under `caption-theme`.

### Key components

**`CaptionDisplay`** (`components/CaptionDisplay.tsx`) — two variants: `'box'` (presenter) and `'flat'` (audience). `role="log"` + `aria-live="polite"`. Auto-scrolls on segment change. Shows a spinner on translating segments.

**`LanguagePickerModal`** (`components/LanguagePickerModal.tsx`) — used for both audience language selection and presenter recognition language. Keyboard-accessible, `aria-modal="true"`.

**`DashboardShell`** — layout shell with `headerActions`, `left`, `main`, `right`, `fillMain` slot props. The `right` slot shows `QAPanel` at `xl` breakpoint; a modal button below that.

### Socket client

Single exported instance at `apps/web/src/lib/socket.ts`. `autoConnect: false` — hooks connect imperatively. Auth token is read from the Supabase session at connect time.

---

## Database Schema

Hosted Supabase (PostgreSQL). Migrations in `supabase/migrations/` (7 files). No local Supabase CLI setup.

### Tables

**`events`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `code` | text UNIQUE | Short join code |
| `title` | text | |
| `description` | text | nullable |
| `status` | text | `'upcoming'` \| `'live'` \| `'ended'` |
| `event_date` | timestamptz | nullable |
| `languages` | text[] | Stores Azure short codes (e.g. `'en'`, `'mi'`) |
| `organiser_id` | uuid FK → `auth.users` | nullable |
| `phrase_list` | text[] | Speech recognition hints |
| `organiser_name` | text | nullable |
| `image_url` | text | nullable |
| `logo_url` | text | nullable |
| `theme_color` | text | nullable |

**`caption_segments`** — one row per language per final caption
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid FK → `events` CASCADE | |
| `sequence` | integer | Shared across languages for the same utterance |
| `text` | text | Caption text in this language |
| `language` | text | Azure short code (e.g. `'en'`, `'mi'`) |
| `is_final` | boolean | Only final segments are persisted |

**`transcripts`** — one per event (unique index enforces this)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid FK → `events` CASCADE | |
| `status` | text | `'pending'` \| `'processing'` \| `'ready'` \| `'failed'` |
| `generated_at` | timestamptz | nullable |

**`transcript_languages`** — one row per language per transcript (unique index enforces this)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `transcript_id` | uuid FK → `transcripts` CASCADE | |
| `language` | text | Azure short code |
| `content` | text | Full rendered transcript text |

**`qa_questions`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_id` | uuid FK → `events` CASCADE | |
| `body` | text | |
| `language` | text | default `'en'` |
| `translations` | jsonb | All translations in a single column (different from transcript_languages pattern) |
| `status` | text | `'pending'` \| `'pinned'` \| `'dismissed'` |

### RLS summary

Public reads on all tables (`using (true)`). Writes on `caption_segments`, `transcripts`, `transcript_languages`, `qa_questions` use `with check (true)` — intended to be enforced at the application layer (service role key on the API). Events allow insert/update only for the owning organiser (`auth.uid() = organiser_id`).

---

## Socket.IO Events Reference

### Client → Server

| Event | Payload | Who sends |
|---|---|---|
| `event:join` | `code: string` | Audience |
| `event:leave` | `code: string` | Audience |
| `session:start` | `{ code, locale? }` | Organiser |
| `session:end` | `code: string` | Organiser |
| `session:set-language` | `{ code, locale }` | Organiser |
| `session:set-mode` | `{ code, mode: 'single' \| 'dual' }` | Organiser |
| `audio:chunk` | `ArrayBuffer` (PCM Int16) | Presenter |
| `audio:subscribe` | `{ code, language }` | Audience |
| `audio:unsubscribe` | `{ code, language }` | Audience |
| `qa:submit` | `{ code, body, language }` | Audience |
| `qa:moderate` | `{ code, questionId, status }` | Organiser |
| `reaction:send` | `{ code, emoji }` | Audience |

### Server → Client

| Event | Payload | Notes |
|---|---|---|
| `caption:segment` | `CaptionSegmentPayload` | May arrive twice per utterance: source-only then with translations |
| `caption:history` | `{ segments }` | Last 20 final segments sent on join |
| `caption:error` | `{ message, fatal }` | `fatal: true` closes the session |
| `viewer:count` | `{ count: number }` | Broadcast on join/leave/disconnect |
| `audio:tts` | `{ language, sequence, data: ArrayBuffer }` | Full MP3 — Azure TTS (non-Māori) |
| `audio:tts-stream` | `{ language, sequence, chunk: ArrayBuffer, done: boolean }` | PCM chunks — OpenAI TTS (te reo). `done: true` is the terminal sentinel |
| `qa:history` | `{ questions }` | Up to 50 non-dismissed questions on join |
| `qa:new` | `{ question }` | New question broadcast to room |
| `qa:update` | `{ question }` | After moderation |
| `reaction:burst` | `{ emoji, count }` | Never persisted |

---

## Testing

### Framework
Both apps use **Vitest** with `vitest run` (single-pass, no watch).

### API tests (`apps/api/src/__tests__/` — 11 files)
Pattern: mix of HTTP integration tests (supertest against the real Express `app`) and unit tests for service classes. Mocking: `vi.mock()` at module level. Azure SDK mocked wholesale. Supabase mocked with chainable builder helpers.

Run with `pnpm --filter api test`.

| File | Covers |
|---|---|
| `auth.test.ts` | `GET /api/auth/me` |
| `events.test.ts` | `POST /api/events`, `GET /api/events/:code` |
| `translate.test.ts` | `POST /api/translate` route |
| `AzureSession.test.ts` | AzureSession start/stop/pushChunk |
| `DualAzureSession.test.ts` | Two sessions with shared sequence counter |
| `PapaReoSession.test.ts` | WebSocket session lifecycle |
| `EventManager.test.ts` | Session lifecycle singleton |
| `SocketHandler.test.ts` | Connection, auth rejection, room join/leave |
| `AudioSubscriptionManager.test.ts` | Subscribe/unsubscribe/disconnectAll |
| `TtsService.test.ts` | Synthesize returns buffer or null |
| `languageMap.test.ts` | BCP-47 conversion pure functions |

### API integration tests (`apps/api/src/__tests__/integration/` — 4 files)
Call real Azure Speech, Azure Translator, and OpenAI APIs. Require API keys in `apps/api/.env`. Skip cleanly when keys are absent (checked against placeholder sentinel). Run with `pnpm --filter api test:integration`. Timeout: 30s per test.

WAV fixtures committed at `apps/api/src/__tests__/fixtures/audio/` (16kHz/16-bit/mono PCM WAV). Regenerate with `pnpm --filter api generate-audio` if phrases change.

| File | Covers |
|---|---|
| `stt.integration.test.ts` | AzureSession recognises `en-hello.wav`; OpenAiSttSession recognises `mi-kia-ora.wav` |
| `translate.integration.test.ts` | `translateText` for en→mi, en→fr, mi→en, mi→fr |
| `tts.integration.test.ts` | Azure TTS produces valid MP3 for `en`/`fr`; OpenAI TTS produces valid PCM stream for `mi` |
| `pipeline.integration.test.ts` | All 6 source→target combos end-to-end: en→en, en→mi, en→fr, mi→mi, mi→en, mi→fr |

Helpers in `integration/helpers.ts`: `stripWavHeader`, `fuzzyMatch` (normalised Levenshtein), `isValidMp3`, `isValidPcmStream`, `collectSegment` (collects all final STT segments until 1.5s quiet window, joined).

### Web tests (`apps/web/src/__tests__/` — 9 files)
Pattern: React Testing Library (`render`, `screen`, `fireEvent`, `waitFor`). No `@testing-library/jest-dom` — assertions use `.toBeDefined()`, `.toBeNull()`. `jsdom` environment.

Framer-motion is mocked globally via `src/__tests__/setup.tsx`, registered in `vite.config.ts` `setupFiles`. Do not add per-file `vi.mock('framer-motion', ...)`.

| File | Covers |
|---|---|
| `CaptionDisplay.test.tsx` | 14 cases — rendering, variants, accessibility |
| `LanguagePickerModal.test.tsx` | 9 cases — open/close, search, callbacks |
| `TranscriptDownload.test.tsx` | Smoke test |
| `useCaptions.test.ts` | Socket connect, join, segment/history listeners |
| `useAudioPlayer.test.ts` | Subscribe, TTS listeners, cleanup |
| `useAuth.test.ts` | Session init, isAuthenticated, getToken, signIn error, cleanup |
| `useAudioCapture.test.ts` | Initial state, start/stop emissions, getUserMedia error, teardown |
| `ProtectedRoute.test.tsx` | Loading state, authenticated renders children, unauthenticated redirects |
| `LoginPage.test.tsx` | Form render, signIn call, error display, navigate on success |

### Notable gaps
- No tests for remaining page-level components (SignupPage, DashboardPage, EventPage, PresentPage, CreateEventPage)
- No tests for remaining hooks (`useQA`, `useReactions`, `useViewerCount`, `useAccessibility`, `useCountdown`)
- No socket integration or E2E tests (Playwright is configured at root but no tests exist)
- `TranscriptProcessor` has no unit tests

---

## Key Gotchas

**BCP-47 vs Azure short codes are two different things.** `Event.languages` stores Azure short codes (`'en'`, `'mi'`, `'zh-Hans'`). STT sessions use BCP-47 (`'en-NZ'`, `'mi-NZ'`). The mapping lives in `RECOGNITION_LOCALES`. Three languages have no STT entry by design (`sm`, `to`, `fj`); `mi` routes to Papa Reo instead.

**`noUnusedLocals: true` in web.** Any unused import in `apps/web` is a TypeScript compile error. The web tsconfig also excludes `src/__tests__` from compilation.

**framer-motion is globally mocked.** `src/__tests__/setup.tsx` provides the mock via `setupFiles` in `vite.config.ts`. Do not add per-file `vi.mock('framer-motion', ...)` — it is redundant.

**`Event.languages` is documented as BCP-47 in types.ts but stores short codes in practice.** The insert at `events.ts:34` maps `NZ_LANGUAGES` (short codes) directly into it. Trust the code over the comment.

**Transcript status polling.** `PresentPage` polls `GET /api/events/:code/transcript` every 3 seconds while status is `'pending'` or `'processing'`, then disables the query. Implemented via TanStack Query `refetchInterval` with a function (`PresentPage.tsx:63`).
