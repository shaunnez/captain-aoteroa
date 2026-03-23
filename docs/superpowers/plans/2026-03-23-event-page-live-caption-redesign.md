# EventPage Live Caption Viewer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-column `/event/:code` layout with the Stitch "Live Caption Viewer (Light Mode)" design — split sidebar (accessibility controls) + full-height caption canvas.

**Architecture:** Three independent tasks, sequential. Task 1 adds CSS, Task 2 adds a `variant="flat"` prop to `CaptionDisplay`, Task 3 restructures `EventPage` to use the new layout and the flat variant. `PresentPage` is not touched.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (class dark mode), Vitest + React Testing Library, Framer Motion

**Spec:** `docs/superpowers/specs/2026-03-23-event-page-redesign.md`

---

## File Map

| File | Action | What changes |
|---|---|---|
| `apps/web/src/styles/index.css` | Modify | Add `.caption-area` scrollbar styles |
| `apps/web/src/components/CaptionDisplay.tsx` | Modify | Add `variant?: 'box' \| 'flat'` prop; flat variant: faded-old/bold-current segment treatment |
| `apps/web/src/pages/EventPage.tsx` | Modify | Full layout restructure: sidebar + caption canvas |
| `apps/web/src/__tests__/CaptionDisplay.test.tsx` | Modify | Add tests for `variant="flat"` behaviour |

---

## Task 1: Caption Area Scrollbar Styles

**Files:**
- Modify: `apps/web/src/styles/index.css`

- [ ] **Step 1.1: Add `.caption-area` styles**

Open `apps/web/src/styles/index.css`. Add the following block inside the `@layer utilities` section (after the existing `.tohu-divider` rule):

```css
  .caption-area {
    scrollbar-width: thin;
    scrollbar-color: var(--color-primary) transparent;
  }
  .caption-area::-webkit-scrollbar {
    width: 6px;
  }
  .caption-area::-webkit-scrollbar-thumb {
    background-color: var(--color-primary);
    border-radius: 10px;
  }
```

- [ ] **Step 1.2: Commit**

```bash
git add apps/web/src/styles/index.css
git commit -m "style: add .caption-area scrollbar styles"
```

---

## Task 2: CaptionDisplay Flat Variant

The current `CaptionDisplay` wraps segments in a rounded box. The flat variant renders segments directly — older ones faded, the last one bold with a left border accent — for use in the new `EventPage` canvas.

**Files:**
- Modify: `apps/web/src/components/CaptionDisplay.tsx`
- Modify: `apps/web/src/__tests__/CaptionDisplay.test.tsx`

- [ ] **Step 2.1: Write failing tests for the flat variant**

Open `apps/web/src/__tests__/CaptionDisplay.test.tsx`. Add this `describe` block after the existing one:

```tsx
describe('CaptionDisplay variant="flat"', () => {
  const segments: DisplaySegment[] = [
    { sequence: 1, text: 'First segment', isFinal: true, isTranslating: false, id: '1' },
    { sequence: 2, text: 'Second segment', isFinal: true, isTranslating: false, id: '2' },
    { sequence: 3, text: 'Current segment', isFinal: false, isTranslating: false, id: '3' },
  ]

  it('still has role="log" and aria-live="polite"', () => {
    render(<CaptionDisplay segments={segments} variant="flat" />)
    const log = screen.getByRole('log')
    expect(log.getAttribute('aria-live')).toBe('polite')
  })

  it('does not render the rounded box container class', () => {
    render(<CaptionDisplay segments={segments} variant="flat" />)
    const log = screen.getByRole('log')
    expect(log.className).not.toContain('rounded-lg')
  })

  it('renders all segment texts', () => {
    render(<CaptionDisplay segments={segments} variant="flat" />)
    expect(screen.getByText('First segment')).toBeDefined()
    expect(screen.getByText('Second segment')).toBeDefined()
    expect(screen.getByText('Current segment')).toBeDefined()
  })

  it('applies faded style to all segments except the last', () => {
    const { container } = render(<CaptionDisplay segments={segments} variant="flat" />)
    const paras = container.querySelectorAll('p')
    // First two are faded (opacity-20 class present)
    expect(paras[0].className).toContain('opacity-20')
    expect(paras[1].className).toContain('opacity-20')
    // Last is not faded
    expect(paras[2].className).not.toContain('opacity-20')
  })

  it('applies left-border accent to the last segment', () => {
    const { container } = render(<CaptionDisplay segments={segments} variant="flat" />)
    const paras = container.querySelectorAll('p')
    expect(paras[2].className).toContain('border-l-8')
  })

  it('with highContrast=true, faded segments are not faded', () => {
    const { container } = render(
      <CaptionDisplay segments={segments} variant="flat" highContrast={true} />
    )
    const paras = container.querySelectorAll('p')
    expect(paras[0].className).not.toContain('opacity-20')
    expect(paras[1].className).not.toContain('opacity-20')
  })

  it('with a single segment, that segment gets the active style', () => {
    const single: DisplaySegment[] = [
      { sequence: 1, text: 'Only segment', isFinal: true, isTranslating: false, id: '1' },
    ]
    const { container } = render(<CaptionDisplay segments={single} variant="flat" />)
    const para = container.querySelector('p')!
    expect(para.className).toContain('border-l-8')
    expect(para.className).not.toContain('opacity-20')
  })
})
```

