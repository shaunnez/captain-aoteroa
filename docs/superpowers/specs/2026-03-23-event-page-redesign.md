# EventPage Redesign — Live Caption Viewer (Light Mode)

**Date:** 2026-03-23
**Route:** `/event/:code`
**Reference:** Stitch screen "Live Caption Viewer (Light Mode) - Beige Primary" (project `650033148866683896`, screen `338a3c68dc7e4107a103c1c89abdbe2b`)

---

## Goal

Replace the current single-column layout of `EventPage.tsx` with the Stitch mockup design: a split layout featuring a permanent left sidebar for accessibility controls and a full-height caption canvas on the right. All existing functionality (real-time captions, language selection, dark mode, accessibility settings, lobby state, error handling) must be preserved.

---

## Tailwind / Token Convention

The project uses **CSS custom properties** for all design tokens, referenced inline as `bg-[var(--color-*)]`, `text-[var(--color-*)]`, etc. Do NOT use Tailwind color aliases like `bg-primary` or `text-on-surface-variant` — those aliases are not reliably registered. Use the CSS-variable form throughout. Example:
- `bg-[var(--color-primary)]` not `bg-primary`
- `text-[var(--color-on-surface)]` not `text-on-surface`
- `border-[var(--color-outline-variant)]` not `border-outline-variant`
- `accent-[var(--color-primary)]` for the range slider

Font families: `font-serif` (Lora) is registered in Tailwind config. Body/label text uses the default `font-sans` (Inter). Do NOT use `font-body` or `font-label`.

---

## Layout

Root element: `flex flex-col h-screen overflow-hidden bg-[var(--color-background)]`

1. **Sticky header** — full width
2. **Body row** — `flex flex-1 overflow-hidden`:
   - **Sidebar** (`w-72 shrink-0`) — left panel, scrollable
   - **Caption canvas** — `flex-1 min-w-0`, relative, overflow-hidden

---

## Header

- `sticky top-0 z-10 bg-[var(--color-background)]/90 backdrop-blur-xl border-b border-[var(--color-outline-variant)] px-6 py-4 flex items-center justify-between gap-4`
- **Left**: "Caption Aotearoa" brand (`font-serif text-xl font-bold text-[var(--color-primary)]`) → vertical divider (`w-px h-5 bg-[var(--color-outline-variant)]`) → live/status badge:
  - When `isConnected && event.status === 'live'`: green pill (`flex items-center gap-1.5 px-3 py-1 rounded-full border`; bg `rgba(240,253,244,1)` / border `rgba(34,197,94,0.3)`): pulsing green dot (`w-2 h-2 rounded-full bg-green-600 animate-pulse`) + "LIVE" (`text-xs font-bold uppercase tracking-widest text-green-700`). Use inline hex/rgba rather than Tailwind palette aliases to stay consistent with the CSS-variable convention.
  - Otherwise: grey dot + "Connecting…" or "Connected"
- **Right**: viewer count (if > 0, `text-sm text-[var(--color-on-surface-variant)]`) + Exit button (`flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-outline-variant)] text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors`) — navigates `navigate('/')`
- Language picker and settings gear **removed from header** (moved to sidebar)
- `DarkModeToggle` **removed from header** (dark/light controlled via sidebar contrast buttons)

---

## Sidebar

`w-72 shrink-0 bg-[var(--color-surface-container-low)] border-r border-[var(--color-outline-variant)] p-6 flex flex-col gap-8 overflow-y-auto`

### Text Size section
- Section label: `text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]` — "Text Size"
- Card: `bg-[var(--color-surface-container-lowest)] p-4 rounded-xl border border-[var(--color-outline-variant)] shadow-sm`
- Row of small/large "A" (`material-symbols-outlined text_fields`) icons + range slider between them
- Slider: `w-full h-2 bg-[var(--color-primary)]/10 rounded-lg appearance-none accent-[var(--color-primary)]`
- Binds to `fontSize` / `setFontSize` from `useAccessibility()` (`min=1.25 max=3 step=0.25`)
- Custom CSS for slider thumb: `20px × 20px`, `bg-[var(--color-primary)]`, circular — add to `index.css` alongside existing thumb rule

### Contrast / Mode section
- Section label: "Display"
- 2-column grid of toggle buttons, each with a colour swatch circle + label:
  - Use `useDarkModeContext()` (from `DarkModeContext`) which returns `{ isDark, toggle }`. `toggle` is a binary flip — use a guard: `if (!isDark) toggle()` for Light, `if (isDark) toggle()` for Dark.
  - **"Light"** button: calls `if (isDark) toggle()`. Active when `!isDark`.
  - **"Dark"** button: calls `if (!isDark) toggle()`. Active when `isDark`.
  - Active state: `border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5`
  - Inactive: `border-2 border-transparent bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] transition-colors`
- Below the grid: a `<label>` checkbox for high contrast — `toggleHighContrast` from `useAccessibility()`. Label: "High contrast".

