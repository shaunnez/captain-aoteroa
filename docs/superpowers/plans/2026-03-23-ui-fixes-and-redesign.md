# UI Fixes & Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four UI bugs (font-size slider, high-contrast checkbox, dark-mode purple text, broken presenter link), replace the language picker with a full-screen modal, and redesign PresentPage/DashboardPage/EventDetailPage with a shared 3-column DashboardShell.

**Architecture:** All organiser pages get a shared `DashboardShell` layout wrapper (left sidebar / main / right panel). A new controlled `LanguagePickerModal` replaces the dropdown in EventPage. Dark-mode colour fixes live entirely in `index.css`. Every page uses CSS variables — no hardcoded hex colours.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, React Router v6, React Query, Vitest + React Testing Library, Framer Motion

**Spec:** `docs/superpowers/specs/2026-03-23-ui-fixes-and-redesign.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `apps/web/src/styles/index.css` | Dark-mode colour tokens + button overrides + scrollbar fix |
| Modify | `apps/web/src/components/CaptionDisplay.tsx` | Inherit font-size in `flat` variant |
| Modify | `apps/web/src/__tests__/CaptionDisplay.test.tsx` | Add font-size inheritance test |
| Modify | `apps/web/src/components/EventCard.tsx` | Add optional `to` prop |
| Modify | `apps/web/src/components/MicControl.tsx` | Replace legacy `brand-*` with CSS vars |
| Modify | `apps/web/src/components/QRDisplay.tsx` | Replace legacy `brand-*` with CSS vars |
| Modify | `apps/web/src/pages/EventPage.tsx` | Remove high-contrast checkbox, fix status dot, add modal trigger |
| Create | `apps/web/src/components/LanguagePickerModal.tsx` | Full-screen language picker modal |
| Create | `apps/web/src/__tests__/LanguagePickerModal.test.tsx` | Modal unit tests |
| Create | `apps/web/src/components/DashboardShell.tsx` | 3-column layout shell |
| Rewrite | `apps/web/src/pages/PresentPage.tsx` | Use DashboardShell, CSS vars, no tabs |
| Rewrite | `apps/web/src/pages/DashboardPage.tsx` | Use DashboardShell + EventCard with `to` |
| Rewrite | `apps/web/src/pages/EventDetailPage.tsx` | Use DashboardShell, fix presenter link |

---

## Task 1: Dark Mode CSS Fixes

**Files:**
- Modify: `apps/web/src/styles/index.css`

Changes: change `--color-primary` in `.dark` from `#c7bfff` to `#f4f1e6`, add button dark-mode overrides, fix scrollbar colours.

- [ ] **Step 1: Open `apps/web/src/styles/index.css` and make the following edits**

In the `.dark` block, change line 42:
```css
/* FROM */
--color-primary:                  #c7bfff;
/* TO */
--color-primary:                  #f4f1e6;
```

After the `.dark` closing brace (after line 64), add:
```css
/* ── Dark mode component overrides ─────────────────────── */
.dark .btn-primary {
  background-color: #311b92;
  color: #ffffff;
}
.dark .btn-primary:hover {
  background-color: #3d23b8;
}
.dark .btn-secondary {
  color: #f4f1e6;
  border-color: #f4f1e6;
}
.dark .btn-secondary:hover {
  background-color: #311b92;
  color: #ffffff;
}
```

In the `.caption-area` rule (around line 144), update both scrollbar declarations:
```css
.caption-area {
  scrollbar-width: thin;
  scrollbar-color: #311b92 transparent;   /* was: var(--color-primary) transparent */
}
.caption-area::-webkit-scrollbar-thumb {
  background-color: #311b92;              /* was: var(--color-primary) */
  border-radius: 10px;
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
pnpm --filter web build 2>&1 | head -20
```
Expected: exits 0 (or only pre-existing warnings, no new errors).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/styles/index.css
git commit -m "fix: dark mode primary colour to white, fix btn + scrollbar overrides"
```

---

## Task 2: CaptionDisplay Font-Size Inheritance

**Files:**
- Modify: `apps/web/src/components/CaptionDisplay.tsx`
- Modify: `apps/web/src/__tests__/CaptionDisplay.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to the `describe('CaptionDisplay variant="flat"')` block in `apps/web/src/__tests__/CaptionDisplay.test.tsx`:

