# Screenshot Retake Plan — 2026-03-25

## Status
- Both guides: all `[SCREENSHOT: ...]` placeholders replaced — no text changes needed.
- Only image files need to be recaptured/replaced.

## Event codes
- `4NU5Q9` — use for all presenter screenshots (has transcript + audience questions)
- `PVWYFL` — "Demo Lobby Event" (upcoming, countdown lobby) — a2 is already done
- `4LCWW0` — "Test Event" (connected/ready state) — fallback for audience shots if needed

## Audience screenshots to redo

### a4-settings-sidebar.png
- Navigate to any event page (e.g. `http://localhost:5173/event/4LCWW0`)
- Screenshot just the settings sidebar panel (left side), not the full viewport
- Must show: Text Size, Line Spacing, Display, Accessibility, Language sections

### a7-audio-toggle.png
- Same event page
- Screenshot just the "Play audio" button area (bottom of the settings sidebar)
- Crop tight around the button — not the whole sidebar

### a8-ask-drawer.png
- Navigate to a non-ended event (use `4LCWW0` — status is "connected/ready")
- Click the "Ask a question" button in the footer
- Screenshot the open drawer/modal showing: textarea with "Type your question..." placeholder, "0 / 280" counter, Send button
- Focus on the footer panel, not the full page

### a9-reactions.png
- Same event page with reaction bar visible
- Click one of the reaction emoji buttons (👍 👏 ❤️ 💯)
- Wait ~1 second for the floating emoji animation
- Screenshot capturing the floating emoji rising up the screen

## Presenter screenshots to redo

All presenter shots use event `4NU5Q9`. Must be logged in as presenter.
Login: http://localhost:5173/login — use existing session or log in with organiser credentials.

### p3-create-form.png
- Navigate to `http://localhost:5173/create`
- Screenshot the create event form page
- Must show the full form (title, description, date/time, language fields etc.)

### p4-sidebar.png
- Navigate to the presenter view for event `4NU5Q9`
- Screenshot just the presenter sidebar / event info panel
- (Or rename file to `p4-presenter-event-page.png` and update the markdown reference — confirm with user first)
- **Current instruction:** just show the sidebar

### p6-qr-code.png
- Navigate to the presenter view for `4NU5Q9`
- Find the QR code section/tab
- Add a short delay (e.g. `browser_wait_for` or pause) before screenshotting so the QR code image has time to render
- Screenshot must show the actual QR code image

### p7-session-controls.png
- Presenter view for `4NU5Q9`
- Screenshot just the session controls panel (start/stop session, mic controls etc.)
- Crop to the controls area only, not the full page

### p8-live-transcript.png
- Presenter view for `4NU5Q9`
- Screenshot just the live transcript panel
- Should show transcript content (event has real transcript data)

### p9-qa-panel.png
- Presenter view for `4NU5Q9`
- Screenshot just the audience questions / Q&A panel
- Should show submitted questions (event has real audience questions)

## Playwright MCP notes
- `browser_take_screenshot` with `filename: "docs/screenshots/name.png"` saves relative to project root
- `browser_snapshot` after every navigate to confirm state before acting
- For element-level crops: use `ref` + `element` params on `browser_take_screenshot`
- For reactions floating emoji: click reaction button → `browser_wait_for` ~1000ms → screenshot
- QR code: navigate → wait for network idle or use `browser_wait_for` → screenshot
- API server must be running on `localhost:3002` (run `pnpm --filter api dev` if not)
