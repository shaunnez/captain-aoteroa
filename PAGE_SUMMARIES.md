# Caption Aotearoa — Page Summaries

> Per-page breakdown for feeding into AI design tools to generate layout variations.

## `/` — Home (public)

Public landing page. Hero section with branding and Tohu (Māori pattern) decorative elements. Primary action: audience enters a 6-character event code via a join form. Below the hero: a searchable list of public events sorted Live → Upcoming → Ended, auto-refreshing every 30 seconds. Each event card shows title, date, status badge, event code, and language count. Footer links organisers to the sign-in page.

**Key components:** JoinForm, EventSearchBar, EventCard, Tohu

---

## `/login` — Login (public)

Email + password form. Supabase authentication. Redirects to `/dashboard` on success. Link to signup page for new organisers.

**Key components:** Auth form

---

## `/signup` — Signup (public)

Email + password registration (min 8 chars). Supabase auth. Shows email confirmation prompt on success. Link back to login.

**Key components:** Auth form

---

## `/create` — Create Event (protected)

Single-page form. Fields: title (required), description (textarea), custom phrase hints (comma-separated, for te reo Māori words and event-specific terms to aid speech recognition), and optional event date/time. All NZ census languages are enabled by default. On submit, navigates directly to the presenter view for the new event.

**Key components:** Form inputs, submit button

---

## `/event/:code` — Audience View (public)

The main audience experience. Two states:

**Pre-event lobby:** Countdown timer (days, hours, minutes, seconds), event title, description, and scheduled date. Auto-transitions when the event goes live.

**Live captioning:** Header bar with event title, connection indicator (green/yellow dot), and viewer count. Language picker dropdown — NZ census languages are "instant" tier, other Azure-supported languages are "translated" tier with slight delay. Gear icon opens an accessibility settings panel: text size slider (1.25–3 rem), high contrast mode toggle; settings persist to localStorage. Main area: vertically scrolling captions — final segments are solid text, interim/in-progress segments are purple italic with fade animation. Smooth entrance animations via Framer Motion. Full ARIA support with live regions for screen readers.

**Key components:** EventLobby, CaptionDisplay, LanguagePicker, AccessibilityPanel, StatusBadge

---

## `/present/:code` — Presenter View (protected)

The speaker's control panel. Central element: large circular microphone button (purple when inactive, red when recording). Captures 16 kHz PCM audio from the mic and streams it via Socket.IO to Azure Speech-to-Text on the backend. Language selector buttons labelled "I am speaking in…" for each configured language, with an optional bilingual "English + Te Reo" toggle. A live caption preview strip shows real-time transcription. QR code button opens a fullscreen modal displaying the audience join URL and event code for projection/sharing. Header shows event title and live viewer count.

**Key components:** MicControl, LanguageSelector, CaptionPreview, QRDisplay

---

## `/dashboard` — Dashboard (protected)

Organiser hub. Header with "New Event" primary button and sign-out button. Body: list of all the organiser's events displayed as cards, sorted Live → Upcoming → Ended, auto-refreshing every 15 seconds. Each card shows: title, formatted date/time, colour-coded status badge (purple = upcoming, green with pulse = live, grey = ended), event code in monospace, and language count. Clicking a card navigates to the event detail page. Empty state prompts creating a first event.

**Key components:** EventCard, StatusBadge

---

## `/dashboard/events/:id` — Event Detail (protected)

Event management and control centre. Displays event title, description, date, code, status badge, and language count. Action buttons change by event status:

- **Upcoming:** "Start Captioning" button to go live.
- **Live:** "Open Presenter" button (links to presenter view) and "End Event" button.
- **Ended:** Transcript section — select language, view transcript, download as PDF. Shows processing/failed/ready status. "Retry Transcript" button if generation failed.

QR code button is always visible regardless of status.

**Key components:** StatusBadge, TranscriptDownload, QRDisplay

---

## `/dashboard/events/:id/present` — Dashboard Presenter (protected)

Identical to the standalone presenter view (`/present/:code`) but wrapped with a back-to-event-detail breadcrumb/button. Allows organisers to launch presenter mode from the dashboard workflow without losing navigation context.

**Key components:** Same as Presenter View + back navigation

---

## Data Flow Summary

| Channel | Purpose |
|---|---|
| **Socket.IO** | Presenter streams `audio:chunk` → server → Azure STT → `caption:segment` broadcast to all joined audience clients |
| **Translation** | NZ census languages translated server-side in real time; other languages use client-side polling of `/api/translate` every 5s |
| **Auth** | Supabase JWT tokens; protected routes guarded by `ProtectedRoute` wrapper |
| **Viewer count** | `viewer:count` Socket.IO event displayed on both audience and presenter views |
| **Transcripts** | Generated server-side after event ends; fetched via REST API; downloadable as PDF |
