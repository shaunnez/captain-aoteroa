# Screenshot Resume State — 2026-03-25

## Status
- Presenter guide (`docs/user-guide-presenter.md`): **DONE** — all 10 placeholders replaced by agent
- Audience guide (`docs/user-guide-audience.md`): **PENDING** — still has `[SCREENSHOT: ...]` placeholders

## Audience guide: what to do next session

Replace these placeholders in `docs/user-guide-audience.md`:

### Already captured — just replace these:
```
[SCREENSHOT: Home page — showing the join form with the event code input field and the event search bar below]
→ ![Home page join form](./screenshots/a1-home-join.png)

[SCREENSHOT: Live caption screen — showing captions mid-sentence, Live badge in header, viewer count]
→ ![Live caption screen](./screenshots/a3-live-captions.png)

[SCREENSHOT: Settings sidebar open on desktop — showing all options: text size, line spacing, display, accessibility, language]
→ ![Settings sidebar](./screenshots/a4-settings-sidebar.png)

[SCREENSHOT: Accessibility section — showing High contrast and Dyslexia-friendly font toggles]
→ ![Accessibility settings](./screenshots/a5-accessibility.png)

[SCREENSHOT: Language picker modal — showing the full list of NZ languages with flags]
→ ![Language picker](./screenshots/a6-language-picker.png)

[SCREENSHOT: Audio toggle button — showing "Play audio" and "Audio on" states]
→ ![Audio toggle](./screenshots/a7-audio-toggle.png)

[SCREENSHOT: Reaction bar — showing the four emoji buttons 👍 👏 ❤️ 💯]
→ ![Reaction bar](./screenshots/a9-reactions.png)

[SCREENSHOT: Transcript download area — showing View Transcript button, then language picker and Download Image button after loading]
→ ![Transcript download](./screenshots/a10-transcript.png)
```

### Still need to capture (2 shots):

**a2-lobby.png** — event lobby countdown
- Need a future-dated event. Either create one via /create with a date 1hr in the future, or check if one exists.
- Navigate to http://localhost:5173/event/[future-code]
- Should show: event title, description, countdown timer (days/hrs/min/sec)
- Replace: `[SCREENSHOT: Lobby countdown screen — showing event title, description, and countdown timer (days/hrs/min/sec)]`

**a8-ask-drawer.png** — ask question drawer open
- Navigate to http://localhost:5173/event/4LCWW0 (or any non-ended event)
- Click the "Ask a question" button to open the bottom drawer
- Screenshot must show: textarea with "Type your question..." placeholder, "0 / 280" character count, Send button
- Replace: `[SCREENSHOT: Ask question drawer open — showing textarea, character count, and Send button]`

## Playwright MCP notes
- `browser_take_screenshot` with `filename: "docs/screenshots/name.png"` saves relative to project root
- `browser_resize` params must be JSON numbers (not strings) — but it errored anyway; skip it
- Viewport tends to render consistently once you navigate explicitly with `browser_navigate`
- After `browser_navigate`, always call `browser_snapshot` to confirm page state before screenshotting

## Event codes available
- `4LCWW0` — "Test Event" (ended, has post-session state)
- `VD1S09` — "First Event" (ended, has real captions)