```tsx
it('paragraph inherits font-size from parent style, not hardcoded tailwind sizes', () => {
  const seg: DisplaySegment[] = [
    { sequence: 1, text: 'Size test', isFinal: true, isTranslating: false, id: '1' },
  ]
  const { container } = render(
    <CaptionDisplay segments={seg} variant="flat" style={{ fontSize: '2rem' }} />
  )
  const para = container.querySelector('p')!
  // Must NOT have hardcoded responsive size classes
  expect(para.className).not.toContain('text-3xl')
  expect(para.className).not.toContain('text-5xl')
  expect(para.className).not.toContain('text-7xl')
  // Must use text-[1em] so it inherits the parent fontSize
  expect(para.className).toContain('text-[1em]')
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm --filter web test -- CaptionDisplay
```
Expected: new test FAILS — `expect(para.className).not.toContain('text-3xl')` fails.

- [ ] **Step 3: Fix `CaptionDisplay.tsx` flat variant**

In `apps/web/src/components/CaptionDisplay.tsx`, find the `motion.p` className in the `flat` variant (line 44). Replace the hardcoded responsive size classes:

```tsx
/* FROM */
className={`text-3xl md:text-5xl lg:text-7xl leading-[1.6] text-[var(--color-primary)] ${fadedClass} ${activeClass} ${italicClass}`.trim()}

/* TO */
className={`text-[1em] leading-[1.6] text-[var(--color-primary)] ${fadedClass} ${activeClass} ${italicClass}`.trim()}
```

Also add `cursor-pointer` to the range slider in `EventPage.tsx` (handled in Task 5 — note here for awareness).

- [ ] **Step 4: Run all CaptionDisplay tests**

```bash
pnpm --filter web test -- CaptionDisplay
```
Expected: ALL tests pass (including the new one).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/CaptionDisplay.tsx apps/web/src/__tests__/CaptionDisplay.test.tsx
git commit -m "fix: CaptionDisplay flat variant inherits font-size from parent style prop"
```

---

## Task 3: EventCard Optional `to` Prop

**Files:**
- Modify: `apps/web/src/components/EventCard.tsx`

- [ ] **Step 1: Add the `to` prop**

In `apps/web/src/components/EventCard.tsx`, update the interface and navigation:

```tsx
interface EventCardProps {
  event: Event
  to?: string   // defaults to /event/:code if omitted — backward compatible
}

