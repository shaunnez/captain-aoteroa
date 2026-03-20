# Plan: Apply Dark Mode "Digital Weaver" Design System

## Context
The Caption Aotearoa web app currently uses a light sand/purple theme (Roboto fonts, #fdfdf0 backgrounds, white cards). The user has added a complete design system from Google Stitch with dark mode mockups, HTML code templates, and a design document. The goal is to transform the entire web UI to match the dark mode "Digital Weaver" aesthetic — a high-contrast charcoal/black canvas with Manrope/Plus Jakarta Sans typography, rainbow "Aurora" gradient accents, kowhaiwhai background textures, and ghost-style buttons. All existing functionality (Socket.IO captions, React Query, Supabase auth, accessibility) must remain intact.

## Reference Files
- **Design document:** `design/stitch_caption_aotearoa_home_light_theme/caption_aotearoa_design_document_design.md`
- **Home dark HTML:** `design/.../caption_aotearoa_final_home/code.html`
- **Language picker HTML:** `design/.../language_selection_with_icons/code.html`
- **Recording view HTML:** `design/.../organiser_recording_view/code.html`
- **Export guide:** `design/stitch_caption_aotearoa_home_light_theme/example-code.html`
- **Dark screenshots:** `design/.../caption_aotearoa_home_dark_theme/screen.png`, `organiser_dashboard_dark_mode/screen.png`, `caption_aotearoa_live_captioning_dark_mode/screen.png`, `event_controls_dark_mode/screen.png`, `language_selection_dark_mode/screen.png`, `new_event_creation_dark_mode/screen.png`, `event_qr_code_modal_dark_mode/screen.png`

---

## Implementation Steps

### Step 1: Foundation — Tailwind Config
**File:** `apps/web/tailwind.config.ts`

Replace the entire color palette and font config with the Stitch dark mode tokens:

```
Colors:
  surface:                 #0e0e0e    (main bg)
  surface-dim:             #0e0e0e
  surface-bright:          #2b2c2c
  surface-container-lowest: #000000
  surface-container-low:   #131313
  surface-container:       #191a1a
  surface-container-high:  #1f2020
  surface-container-highest: #252626
  on-surface:              #e7e5e5    (primary text)
  on-surface-variant:      #acabaa    (dimmed text)
  secondary:               #9d9e9e    (labels)
  primary:                 #c6c6c7    (borders, active)
  primary-container:       #454747
  outline:                 #767575
  outline-variant:         #484848
  error:                   #ee7d77
  error-container:         #7f2927
  tertiary:                #ffe792    (accent/gold)
  tertiary-container:      #ffd709
  on-primary:              #3f4041
  on-error:                #490106

  (Keep brand-error: #9d2020 as fallback for form validation)

Fonts:
  headline: ['Manrope', sans-serif]
  body:     ['Plus Jakarta Sans', sans-serif]
  label:    ['Plus Jakarta Sans', sans-serif]

Border radius:
  DEFAULT: 0.125rem
  lg: 0.25rem
  xl: 0.5rem
  full: 0.75rem
  pill: 9999px  (keep existing)
```

### Step 2: Foundation — CSS & Fonts
**File:** `apps/web/src/styles/index.css`

- Replace Google Fonts import: Roboto → Manrope + Plus Jakarta Sans
- Update base layer: `body { @apply bg-surface text-on-surface font-body }`
- Rewrite `.btn-primary` → ghost style: transparent bg, thin border `border-outline-variant`, text `on-surface`, hover: `bg-surface-container-high`
- Rewrite `.btn-secondary` → similar ghost with subtle accent
- Add `.btn-accent` → for primary CTAs with rainbow bottom border on hover
- Rewrite `.input-field` → dark bg `surface-container`, border `outline-variant`, text `on-surface`, focus border `primary`
- Add new utility classes:
  - `.kowhaiwhai-pattern` — inline SVG background at very low opacity (from Stitch HTML)
  - `.rainbow-glow` — gradient blur effect for hero input
  - `.rainbow-indicator` — solid rainbow gradient bar (for live/active states)
  - `.glass-obsidian` — semi-transparent dark glass effect

### Step 3: Create Logo SVG Asset
**File:** `apps/web/public/logo-koru.svg` (new)

Create a simple koru-inspired SVG mark with a rainbow gradient fill, similar to the one shown in the dark mode home screenshot. Keep it minimal — a spiral koru shape with the Aurora gradient.

### Step 4: HomePage Redesign
**File:** `apps/web/src/pages/HomePage.tsx`

Transform to match the dark mode home screenshot:
- Full-width dark layout with `kowhaiwhai-pattern` background
- Top nav bar: fixed, dark with "Caption Aotearoa" text + logo
- Hero section: Large Manrope heading with gradient text ("Bridging Silence with Real-Time Clarity" or similar), subtitle in `on-surface-variant`
- Join input: Rainbow glow wrapper around dark input + "Join Event" button
- Events section: Grid of dark event cards with icon columns, status badges, "Watch Live" buttons
- Footer: dark `surface-container-lowest` with border top

### Step 5: JoinForm Component
**File:** `apps/web/src/components/JoinForm.tsx`

- Remove label, use placeholder-driven input
- Dark input styling with `surface-container-high` bg
- Rainbow glow wrapper around the input group
- Font: `font-headline tracking-widest uppercase`

### Step 6: EventCard Component
**File:** `apps/web/src/components/EventCard.tsx`

- Dark card: `bg-surface-container-lowest border border-outline-variant/20`
- Hover: `border-primary/50`
- Title in `on-surface`, date in `on-surface-variant`
- Code/language count in `secondary`
- Keep StatusBadge integration

### Step 7: StatusBadge Component
**File:** `apps/web/src/components/StatusBadge.tsx`

- Live: rainbow gradient background or `error` with glow
- Upcoming: `surface-container-high` with `secondary` text
- Ended: `surface-container-high` with `outline` text

### Step 8: EventSearchBar Component
**File:** `apps/web/src/components/EventSearchBar.tsx`

- Dark input: `bg-surface-container border-outline-variant`
- Icon color: `secondary`
- Focus: `border-primary`

### Step 9: DashboardPage
**File:** `apps/web/src/pages/DashboardPage.tsx`

- Dark header: `bg-surface-container-lowest` with thin bottom border
- Title in `font-headline` with `on-surface` color
- Event cards: dark surface with ghost-style borders
- "New Event" button: ghost style with accent
- Background: `kowhaiwhai-pattern`

### Step 10: EventDetailPage
**File:** `apps/web/src/pages/EventDetailPage.tsx`

Match the event controls dark mode screenshot:
- Dark header with back arrow, event title, live indicator (pulsing dot)
- Dark cards for "Event Details" and "Controls" sections
- Ghost buttons: "Open Presenter" with play icon, "End Event" with error styling
- "Show QR Code" ghost button with QR icon

### Step 11: CreateEventPage
**File:** `apps/web/src/pages/CreateEventPage.tsx`

Match new event creation dark mode screenshot:
- Dark background, centered form
- Title: large `font-headline` text
- Input fields with dark styling
- Custom phrases textarea with subtle teal/accent border
- "Create event" button with accent styling

### Step 12: LoginPage & SignupPage
**Files:** `apps/web/src/pages/LoginPage.tsx`, `apps/web/src/pages/SignupPage.tsx`

- Dark background with centered form
- Dark input fields
- Ghost/accent button styling

### Step 13: EventPage (Audience Caption View)
**File:** `apps/web/src/pages/EventPage.tsx`

Match live captioning dark mode screenshot:
- Dark header with "Live" indicator (rainbow dot), title, language picker, viewer count
- `kowhaiwhai-pattern` background on caption area
- Accessibility panel: dark surface with `outline-variant` borders
- Caption area: dark background
- Bottom toolbar: font size control + share button (dark styling)
- Update high contrast mode to work within dark theme

### Step 14: CaptionDisplay Component
**File:** `apps/web/src/components/CaptionDisplay.tsx`

Match the live captioning screenshot:
- Large `font-headline` text
- Final captions: `on-surface` (bright white)
- Interim (partial) captions: `on-surface-variant` (dimmed)
- Active line: rainbow indicator bar on left side
- Blinking cursor: `primary` color bar
- Dark background, remove white bg default

### Step 15: LanguagePicker Component
**File:** `apps/web/src/components/LanguagePicker.tsx`

Major redesign to match language selection dark mode screenshot:
- Trigger button: ghost style with dark bg
- Dropdown panel: `bg-surface-container-low` with `outline-variant` border
- Search input: dark with rainbow underline on focus
- "Instant" badges: `bg-primary-container` with `primary` text
- "Translated" badges: subtle dark styling
- Te Reo Māori always first with special highlight
- Larger touch targets (min 48px row height)

### Step 16: PresentPage (Presenter View)
**File:** `apps/web/src/pages/PresentPage.tsx`

Match organiser recording/live stream screenshots:
- Dark background with `kowhaiwhai-pattern`
- Header: dark with recording indicator, event title, viewer count, QR button
- Large mic control: centered with rainbow indicator bar above when live
- Language pills: dark styling (`surface-container-high` bg, `outline-variant` border)
- Active language: `primary` border with rainbow left accent
- "English + Te Reo" dual mode button
- Caption preview: dark card with Manrope text
- Audience URL at bottom in `secondary` text

### Step 17: MicControl Component
**File:** `apps/web/src/components/MicControl.tsx`

- Larger circular button (w-24 h-24)
- Not capturing: `border-2 border-outline-variant` with mic icon in `primary`
- Capturing: rainbow indicator bar above, pulsing border, "Live" badge
- Label text: `secondary` color

### Step 18: QRDisplay Component
**File:** `apps/web/src/components/QRDisplay.tsx`

Match QR modal dark mode screenshot:
- Trigger: ghost button
- Modal: dark `surface-container-low` bg with `outline-variant` border
- QR code with dark-friendly colors (purple on white, or white on dark)
- Event code in large `font-headline` text
- "Scan to join" label in `secondary`
- Koru corner decorations using existing `mangopare-corner.svg`
- Close button: `on-surface` X icon

### Step 19: EventLobby Component
**File:** `apps/web/src/components/EventLobby.tsx`

- Dark full-screen: `bg-surface` with `kowhaiwhai-pattern`
- Dark card: `surface-container-high` border
- Title in `on-surface`, date in `secondary`
- Countdown numbers: large `on-surface` with `font-headline`
- "Starting in" label: `secondary` uppercase

### Step 20: Tohu Component
**File:** `apps/web/src/components/Tohu.tsx`

- Keep as-is. The purple SVG patterns work well on dark backgrounds at low opacity. May adjust opacity values where used in pages.

---

## Files Modified (Summary)
1. `apps/web/tailwind.config.ts`
2. `apps/web/src/styles/index.css`
3. `apps/web/public/logo-koru.svg` (new)
4. `apps/web/src/pages/HomePage.tsx`
5. `apps/web/src/pages/DashboardPage.tsx`
6. `apps/web/src/pages/EventPage.tsx`
7. `apps/web/src/pages/PresentPage.tsx`
8. `apps/web/src/pages/CreateEventPage.tsx`
9. `apps/web/src/pages/EventDetailPage.tsx`
10. `apps/web/src/pages/LoginPage.tsx`
11. `apps/web/src/pages/SignupPage.tsx`
12. `apps/web/src/components/JoinForm.tsx`
13. `apps/web/src/components/EventCard.tsx`
14. `apps/web/src/components/StatusBadge.tsx`
15. `apps/web/src/components/EventSearchBar.tsx`
16. `apps/web/src/components/CaptionDisplay.tsx`
17. `apps/web/src/components/LanguagePicker.tsx`
18. `apps/web/src/components/MicControl.tsx`
19. `apps/web/src/components/QRDisplay.tsx`
20. `apps/web/src/components/EventLobby.tsx`

## What Stays Unchanged
- All hooks (`useAudioCapture`, `useCaptions`, `useCountdown`, `useAccessibility`, `useViewerCount`, `useAuth`)
- All lib files (`api.ts`, `socket.ts`, `supabase.ts`)
- Router structure (`router.tsx`, `App.tsx`, `main.tsx`)
- `packages/shared` (types, constants)
- `apps/api` (backend)
- `ProtectedRoute`, `TranscriptDownload`, `Tohu` components (minimal/no changes)
- All SVG assets in `public/tohu/`

## Verification
1. `pnpm --filter web dev` — confirm app starts without errors
2. Visit `/` — dark home page with rainbow glow input, event cards, kowhaiwhai texture
3. Visit `/login` and `/signup` — dark forms
4. Visit `/dashboard` — dark event list with ghost buttons
5. Visit `/create` — dark event creation form
6. Visit `/dashboard/events/:id` — dark event detail with controls
7. Visit `/event/:code` — dark audience view with captions, language picker
8. Visit `/present/:code` — dark presenter view with mic, language pills
9. Test accessibility: font size slider and high contrast toggle still work
10. Test responsiveness: check mobile layouts on all pages
11. `pnpm --filter web build` — confirm production build succeeds
