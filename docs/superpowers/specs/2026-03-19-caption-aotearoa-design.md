# Caption Aotearoa — Design Spec

**Date:** 2026-03-19
**Grant:** Access Activator Scale Stage — $100k (application due 2026-03-29)
**Showcase:** Late June–July 2026

> **Build phases**
> - **MVP** (by 2026-03-29): working and tested with pilot user for grant application
> - **Full** (by 2026-06-30): complete product for grant showcase
>
> Every section below is tagged [MVP] or [Full].

---

## Overview

Caption Aotearoa is a browser-based live captioning platform for community events in New Zealand. An event organiser streams audio from a presenter's device to the server, which transcribes and translates it in real time via Azure Cognitive Services, then broadcasts live captions to audience members' phones. No app install required.

The platform directly addresses the gap between expensive professional CART captioning ($150+/hour) and personal-only tools like Google Live Transcribe. It serves Deaf, hard-of-hearing, and multilingual communities across Aotearoa.

**Pilot user:** A Deaf community member who will validate the core captioning experience before the grant application.

---

## Grant Fit

- **Digital & Information Systems** priority area
- Lived experience criterion: Deaf pilot user + disability community partnerships
- Feasibility: fully browser-based, no app install, deployable within grant timeline
- Measurable impact: events captioned, audience reach, languages served
- Unique NZ angle: te reo Māori phrase support, cultural design language matching Whaikaha

---

## Tech Stack

**Monorepo structure:**
```
apps/
  web/    # Vite + TypeScript + Tailwind + TanStack Query + Axios + Lucide React
  api/    # Node.js + TypeScript + Express + Socket.io + Azure Speech SDK
packages/
  shared/ # Shared TypeScript types
```

**Database:** Supabase (Postgres + Auth + RLS) [Full — MVP uses simplified schema]
**Transcription/Translation:** Azure Cognitive Services — TranslationRecognizer [MVP + Full]
**AI transcript cleanup:** Claude API (claude-haiku) [Full]
**PDF generation:** jsPDF (client-side) [Full]
**QR codes:** react-qr-code (client-side) [MVP]
**Animations:** Framer Motion [Full]

---

## Environment Variables

### `apps/api`
```
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=           # e.g. "australiaeast"
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=     # server-side only, never exposed to client
ANTHROPIC_API_KEY=             # Full only — transcript post-processing
PRESENTER_SECRET=              # MVP only — checked server-side on POST /api/auth/login
JWT_SECRET=                    # MVP only — signs/verifies organiser session tokens
PORT=3002
CLIENT_URL=                    # for CORS, e.g. "http://localhost:5173"
```

### `apps/web`
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=                  # e.g. "http://localhost:3002"
```

> **HTTPS requirement:** Browsers block `getUserMedia` (microphone access) on non-HTTPS origins except `localhost`. The Railway deployment must have TLS configured before the presenter flow will work in production.

---

## Data Model

### MVP schema (no auth, simplified)

```sql
events
  id          uuid primary key default gen_random_uuid()
  code        text unique not null        -- 6-char join code e.g. "KAI492"
  title       text not null
  description text
  status      text default 'upcoming'    -- 'upcoming' | 'live' | 'ended'
  event_date  timestamptz
  phrase_list text[]                     -- custom vocab e.g. ["karakia","wharenui"]
  languages   text[]                     -- enabled Azure locales e.g. ["mi-NZ","sm-WS"]
  created_at  timestamptz default now()

caption_segments
  id          uuid primary key default gen_random_uuid()
  event_id    uuid references events not null
  sequence    bigint not null            -- monotonic, assigned by server at insert time
  text        text not null
  language    text not null default 'en-NZ'
  is_final    boolean default false
  created_at  timestamptz default now()
```

For MVP, `organiser_id` is omitted. Event creation and presenting are protected by a simple password login:

- `/organiser-login` — password input field (type=password), submits via `POST /api/auth/login` with `{ password }` in the request body
- API compares against `PRESENTER_SECRET` env var, returns a signed JWT (short-lived, 24h)
- Client stores JWT in localStorage, attaches as `Authorization: Bearer <token>` header on all organiser API calls
- `/create` and `/present/[code]` check for valid JWT client-side (redirect to `/organiser-login` if missing/expired) and server-side (401 if invalid)
- Secret never appears in a URL, query string, or browser history

This is replaced by Supabase Auth in the Full phase.

### Full schema (adds auth + transcripts)

```sql
-- events gains:
  organiser_id  uuid references auth.users not null