export function EventCard({ event, to }: EventCardProps) {
  const navigate = useNavigate()
  // ...existing date formatting...

  return (
    <button
      onClick={() => navigate(to ?? `/event/${event.code}`)}
      className="w-full text-left rounded-xl p-5
                 bg-[var(--color-surface-container)]
                 border border-[var(--color-outline-variant)]
                 hover:border-[var(--color-primary)] hover:shadow-lg
                 transition-all duration-200 group"
    >
      {/* rest of JSX unchanged */}
```

No test required — the behaviour is a simple prop override; the existing navigation logic is unchanged and `HomePage` will continue to pass no `to` prop.

- [ ] **Step 2: Verify build still compiles**

```bash
pnpm --filter web build 2>&1 | head -20
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/EventCard.tsx
git commit -m "feat: add optional 'to' prop to EventCard for dashboard navigation"
```

---

## Task 4: MicControl and QRDisplay — CSS Variable Migration

**Files:**
- Modify: `apps/web/src/components/MicControl.tsx`
- Modify: `apps/web/src/components/QRDisplay.tsx`

Both components use legacy `brand-*` Tailwind classes that won't respond to dark mode.

- [ ] **Step 1: Update `MicControl.tsx`**

Replace the entire file content:

```tsx
import { Mic, Square } from 'lucide-react'

interface Props {
  isCapturing: boolean
  onStart: () => void
  onStop: () => void
  error: string | null
  disabled?: boolean
}

export function MicControl({ isCapturing, onStart, onStop, error, disabled }: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={isCapturing ? onStop : onStart}
        disabled={disabled}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all
          shadow-lg text-white text-3xl
          ${isCapturing
            ? 'bg-[var(--color-error)] hover:opacity-90 animate-pulse'
            : 'bg-[var(--color-primary-container)] hover:opacity-90'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isCapturing ? 'Stop captioning' : 'Start captioning'}
      >
        {isCapturing ? <Square size={32} /> : <Mic size={32} />}
      </button>
      <p className="text-sm font-medium text-[var(--color-on-surface-variant)]">
        {isCapturing ? 'Captioning live — tap to stop' : 'Tap to start captioning'}
      </p>
      {error && <p className="text-[var(--color-error)] text-sm">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Update `QRDisplay.tsx`**

Replace the `fullscreen` overlay element (the `motion.div` and its children). Only the overlay div changes — the trigger button and AnimatePresence wrapper stay the same structure:

```tsx
{fullscreen && (
  <motion.div
    initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    className="fixed inset-0 bg-[var(--color-background)] flex flex-col items-center justify-center z-50 p-12"
    onClick={() => setFullscreen(false)}
  >
    <button
      className="absolute top-6 right-6 text-[var(--color-on-surface)] hover:opacity-70 transition-opacity"
      aria-label="Close QR code"
    >
      <X size={32} />
    </button>
    <QRCode value={audienceUrl} size={280} fgColor="#493276" bgColor="#fdfdf0" />
    <p className="font-mono text-5xl font-bold text-[var(--color-on-surface)] mt-8 tracking-widest">
      {eventCode}
    </p>
    <p className="text-[var(--color-on-surface-variant)] mt-4 text-lg">
      Scan to join · Tap anywhere to close
    </p>
  </motion.div>
)}
```

- [ ] **Step 3: Verify build**

```bash
pnpm --filter web build 2>&1 | head -20
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/MicControl.tsx apps/web/src/components/QRDisplay.tsx
git commit -m "fix: replace legacy brand-* colours with CSS vars in MicControl and QRDisplay"
```

---

## Task 5: EventPage Bug Fixes

**Files:**
- Modify: `apps/web/src/pages/EventPage.tsx`

Three targeted fixes: remove high-contrast checkbox, fix the connected-but-not-live status dot, add `cursor-pointer` to the range slider. The LanguagePickerModal integration comes in Task 8.

- [ ] **Step 1: Remove the high-contrast checkbox**

Find the Display section (around line 181-189):

```tsx
{/* REMOVE THIS BLOCK: */}
<label className="flex items-center gap-2 cursor-pointer pt-1">
  <input
    type="checkbox"
    checked={highContrast}
    onChange={toggleHighContrast}
    className="w-4 h-4 accent-[var(--color-primary)]"
  />
  <span className="text-sm text-[var(--color-on-surface)]">High contrast</span>
</label>
```

Delete those 7 lines.

- [ ] **Step 2: Remove unused destructured values from `useAccessibility`**

On the line that calls `useAccessibility`, remove `highContrast` and `toggleHighContrast` from the destructure:

```tsx
/* FROM */
const { fontSize, highContrast, setFontSize, toggleHighContrast } = useAccessibility()

/* TO */
const { fontSize, setFontSize } = useAccessibility()
```

Also remove `highContrast` from the `CaptionDisplay` prop (line ~242):

```tsx
/* FROM */
<CaptionDisplay
  segments={segments}
  variant="flat"
  highContrast={highContrast}
  ...
/>

/* TO */
<CaptionDisplay
  segments={segments}
  variant="flat"
  ...
/>
```

- [ ] **Step 3: Fix the connected-but-not-live status dot**

Find line ~100 where the non-live connected dot is rendered:

```tsx
/* FROM */
<span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline)]'}`} />

/* TO */
<span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--color-primary-container)]' : 'bg-[var(--color-outline)]'}`} />
```

- [ ] **Step 4: Add `cursor-pointer` to the range slider**

Find the `<input type="range"` element (around line 138-146). Add `cursor-pointer` to its className:

```tsx
className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
```

- [ ] **Step 5: Verify build and run tests**

```bash
pnpm --filter web build 2>&1 | head -20
pnpm --filter web test
```
Expected: build exits 0, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/EventPage.tsx
git commit -m "fix: remove high-contrast checkbox, fix status dot colour, add cursor-pointer to slider"
```

---

## Task 6: DashboardShell Component

**Files:**
- Create: `apps/web/src/components/DashboardShell.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/DashboardShell.tsx`:

```tsx
interface DashboardShellProps {
  left: React.ReactNode
  main: React.ReactNode
  right: React.ReactNode
  headerActions?: React.ReactNode
}

export function DashboardShell({ left, main, right, headerActions }: DashboardShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-[var(--color-outline-variant)]
                         bg-[var(--color-surface-container-low)]
                         flex items-center justify-between px-6 gap-4">
        <span className="font-serif text-lg font-bold text-[var(--color-on-surface)]">
          Caption Aotearoa
        </span>
        {headerActions && (
          <div className="flex items-center gap-3">
            {headerActions}
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — hidden below lg */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col gap-6
                          bg-[var(--color-surface-container-low)]
                          border-r border-[var(--color-outline-variant)]
                          p-5 overflow-y-auto">
          {left}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {main}
        </main>

        {/* Right panel — hidden below xl */}
        <aside className="hidden xl:flex w-72 shrink-0 flex-col gap-6
                          bg-[var(--color-surface-container-low)]
                          border-l border-[var(--color-outline-variant)]
                          p-5 overflow-y-auto">
          {right}
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter web build 2>&1 | head -20
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/DashboardShell.tsx
git commit -m "feat: add DashboardShell 3-column layout component"
```

---

## Task 7: LanguagePickerModal Component

**Files:**
- Create: `apps/web/src/components/LanguagePickerModal.tsx`
- Create: `apps/web/src/__tests__/LanguagePickerModal.test.tsx`

- [ ] **Step 1: Write failing tests first**

Create `apps/web/src/__tests__/LanguagePickerModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguagePickerModal } from '../components/LanguagePickerModal'

describe('LanguagePickerModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    selectedLocale: 'en',
    onSelect: vi.fn(),
  }

  it('renders nothing when isOpen is false', () => {
    render(<LanguagePickerModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Select Language')).toBeNull()
  })

  it('renders the modal when isOpen is true', () => {
    render(<LanguagePickerModal {...defaultProps} />)
    expect(screen.getByText('Select Language')).toBeDefined()
  })

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn()
    render(<LanguagePickerModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close language picker'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onSelect with locale code when a language tile is clicked', () => {
    const onSelect = vi.fn()
    render(<LanguagePickerModal {...defaultProps} onSelect={onSelect} />)
    // "English" is always in NZ_LANGUAGES
    fireEvent.click(screen.getByText('English'))
    expect(onSelect).toHaveBeenCalledWith('en')
  })

  it('calls onClose after selecting a language', () => {
    const onClose = vi.fn()
    render(<LanguagePickerModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('English'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('filters tiles by search query', () => {
    render(<LanguagePickerModal {...defaultProps} />)
    const search = screen.getByPlaceholderText('Search for a language…')
    fireEvent.change(search, { target: { value: 'te reo' } })
    // Te reo Māori should still be visible (exact label casing from nzLanguages.ts)
    expect(screen.getByText('Te reo Māori')).toBeDefined()
    // English should be hidden
    expect(screen.queryByText('English')).toBeNull()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<LanguagePickerModal {...defaultProps} onClose={onClose} />)
    // The backdrop is the outermost fixed div
    fireEvent.click(container.querySelector('[data-backdrop]')!)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
pnpm --filter web test -- LanguagePickerModal
```
Expected: all tests FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `apps/web/src/components/LanguagePickerModal.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared/nzLanguages'
import { AZURE_TRANSLATION_LANGUAGES } from '@caption-aotearoa/shared/azureLanguages'

interface LanguagePickerModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLocale: string
  onSelect: (locale: string) => void
}

const NZ_CODES = new Set(NZ_LANGUAGES.map((l) => l.code))

export function LanguagePickerModal({ isOpen, onClose, selectedLocale, onSelect }: LanguagePickerModalProps) {
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const query = search.toLowerCase()

  const instantItems = NZ_LANGUAGES.filter((l) =>
    l.label.toLowerCase().includes(query)
  )

  const translatedItems = AZURE_TRANSLATION_LANGUAGES.filter(
    (l) => !NZ_CODES.has(l.code) && l.label.toLowerCase().includes(query)
  )

  function handleSelect(code: string) {
    onSelect(code)
    onClose()
  }

  return (
    <div
      data-backdrop
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface-container-lowest)] rounded-2xl shadow-2xl
                   w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Select Language"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-outline-variant)] shrink-0">
          <h2 className="text-xl font-semibold text-[var(--color-on-surface)]">
            Select Language
          </h2>
          <button
            onClick={onClose}
            aria-label="Close language picker"
            className="p-1 rounded-lg hover:bg-[var(--color-surface-container-high)] transition-colors
                       text-[var(--color-on-surface-variant)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 shrink-0">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search for a language…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
          />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-6">

          {/* Instant languages */}
          {instantItems.length > 0 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-3">
                Instant Languages
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {instantItems.map((lang) => {
                  const isSelected = selectedLocale === lang.code
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelect(lang.code)}
                      className={`rounded-xl p-4 flex flex-col items-center gap-2 border transition-colors text-center
                        ${isSelected
                          ? 'border-[var(--color-primary-container)] bg-[var(--color-primary-fixed)]'
                          // Note: uses --color-primary-container (deep purple) rather than --color-primary
                          // because after Task 1, --color-primary in dark mode is cream (#f4f1e6).
                          // --color-primary-container (#311b92) gives consistent visible selection in both modes.
                          : 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] hover:border-[var(--color-primary-container)]'
                        }`}
                    >
                      <span className="text-3xl leading-none">{lang.flag ?? '🌐'}</span>
                      <span className="text-sm font-semibold text-[var(--color-on-surface)] leading-tight">
                        {lang.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Translated languages */}
          {translatedItems.length > 0 && (
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-3">
                Translated
              </p>
              <div className="space-y-1">
                {translatedItems.map((lang) => {
                  const isSelected = selectedLocale === lang.code
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelect(lang.code)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm
                        text-left transition-colors
                        ${isSelected
                          ? 'bg-[var(--color-primary-fixed)] text-[var(--color-on-surface)]'
                          : 'hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]'
                        }`}
                    >
                      <span>{lang.label}</span>
                      <span className="text-xs bg-[var(--color-surface-container-high)]
                                       text-[var(--color-on-surface-variant)]
                                       rounded-full px-2 py-0.5 ml-3 shrink-0">
                        Translated
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {instantItems.length === 0 && translatedItems.length === 0 && (
            <p className="text-[var(--color-on-surface-variant)] text-sm py-8 text-center">
              No languages found
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run all LanguagePickerModal tests**

```bash
pnpm --filter web test -- LanguagePickerModal
```
Expected: all 7 tests PASS.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
pnpm --filter web test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/LanguagePickerModal.tsx apps/web/src/__tests__/LanguagePickerModal.test.tsx
git commit -m "feat: add LanguagePickerModal full-screen tile modal component"
```

---

## Task 8: EventPage — LanguagePickerModal Integration

**Files:**
- Modify: `apps/web/src/pages/EventPage.tsx`

Replace the existing `<LanguagePicker>` dropdown trigger in the sidebar with a pill trigger button + `<LanguagePickerModal>`.

- [ ] **Step 1: Add import for `LanguagePickerModal`**

At the top of `apps/web/src/pages/EventPage.tsx`, add:

```tsx
import { LanguagePickerModal } from '../components/LanguagePickerModal'
```

- [ ] **Step 2: Add modal open state**

Inside the `EventPage` function, after the existing state declarations, add:

```tsx
const [langPickerOpen, setLangPickerOpen] = useState(false)
```

- [ ] **Step 3: Find the current language/session section in the sidebar**

Locate the block that currently renders (around line 193–202):

```tsx
{/* Language & session */}
<div className="mt-auto pt-6 border-t border-[var(--color-outline-variant)]">
  <div className="bg-[var(--color-primary)]/5 border border-[var(--color-outline-variant)]
                  rounded-xl p-4 space-y-3">
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-sm text-[var(--color-primary)]">translate</span>
      <LanguagePicker selectedLocale={selectedLocale} onSelect={setSelectedLocale} />
    </div>
    <p className="font-mono text-xs text-[var(--color-on-surface-variant)]">#{event.code}</p>
  </div>
</div>
```

Replace it with:

```tsx
{/* Language & session */}
<div className="mt-auto pt-6 border-t border-[var(--color-outline-variant)]">
  <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]
                  rounded-xl p-4 space-y-3">
    <button
      onClick={() => setLangPickerOpen(true)}
      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                 bg-[var(--color-surface-container-high)]
                 text-[var(--color-on-surface)]
                 border border-[var(--color-outline-variant)]
                 hover:bg-[var(--color-surface-container-highest)] transition-colors"
    >
      <span className="material-symbols-outlined text-[16px] text-[var(--color-on-surface-variant)]">translate</span>
      <span className="flex-1 text-left truncate">
        {/* Show flag + label of the selected language */}
        {(() => {
          const lang = NZ_LANGUAGES.find((l) => l.code === selectedLocale)
          return lang ? `${lang.flag ?? ''} ${lang.label}`.trim() : selectedLocale
        })()}
      </span>
      <svg className="w-3 h-3 opacity-60 shrink-0" viewBox="0 0 12 12" fill="none">
        <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    <p className="font-mono text-xs text-[var(--color-on-surface-variant)]">#{event.code}</p>
  </div>
</div>

{/* Language picker modal — rendered outside the sidebar so it covers full screen */}
<LanguagePickerModal
  isOpen={langPickerOpen}
  onClose={() => setLangPickerOpen(false)}
  selectedLocale={selectedLocale}
  onSelect={setSelectedLocale}
/>
```

- [ ] **Step 4: Remove the `LanguagePicker` import if no longer used**

Check if `LanguagePicker` is still imported. If so, remove that import line. The old `LanguagePicker` component file itself is kept.

Also ensure `NZ_LANGUAGES` is imported (it should already be at the top of EventPage via `useCaptions` or directly).

- [ ] **Step 5: Verify build and tests**

```bash
pnpm --filter web build 2>&1 | head -20
pnpm --filter web test
```
Expected: exits 0, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/EventPage.tsx
git commit -m "feat: replace LanguagePicker dropdown with LanguagePickerModal in EventPage"
```

---

## Task 9: PresentPage Redesign

**Files:**
- Rewrite: `apps/web/src/pages/PresentPage.tsx`

Full replacement. Keeps all existing hooks and logic, rewrites the JSX entirely to use `DashboardShell`. No tabs. No hardcoded hex colours. No `className="dark"` on root element.

- [ ] **Step 1: Replace `PresentPage.tsx` entirely**

```tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { socket } from '../lib/socket'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useCaptions } from '../hooks/useCaptions'
import { CaptionDisplay } from '../components/CaptionDisplay'
import { MicControl } from '../components/MicControl'
import { QRDisplay } from '../components/QRDisplay'
import { DashboardShell } from '../components/DashboardShell'
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import { useViewerCount } from '../hooks/useViewerCount'
import type { Event } from '@caption-aotearoa/shared'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared/nzLanguages'
import { RECOGNITION_LOCALES } from '@caption-aotearoa/shared/recognitionLocales'

/** Māori uses Papa Reo on the backend — add it separately to the UI map. */
const PRESENTER_LOCALES: Record<string, string> = { ...RECOGNITION_LOCALES, mi: 'mi-NZ' }

export function PresentPage() {
  const { code } = useParams<{ code: string }>()
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', code],
    queryFn: () => api.get<Event>(`/api/events/${code}`).then((r) => r.data),
    enabled: !!code,
  })

  const [speakerLocale, setSpeakerLocale] = useState<string | undefined>(undefined)
  const [isDualMode, setIsDualMode] = useState(false)

  const { isCapturing, start, stop, error: audioError } = useAudioCapture(code ?? '')
  const viewerCount = useViewerCount(code ?? '')
  const { segments } = useCaptions(code ?? '', speakerLocale ?? 'en-NZ')

  const hasBilingual =
    event?.languages.includes('en') && event?.languages.includes('mi')

  async function handleStart() {
    await api.patch(`/api/events/${code}/status`, { status: 'live' })
    await start()
  }

  async function handleStop() {
    stop()
    await api.patch(`/api/events/${code}/status`, { status: 'ended' })
  }

  function handleLanguageChange(azureCode: string) {
    if (isDualMode) {
      setIsDualMode(false)
      if (code) socket.emit('session:set-mode', { code, mode: 'single' })
    }
    const bcp47 = PRESENTER_LOCALES[azureCode] ?? azureCode
    setSpeakerLocale(bcp47)
    if (code) socket.emit('session:set-language', { code, locale: bcp47 })
  }

  function handleToggleDual() {
    const newMode = !isDualMode
    setIsDualMode(newMode)
    if (code) socket.emit('session:set-mode', { code, mode: newMode ? 'dual' : 'single' })
  }

  if (isLoading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-[var(--color-on-surface)] text-lg">Loading…</p>
      </div>
    )
  }

  const speakerLanguages = event.languages.filter((l) => l in PRESENTER_LOCALES)

  return (
    <DashboardShell
      left={
        <div className="flex flex-col gap-5 h-full">
          {/* Event info */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] leading-snug">
              {event.title}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                isCapturing ? 'bg-red-500 animate-pulse' : 'bg-[var(--color-outline)]'
              }`} />
              <span className="text-sm text-[var(--color-on-surface-variant)]">
                {isCapturing ? 'Live' : 'Ready'}
              </span>
              {viewerCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-[var(--color-on-surface-variant)] ml-1">
                  <span className="material-symbols-outlined text-[15px]">group</span>
                  {viewerCount}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--color-outline-variant)]" />

          {/* Language selector */}
          {speakerLanguages.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest">
                I am speaking in
              </p>
              <div className="flex flex-wrap gap-2">
                {speakerLanguages.map((azureCode, i) => {
                  const bcp47 = PRESENTER_LOCALES[azureCode]
                  const isActive =
                    !isDualMode &&
                    (speakerLocale === bcp47 || (speakerLocale === undefined && i === 0))
                  return (
                    <button
                      key={azureCode}
                      onClick={() => handleLanguageChange(azureCode)}
                      className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                        isActive
                          ? 'bg-[var(--color-primary-container)] text-white border-[var(--color-primary-container)]'
                          : 'bg-transparent text-[var(--color-on-surface)] border-[var(--color-outline-variant)] hover:border-[var(--color-primary-container)]'
                      }`}
                    >
                      {NZ_LANGUAGES.find((l) => l.code === azureCode)?.label ?? azureCode}
                    </button>
                  )
                })}
                {hasBilingual && (
                  <button
                    onClick={handleToggleDual}
                    className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                      isDualMode
                        ? 'bg-[var(--color-primary-container)] text-white border-[var(--color-primary-container)]'
                        : 'bg-transparent text-[var(--color-on-surface)] border-[var(--color-outline-variant)] hover:border-[var(--color-primary-container)]'
                    }`}
                  >
                    English + Te Reo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Kowhaiwhai decorative pattern at bottom */}
          <div className="mt-auto opacity-10 pointer-events-none">
            <KowhaiwhaPattern />
          </div>
        </div>
      }
      main={
        <div className="flex flex-col gap-8">
          <MicControl
            isCapturing={isCapturing}
            onStart={handleStart}
            onStop={handleStop}
            error={audioError}
          />
          <div>
            <p className="text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2">
              Live preview
            </p>
            <CaptionDisplay
              segments={segments}
              className="h-64 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-xl p-4"
            />
          </div>
        </div>
      }
      right={
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            Audience joining
          </h3>
          <QRDisplay eventCode={event.code} />
          <div className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-4 space-y-2">
            <p className="text-xs text-[var(--color-on-surface-variant)]">Join link</p>
            <p className="font-mono text-xs text-[var(--color-on-surface)] break-all">
              {window.location.origin}/event/{event.code}
            </p>
            <p className="text-xs text-[var(--color-on-surface-variant)] pt-1">
              Code:{' '}
              <span className="font-mono font-semibold text-[var(--color-on-surface)]">
                {event.code}
              </span>
            </p>
          </div>
        </div>
      }
    />
  )
}
```

- [ ] **Step 2: Verify build and tests**

```bash
pnpm --filter web build 2>&1 | head -20
pnpm --filter web test
```
Expected: exits 0, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/PresentPage.tsx
git commit -m "feat: redesign PresentPage with DashboardShell 3-column layout, remove tabs"
```

