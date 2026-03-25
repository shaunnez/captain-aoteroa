# Engineering Spec: User Guides — Presenter & Audience

**Date:** 2026-03-25
**Author:** Engineering planning
**Status:** Ready to execute

---

## Constraints This Spec Must Respect

Verified by reading actual source files:

| Constraint | Source | Verified value |
|------------|--------|----------------|
| App brand name | `LoginPage.tsx:80`, `EventPage.tsx:124` | "HearMe NZ" (not "Caption Aotearoa") |
| Login route | `router.tsx:33` | `/login` |
| Signup route | `router.tsx:34` | `/signup` |
| Dashboard route | `router.tsx:36` | `/dashboard` |
| Create event route | `router.tsx:33` | `/create` |
| Present route | `router.tsx:34` | `/present/:code` |
| Audience route | `router.tsx:30` | `/event/:code` |
| Login fields | `LoginPage.tsx:88–130` | Email, Password |
| Login auth label | `LoginPage.tsx:84` | "Organiser login" |
| Create event fields | `CreateEventPage.tsx:96–196` | Title (required), Description, Organiser/speaker name, Theme colour (7 presets), Custom phrases, Event date |
| Theme colour presets | `CreateEventPage.tsx:133–141` | Default, Tūī (#1a5276), Pōhutukawa (#c0392b), Kōwhai (#d4a017), Pounamu (#1e8449), Tohorā (#2e4057), Kōrari (#7d3c98) |
| Present page: editable fields | `PresentPage.tsx:245–420` | Title, Description, Organiser name, Date — all inline editable via pencil icon |
| Present page: session controls | `PresentPage.tsx:629–650` | MicControl (start/stop) + End Session (red square) |
| Present page: post-session | `PresentPage.tsx:558–603` | "Session complete", duration, "Generate Transcript (AI Assist)", TranscriptDownload |
| Present page: language selector label | `PresentPage.tsx:452` | "I am speaking in" |
| Present page: right sidebar | `PresentPage.tsx:677` | QAPanel (xl+ only) |
| Present page: QA on smaller screens | `PresentPage.tsx:527–540` | "Q&A" button opens modal |
| Audience sidebar: Text Size | `EventPage.tsx:213–235` | Range slider, min 1.25rem, max 3rem, step 0.25 |
| Audience sidebar: Line Spacing | `EventPage.tsx:237–263` | Range slider: compact / normal / relaxed |
| Audience sidebar: Display | `EventPage.tsx:265–296` | Light / Dark toggle buttons |
| Audience sidebar: Accessibility | `AccessibilityPanel.tsx:22–56` | High contrast toggle, Dyslexia-friendly font toggle |
| Audience sidebar: Language | `EventPage.tsx:312–330` | Language picker button showing flag + label |
| Audience sidebar: Audio | `EventPage.tsx:331–349` | "Play audio" / "Audio on" toggle (only shown for TTS-supported languages) |
| Audience: Ask a question | `EventPage.tsx:419–430` | Button → AskQuestionDrawer bottom sheet, 280 char limit |
| Audience: ReactionBar | `ReactionBar.tsx:5` | 👍 👏 ❤️ 💯 |
| Event lobby | `EventLobby.tsx:16–73` | Countdown timer (days/hrs/min/sec), shown when event has future date and isn't live |
| JoinForm code format | `JoinForm.tsx:34–38` | 6 uppercase chars, auto-uppercased, placeholder "KAI492" |
| Transcript download | `TranscriptDownload.tsx:89–99` | PNG file, language selectable, filename pattern `{title}-transcript-{lang}.png` |
| Event code display | `PresentPage.tsx:492` | Large monospace, section labelled "Event code" |
| QR code | `PresentPage.tsx:487` | `<QRDisplay eventCode={event.code} />` in "Audience Joining" section |
| Join link | `PresentPage.tsx:497–507` | `{origin}/event/{code}` |

---

## Objective

Produce two standalone markdown user guides — one for presenters (organisers) and one for audience members — grounded entirely in the actual UI. The guides will be used for the Access Activator grant application demo and for onboarding new users. They must be screenshot-ready: each guide marks screenshot insertion points with `[SCREENSHOT: description]` placeholders.

---

## Acceptance Criteria

| AC | Description | Verify | Expected | Automated |
|----|-------------|--------|----------|-----------|
| AC1 | Presenter guide exists | `test -f docs/user-guide-presenter.md` | exit 0 | yes |
| AC2 | Audience guide exists | `test -f docs/user-guide-audience.md` | exit 0 | yes |
| AC3 | Presenter guide covers all 5 sections | `grep -c "^##" docs/user-guide-presenter.md` | ≥ 5 | yes |
| AC4 | Audience guide covers all 4 sections | `grep -c "^##" docs/user-guide-audience.md` | ≥ 4 | yes |
| AC5 | All screenshot placeholders present in presenter guide | `grep -c "\[SCREENSHOT" docs/user-guide-presenter.md` | ≥ 8 | yes |
| AC6 | All screenshot placeholders present in audience guide | `grep -c "\[SCREENSHOT" docs/user-guide-audience.md` | ≥ 6 | yes |
| AC7 | Branding correct — no "Caption Aotearoa" in user-facing guides | `grep -i "caption aotearoa" docs/user-guide-presenter.md docs/user-guide-audience.md` | no output | yes |
| AC8 | All route references valid | Manual check: routes match `router.tsx` | All paths match | no |

---

## Architecture

### Documents to produce

| File | Audience | Sections |
|------|----------|----------|
| `docs/user-guide-presenter.md` | Organisers / presenters | Sign up & log in, Dashboard, Create an event, Running a session, After the session |
| `docs/user-guide-audience.md` | Audience members / attendees | Finding an event, The event lobby, Watching captions, Customising your view, Asking questions |

### Screenshot placeholder convention

Every screenshot insertion point uses: `[SCREENSHOT: brief description of what to capture]`

Screenshots will be captured using Playwright after guides are written. The placeholders tell the screenshot agent exactly what to capture and in what state.

---

## Work Package 1: Presenter Guide

**File:** `docs/user-guide-presenter.md`

### Section 1: Sign up & log in

Route: `/login` and `/signup`

Content:
- Go to `/login` (link from home page top right)
- Enter your **Email** and **Password** and click **Sign in**
- First time? Click **Sign up** below the form. Create an account with your email and a password. After creating your account, you will be taken to your dashboard.
- Screenshot: login page

### Section 2: Your Dashboard

Route: `/dashboard`

Content:
- After signing in you land on **Your Events** — a grid of all your events, sorted live → upcoming → ended.
- From the left sidebar: **Events** (current page) and **Create Event**.
- Each event card shows title, status badge, and date. Click a card to open that event's presenter view.
- Screenshot: dashboard with events grid

### Section 3: Create an Event

Route: `/create`

Content:

| Field | Required | Notes |
|-------|----------|-------|
| Event title | Yes | Shown to audience on caption screen |
| Description | No | Shown in audience sidebar |
| Organiser / speaker name | No | Shown below title in audience view |
| Theme colour | No | 7 NZ-themed presets: Default, Tūī, Pōhutukawa, Kōwhai, Pounamu, Tohorā, Kōrari |
| Custom phrases | No | Comma-separated te reo or domain-specific words to improve speech recognition (e.g. `karakia, whakatau`) |
| Event date | No | Sets the start time; audience sees a lobby countdown until this time |

- Click **Create event** — you are taken directly to the presenter view for that event.
- Screenshot: create event form

### Section 4: Running a session

Route: `/present/:code`

Sub-sections:

**4a. Event information panel (left sidebar)**
- The event title, description, organiser name, and date are shown. Hover any field to reveal a pencil icon — click it to edit inline. Press the check mark to save, X to cancel.
- **Status indicator**: shows a red pulsing dot and "Live" when you are streaming, or grey "Ready" when idle.
- **Viewer count**: appears when audience members join.
- **Recording timer**: counts up from 00:00:00 while the microphone is active.

Screenshot: left sidebar showing editable fields

**4b. Language selector**

- Under "I am speaking in", click the language button to open the language picker and select the language you will speak.
- If your event has both English and te reo Māori configured, a **"English + Te Reo"** dual-mode option is available.

Screenshot: language picker modal open

**4c. Sharing with your audience**

- In the **Audience Joining** section:
  - **QR code**: audience members scan this to go directly to the caption screen.
  - **Event code**: the 6-character code (e.g. `KAI492`) — display it on screen or read it aloud.
  - **Join link**: `hearme.nz/event/KAI492` — share via message or email.

Screenshot: QR code + event code panel

**4d. Starting and stopping**

- Click the **microphone button** to start capturing audio. The button turns red and the status shows "Streaming".
- Click the **microphone button** again to pause — captions stop but the session remains open.
- To permanently end the event: click the **red square (End Session)** button. This marks the event as ended and stops accepting audio.

Screenshot: session controls panel with mic button

**4e. Live captions and audience reactions**

- The **Live Transcript** panel shows what is being transcribed in real-time.
- Floating emoji reactions from audience members (👍 👏 ❤️ 💯) appear briefly in the transcript area.

Screenshot: live transcript panel

**4f. Audience Q&A**

- On large screens, the **Q&A Panel** is visible on the right. On smaller screens, click the **Q&A** button in the session controls.
- Questions submitted by audience members appear here, translated into your event language automatically.
- Click the **pin icon** to pin a question to the top. Click **dismiss** to remove it.

Screenshot: Q&A panel with questions

### Section 5: After the session

After clicking End Session:

- A **Session complete** banner shows the total recording duration.
- Click **Generate Transcript (AI Assist)** — HearMe NZ uses AI to clean and format the transcript. This takes 15–60 seconds depending on session length. The button shows "Processing…" while it runs.
- Once ready, the button changes to **Regenerate Transcript** (in case you want a fresh version).
- Click **View Transcript** to load the transcript, then:
  1. Select a language from the picker (all NZ languages your event was configured for).
  2. Click **Download Image** to save the transcript as a PNG file.

Screenshot: post-session panel showing generate + download buttons

---

## Work Package 2: Audience Guide

**File:** `docs/user-guide-audience.md`

### Section 1: Finding an event

Route: `/` (home page)

Content:
- On the HearMe NZ home page, find the **"Join an event"** section.
- Enter the 6-character **event code** given to you by the organiser (e.g. `KAI492`). The code is automatically uppercased.
- Click **Join event**.

Screenshot: home page join form

### Section 2: The event lobby

(Shown when the event has a future start time and hasn't gone live yet.)

Content:
- You'll see the event title, description, and a **countdown timer** showing days, hours, minutes, and seconds until the event starts.
- The page will automatically transition to the caption screen when the event goes live — no need to refresh.

Screenshot: lobby countdown screen

### Section 3: Watching captions

Route: `/event/:code`

Content:
- When the session starts, captions appear in the main area in real time.
- The **status badge** in the header shows:
  - Green pulsing dot + "Live" — session is active
  - "Connected" — connected to the event but session hasn't started
  - "Ended" — the session has finished

Screenshot: live caption screen with captions showing

### Section 4: Customising your view

(Left sidebar — on mobile, tap the settings icon in the top left to open it.)

Sub-sections:

**Text size**: drag the slider left (smaller) or right (larger).

**Line spacing**: drag the slider to compact, normal, or relaxed.

**Display**: click **Light** or **Dark** to switch colour scheme.

**Accessibility**:
- **High contrast** — toggle on for sharper black-and-white captions, easier to read in bright environments.
- **Dyslexia-friendly font** — switches captions to OpenDyslexic font.

Screenshot: settings sidebar open

**Language**: click the language button to open the language picker. Choose from all NZ census languages — captions are translated in real time. Your selection is remembered next time you visit.

Screenshot: language picker modal

**Audio**: if the selected language has audio support, an **"Play audio"** button appears. Tap it to hear a spoken version of each caption as it arrives. Tap **"Audio on"** to turn it off.

Screenshot: audio toggle button

### Section 5: Asking questions

(Only available while the event is live.)

Content:
- Tap **Ask a question** at the bottom of the screen.
- Type your question (up to 280 characters) and tap **Send** (or press Cmd/Ctrl + Enter).
- Your question is sent in your chosen language — it will be automatically translated for the presenter.
- Tap the backdrop or the × to close without sending.

Screenshot: ask question drawer open

**Reactions**: tap any of the reaction buttons — 👍 👏 ❤️ 💯 — to send a live reaction. These float up on the presenter's screen.

Screenshot: reaction bar

### Section 6: Downloading the transcript

(Available after the event has ended.)

Content:
- Click **View Transcript** at the bottom of the caption screen.
- Select a language from the picker to choose which translation to download.
- Click **Download Image** — the transcript saves as a PNG file to your device.

Screenshot: transcript download panel

---

## Execution Order

```
WP1 (presenter guide) — independent
WP2 (audience guide) — independent
```

Both can be written in parallel. No shared state or dependencies.

---

## Screenshot Capture Plan

After both guides are written, use Playwright to capture screenshots at these URLs and states:

### Presenter screenshots (requires login: test@test.com / testpassword123!)

| # | URL / State | Screenshot description |
|---|-------------|----------------------|
| P1 | `/login` | Login page |
| P2 | `/dashboard` | Dashboard with events |
| P3 | `/create` | Create event form |
| P4 | `/present/:code` | Left sidebar with editable fields |
| P5 | `/present/:code` — language picker open | Language picker modal |
| P6 | `/present/:code` | QR code + event code panel |
| P7 | `/present/:code` | Session controls (mic + end session) |
| P8 | `/present/:code` — with captions | Live transcript panel |
| P9 | `/present/:code` — Q&A panel visible | Q&A panel |
| P10 | `/present/:code` — session ended | Post-session panel |

### Audience screenshots (no login required)

| # | URL / State | Screenshot description |
|---|-------------|----------------------|
| A1 | `/` | Home page join form |
| A2 | `/event/:code` — future date event | Lobby countdown |
| A3 | `/event/:code` — live | Live caption screen |
| A4 | `/event/:code` — sidebar open | Settings sidebar |
| A5 | `/event/:code` — language picker open | Language picker modal |
| A6 | `/event/:code` — ask drawer open | Ask question drawer |
| A7 | `/event/:code` — ended | Transcript download panel |

---

## Risk Register

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Test credentials don't work | P1 | Low | Verified by user: test@test.com / testpassword123! |
| No existing events for screenshots | P2 | Medium | Create a test event during screenshot session |
| "HearMe NZ" vs "Caption Aotearoa" in guides | P2 | Low | AC7 grep check enforces correct branding |
| Lobby screenshot requires future-dated event | P2 | Medium | Create event with date 1 hour in the future before capturing A2 |
| Audio toggle only visible for TTS-supported langs | P3 | Low | Ensure English (en-NZ) is selected when capturing A6 |