-- new tables:
transcripts
  id            uuid primary key default gen_random_uuid()
  event_id      uuid references events unique
  status        text default 'pending'   -- 'pending' | 'processing' | 'ready' | 'failed'
  generated_at  timestamptz

transcript_languages
  id              uuid primary key default gen_random_uuid()
  transcript_id   uuid references transcripts not null
  language        text not null          -- BCP-47 locale e.g. 'en-NZ', 'mi-NZ'
  content         text not null
  -- index: (transcript_id)
  -- cascade: on delete of transcripts, delete transcript_languages
```

**RLS rules (Full):**
- `events`: organisers read/write own rows; public read all
- `caption_segments`: API server writes (service role); public reads
- `transcripts` / `transcript_languages`: API server writes (service role); public reads

---

## Supported Languages

Azure BCP-47 locale codes used throughout (Socket.io events, DB records, UI labels):

| Label | Azure locale |
|-------|-------------|
| English (NZ) | `en-NZ` |
| Te reo Māori | `mi-NZ` |
| Samoan | `sm-WS` |
| Tongan | `to-TO` |
| default source | `en-NZ` |

> Note: `mi-NZ` support in Azure Translation is limited. Verify locale availability in the target Azure region during setup. Fall back to `mi` if `mi-NZ` is not available.

---

## Pages

### [MVP] Core pages
| Route | Description |
|-------|-------------|
| `/` | Simple join-by-code form + event title lookup |
| `/event/[code]` | Audience caption view |
| `/organiser-login` | Password form — POSTs to `/api/auth/login`, stores JWT |
| `/create` | Simple event creation form (JWT-gated) |
| `/present/[code]` | Organiser captioning session (JWT-gated) |

### [Full] Full page set
| Route | Description |
|-------|-------------|
| `/` | Browse/search events — cards, search bar, status badges |
| `/event/[code]` | Audience caption view (extended with language switcher, font/contrast) |
| `/login` | Supabase Auth — email/password or magic link |
| `/signup` | Organiser registration |
| `/dashboard` | Organiser's events list |
| `/dashboard/events/[id]` | Event detail — edit, QR code, start/end captioning, transcript download |
| `/dashboard/events/[id]/present` | Live captioning session |

All routes using `[code]` resolve the event by its 6-char code. The server looks up the UUID via `SELECT id FROM events WHERE code = $1`. The Socket.io room identifier is the 6-char code (e.g. `"KAI492"`).

The audience URL encoded in the QR code is: `https://<domain>/event/<CODE>` — e.g. `https://caption.aotearoa.nz/event/KAI492`.

---

## User Flows

### Organiser flow [MVP]
1. Visit `/organiser-login` → enter password → POST → JWT stored in localStorage
2. Redirected to `/create` → enter title, description, date, phrase list, languages → submit
3. Redirected to `/present/[code]` → click "Start Captioning" → browser requests mic permission
4. Azure TranslationRecognizer processes audio, captions broadcast to audience
5. Click "End Event"

### Organiser flow [Full]
1. Sign up → `/dashboard` → "New Event" → full event form
2. Event detail: "Display Code" → fullscreen QR overlay
3. "Start Captioning" → live session page
4. "End Event" → transcript generation fires in background
5. "Download Transcript" when ready

### Audience flow [MVP + Full]
1. Scan QR or enter code at `/` → `/event/[code]`
2. Captions appear live, auto-scrolling
3. Pick language from available options [Full: switchable mid-event]
4. [Full] Adjust font size and contrast
5. [Full] After event: "Download Transcript"

---

## Real-time Captioning Architecture

### Audio streaming protocol

**Browser → Server:**
```
Socket.io event: "audio:chunk"
Payload: ArrayBuffer (raw PCM, 16kHz, 16-bit mono, little-endian)
Chunk interval: 100ms (captured via Web Audio API ScriptProcessorNode or AudioWorkletNode)
```