---

## Task 10: DashboardPage Redesign

**Files:**
- Rewrite: `apps/web/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Replace `DashboardPage.tsx` entirely**

```tsx
import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { DashboardShell } from '../components/DashboardShell'
import { EventCard } from '../components/EventCard'
import { LogOut, Plus, LayoutList } from 'lucide-react'
import type { Event } from '@caption-aotearoa/shared'

export function DashboardPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => api.get<Event[]>('/api/events').then((r) => r.data),
    refetchInterval: 15_000,
  })

  const statusOrder = { live: 0, upcoming: 1, ended: 2 }
  const sorted = [...events].sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status]
    if (s !== 0) return s
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <DashboardShell
      headerActions={
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]
                     hover:text-[var(--color-on-surface)] transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      }
      left={
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-3">
            Organiser
          </p>
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                       bg-[var(--color-primary-fixed)] text-[var(--color-on-surface)] transition-colors"
          >
            <LayoutList size={16} />
            Events
          </Link>
          <Link
            to="/create"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                       text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] transition-colors"
          >
            <Plus size={16} />
            Create Event
          </Link>
        </div>
      }
      main={
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-6">
            Your Events
          </h1>
          {isLoading ? (
            <p className="text-[var(--color-on-surface-variant)] text-center py-12">
              Loading events…
            </p>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[var(--color-on-surface-variant)] mb-4">No events yet.</p>
              <Link to="/create" className="btn-primary">
                Create your first event
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  to={`/dashboard/events/${event.id}`}
                />
              ))}
            </div>
          )}
        </div>
      }
      right={
        <div className="flex flex-col gap-4">
          <Link to="/create" className="btn-primary text-center">
            <Plus size={16} className="inline mr-2" />
            New Event
          </Link>
          <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
            Share an event code or QR code with your audience — no app install needed.
          </p>
        </div>
      }
    />
  )
}
```

- [ ] **Step 2: Verify build and tests**

```bash
pnpm --filter web build 2>&1 | head -20
pnpm --filter web test
```
Expected: exits 0, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/DashboardPage.tsx
git commit -m "feat: redesign DashboardPage with DashboardShell and EventCard navigation"
```

