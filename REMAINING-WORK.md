# Caption Aotearoa — Remaining Work for Full Product

**Deadline:** 2026-06-30 (grant showcase)
**Spec:** `docs/superpowers/specs/2026-03-19-caption-aotearoa-design.md`

Everything below is what remains after the MVP build. Items are grouped by domain and roughly ordered by dependency.

---

## What's Already Done (MVP)

- Real-time captioning pipeline: mic → AudioWorklet PCM → Socket.io → Azure TranslationRecognizer → caption broadcast
- Three speech backends: Azure single-language, Azure dual-language (en-NZ + mi-NZ), Papa Reo (te reo Māori)
- 36 NZ census "instant" languages + 100+ on-demand translated languages via Azure Translator
- Organiser flow: password login, event creation, presenter page with mic control + QR code
- Audience flow: join by 6-char code, event lobby with countdown, live captions, language picker (instant + translated tiers)
- JWT auth with protected routes (API middleware + frontend `ProtectedRoute`)
- Supabase persistence for events and caption segments
- On-demand translation endpoint (`POST /api/translate`) with caching
- Reconnection handling (caption history on rejoin)
- Azure session auto-recovery on non-fatal errors
- Whaikaha colour palette + Roboto/Roboto Serif typography
- Azure mock infrastructure (`AZURE_MOCK=true`) for cost-free testing
- Basic test suite: auth, events, AzureSession, EventManager (Vitest)

---

## 1. Authentication — Supabase Auth

Replace the shared-password JWT system with real user accounts.

- [ ] Add `@supabase/auth-helpers-react` or equivalent to `apps/web`
- [ ] Create `/signup` page — email/password or magic link registration
- [ ] Replace `/organiser-login` with `/login` page using Supabase Auth
- [ ] Replace `verifyJWT` middleware with Supabase session verification on the API
- [ ] Add `organiser_id uuid references auth.users not null` to `events` table
- [ ] Add RLS policies:
  - `events`: organisers read/write own rows; public read all
  - `caption_segments`: service role writes; public reads
- [ ] Remove `PRESENTER_SECRET` and `JWT_SECRET` env vars from config and deployment
- [ ] Update `ProtectedRoute` to use Supabase auth state instead of localStorage JWT

## 2. Database Schema & Migrations

- [ ] Create and check in Supabase migration files for the MVP schema (`events`, `caption_segments`)
- [ ] Add migration for `organiser_id` column on `events`
- [ ] Create `transcripts` table (`id`, `event_id`, `status`, `generated_at`)
- [ ] Create `transcript_languages` table (`id`, `transcript_id`, `language`, `content`)
- [ ] Add RLS policies for `transcripts` and `transcript_languages` (service role writes, public reads)
- [ ] Add `phrase_list text[]` column to events (defined in spec but not currently used in create form)

## 3. Organiser Dashboard

New pages replacing the minimal create-and-present flow.

- [ ] `/dashboard` — list of organiser's events with status badges, sorted by date
- [ ] `/dashboard/events/[id]` — event detail page:
  - Edit event (title, description, date, phrase list, languages)
  - QR code display button
  - Start/end captioning controls
  - Transcript status + download (once implemented)
  - Event analytics (audience count, duration, languages used)
- [ ] `/dashboard/events/[id]/present` — move presenter functionality here from `/present/:code`

## 4. Public Event Browse

Replace the simple `JoinForm` on `/` with a richer landing page.

- [ ] Searchable event listing with cards (title, date, status badge, language count)
- [ ] Search bar filtering by title
- [ ] Status badges: upcoming (purple), live (green pulse), ended (grey)
- [ ] Keep the join-by-code input as an alternative entry point

## 5. Transcript Post-processing

Automatic transcript cleanup using Claude API after events end.

- [ ] Add `ANTHROPIC_API_KEY` to API config and deployment env vars
- [ ] Create `TranscriptProcessor` service:
  - Triggered when event status → `ended`
  - Fetches all final `caption_segments` ordered by sequence
  - Concatenates per language
  - Sends to Claude API (claude-haiku) with cleanup prompt
  - Stores results in `transcript_languages`
  - Updates `transcripts.status` (`pending` → `processing` → `ready` / `failed`)