**Server → Azure:**
```typescript
// PushAudioInputStream setup (per AzureSession instance)
const pushStream = AudioInputStream.createPushStream(
  AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
)
// On each "audio:chunk" from Socket.io:
pushStream.write(Buffer.from(arrayBuffer))
// On session end:
pushStream.close()
```

**Server → Audience:**
```
Socket.io event: "caption:segment"
Payload: {
  id: string          // segment UUID
  segments: {         // one entry per enabled language + source
    "en-NZ": "text",
    "mi-NZ": "text",
    ...
  }
  isFinal: boolean
  sequence: number
}
```

**Reconnection handling:**
- On audience reconnect, server sends last 20 final segments as `caption:history` event before resuming live stream:
  ```
  Socket.io event: "caption:history"
  Payload: { segments: Array<{ id, segments: Record<locale, string>, sequence, isFinal: true }> }
  ```
  Client merges into local state by sequence number, deduplicating any already-received segments
- Interim (non-final) segments are not replayed — audience rejoins the live stream cold for interim

**Azure session failure mid-event:**
- On Azure SDK error event: server emits `caption:error` to the room with `{ message: "Captioning interrupted, attempting to reconnect..." }`
- Server attempts to recreate the AzureSession once — creates a **new** `PushAudioInputStream` and a **new** `TranslationRecognizer` (the Azure SDK does not support reusing a push stream after a recognizer error)
- If reconnect fails: emits `caption:error` with `{ fatal: true }`, organiser UI shows "Captioning stopped — please restart"
- Audience UI shows a banner: "Live captions interrupted"

### Full architecture flow

```
Presenter browser
  → AudioWorkletNode captures raw PCM (16kHz, 16-bit mono)
  → Socket.io "audio:chunk" (ArrayBuffer) → API server

API server (per live event)
  → AzureSession.pushStream.write(chunk)
  → TranslationRecognizer fires recognized/recognizing events
  → Maps to caption:segment payload with all language variants
  → Assigns monotonic sequence number
  → Broadcasts Socket.io "caption:segment" to room "[code]"
  → On isFinal: persists one caption_segments row per language to Supabase

Audience browser
  → Joins Socket.io room "[code]" on load
  → Receives caption:history on join (last 20 final segments)
  → Receives caption:segment live
  → Stores all segments in local array (all language variants)
  → Renders selectedLanguage slice only
  → Language switch: change selectedLanguage state → instant re-render from local store
```

**Backend services:**
- `EventManager` — `Map<code, AzureSession>` of active sessions
- `AzureSession` — wraps TranslationRecognizer + PushAudioInputStream per live event
- `SocketHandler` — manages rooms, routes audio chunks, broadcasts segments, handles reconnects
- `TranscriptProcessor` — [Full] fires on event end, calls Claude API, stores cleaned output

---

## Transcript Post-processing [Full]

Triggered automatically when event status changes to `ended`.

**Flow:**
1. Set `transcripts.status = 'processing'`
2. Fetch all `caption_segments` where `event_id = X AND is_final = true`, ordered by `sequence ASC`
3. Concatenate per language
4. POST to Claude API (claude-haiku) per language with prompt:
   > "The following is a live speech transcript captured via voice recognition at a community event in New Zealand. Clean it up to be human-readable: fix punctuation, join broken sentences, correct obvious transcription errors, preserve the meaning and speaker voice. Do not add content that was not spoken."
5. Store each result in `transcript_languages`
6. Set `transcripts.status = 'ready'`, `generated_at = now()`
7. On failure: set `status = 'failed'`

**Retry:** Dashboard shows a "Retry" button when status is `failed`. Clicking it POSTs to `POST /api/events/:id/transcript/retry` which re-runs the processor.

**Download:**
- Available to all users (organiser + audience) after event ends
- Client calls `GET /api/events/:id/transcript` → returns `{ status, languages: [{ language, content }] }`
- User picks English + optional second language → PDF generated client-side (jsPDF)
- PDF layout: event title + date header, English body, optional second language section below
- Status `processing`: spinner; `failed`: retry button; `ready`: download button

---

## Additional Features [Full unless noted]

