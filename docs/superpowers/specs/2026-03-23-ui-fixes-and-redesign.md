# UI Fixes & Dashboard Redesign — Design Spec
**Date:** 2026-03-23

## Overview

Six distinct problem areas: four bug fixes and two visual redesigns. All changes must respect the existing light/dark mode CSS variable system (`--color-*`).

---

## Group 1: Bug Fixes

### 1.1 Text Slider Broken (EventPage)
**Problem:** The `<input type="range">` sets `fontSize` state and passes `style={{ fontSize: \`${fontSize}rem\` }}` to `CaptionDisplay`, but the `flat` variant of `CaptionDisplay` renders caption paragraphs with hardcoded Tailwind responsive size classes (`text-3xl md:text-5xl lg:text-7xl`) that override the inherited `font-size`. The slider state is correct; the display ignores it.
**Fix:**
1. In `CaptionDisplay`, when `variant="flat"`, replace the hardcoded responsive font-size Tailwind classes on caption `<p>` elements with `text-[1em]` so they inherit the `font-size` from the parent `style` prop.
2. The range input already has `accent-[var(--color-primary)]`. Add `cursor-pointer` only.

### 1.2 Remove High Contrast Checkbox (EventPage)
**Problem:** The high contrast checkbox in the EventPage sidebar has no clear purpose.
**Fix:** Delete the `<label>` containing the `highContrast` checkbox and the `toggleHighContrast` call from the Display section in EventPage. Remove unused imports from `useAccessibility` if `highContrast` and `toggleHighContrast` are no longer used.

### 1.3 Dark Mode Purple Text → White
**Problem:** In dark mode, `--color-primary` resolves to `#c7bfff` (light purple), making all `text-[var(--color-primary)]` elements appear purple rather than white.

**Note on PresentPage:** `PresentPage.tsx` has `className="dark"` on its root div, which force-applies dark mode independently of the global context. This class must be removed as part of the PresentPage redesign (Section 3.2) — the new `DashboardShell` wrapper provides the correct background via CSS variables. The hardcoded `bg-[#0a0a0c]` on the loading state also needs updating to `bg-[var(--color-background)]`.