---

## Task 11: EventDetailPage Redesign + Open Presenter Fix

**Files:**
- Rewrite: `apps/web/src/pages/EventDetailPage.tsx`

- [ ] **Step 1: Replace `EventDetailPage.tsx` entirely**

```tsx
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { DashboardShell } from '../components/DashboardShell'
import { StatusBadge } from '../components/StatusBadge'
import { QRDisplay } from '../components/QRDisplay'
import { TranscriptDownload } from '../components/TranscriptDownload'
import type { Event } from '@caption-aotearoa/shared'
import { ArrowLeft, Play, Square, RotateCcw, ExternalLink } from 'lucide-react'

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: events = [] } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => api.get<Event[]>('/api/events').then((r) => r.data),
  })

  const event = events.find((e) => e.id === id)

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/api/events/${event?.code}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-events'] }),
  })

  const retryTranscript = useMutation({
    mutationFn: () => api.post(`/api/events/${event?.code}/transcript/retry`),
  })

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-[var(--color-on-surface-variant)]">Loading event…</p>
      </div>
    )
  }

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-NZ', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null

  return (
    <DashboardShell
      left={
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]
                       hover:text-[var(--color-on-surface)] transition-colors -ml-1"
          >
            <ArrowLeft size={16} />
            All events
          </button>
          <div className="border-t border-[var(--color-outline-variant)]" />
          <div>
            <h2 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] leading-snug">
              {event.title}
            </h2>
            <p className="font-mono text-xs text-[var(--color-on-surface-variant)] mt-1">
              {event.code}
            </p>
            {formattedDate && (
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-2">
                {formattedDate}
              </p>
            )}
            <div className="mt-3">
              <StatusBadge status={event.status} />
            </div>
          </div>
        </div>
      }
      main={
        <div className="space-y-6">
          {/* Event details */}
          <section className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6">
            <h2 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] mb-3">
              Event Details
            </h2>
            {event.description && (
              <p className="text-[var(--color-on-surface-variant)] mb-3">{event.description}</p>
            )}
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {event.languages.length} language{event.languages.length !== 1 ? 's' : ''} configured
            </p>
          </section>

          {/* Controls */}
          <section className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6">
            <h2 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] mb-4">
              Controls
            </h2>
            <div className="flex flex-wrap gap-3">
              {event.status === 'upcoming' && (
                <button
                  onClick={() => statusMutation.mutate('live')}
                  disabled={statusMutation.isPending}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <Play size={16} />
                  Start Captioning
                </button>
              )}
              {event.status === 'live' && (
                <>
                  {/* Fixed: was /dashboard/events/:id/present — now goes directly to /present/:code */}
                  <Link
                    to={`/present/${event.code}`}
                    className="btn-primary flex items-center gap-2"
                  >
                    <ExternalLink size={16} />
                    Open Presenter
                  </Link>
                  <button
                    onClick={() => statusMutation.mutate('ended')}
                    disabled={statusMutation.isPending}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-50
                               text-[var(--color-error)] border-[var(--color-error)]
                               hover:bg-[var(--color-error)] hover:text-white"
                  >
                    <Square size={16} />
                    End Event
                  </button>
                </>
              )}
              {event.status === 'ended' && (
                <button
                  onClick={() => retryTranscript.mutate()}
                  disabled={retryTranscript.isPending}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  {retryTranscript.isPending ? 'Retrying…' : 'Retry Transcript'}
                </button>
              )}
            </div>
          </section>

          {/* Transcript */}
          {event.status === 'ended' && (
            <section className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6">
              <h2 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] mb-4">
                Transcript
              </h2>
              <TranscriptDownload
                eventCode={event.code}
                eventTitle={event.title}
                eventDate={event.event_date}
              />
            </section>
          )}
        </div>
      }
      right={
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            Audience joining
          </h3>
          <QRDisplay eventCode={event.code} />
          <div className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-4 space-y-2">
            <p className="text-xs text-[var(--color-on-surface-variant)]">Join link</p>
            <p className="font-mono text-xs text-[var(--color-on-surface)] break-all">
              {window.location.origin}/event/{event.code}
            </p>
            <p className="text-xs text-[var(--color-on-surface-variant)] pt-1">
              Code:{' '}
              <span className="font-mono font-semibold text-[var(--color-on-surface)]">
                {event.code}
              </span>
            </p>
          </div>
        </div>
      }
    />
  )
}
```