- [ ] `POST /api/events/:id/transcript/retry` — re-run on failure
- [ ] Dashboard UI: status indicator (spinner/retry/download) based on transcript status

## 6. Transcript Download

- [ ] `GET /api/events/:id/transcript` — returns `{ status, languages: [{ language, content }] }`
- [ ] Client-side PDF generation with jsPDF:
  - Language picker (English + optional second language)
  - Layout: event title + date header, English body, optional second language section
- [ ] Download button on event detail page and audience post-event view
- [ ] Add jsPDF dependency to `apps/web`

## 7. Audience Accessibility Features

- [ ] **Font size slider** — range 1.25rem to 3rem, persisted in localStorage
- [ ] **High contrast toggle** — `#1e1c20` background with white text
- [ ] Add controls to the audience `EventPage` header/settings area
- [ ] Persist preferences in localStorage so they survive page refreshes

## 8. Animations — Framer Motion

- [ ] Add `framer-motion` dependency to `apps/web`
- [ ] Caption segments: fade-in per line as they arrive
- [ ] Page transitions: smooth route changes
- [ ] QR modal: scale-in animation on open
- [ ] Keep animations subtle and respect `prefers-reduced-motion`

## 9. Māori Design Elements

- [ ] SVG decorative tohu patterns inspired by Whaikaha's design language
- [ ] Use as section decorators on key pages (home, dashboard, event lobby)
- [ ] Commission originals or create inspired designs — do not copy wholesale

## 10. Production Deployment

- [ ] **Frontend (Vercel):** configure static deploy for `apps/web`
- [ ] **API (Railway):** migrate from Render config to Railway (persistent process needed for WebSockets + Azure SDK)
- [ ] Verify HTTPS is active on Railway before go-live (required for `getUserMedia`)
- [ ] Add `PAPAREO_TOKEN` and `ANTHROPIC_API_KEY` to deployment env vars
- [ ] Fix PORT env var parsing in `apps/api/src/config.ts` (currently commented out — Railway sets PORT dynamically)
- [ ] Set `CLIENT_URL` to match the Vercel domain for CORS
- [ ] Domain setup: `caption.aotearoa.nz` or equivalent

## 11. Test Coverage

Gaps identified in `TESTING-PLAN.md` that remain unimplemented:

### API tests (Vitest)
- [ ] `DualAzureSession.test.ts` — dual-mode creates 2 sessions, shared sequence counter, pushChunk forwards to both
- [ ] `PapaReoSession.test.ts` — WebSocket connection, audio chunk forwarding, transcription events
- [ ] `SocketHandler.test.ts` — auth rejection, room join/leave, caption:history on join, audio:chunk routing
- [ ] `translate.test.ts` — batch translation, caching, error handling
- [ ] `languageMap.test.ts` — BCP-47 ↔ translation code conversions

### Frontend tests (Vitest + jsdom)
- [ ] Configure Vitest for `apps/web` with jsdom environment
- [ ] `CaptionDisplay.test.tsx` — renders segments, `role="log"`, `aria-live`, interim vs final styling
- [ ] `useCaptions.test.ts` — mock socket, caption:segment events, locale switching, on-demand polling

### E2E tests (Playwright)
- [ ] Install Playwright at repo root
- [ ] Configure with `AZURE_MOCK=true` and fake microphone (Chromium flags)
- [ ] Full flow: create event → join → see captions
- [ ] Multiple audience members see identical captions
- [ ] Late joiner receives caption history
- [ ] On-demand translation polling

### Smoke test
- [ ] Real Azure test (`AZURE_LIVE=true`), manual pre-release, ~$0.02/run
- [ ] Fuzzy assertion on transcription output

### CI
- [ ] Add test scripts to root `package.json` (`test`, `test:e2e`, `test:all`)
- [ ] Configure CI pipeline to run unit + integration + E2E on PR

## 12. Misc / Cleanup

- [ ] Check in Supabase migration DDL (no schema files in repo currently)
- [ ] Add phrase list input to the event creation form (spec mentions it, not currently in UI)
- [ ] Remove or update `render.yaml` if migrating to Railway
- [ ] Update `readme.md` with deployment and contribution instructions