**Fix:**
- Change `--color-primary` in `.dark` in `index.css` from `#c7bfff` to `#f4f1e6` (same as `--color-on-surface`). This makes `text-[var(--color-primary)]` render white in dark mode.
- **Side effects to handle:** `--color-primary` is also used for borders, scrollbar thumb (`caption-area`), and active status dots. These should stay visually purple in dark mode. Address by:
  - Status dot: replace `bg-[var(--color-primary)]` with `bg-[var(--color-primary-container)]` (#311b92) for the animated "live" pulse dot in EventPage.
  - Scrollbar in `.caption-area`: update **both** the `scrollbar-color` shorthand (line 144 of `index.css` — format is `thumb track`) and the `-webkit-scrollbar-thumb` `background-color` to use `#311b92` (the `--color-primary-container` value). Because `scrollbar-color` does not support CSS variables via `var()` in all browsers, use the hex value directly: `scrollbar-color: #311b92 transparent`.
  - Border accents on focus rings: `--color-primary` white is fine for focus rings (high contrast ✓).
  - KowhaiwhaPattern colour: uses CSS `stroke`/`fill` — keep as-is (pattern is decorative, subtle opacity).
- Add `.dark .btn-primary { background-color: #311b92; color: #ffffff; }` override so buttons remain deep-purple with white text.
- Add `.dark .btn-secondary { color: #f4f1e6; border-color: #f4f1e6; }` and `.dark .btn-secondary:hover { background-color: #311b92; color: #ffffff; }`.
- **`PresentPage.tsx` is fully replaced by the Section 3.2 redesign.** The in-place `#c7bfff` fixes in that file are superseded — the redesigned component uses CSS variables throughout and does not contain any hardcoded hex colours. Do not apply in-place fixes to the old `PresentPage` code.
- For all other files, grep for `#c7bfff` and replace with `var(--color-primary)` (text/border accent) or `var(--color-on-surface)` (body text). No other file uses this colour outside PresentPage.

### 1.4 "Open Presenter" Broken Link
**Problem:** In `EventDetailPage`, the "Open Presenter" link goes to `/dashboard/events/:id/present`. That route renders `DashboardPresentPage` which renders `PresentPage`, but `PresentPage` reads `useParams({ code })` — which is undefined at that path — causing a blank/error page.
**Fix:** Change the `<Link to={\`/dashboard/events/${event.id}/present\`}>` to `<Link to={\`/present/${event.code}\`}>`. The `DashboardPresentPage` and its route can be kept or removed; the link target is the fix.

---

## Group 2: Language Picker → Full-Screen Modal

### 2.1 New `LanguagePickerModal` Component
Replace the existing dropdown-based `LanguagePicker` with a full-screen modal.

**Trigger:** A standalone button (not inline with a dropdown) in the EventPage bottom bar / sidebar that opens the modal.

**Modal structure:**
```
┌─────────────────────────────────────────┐
│ Select Language                      ✕  │
│ ┌──────────────────────────────────┐    │
│ │ 🔍 Search for a language...       │    │
│ └──────────────────────────────────┘    │
│                                         │
│ INSTANT LANGUAGES                       │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │  🇳🇿  │ │  🇬🇧  │ │  🇪🇸  │ │  🇫🇷  │   │
│ │Te Reo│ │Englis│ │Spanis│ │Frenc │   │
│ │Māori │ │English│ │Español│ │Franç.│  │
│ └──────┘ └──────┘ └──────┘ └──────┘   │
│  ... (all NZ census languages)          │
│                                         │
│ TRANSLATED                              │
│  Afrikaans                  Translated  │
│  Albanian                   Translated  │
│  ...                                    │
└─────────────────────────────────────────┘
```

**Component interface:**
```tsx
interface LanguagePickerModalProps {
  isOpen: boolean          // controlled by parent
  onClose: () => void
  selectedLocale: string
  onSelect: (locale: string) => void
}
```
The parent (`EventPage`) holds `const [langPickerOpen, setLangPickerOpen] = useState(false)` and renders a trigger button that sets it to `true`.

**Visual spec:**
- Backdrop: `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center`
- Card: `bg-[var(--color-surface-container-lowest)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden`
- Header: padding 6, flex row, `text-xl font-semibold text-[var(--color-on-surface)]`, X button
- Search: `input-field` class
- Instant tile: `rounded-xl p-4 flex flex-col items-center gap-2 border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] transition-colors bg-[var(--color-surface-container-low)]`; selected tile: `border-[var(--color-primary)] bg-[var(--color-primary-fixed)]`
- Tile contents: flag emoji (`text-3xl`), language name (`text-sm font-semibold`). **No native name** — `NzLanguage` type has no `nativeName` field; do not add one.
- Grid (mobile-first Tailwind order): `grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4`
- Translated list items: full-width row with language name + "Translated" badge

**Integration:** In `EventPage`, replace the `<LanguagePicker>` component in the sidebar with:
1. A trigger button: `<button onClick={() => setLangPickerOpen(true)}>` (styled as a pill with flag + label + chevron, matching the existing trigger)
2. `<LanguagePickerModal isOpen={langPickerOpen} onClose={() => setLangPickerOpen(false)} selectedLocale={selectedLocale} onSelect={setSelectedLocale} />`

The old `LanguagePicker` dropdown component can be kept as-is (it may still be used in other contexts) — `LanguagePickerModal` is a new separate component.

---

## Group 3: Presenter/Dashboard Layout Redesign

### 3.1 New `DashboardShell` Component

A layout wrapper for authenticated/organiser pages. Three columns:

```
┌──────────────┬────────────────────────┬──────────────┐
│  Left Sidebar│     Main Content       │  Right Panel │
│   w-56       │     flex-1             │    w-72      │
│              │                        │              │
└──────────────┴────────────────────────┴──────────────┘
```

**Props:**
```tsx
interface DashboardShellProps {
  left: React.ReactNode
  main: React.ReactNode
  right: React.ReactNode
  headerActions?: React.ReactNode  // optional slot for per-page header buttons (e.g. Sign Out)
}
```

**Shell structure:**
- Outer: `min-h-screen flex flex-col bg-[var(--color-background)]`
- Header bar: `h-14 border-b border-[var(--color-outline-variant)] flex items-center px-6 gap-4 bg-[var(--color-surface-container-low)] shrink-0`; left: Caption Aotearoa brand name; right: `{headerActions}`
- Body row: `flex flex-1 overflow-hidden`
  - Left: `w-56 shrink-0 bg-[var(--color-surface-container-low)] border-r border-[var(--color-outline-variant)] p-5 flex flex-col gap-6 overflow-y-auto hidden lg:flex` (hidden on mobile)
  - Main: `flex-1 overflow-y-auto p-6 lg:p-8`
  - Right: `w-72 shrink-0 bg-[var(--color-surface-container-low)] border-l border-[var(--color-outline-variant)] p-5 flex flex-col gap-6 overflow-y-auto hidden xl:flex` (hidden on mobile/tablet)

**Mobile behaviour:** On `< lg` (< 1024px), the left sidebar is hidden; its content is not accessible on mobile — this is acceptable because the dashboard pages are organiser-only desktop tools. On mobile the main content fills the full width. The EventPage (audience view) is a separate layout and is not affected by DashboardShell.

### 3.2 PresentPage Redesign

Remove the tab nav (Dashboard / Analytics / Schedule / Recordings) entirely.

**Left sidebar content:**
- Event title (font-serif, text-lg, font-semibold)
- Status badge: Live (red pulse dot) / Ready (grey dot) + viewer count
- Divider
- "I am speaking in" label + language pill buttons (existing logic)
- Bilingual toggle if applicable
- Spacer + Kowhaiwhai pattern at bottom (subtle, opacity-10)

**Main content:**
- `MicControl` component (Start/Stop) — centred, prominent
- Audio error display
- "Live preview" label + `CaptionDisplay` (h-64, rounded-xl border)

**Right panel:**
- "Audience joining" heading
- `QRDisplay` component
- Join URL (`/event/:code`) — monospace, copyable
- Event code display

### 3.3 DashboardPage Redesign

**Left sidebar content:**
- "Caption Aotearoa" sub-label ("Organiser")
- Divider
- Nav items: Events (active), Create Event (links to /create), Sign Out

**Main content:**
- "Your Events" heading (font-serif text-2xl)
- Sorted event cards. **Add an optional `to?: string` prop to `EventCard`** (default: `/event/${event.code}`). DashboardPage passes `to={\`/dashboard/events/${event.id}\`}`. This keeps backward compatibility — `HomePage` continues to work without passing `to`. The existing inline `<button>` cards in `DashboardPage.tsx` (legacy `brand-*` classes) are replaced by `<EventCard>` with the `to` override.
- Empty state: "No events yet. Create your first event."

**Right panel:**
- "New Event" button (btn-primary, full width) → `/create`
- Help text: "Share an event code or QR code with your audience."

### 3.4 EventDetailPage Redesign

**Left sidebar content:**
- Back arrow → `/dashboard`
- Event title, status badge, event code (monospace small)
- Event date if set

**Main content:**
- Event details card (description, date, languages count)
- Controls section: Start Captioning / End Event / Retry Transcript buttons (status-gated, same logic as now)
- "Open Presenter" link → `/present/${event.code}` (fixed)
- Transcript download (if ended)

**Right panel:**
- `QRDisplay`
- Join URL + event code
- Copy link button

---

## Acceptance Criteria

- [ ] Font size slider in EventPage changes caption text size visually
- [ ] High contrast checkbox removed from EventPage
- [ ] No purple text visible in dark mode across all pages
- [ ] "Open Presenter" navigates to `/present/:code` without error
- [ ] Language picker opens as full-screen modal with tile grid
- [ ] Language picker search filters both Instant and Translated sections
- [ ] `/present/:code` uses 3-column DashboardShell layout with no tabs
- [ ] `/dashboard` uses 3-column DashboardShell layout showing event cards
- [ ] `/dashboard/events/:id` uses 3-column DashboardShell layout
- [ ] All redesigned pages look correct in both light and dark mode