- [ ] **Step 2.2: Run tests to confirm they fail**

```bash
cd apps/web && pnpm test --run src/__tests__/CaptionDisplay.test.tsx
```

Expected: the new `variant="flat"` tests fail (variant prop does not exist yet).

- [ ] **Step 2.3: Implement the flat variant**

Replace the entire contents of `apps/web/src/components/CaptionDisplay.tsx` with:

```tsx
import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { DisplaySegment } from '../hooks/useCaptions'

interface Props {
  segments: DisplaySegment[]
  className?: string
  style?: React.CSSProperties
  highContrast?: boolean
  variant?: 'box' | 'flat'
}

export function CaptionDisplay({
  segments,
  className = '',
  style,
  highContrast = false,
  variant = 'box',
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments])

  if (variant === 'flat') {
    return (
      <div
        className={`overflow-y-auto caption-area flex flex-col gap-10 pr-4 ${className}`}
        role="log"
        aria-live="polite"
        aria-label="Live captions"
        style={style}
      >
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1
          const fadedClass =
            !isLast && !highContrast
              ? 'text-[var(--color-primary)] opacity-20'
              : 'text-[var(--color-primary)]'
          const activeClass = isLast
            ? 'border-l-8 border-[var(--color-primary)] pl-10 transition-all duration-700 ease-out'
            : ''
          return (
            <motion.p
              key={`${seg.sequence}-${seg.isFinal}`}
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`text-3xl md:text-5xl lg:text-7xl leading-[1.6] ${fadedClass} ${activeClass} ${
                !seg.isFinal ? 'italic' : ''
              } flex items-center gap-3`}
            >
              <span>{seg.text}</span>
              {seg.isTranslating && (
                <span
                  className="inline-block w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin flex-shrink-0"
                  aria-label="Translating"
                />
              )}
            </motion.p>
          )
        })}
        <div ref={bottomRef} />
      </div>
    )
  }

  // Default 'box' variant — unchanged
  return (
    <div
      className={`overflow-y-auto rounded-lg p-6 space-y-2 ${className}`}
      role="log"
      aria-live="polite"
      aria-label="Live captions"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#311b92 transparent', ...style }}
    >
      {segments.map((seg) => (
        <motion.p
          key={`${seg.sequence}-${seg.isFinal}`}
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`leading-relaxed transition-colors duration-200 flex items-center gap-2 ${
            seg.isFinal
              ? 'text-[var(--color-on-surface)]'
              : 'text-[var(--color-primary)] opacity-70 italic'
          }`}
        >
          <span>{seg.text}</span>
          {seg.isTranslating && (
            <span
              className="inline-block w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin flex-shrink-0"
              aria-label="Translating"
            />
          )}
        </motion.p>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 2.4: Run all CaptionDisplay tests**

```bash
cd apps/web && pnpm test --run src/__tests__/CaptionDisplay.test.tsx
```

Expected: all tests pass (both the original `describe` block and the new flat variant block).

- [ ] **Step 2.5: Commit**

```bash
git add apps/web/src/components/CaptionDisplay.tsx apps/web/src/__tests__/CaptionDisplay.test.tsx
git commit -m "feat: add variant='flat' to CaptionDisplay for canvas caption rendering"
```

---

## Task 3: EventPage Layout Restructure

Replace the single-column layout with a split sidebar + caption canvas. All existing hooks and logic are preserved — only the JSX structure and styles change.

**Files:**
- Modify: `apps/web/src/pages/EventPage.tsx`

- [ ] **Step 3.1: Replace EventPage.tsx**

Replace the entire contents of `apps/web/src/pages/EventPage.tsx` with:

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useCaptions } from '../hooks/useCaptions'
import { CaptionDisplay } from '../components/CaptionDisplay'
import { EventLobby } from '../components/EventLobby'
import { LanguagePicker } from '../components/LanguagePicker'
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import { TranscriptDownload } from '../components/TranscriptDownload'
import { useAccessibility } from '../hooks/useAccessibility'
import { useViewerCount } from '../hooks/useViewerCount'
import { useDarkModeContext } from '../contexts/DarkModeContext'
import type { Event } from '@caption-aotearoa/shared'

export function EventPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [selectedLocale, setSelectedLocale] = useState('en')
  const [lobbyDismissed, setLobbyDismissed] = useState(false)
  const { fontSize, highContrast, setFontSize, toggleHighContrast } = useAccessibility()
  const { isDark, toggle } = useDarkModeContext()
  const viewerCount = useViewerCount(code ?? '')

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', code],
    queryFn: () => api.get<Event>(`/api/events/${code}`).then((r) => r.data),
    enabled: !!code,
    refetchInterval: 10_000,
  })

  const isConfiguredLanguage = event?.languages.includes(selectedLocale) ?? true

  const { segments, isConnected, error: captionError } = useCaptions(
    code ?? '',
    selectedLocale,
    isConfiguredLanguage,
  )

  // Auto-dismiss lobby when event goes live
  useEffect(() => {
    if (event?.status === 'live') setLobbyDismissed(true)
  }, [event?.status])

  // Show lobby when event_date is future AND status !== 'live' AND not dismissed
  const showLobby =
    !lobbyDismissed &&
    event &&
    event.status !== 'live' &&
    event.event_date &&
    new Date(event.event_date).getTime() > Date.now()

  // Auto-dismiss when countdown expires
  useEffect(() => {
    if (!event?.event_date || lobbyDismissed || event.status === 'live') return
    const diff = new Date(event.event_date).getTime() - Date.now()
    if (diff <= 0) { setLobbyDismissed(true); return }
    const timer = setTimeout(() => setLobbyDismissed(true), diff)
    return () => clearTimeout(timer)
  }, [event?.event_date, event?.status, lobbyDismissed])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <p className="text-[var(--color-primary)] text-lg">Loading event…</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--color-background)]">
        <p className="text-[var(--color-error)] text-lg">Event not found. Check your code and try again.</p>
      </div>
    )
  }

  if (showLobby) return <EventLobby event={event} />

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-background)]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-[var(--color-background)]/90 backdrop-blur-xl
                         border-b border-[var(--color-outline-variant)] px-6 py-4
                         flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-serif text-xl font-bold text-[var(--color-primary)]">
            Caption Aotearoa
          </span>
          <div className="w-px h-5 bg-[var(--color-outline-variant)]" />
          {isConnected && event.status === 'live' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border"
                 style={{ background: 'rgba(240,253,244,1)', borderColor: 'rgba(34,197,94,0.3)' }}>
              <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-green-700">Live</span>
              {viewerCount > 0 && (
                <span className="text-xs text-green-700 ml-1">· {viewerCount}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--color-outline-variant)]">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-outline)]'}`} />
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                {isConnected ? 'Connected' : 'Connecting…'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-outline-variant)]
                     text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          Exit
        </button>
      </header>

      {/* ── Body row ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-72 shrink-0 bg-[var(--color-surface-container-low)]
                          border-r border-[var(--color-outline-variant)]
                          p-6 flex flex-col gap-8 overflow-y-auto">

          {/* Text Size */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Text Size
            </h3>
            <div className="bg-[var(--color-surface-container-lowest)] p-4 rounded-xl
                            border border-[var(--color-outline-variant)] shadow-sm space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="material-symbols-outlined text-sm text-[var(--color-primary)]"
                      style={{ fontSize: '16px' }}>text_fields</span>
                <span className="material-symbols-outlined text-[var(--color-primary)]"
                      style={{ fontSize: '24px' }}>text_fields</span>
              </div>
              <input
                type="range"
                min="1.25" max="3" step="0.25"
                value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none accent-[var(--color-primary)]"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
                aria-label="Text size"
              />
            </div>
          </section>

          {/* Display mode */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
              Display
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { if (isDark) toggle() }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  !isDark
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)]'
                }`}
                aria-pressed={!isDark}
              >
                <div className="w-8 h-8 rounded-full bg-[var(--color-background)] border border-[var(--color-outline-variant)]" />
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">Light</span>
              </button>
              <button
                onClick={() => { if (!isDark) toggle() }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  isDark
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-transparent bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)]'
                }`}
                aria-pressed={isDark}
              >
                <div className="w-8 h-8 rounded-full bg-[#0a0a0c]" />
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">Dark</span>
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={toggleHighContrast}
                className="w-4 h-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm text-[var(--color-on-surface)]">High contrast</span>
            </label>
          </section>

          {/* Language & session — pushed to bottom */}
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
        </aside>

        {/* ── Caption canvas ── */}
        <section className="flex-1 min-w-0 relative flex flex-col p-8 md:p-12 overflow-hidden">
          <KowhaiwhaPattern opacity={0.03} />

          {/* Caption error banner */}
          {captionError && (
            <div className="absolute top-0 inset-x-0 z-20 bg-[var(--color-error)] text-white px-6 py-3 text-sm">
              {captionError}
            </div>
          )}

          {/* Event header row */}
          <div className="relative z-10 mb-10 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-serif text-3xl font-bold text-[var(--color-primary)] tracking-tight truncate">
                {event.title}
              </h1>
              {event.description && (
                <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">{event.description}</p>
              )}
            </div>
          </div>

          {/* Captions */}
          <div className="relative z-10 flex-1 overflow-hidden flex flex-col">
            {segments.length === 0 && event.status === 'live' ? (
              /* Listening dots */
              <div className="flex items-center gap-2 py-6">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : segments.length === 0 ? (
              <p className="text-[var(--color-primary)] opacity-50 text-lg mt-16">
                Waiting for captions to begin…
              </p>
            ) : (
              <CaptionDisplay
                segments={segments}
                variant="flat"
                highContrast={highContrast}
                className="flex-1"
                style={{ fontSize: `${fontSize}rem` }}
              />
            )}
          </div>

          {/* Footer bar */}
          <div className="relative z-10 mt-8 flex justify-between items-center
                          border-t border-[var(--color-outline-variant)] pt-6 shrink-0">
            <div className="flex gap-2">
              {event.status === 'ended' && (
                <TranscriptDownload
                  eventCode={event.code}
                  eventTitle={event.title}
                  eventDate={event.event_date}
                />
              )}
              <button
                className="p-2 rounded-lg bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 transition-colors"
                title="Report issue"
                aria-label="Report issue"
              >
                <span className="material-symbols-outlined text-[var(--color-primary)]">flag</span>
              </button>
            </div>
            <span className="text-xs font-sans uppercase tracking-widest text-[var(--color-primary)]/40">
              Real-time
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 3.2: Start the dev server and visually verify**

```bash
pnpm --filter web dev
```

Navigate to `http://localhost:5173/event/TESTCODE` (use any existing event code). Check:
- Sidebar renders on the left with text-size slider, display toggle, language picker, event code
- Caption canvas fills the right with event title and caption area
- Header shows "Caption Aotearoa" brand + status badge + Exit button
- No language picker or settings gear in the header

- [ ] **Step 3.3: Run the full test suite**

```bash
cd apps/web && pnpm test --run
```

Expected: all tests pass. If any test imports `EventPage` directly and mocks `useDarkModeContext`, update those mocks to return `{ isDark: false, toggle: vi.fn() }`.

- [ ] **Step 3.4: Commit**

```bash
git add apps/web/src/pages/EventPage.tsx
git commit -m "feat: redesign EventPage with sidebar + caption canvas (Live Caption Viewer light mode)"
```

---

## Verification Checklist

Before declaring done, confirm:

- [ ] `/event/:code` shows the new split layout
- [ ] Text size slider adjusts caption font size
- [ ] Light/Dark buttons toggle the `dark` class on `<html>` correctly
- [ ] High contrast checkbox still works
- [ ] Language picker in sidebar correctly changes caption language
- [ ] Lobby screen still shows for future-dated events
- [ ] Live status badge shows green when event is live
- [ ] Caption area scrolls with the thin scrollbar style
- [ ] `PresentPage` (`/present/:code`) still shows its existing dark layout — nothing broke
- [ ] All Vitest tests pass