### Language & Session (bottom, `mt-auto pt-6 border-t border-[var(--color-outline-variant)]`)
- Card: `bg-[var(--color-primary)]/5 border border-[var(--color-outline-variant)] rounded-xl p-4`
- Row: translate icon (`material-symbols-outlined text-sm`) + selected language name
- `LanguagePicker` component rendered here (same props as before: `selectedLocale`, `onSelect`)
- Event code shown as: `#` + `event.code` in `font-mono text-xs text-[var(--color-on-surface-variant)]`

---

## Caption Canvas

`flex-1 min-w-0 relative flex flex-col p-8 md:p-12 overflow-hidden`

### Background
- `KowhaiwhaPattern` with `opacity={0.03}` (same as current `EventPage` usage — subtle watermark)

### Caption error banner
- If `captionError`: `absolute top-0 inset-x-0 bg-[var(--color-error)] text-white px-6 py-3 text-sm z-20`

### Event header row (`relative z-10 mb-10 flex justify-between items-end`)
- **Left**: Event title (`font-serif text-3xl font-bold text-[var(--color-primary)] tracking-tight`) + subtitle (`text-sm text-[var(--color-on-surface-variant)] mt-1`, e.g. `event.description` if present, else status text)
- **Right**: omit entirely — no `currentSpeaker` field exists on `Event` or over the socket. Do not render a placeholder name.

### Scrolling caption area (`relative z-10 flex-1 overflow-y-auto caption-area flex flex-col gap-10 pr-4`)
- **All segments except the last**: `text-3xl md:text-5xl lg:text-7xl leading-[1.6] text-[var(--color-primary)]/20 transition-opacity duration-500`
- **Last (most recent) segment**: `text-3xl md:text-5xl lg:text-7xl leading-[1.6] text-[var(--color-primary)] border-l-8 border-[var(--color-primary)] pl-10 transition-all duration-700 ease-out`
- When `event.status === 'live'` and `segments.length === 0`: three bouncing dots (`w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce` with staggered `animation-delay`)
- When `event.status !== 'live'` and `segments.length === 0`: existing "Waiting for captions…" message

### Footer bar (`relative z-10 mt-8 flex justify-between items-center border-t border-[var(--color-outline-variant)] pt-6`)
- **Left**: icon buttons `p-2 rounded-lg bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 transition-colors`:
  - Save transcript: render `<TranscriptDownload eventCode={event.code} eventTitle={event.title} eventDate={event.event_date} />` only when `event.status === 'ended'`. When not ended, render nothing (do not show a disabled icon). Import `TranscriptDownload` from `../components/TranscriptDownload`.
  - Report issue: `material-symbols-outlined flag` icon button — no-op for now (renders button, no handler)
- **Right**: `text-xs font-sans uppercase tracking-widest text-[var(--color-primary)]/40` — static "Real-time" text

---

## CaptionDisplay Changes

The current `CaptionDisplay` component renders a scrollable rounded box. Under this redesign, the canvas itself IS the display area. Two options:

**Option A (preferred):** Keep `CaptionDisplay.tsx` but add a `variant="flat"` prop. When `variant="flat"`, it renders the caption segments without the outer container box — just the `flex flex-col gap-10` list.

**Segment rendering logic for flat variant:**
- "Current" segment = the last item in the `segments` array by index (regardless of `isFinal`)
- All segments before the last: `text-3xl md:text-5xl lg:text-7xl leading-[1.6] text-[var(--color-primary)]/20`
- Last segment: `text-3xl md:text-5xl lg:text-7xl leading-[1.6] text-[var(--color-primary)] border-l-8 border-[var(--color-primary)] pl-10 transition-all duration-700 ease-out`
- The existing `isFinal` / `isTranslating` italic treatment is preserved within each segment's text rendering (not replaced)
- The `highContrast` prop: when `true`, override the faded segments to `text-[var(--color-on-surface)]` (no fade) for maximum legibility

**Option B:** Remove `CaptionDisplay` from `EventPage` entirely and render segments inline. `PresentPage` keeps using `CaptionDisplay` unchanged.

→ Use **Option A** to avoid duplicating segment-rendering logic.

---

## Components Touched

| File | Change |
|---|---|
| `apps/web/src/pages/EventPage.tsx` | Full layout restructure per spec |
| `apps/web/src/components/CaptionDisplay.tsx` | Add `variant?: 'box' | 'flat'` prop; `flat` renders segments without outer container, with faded-old/bold-current treatment |
| `apps/web/src/components/LanguagePicker.tsx` | No logic change; render in sidebar instead of header |
| `apps/web/src/styles/index.css` | Add `.caption-area` scrollbar styles (thin, `var(--color-primary)` thumb) — this class does not currently exist |

---

## What Does NOT Change

- All socket/hook logic (`useCaptions`, `useViewerCount`, `useAccessibility`, `useDarkModeContext`)
- Lobby state (`EventLobby` shown when applicable — wraps entire page)
- Route and params (`/event/:code`)
- Dark mode token system (`index.css`, `DarkModeContext`)
- `PresentPage.tsx` — untouched