### Te reo + custom phrase list [MVP]
- Organiser adds phrases during event creation (comma-separated textarea)
- Loaded into Azure PhraseListGrammar on AzureSession start
- Improves accuracy for te reo, names, event-specific terminology

### Font size + high contrast [Full]
- Audience-side, persisted in localStorage
- Font size: slider 1.25rem → 3rem
- High contrast: `#1e1c20` background, white text

### Language switching [Full]
- Pill buttons for each enabled language
- All variants stored locally per segment — switch is instant, no server call

### QR code display [Full]
- Fullscreen overlay: large QR + 6-char code + event title
- URL encoded: `https://<domain>/event/<CODE>`
- Purple-on-sand design, one-tap to close

---

## Visual Design System

Mirrors Whaikaha's design language. Source: `https://www.whaikaha.govt.nz/_resources/themes/mdp/dist/mdp.css`

**Tailwind config custom colours:**
```js
colors: {
  'brand-purple':      '#493276',
  'brand-purple-dark': '#2c1e47',
  'brand-navy':        '#253e51',
  'brand-sand':        '#fdfdf0',
  'brand-black':       '#1e1c20',
  'brand-error':       '#9d2020',
}
```

**Typography (Google Fonts):**
- Headings: `Roboto Serif`
- Body: `Roboto`
- Body: `1.125rem` / line-height `1.75`
- H1: up to `3.815rem` responsive

**Component patterns:**
- Buttons: pill-shaped (`border-radius: 9999px`), purple/white primary, sand/purple-border secondary
- Inputs: sand background, purple border, purple focus ring
- Cards: sand/white background, `0.5rem` radius, subtle purple border
- Spacing: generous — `4rem–5rem` section padding

**Animations [Full]:** Framer Motion — caption segments fade in per line, page transitions, QR modal scale-in

**Māori design elements:** SVG decorative tohu patterns. Source: extract directly from Whaikaha's live site HTML (inspect `<svg>` elements used as section decorators) or commission originals. Do not copy wholesale — use as visual reference only.

**Caption display:**
- Default: sand background, `#1e1c20` text, `Roboto` at `1.5rem`
- Interim captions: `#493276` muted; final: `#1e1c20` full
- High contrast: `#1e1c20` background, white text

---

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend (`web`) | Vercel | Static deploy |
| Backend (`api`) | Railway | Persistent process — required for WebSockets + Azure SDK |
| Database | Supabase | Hosted Postgres |
| Azure Speech | Azure Cognitive Services | ~$1/hr audio, pay-per-use |

> Railway automatically provisions TLS. Ensure `CLIENT_URL` env var matches the Vercel domain for CORS.

---

## MVP Checklist (must be done by 2026-03-29)

- [ ] Monorepo scaffolded (Vite web + Express api + shared types)
- [ ] `POST /api/auth/login` — validates PRESENTER_SECRET, returns signed JWT
- [ ] `/organiser-login` page — password field, POST, stores JWT in localStorage
- [ ] Azure TranslationRecognizer wired to PushAudioInputStream
- [ ] Web Audio API PCM capture → Socket.io "audio:chunk"
- [ ] Socket.io room broadcast of caption:segment
- [ ] `/create` — basic event creation form (JWT-gated), stores to Supabase
- [ ] `/event/[code]` — audience caption display (English only)
- [ ] `/present/[code]` — organiser mic control (JWT-gated)
- [ ] QR code display on present page
- [ ] Whaikaha colour palette + Roboto/Roboto Serif applied
- [ ] Te reo phrase list loaded into Azure session
- [ ] Tested end-to-end with Deaf pilot user

## Full Product Checklist (by 2026-06-30)

- [ ] Supabase Auth (signup/login) replacing secret gate
- [ ] Full organiser dashboard
- [ ] Public event browse/search page with cards
- [ ] Language switching (mid-event, all Pacific languages)
- [ ] Font size slider + high contrast toggle
- [ ] Transcript post-processing (Claude API)
- [ ] Transcript download (PDF, bilingual)
- [ ] WebSocket reconnection + Azure session recovery
- [ ] Framer Motion animations
- [ ] Māori SVG decorative elements
- [ ] Production deployment (Vercel + Railway)
- [ ] HTTPS confirmed on Railway before go-live
