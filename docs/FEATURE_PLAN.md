# Caption Aotearoa — Feature Implementation Plan

## Context

Captain Aotearoa is a live captioning app for NZ community events. Core captioning works well (Azure STT, 36 languages, TTS, dark mode, font sizing). This plan adds 7 features to improve UI polish, audience interaction, accessibility, event branding, and post-event value. Features are ordered by the user's priority.

**Dropped features:** Te Reo Glossary (#8, needs te reo STT first), NZSL Fingerspelling (#9, too much effort for professional quality), Analytics (#10, lower priority).

**Build order:** 4 → 6 → 3 → 1 → 2 → 5 → 7

---

## Feature 4: Animated Hero & Home Page Polish

**Goal:** Replace static hero with an animated product demo and add scroll-triggered reveal animations throughout the home page.

### Changes

**`apps/web/src/pages/HomePage.tsx`**
- Hero section: Add a looping demo video/animation showing the scan-to-caption flow (MP4 with `<video autoPlay muted loop playsInline>` and a poster fallback image). Wrap in a device mockup frame (phone outline SVG). Use `useReducedMotion()` — if true, show static poster image instead.
- Hero text: Stagger fade-in animation on h1, p, and JoinForm using `motion.div` with `variants` and `staggerChildren: 0.15`.
- Features section: Use `motion.div` with `whileInView={{ opacity: 1, y: 0 }}` and `viewport={{ once: true }}` for each feature card. Stagger with `transition.delayChildren`.
- Stats section: Animated counter (count up from 0 to target value) using `useInView` from framer-motion + `useSpring`/`useTransform`. For "<1s" use a simple fade-in.
- Events section: Stagger grid items on mount. Add skeleton loading cards.

**`apps/web/src/components/EventCardSkeleton.tsx`** (new)
- Pulsing placeholder matching EventCard dimensions (rounded-xl, shimmer effect on title/date/description blocks).

**`apps/web/src/components/AnimatedCounter.tsx`** (new)
- Takes `target: number`, `suffix?: string`. Uses framer-motion `useSpring` + `useInView` to count up.

**Pattern:** Follow existing framer-motion conventions — `useReducedMotion()` guard, `{ opacity: 0, y: 8 }` entry, 0.2–0.3s easeOut.

---

## Feature 6: Subtle UI Animations & Polish

**Goal:** Page transitions, micro-interactions, improved loading states, sidebar animation refinement.

### Changes

**`apps/web/src/router.tsx`**
- Wrap `<Routes>` in `<AnimatePresence mode="wait">`. Add `useLocation()` and pass `location.pathname` as `key` to a `<motion.div>` wrapper around `<Routes>`.
- Page enter: `{ opacity: 0, y: 12 }` → `{ opacity: 1, y: 0 }`, 0.25s easeOut.
- Page exit: `{ opacity: 0 }`, 0.15s.

**`apps/web/src/styles/index.css`**
- `.btn-primary`: Add `active:scale-[0.97] transition-all` for press feedback.
- `.btn-secondary`: Same press scale.
- Add skeleton shimmer keyframe: `@keyframes shimmer` with gradient slide.

**`apps/web/src/components/DashboardShell.tsx`**
- Wrap mobile backdrop in `<AnimatePresence>` with `motion.div` fade (opacity 0→1, 0.2s).
- Sidebar: Switch from CSS `translate-x` to framer-motion `motion.aside` with spring physics (`type: "spring", damping: 25, stiffness: 300`).

**`apps/web/src/pages/CreateEventPage.tsx`**
- On successful creation: brief success animation (checkmark + confetti burst) before navigating to presenter view. Use `canvas-confetti` library (lightweight, ~3KB).

---

## Feature 3: Audience Q&A

**Goal:** Audience submits translated questions from their phones. Presenter sees them in a Q&A panel and can pin/dismiss them.

### Database

**`supabase/migrations/006_qa_questions.sql`** (new)
```sql
create table if not exists qa_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  body text not null,
  language text not null,
  translations jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','pinned','dismissed')),
  created_at timestamptz not null default now()
);
create index idx_qa_questions_event on qa_questions(event_id, created_at);
alter table qa_questions enable row level security;
create policy "Anyone can read questions" on qa_questions for select using (true);
create policy "Anyone can submit questions" on qa_questions for insert with check (true);
create policy "Service can update questions" on qa_questions for update using (true);
```

### Shared Types

**`packages/shared/src/types.ts`** — Add:
- `QaQuestion` interface: `id, event_id, body, language, translations: Record<string, string>, status, created_at`
- `QaSubmitPayload`: `{ code: string; body: string; language: string }`
- `QaQuestionPayload`: `{ question: QaQuestion }`
- `QaModeratePayload`: `{ code: string; questionId: string; status: 'pinned' | 'dismissed' }`
- Add to `ClientToServerEvents`: `'qa:submit'`, `'qa:moderate'`
- Add to `ServerToClientEvents`: `'qa:new'`, `'qa:update'`, `'qa:history'`

### API

**`apps/api/src/services/SocketHandler.ts`** — Add handlers inside existing `connection` block:
- `qa:submit`: Insert into DB, translate via Azure Translator (reuse pattern from `translate.ts`), broadcast `qa:new` to room.
- `qa:moderate`: Auth-gated. Update status in DB, broadcast `qa:update` to room.
- On `event:join`: Also emit `qa:history` with recent questions for the event.

### Frontend

**`apps/web/src/hooks/useQA.ts`** (new)
- Follows `useCaptions` pattern. Manages question list state. Listens to `qa:new`, `qa:update`, `qa:history`. Exposes `questions`, `submitQuestion(body)`, `moderateQuestion(id, status)`.

**`apps/web/src/components/AskQuestionDrawer.tsx`** (new)
- Bottom drawer on audience view. Text input + language indicator + submit button. Character limit ~280 chars. Opens via floating "Ask a question" button.

**`apps/web/src/components/QAPanel.tsx`** (new)
- Presenter view panel. Shows questions sorted by newest. Each has pin/dismiss buttons. Pinned questions highlighted at top. Badge count on collapsed state.

**`apps/web/src/pages/EventPage.tsx`**
- Add floating "Ask" button (bottom-right, above footer). Opens `AskQuestionDrawer`.
- Import and use `useQA(code)`.

**`apps/web/src/pages/PresentPage.tsx`**
- Add `QAPanel` as a collapsible section in the main column, between Session Controls and Live Transcript. Tab or accordion toggle.

---

## Feature 1: Accessibility Settings Panel

**Goal:** Expose the hidden `highContrast` mode, add dyslexia-friendly font, and caption line spacing options.

### Changes

**`apps/web/src/hooks/useAccessibility.ts`**
- Add to persisted prefs: `dyslexiaFont: boolean` (default false), `lineSpacing: 'compact' | 'normal' | 'relaxed'` (default 'normal').
- Expose: `dyslexiaFont`, `toggleDyslexiaFont()`, `lineSpacing`, `setLineSpacing()`.

**`apps/web/src/styles/index.css`**
- Add `@font-face` for OpenDyslexic (self-hosted woff2, ~100KB).
- Add `.font-dyslexia` class: `font-family: 'OpenDyslexic', sans-serif`.
- Add high-contrast token overrides: `.high-contrast` class that sets `--color-on-surface: #000` / `#fff`, removes opacity fading, increases border contrast.

**`apps/web/src/components/AccessibilityPanel.tsx`** (new)
- Toggle switches for: High Contrast, Dyslexia Font, Line Spacing (3 radio buttons: compact/normal/relaxed).
- Each toggle uses `role="switch"` with `aria-checked`.

**`apps/web/src/pages/EventPage.tsx`**
- Add `AccessibilityPanel` to sidebar between Text Size and Display sections.
- Destructure `highContrast`, `dyslexiaFont`, `lineSpacing` from `useAccessibility()`.
- Pass `highContrast` to `<CaptionDisplay>` (already accepts the prop).
- Apply `font-dyslexia` class and line-height style to caption area conditionally.

---

## Feature 2: Enhanced Event Creation

**Goal:** Add organiser name, event hero image, event logo, and custom theme colour to events.

### Database

**`supabase/migrations/007_event_branding.sql`** (new)
```sql
alter table events add column if not exists organiser_name text;
alter table events add column if not exists image_url text;
alter table events add column if not exists logo_url text;
alter table events add column if not exists theme_color text;
```

### Shared Types

**`packages/shared/src/types.ts`**
- Add to `Event`: `organiser_name?: string`, `image_url?: string`, `logo_url?: string`, `theme_color?: string`.
- Also add the already-existing-in-DB fields: `phrase_list?: string[]`, `organiser_id?: string`.

### API

**`apps/api/src/routes/events.ts`**
- POST handler: Read `organiser_name`, `image_url`, `logo_url`, `theme_color`, `phrase_list` from `req.body` and include in insert.
- PATCH handler: Allow updating these new fields.
- **Fix existing bug:** `phrase_list` is sent by frontend but currently ignored — wire it into the insert.

**Image upload:** Add a new route `POST /api/upload` that accepts multipart form data and uploads to Supabase Storage. Returns the public URL. (Or use Supabase Storage client-side directly with the user's auth token.)

### Frontend

**`apps/web/src/pages/CreateEventPage.tsx`**
- Add fields: organiser/speaker name (text), hero image (drag-and-drop upload with preview), logo (smaller upload), theme colour (colour picker or preset palette of 6-8 NZ-inspired colours).
- Image upload component with preview, size validation (max 2MB), and loading state.

**`apps/web/src/components/EventCard.tsx`**
- Show hero image as card background/header if `image_url` exists.
- Show organiser name below title.

**`apps/web/src/pages/EventPage.tsx`**
- Display event hero image in header area.
- Show organiser name.
- Apply `theme_color` to accent elements if set.

**`apps/web/src/pages/EventDetailPage.tsx`**
- Show/edit branding fields.

---

## Feature 5: AI Event Summary

**Goal:** Auto-generate a concise bullet-point summary after event ends. Show in UI and include in transcript downloads.

### Database

**`supabase/migrations/008_transcript_summary.sql`** (new)
```sql
alter table transcripts add column if not exists summary text;
```

### API

**`apps/api/src/services/TranscriptProcessor.ts`**
- After cleaning all language transcripts, add a `generateSummary()` step.
- Use the English transcript as source. Prompt Claude (haiku) to produce 3-5 bullet points summarising key topics, decisions, and action items.
- Store in `transcripts.summary` column.

**`apps/api/src/routes/transcripts.ts`**
- Include `summary` in the GET response alongside `status` and `languages`.

### Frontend

**`apps/web/src/components/TranscriptDownload.tsx`**
- Show summary as bullet points above the language picker when transcript is ready.
- Include summary at top of the downloadable PNG.

**`apps/web/src/pages/EventDetailPage.tsx`**
- Show summary card when event is ended and transcript is ready.

---

## Feature 7: Live Emoji Reactions

**Goal:** Audience taps emoji buttons, reactions float up on presenter's screen. Ephemeral (no DB).

### Shared Types

**`packages/shared/src/types.ts`**
- Add `ReactionPayload`: `{ emoji: string; count: number }`
- Add to `ClientToServerEvents`: `'reaction:send': (payload: { code: string; emoji: string }) => void`
- Add to `ServerToClientEvents`: `'reaction:burst': (payload: ReactionPayload) => void`

### API

**`apps/api/src/services/SocketHandler.ts`**
- `reaction:send`: Throttle per socket (max 1 per 2 seconds). Broadcast `reaction:burst` to room. No DB write.

### Frontend

**`apps/web/src/hooks/useReactions.ts`** (new)
- Listens to `reaction:burst`. Maintains a queue of recent reactions for animation. Exposes `sendReaction(emoji)` with client-side debounce.

**`apps/web/src/components/ReactionBar.tsx`** (new)
- Horizontal bar with 4 emoji buttons: 👍 👏 ❤️ 💯. Fixed at bottom of caption area in audience view.
- Each button: tap sends reaction, brief scale pulse on press.

**`apps/web/src/components/FloatingReactions.tsx`** (new)
- Absolutely positioned overlay on presenter view. Incoming reactions render as emoji that float upward with random horizontal offset, fade out over 2s. CSS animations (not framer-motion, for performance with many elements).

**`apps/web/src/pages/EventPage.tsx`**
- Add `ReactionBar` in footer area alongside "Real-time" label.

**`apps/web/src/pages/PresentPage.tsx`**
- Add `FloatingReactions` overlay on the main transcript panel.

---

## New Files Summary

| File | Feature |
|------|---------|
| `apps/web/src/components/EventCardSkeleton.tsx` | 4 |
| `apps/web/src/components/AnimatedCounter.tsx` | 4 |
| `apps/web/src/components/AccessibilityPanel.tsx` | 1 |
| `apps/web/src/components/AskQuestionDrawer.tsx` | 3 |
| `apps/web/src/components/QAPanel.tsx` | 3 |
| `apps/web/src/components/ReactionBar.tsx` | 7 |
| `apps/web/src/components/FloatingReactions.tsx` | 7 |
| `apps/web/src/hooks/useQA.ts` | 3 |
| `apps/web/src/hooks/useReactions.ts` | 7 |
| `supabase/migrations/006_qa_questions.sql` | 3 |
| `supabase/migrations/007_event_branding.sql` | 2 |
| `supabase/migrations/008_transcript_summary.sql` | 5 |

## Key Existing Files Modified

| File | Features |
|------|----------|
| `apps/web/src/pages/HomePage.tsx` | 4, 6 |
| `apps/web/src/pages/EventPage.tsx` | 1, 2, 3, 7 |
| `apps/web/src/pages/PresentPage.tsx` | 3, 7 |
| `apps/web/src/pages/CreateEventPage.tsx` | 2, 6 |
| `apps/web/src/pages/EventDetailPage.tsx` | 2, 5 |
| `apps/web/src/router.tsx` | 6 |
| `apps/web/src/styles/index.css` | 1, 6 |
| `apps/web/src/hooks/useAccessibility.ts` | 1 |
| `apps/web/src/components/EventCard.tsx` | 2 |
| `apps/web/src/components/DashboardShell.tsx` | 6 |
| `apps/web/src/components/TranscriptDownload.tsx` | 5 |
| `apps/web/src/components/CaptionDisplay.tsx` | 1 (already accepts `highContrast`) |
| `apps/api/src/services/SocketHandler.ts` | 3, 7 |
| `apps/api/src/services/TranscriptProcessor.ts` | 5 |
| `apps/api/src/routes/events.ts` | 2 |
| `apps/api/src/routes/transcripts.ts` | 5 |
| `packages/shared/src/types.ts` | 2, 3, 7 |

## Existing Code to Reuse

- **Framer Motion pattern**: `useReducedMotion()` guard + `{ opacity: 0, y: 8 }` entry (from `CaptionDisplay.tsx`, `QRDisplay.tsx`)
- **Socket hook pattern**: `useEffect` with `socket.on`/`socket.off` named handlers (from `useCaptions.ts`, `useViewerCount.ts`)
- **Auth gating**: `isAuthorised(socket)` in `SocketHandler.ts`
- **Azure Translator call**: Fetch pattern from `translate.ts` (reuse for Q&A translation)
- **Claude integration**: `cleanWithClaude()` pattern from `TranscriptProcessor.ts` (reuse for summary)
- **Room broadcasting**: `io.to(code).emit()` pattern throughout `SocketHandler.ts`
- **DB migration pattern**: Sequential numbering, `gen_random_uuid()`, RLS policies from migrations 001-005

## Verification

For each feature, verify by:
1. `pnpm --filter web dev` — check the feature renders correctly
2. Test in both light and dark mode
3. Test with keyboard-only navigation
4. Test with `prefers-reduced-motion: reduce` in browser devtools (all animations should degrade gracefully)
5. Test responsive layout at 375px mobile viewport
6. For socket features (3, 7): open two browser tabs — one audience, one presenter — and verify real-time sync
7. For DB features (3, 2, 5): verify Supabase migration applies cleanly