- [ ] **Step 2: Verify build and tests**

```bash
pnpm --filter web build 2>&1 | head -20
pnpm --filter web test
```
Expected: exits 0, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/EventDetailPage.tsx
git commit -m "feat: redesign EventDetailPage with DashboardShell, fix Open Presenter link"
```

---

## Final Verification

- [ ] **Run full test suite one last time**

```bash
pnpm --filter web test
```
Expected: all tests pass with no failures.

- [ ] **Manual acceptance criteria check**

Visit each route and verify against the spec acceptance criteria:

| Route | Check |
|-------|-------|
| `/event/:code` | Font size slider changes caption size ✓, no high-contrast checkbox ✓, language button opens full-screen modal ✓ |
| `/event/:code` dark mode | No purple text — event title, status, brand text all appear white/cream ✓ |
| `/present/:code` | 3-column DashboardShell layout ✓, no tabs ✓, mic control centred ✓ |
| `/present/:code` dark mode | Buttons, text all white/deep-purple — no light-purple ✓ |
| `/dashboard` | 3-column layout ✓, event cards navigate to detail page ✓ |
| `/dashboard/events/:id` | 3-column layout ✓, Open Presenter goes to `/present/:code` without error ✓ |
| Both modes | Toggle dark/light — all pages consistent ✓ |
