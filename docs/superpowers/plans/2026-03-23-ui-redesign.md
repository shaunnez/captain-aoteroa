# Caption Aotearoa UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the current brand colours, fonts, and layouts across all five screens with the new Material Design 3 design system from Stitch, supporting both light and dark mode.

**Architecture:** Single source of truth for design tokens lives in `tailwind.config.ts` (Tailwind aliases) + `src/styles/index.css` (CSS custom properties for dark-mode flipping). Dark mode is class-based (`dark` on `<html>`). A `useDarkMode` hook + `DarkModeToggle` component handle persistence. Each screen page file is updated independently — no shared layout wrapper changes required. Parallel streams (Tasks 2–5) are fully independent once Task 1 is done.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3.4 (class dark mode), Vite, Google Fonts (Lora + Inter), Material Symbols Outlined (icon font), Framer Motion (already installed)

---

## Design Token Reference

Extracted from Stitch. Every task below uses these values — do not invent new ones.

### Light mode
| Token | Value |
|---|---|
| primary | `#1c0070` |
| primary-container | `#311b92` |
| primary-fixed | `#e5deff` |
| primary-fixed-dim | `#c7bfff` |
| inverse-primary | `#c7bfff` |
| secondary | `#14696d` |
| secondary-container | `#a3ecf0` |
| tertiary | `#00241d` |
| tertiary-container | `#003c31` |
| background | `#fdf9ee` |
| surface | `#fdf9ee` |
| surface-dim | `#dddacf` |
| surface-container-lowest | `#ffffff` |
| surface-container-low | `#f7f3e8` |
| surface-container | `#f1eee3` |
| surface-container-high | `#ece8dd` |
| surface-container-highest | `#e6e2d8` |
| on-surface | `#1c1c15` |
| on-surface-variant | `#4a4459` |
| outline | `#787584` |
| outline-variant | `#c9c4d5` |
| error | `#ba1a1a` |

### Dark mode (applied under `.dark`)
| Token | Value |
|---|---|
| primary | `#c7bfff` |
| primary-container | `#311b92` |
| background | `#0a0a0c` |
| surface | `#0a0a0c` |
| surface-container-lowest | `#000000` |
| surface-container-low | `#0f0f12` |
| surface-container | `#141417` |
| surface-container-high | `#1c1c21` |
| surface-container-highest | `#1c1c21` |
| on-surface | `#f4f1e6` |
| on-surface-variant | `#a19fb1` |
| outline-variant | `#474553` |

### Typography
- Headlines: **Lora** (serif), fallback Noto Serif, Georgia
- Body / Labels: **Inter**, fallback system-ui, sans-serif

### Kowhaiwhai pattern
SVG circular motif, `#311b92` fill at 4% opacity (light) / 8% opacity (dark). Tiled as a background-image.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/tailwind.config.ts` | Modify | Replace colours + fonts with new design system tokens |
| `apps/web/src/styles/index.css` | Modify | New font imports, CSS custom properties (light + dark), updated component classes |
| `apps/web/src/contexts/DarkModeContext.tsx` | Create | Context + provider + `useDarkModeContext` hook. Single instance at app root prevents multi-toggle desync. |
| `apps/web/src/components/DarkModeToggle.tsx` | Create | Sun/moon toggle button — reads from `DarkModeContext`, not its own hook instance |
| `apps/web/src/components/KowhaiwhaPattern.tsx` | Create | Reusable decorative SVG background pattern component |
| `apps/web/src/router.tsx` | Modify | Wrap `<BrowserRouter>` with `<DarkModeProvider>` so context is available app-wide |
| `apps/web/src/pages/HomePage.tsx` | Modify | Full landing page redesign — nav, hero, join, events grid, features, stats, footer |
| `apps/web/src/pages/LoginPage.tsx` | Modify | Centred card with animated wave background, dark mode support |
| `apps/web/src/pages/PresentPage.tsx` | Modify | Presenter dashboard with tab nav, stream controls, health monitor, QR share |
| `apps/web/src/pages/EventPage.tsx` | Modify | Live caption viewer with bilingual display, text-size slider, settings panel |
| `apps/web/src/components/LanguagePicker.tsx` | Modify | Reskin only — preserve all logic (two-tier Instant/Translated, panelRef click-outside, AZURE_TRANSLATION_LANGUAGES) |
| `apps/web/src/components/CaptionDisplay.tsx` | Modify | Replace `brand-*` tokens with CSS-variable equivalents so dark mode renders correctly |
| `apps/web/src/components/EventCard.tsx` | Modify | Reskin to new tokens (surface-container, on-surface, outline-variant) |
| `apps/web/src/components/JoinForm.tsx` | Modify | Reskin input + button to new tokens |
| `apps/web/src/components/EventSearchBar.tsx` | Modify | Reskin search icon from `text-brand-purple` to `text-[var(--color-primary)]` |

---

## Task 1: Design System Foundation
**This task must be completed before any other task.**

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/styles/index.css`
- Create: `apps/web/src/hooks/useDarkMode.ts`
- Create: `apps/web/src/components/DarkModeToggle.tsx`
- Create: `apps/web/src/components/KowhaiwhaPattern.tsx`

### 1a — Replace Tailwind config

- [x] **Step 1: Replace `apps/web/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode surface scale
        'surface-lowest':  'var(--color-surface-container-lowest)',
        'surface-low':     'var(--color-surface-container-low)',
        'surface':         'var(--color-surface)',
        'surface-high':    'var(--color-surface-container-high)',
        'surface-highest': 'var(--color-surface-container-highest)',
        'bg':              'var(--color-background)',
        // Primary
        'primary':         'var(--color-primary)',
        'primary-cont':    'var(--color-primary-container)',
        'primary-fixed':   'var(--color-primary-fixed)',
        'inv-primary':     'var(--color-inverse-primary)',
        // Secondary / tertiary
        'secondary':       'var(--color-secondary)',
        'secondary-cont':  'var(--color-secondary-container)',
        'tertiary':        'var(--color-tertiary)',
        'tertiary-cont':   'var(--color-tertiary-container)',
        // Text
        'on-surface':      'var(--color-on-surface)',
        'on-surface-var':  'var(--color-on-surface-variant)',
        // Borders
        'outline':         'var(--color-outline)',
        'outline-var':     'var(--color-outline-variant)',
        // Error
        'error':           'var(--color-error)',
        // Legacy aliases (remove progressively)
        'brand-purple':      '#1c0070',
        'brand-purple-dark': '#311b92',
        'brand-navy':        '#311b92',
        'brand-sand':        '#fdf9ee',
        'brand-black':       '#1c1c15',
        'brand-error':       '#ba1a1a',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Noto Serif', 'Georgia', 'serif'],
      },
      fontSize: {
        body: ['1.125rem', { lineHeight: '1.75' }],
      },
      borderRadius: {
        pill: '9999px',
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      backdropBlur: {
        nav: '12px',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [x] **Step 2: Replace `apps/web/src/styles/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Design tokens ──────────────────────────────────────── */
@layer base {
  :root {
    /* Primary */
    --color-primary:                  #1c0070;
    --color-primary-container:        #311b92;
    --color-primary-fixed:            #e5deff;
    --color-primary-fixed-dim:        #c7bfff;
    --color-inverse-primary:          #c7bfff;
    /* Secondary */
    --color-secondary:                #14696d;
    --color-secondary-container:      #a3ecf0;
    /* Tertiary */
    --color-tertiary:                 #00241d;
    --color-tertiary-container:       #003c31;
    /* Surfaces */
    --color-background:               #fdf9ee;
    --color-surface:                  #fdf9ee;
    --color-surface-dim:              #dddacf;
    --color-surface-container-lowest: #ffffff;
    --color-surface-container-low:    #f7f3e8;
    --color-surface-container:        #f1eee3;
    --color-surface-container-high:   #ece8dd;
    --color-surface-container-highest:#e6e2d8;
    /* Text */
    --color-on-surface:               #1c1c15;
    --color-on-surface-variant:       #4a4459;
    /* Borders */
    --color-outline:                  #787584;
    --color-outline-variant:          #c9c4d5;
    /* Error */
    --color-error:                    #ba1a1a;
  }

  .dark {
    --color-primary:                  #c7bfff;
    --color-primary-container:        #311b92;
    --color-primary-fixed:            #e5deff;
    --color-primary-fixed-dim:        #c7bfff;
    --color-inverse-primary:          #1c0070;
    --color-secondary:                #8ad3d7;
    --color-secondary-container:      #00474b;
    --color-tertiary:                 #94d3c1;
    --color-tertiary-container:       #003c31;
    --color-background:               #0a0a0c;
    --color-surface:                  #0a0a0c;
    --color-surface-dim:              #0a0a0c;
    --color-surface-container-lowest: #000000;
    --color-surface-container-low:    #0f0f12;
    --color-surface-container:        #141417;
    --color-surface-container-high:   #1c1c21;
    --color-surface-container-highest:#1c1c21;
    --color-on-surface:               #f4f1e6;
    --color-on-surface-variant:       #a19fb1;
    --color-outline:                  #787584;
    --color-outline-variant:          #474553;
    --color-error:                    #ffb4ab;
  }

  body {
    @apply bg-[var(--color-background)] text-[var(--color-on-surface)] font-sans;
  }

  /* Material Symbols helper */
  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
}

/* ── Shared component classes ───────────────────────────── */
@layer components {
  .btn-primary {
    @apply bg-[var(--color-primary)] text-white rounded-pill px-6 py-2.5 font-medium
           hover:opacity-90 transition-opacity focus:outline-none
           focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2;
  }

  .btn-secondary {
    @apply bg-transparent text-[var(--color-primary)] border-2 border-[var(--color-primary)]
           rounded-pill px-6 py-2.5 font-medium hover:bg-[var(--color-primary)]
           hover:text-white transition-colors;
  }

  .input-field {
    @apply bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]
           rounded-lg px-4 py-2.5 w-full text-[var(--color-on-surface)]
           placeholder:text-[var(--color-on-surface-variant)]
           focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
           focus:border-[var(--color-primary)];
  }

  /* Glass nav */
  .nav-glass {
    @apply backdrop-blur-nav border-b border-[var(--color-outline-variant)];
    background: rgba(253, 249, 238, 0.75);
  }
  .dark .nav-glass {
    background: rgba(10, 10, 12, 0.8);
  }
}

/* ── Kowhaiwhai pattern ─────────────────────────────────── */
@layer utilities {
  .tohu-border-top {
    background-image: url('/tohu/koru-border.svg');
    background-repeat: repeat-x;
    background-position: top center;
    background-size: auto 30px;
    padding-top: 2.5rem;
  }
  .tohu-border-bottom {
    background-image: url('/tohu/koru-border.svg');
    background-repeat: repeat-x;
    background-position: bottom center;
    background-size: auto 30px;
    padding-bottom: 2.5rem;
  }
  .tohu-divider {
    background-image: url('/tohu/wave-divider.svg');
    background-repeat: no-repeat;
    background-position: center;
    background-size: 100% 100%;
    height: 2rem;
  }
}
```

- [x] **Step 3: Create `apps/web/src/contexts/DarkModeContext.tsx`**

> **Why a context?** `useDarkMode` called as an independent hook in multiple components (nav, login page, etc.) creates separate state instances that fight each other. A single context instance at the app root owns all state.

```typescript
import { createContext, useContext, useEffect, useState } from 'react'

interface DarkModeContextValue {
  isDark: boolean
  toggle: () => void
}

const DarkModeContext = createContext<DarkModeContextValue | null>(null)

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('caption-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('caption-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <DarkModeContext.Provider value={{ isDark, toggle: () => setIsDark((d) => !d) }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkModeContext() {
  const ctx = useContext(DarkModeContext)
  if (!ctx) throw new Error('useDarkModeContext must be used inside DarkModeProvider')
  return ctx
}
```

- [x] **Step 4: Create `apps/web/src/components/DarkModeToggle.tsx`**

```tsx
import { useDarkModeContext } from '../contexts/DarkModeContext'

export function DarkModeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggle } = useDarkModeContext()
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`text-[var(--color-on-surface)] opacity-70 hover:opacity-100 transition-opacity ${className}`}
    >
      <span className="material-symbols-outlined text-[20px]">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}
```

- [x] **Step 4b: Wrap router with `DarkModeProvider` in `apps/web/src/router.tsx`**

Add import and wrap the return value:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DarkModeProvider } from './contexts/DarkModeContext'
// ... existing page imports unchanged ...

export function AppRouter() {
  return (
    <DarkModeProvider>
      <BrowserRouter>
        <Routes>
          {/* all existing routes unchanged */}
        </Routes>
      </BrowserRouter>
    </DarkModeProvider>
  )
}
```

Keep all existing `<Route>` lines exactly as they are — only add the `<DarkModeProvider>` wrapper.
```

- [x] **Step 5: Create `apps/web/src/components/KowhaiwhaPattern.tsx`**

```tsx
/**
 * Decorative Kowhaiwhai-inspired SVG pattern overlay.
 * Renders as an absolutely-positioned layer — parent must be `relative`.
 */
export function KowhaiwhaPattern({
  className = '',
  opacity = 0.04,
}: {
  className?: string
  opacity?: number
}) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="kowhaiwhai" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="20" fill="none" stroke="#311b92" strokeWidth="3" opacity={opacity} />
          <circle cx="30" cy="30" r="10" fill="none" stroke="#311b92" strokeWidth="2" opacity={opacity} />
          <circle cx="0"  cy="0"  r="10" fill="none" stroke="#311b92" strokeWidth="2" opacity={opacity} />
          <circle cx="60" cy="0"  r="10" fill="none" stroke="#311b92" strokeWidth="2" opacity={opacity} />
          <circle cx="0"  cy="60" r="10" fill="none" stroke="#311b92" strokeWidth="2" opacity={opacity} />
          <circle cx="60" cy="60" r="10" fill="none" stroke="#311b92" strokeWidth="2" opacity={opacity} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kowhaiwhai)" />
    </svg>
  )
}
```

- [x] **Step 6: Run dev server, verify no crashes**

```bash
cd /Users/shaunnesbitt/Desktop/accessibility-work
pnpm --filter web dev
```

Expected: dev server starts, app loads in browser with cream background and Inter/Lora fonts. Existing pages may look unstyled — that is expected at this stage.

- [x] **Step 7: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/src/styles/index.css \
        apps/web/src/hooks/useDarkMode.ts \
        apps/web/src/components/DarkModeToggle.tsx \
        apps/web/src/components/KowhaiwhaPattern.tsx
git commit -m "feat: add Material Design 3 token system + dark mode infrastructure"
```

---

## Task 2: Landing Page (HomePage)
**Parallel with Tasks 3, 4, 5. Requires Task 1.**

**Files:**
- Modify: `apps/web/src/pages/HomePage.tsx`
- Modify: `apps/web/src/components/EventCard.tsx`
- Modify: `apps/web/src/components/JoinForm.tsx`

### Design spec
- Full-width glassmorphism nav: Logo left, links (Events, About, Contact), Language selector, "Organiser Login" pill button, DarkModeToggle right
- Hero: large Lora headline, subtitle, CTA "Join event" — `JoinForm` centred below
- Events grid: 3-col upcoming events, each as `surface-container` card with status badge
- Features strip: 4-col, icon + heading + body — WCAG 2.1 AAA, Sub-second latency, 25+ languages, Offline-ready
- Stats row: 99.9% accuracy · 85% engagement · <1s latency
- Footer: logo, nav links, legal
- KowhaiwhaPattern at 4% opacity behind hero

### Steps

- [x] **Step 1: Rewrite `apps/web/src/pages/HomePage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { JoinForm } from '../components/JoinForm'
import { EventCard } from '../components/EventCard'
import { EventSearchBar } from '../components/EventSearchBar'
import { DarkModeToggle } from '../components/DarkModeToggle'
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import type { Event } from '@caption-aotearoa/shared'

const FEATURES = [
  { icon: 'verified', title: 'WCAG 2.1 AAA', body: 'Built to the highest accessibility standard from day one.' },
  { icon: 'bolt',     title: 'Sub-second latency', body: 'Captions appear before the sentence ends.' },
  { icon: 'translate', title: '25+ languages', body: 'Including te reo Māori and NZ census languages.' },
  { icon: 'wifi_off', title: 'No install needed', body: 'Scan a QR code or type a 6-character code. Done.' },
]

const STATS = [
  { value: '99.9%', label: 'Accuracy' },
  { value: '85%',   label: 'Increased engagement' },
  { value: '<1s',   label: 'Latency' },
]

export function HomePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get<Event[]>('/api/events').then((r) => r.data),
    refetchInterval: 30_000,
  })

  const statusOrder = { live: 0, upcoming: 1, ended: 2 }
  const filtered = events
    .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 nav-glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <span className="font-serif text-xl font-bold text-[var(--color-primary)]">
            Caption Aotearoa
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--color-on-surface-variant)]">
            <a href="#events" className="hover:text-[var(--color-primary)] transition-colors">Events</a>
            <a href="#features" className="hover:text-[var(--color-primary)] transition-colors">About</a>
            <a href="#contact" className="hover:text-[var(--color-primary)] transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <button
              onClick={() => navigate('/login')}
              className="btn-primary py-1.5 px-4 text-sm"
            >
              Organiser Login
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 px-6 text-center">
        <KowhaiwhaPattern />
        <div className="relative max-w-2xl mx-auto">
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-[var(--color-primary)] mb-6 leading-tight">
            Live captions for<br />Aotearoa
          </h1>
          <p className="text-lg text-[var(--color-on-surface-variant)] mb-10 max-w-lg mx-auto">
            Real-time captions in 25+ languages — streamed to your audience's phones. No app, no account, just scan.
          </p>
          <div className="flex justify-center">
            <JoinForm />
          </div>
        </div>
      </section>

      {/* ── Events ── */}
      <section id="events" className="py-16 px-6 bg-[var(--color-surface-container-low)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <h2 className="font-serif text-3xl font-semibold text-[var(--color-on-surface)]">
              Upcoming events
            </h2>
            <div className="w-full max-w-xs">
              <EventSearchBar value={search} onChange={setSearch} />
            </div>
          </div>

          {isLoading ? (
            <p className="text-[var(--color-primary)] opacity-60 text-center py-16">Loading events…</p>
          ) : filtered.length === 0 ? (
            <p className="text-[var(--color-on-surface-variant)] text-center py-16">
              {search ? 'No events match your search.' : 'No events scheduled yet.'}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl font-semibold text-center text-[var(--color-on-surface)] mb-12">
            Built for accessibility
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.icon} className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-fixed)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px] text-[var(--color-primary)]">{f.icon}</span>
                </div>
                <h3 className="font-semibold text-[var(--color-on-surface)]">{f.title}</h3>
                <p className="text-sm text-[var(--color-on-surface-variant)]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6 bg-[var(--color-primary-container)]">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center text-white">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="font-serif text-4xl font-bold">{s.value}</p>
              <p className="text-sm mt-1 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="py-10 px-6 border-t border-[var(--color-outline-variant)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--color-on-surface-variant)]">
          <span className="font-serif font-semibold text-[var(--color-primary)]">Caption Aotearoa</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Accessibility</a>
            <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
```

- [x] **Step 2: Reskin `apps/web/src/components/EventCard.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'
import type { Event } from '@caption-aotearoa/shared'

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate()

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-NZ', {
        weekday: 'short', day: 'numeric', month: 'short',
        year: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : null

  return (
    <button
      onClick={() => navigate(`/event/${event.code}`)}
      className="w-full text-left rounded-xl p-5
                 bg-[var(--color-surface-container)]
                 border border-[var(--color-outline-variant)]
                 hover:border-[var(--color-primary)] hover:shadow-lg
                 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-semibold text-[var(--color-on-surface)] truncate
                         group-hover:text-[var(--color-primary)] transition-colors">
            {event.title}
          </h3>
          {formattedDate && (
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">{formattedDate}</p>
          )}
          {event.description && (
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-2 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        <StatusBadge status={event.status} />
      </div>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--color-outline-variant)]">
        <span className="text-xs font-mono text-[var(--color-primary)] opacity-70 tracking-wider">
          {event.code}
        </span>
        <span className="text-xs text-[var(--color-on-surface-variant)]">
          {event.languages.length} languages
        </span>
      </div>
    </button>
  )
}
```

- [x] **Step 3: Reskin `apps/web/src/components/JoinForm.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Event } from '@caption-aotearoa/shared'

export function JoinForm() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.get<Event>(`/api/events/${code.toUpperCase()}`)
      navigate(`/event/${code.toUpperCase()}`)
    } catch {
      setError('Event not found. Check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
          Event code
        </label>
        <input
          id="code"
          className="input-field text-2xl font-mono uppercase tracking-widest text-center"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="KAI492"
          maxLength={6}
          required
          autoComplete="off"
          autoCapitalize="characters"
        />
      </div>
      {error && (
        <p className="text-[var(--color-error)] text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="btn-primary disabled:opacity-50"
      >
        {loading ? 'Finding event…' : 'Join event'}
      </button>
    </form>
  )
}
```

- [x] **Step 4: Reskin `apps/web/src/components/EventSearchBar.tsx`**

Only change the icon colour — everything else is already handled by `.input-field`:

```tsx
import { Search } from 'lucide-react'

interface EventSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function EventSearchBar({ value, onChange }: EventSearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-primary)] opacity-40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search events…"
        className="input-field pl-10"
        aria-label="Search events"
      />
    </div>
  )
}
```

- [x] **Step 5: Check in browser — verify hero, events grid, features, stats, footer render correctly in both light and dark mode (toggle with DarkModeToggle in nav)**

- [x] **Step 6: Commit**

```bash
git add apps/web/src/pages/HomePage.tsx \
        apps/web/src/components/EventCard.tsx \
        apps/web/src/components/JoinForm.tsx \
        apps/web/src/components/EventSearchBar.tsx
git commit -m "feat: redesign landing page with MD3 tokens, dark mode, features + stats sections"
```

---

## Task 3: Organiser Login (LoginPage)
**Parallel with Tasks 2, 4, 5. Requires Task 1.**

**Files:**
- Modify: `apps/web/src/pages/LoginPage.tsx`

### Design spec
- Full-screen centred layout, `surface-container-low` background
- Subtle animated wave SVG behind the card (CSS animation using `@keyframes`)
- Card: `surface` bg, `outline-variant` border, generous padding, rounded-xl shadow
- Logo/brand at top of card
- Email + password inputs using `.input-field`
- Primary CTA "Sign in" using `.btn-primary`
- Footer: "Don't have an account? Sign up" link
- KowhaiwhaPattern at low opacity in card background
- Dark mode: background becomes `surface-container-low` with dark tokens

### Steps

- [x] **Step 1: Rewrite `apps/web/src/pages/LoginPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import { DarkModeToggle } from '../components/DarkModeToggle'

export function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-8
                    bg-[var(--color-surface-container-low)] overflow-hidden">
      {/* Wave background */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,400 C360,320 720,480 1080,400 C1260,360 1380,420 1440,400 L1440,900 L0,900 Z"
          fill="var(--color-primary)"
          opacity="0.06"
        />
        <path
          d="M0,500 C400,420 800,580 1200,500 C1320,470 1400,520 1440,500 L1440,900 L0,900 Z"
          fill="var(--color-primary-container)"
          opacity="0.04"
        />
      </svg>

      {/* Dark mode toggle top-right */}
      <div className="absolute top-6 right-6">
        <DarkModeToggle />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-xl border border-[var(--color-outline-variant)]
                      bg-[var(--color-surface)] shadow-xl overflow-hidden p-8">
        <KowhaiwhaPattern opacity={0.03} />
        <div className="relative">
          {/* Brand */}
          <div className="text-center mb-8">
            <span className="font-serif text-2xl font-bold text-[var(--color-primary)]">
              Caption Aotearoa
            </span>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Organiser login
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
                Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                                 text-[20px] text-[var(--color-on-surface-variant)]">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                                 text-[20px] text-[var(--color-on-surface-variant)]">
                  lock
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <p className="text-[var(--color-error)] text-sm">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && (
                <span className="material-symbols-outlined text-[18px] ml-2 align-middle">
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          <p className="text-sm text-center mt-6 text-[var(--color-on-surface-variant)]">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-[var(--color-primary)] underline underline-offset-4 hover:opacity-80"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [x] **Step 2: Check in browser — verify card renders correctly in light and dark, wave SVG visible, icons show (mail, lock, arrow)**

- [x] **Step 3: Commit**

```bash
git add apps/web/src/pages/LoginPage.tsx
git commit -m "feat: redesign organiser login with wave background, MD3 tokens, Material icons"
```

---

## Task 4: Presenter Dashboard (PresentPage)
**Parallel with Tasks 2, 3, 5. Requires Task 1.**

**Files:**
- Modify: `apps/web/src/pages/PresentPage.tsx`

### Design spec
- Dark-first layout (always dark — presenters in dim rooms)
- Header: event title, live status badge, viewer count, QR share button
- Tab nav: Dashboard / Analytics / Schedule / Recordings (Dashboard only is functional)
- Control panel: large mic button (Start/Pause/End), stream health indicator
- Language selector: pill buttons for each configured language + bilingual toggle
- Live preview: `CaptionDisplay` with scrollable area, `#311b92` scrollbar
- Attendee join section: QR code + event code display
- KowhaiwhaPattern at 5% opacity throughout

### Steps

- [x] **Step 1: Rewrite `apps/web/src/pages/PresentPage.tsx`**

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
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import { useViewerCount } from '../hooks/useViewerCount'
import type { Event } from '@caption-aotearoa/shared'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared/nzLanguages'
import { RECOGNITION_LOCALES } from '@caption-aotearoa/shared/recognitionLocales'

const PRESENTER_LOCALES: Record<string, string> = { ...RECOGNITION_LOCALES, 'mi': 'mi-NZ' }

const TABS = ['Dashboard', 'Analytics', 'Schedule', 'Recordings']

export function PresentPage() {
  const { code } = useParams<{ code: string }>()
  const [activeTab, setActiveTab] = useState('Dashboard')
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

  const hasBilingual = event?.languages.includes('en') && event?.languages.includes('mi')

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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
        <p className="text-[#c7bfff] text-lg">Loading…</p>
      </div>
    )
  }

  return (
    <div className="dark min-h-screen flex flex-col bg-[#0a0a0c] text-[#f4f1e6] relative">
      <KowhaiwhaPattern opacity={0.05} />

      {/* ── Header ── */}
      <header className="relative z-10 border-b border-[#474553] px-6 py-4
                         flex items-center justify-between gap-4
                         bg-[rgba(10,10,12,0.8)] backdrop-blur-nav">
        <div>
          <h1 className="font-serif text-xl font-semibold text-[#f4f1e6]">{event.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-block w-2 h-2 rounded-full ${isCapturing ? 'bg-red-400 animate-pulse' : 'bg-[#474553]'}`} />
            <span className="text-sm text-[#a19fb1]">
              {isCapturing ? 'Live' : 'Ready'}
            </span>
            {viewerCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-[#a19fb1]">
                <span className="material-symbols-outlined text-[16px]">group</span>
                {viewerCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <QRDisplay eventCode={event.code} />
        </div>
      </header>

      {/* ── Tab nav ── */}
      <nav className="relative z-10 border-b border-[#474553] px-6 flex gap-1
                      bg-[rgba(10,10,12,0.6)]">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-[#c7bfff] border-[#c7bfff]'
                : 'text-[#a19fb1] border-transparent hover:text-[#f4f1e6]'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* ── Main ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center gap-8 px-8 py-8 max-w-4xl mx-auto w-full">

        {/* Mic control */}
        <MicControl
          isCapturing={isCapturing}
          onStart={handleStart}
          onStop={handleStop}
          error={audioError}
        />

        {/* Language selector */}
        {Object.keys(PRESENTER_LOCALES).some((c) => event.languages.includes(c)) && (
          <div className="w-full flex flex-col items-center gap-3">
            <p className="text-xs font-medium text-[#a19fb1] uppercase tracking-widest">
              I am speaking in
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              {event.languages.filter((l) => l in PRESENTER_LOCALES).map((azureCode, i) => {
                const bcp47 = PRESENTER_LOCALES[azureCode]
                const isActive = !isDualMode && (speakerLocale === bcp47 || (speakerLocale === undefined && i === 0))
                return (
                  <button
                    key={azureCode}
                    onClick={() => handleLanguageChange(azureCode)}
                    className={`rounded-pill px-4 py-1.5 text-sm font-medium border transition-colors ${
                      isActive
                        ? 'bg-[#c7bfff] text-[#0a0a0c] border-[#c7bfff]'
                        : 'bg-white/5 text-[#f4f1e6] border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {NZ_LANGUAGES.find((l) => l.code === azureCode)?.label ?? azureCode}
                  </button>
                )
              })}
              {hasBilingual && (
                <button
                  onClick={handleToggleDual}
                  className={`rounded-pill px-4 py-1.5 text-sm font-medium border transition-colors ${
                    isDualMode
                      ? 'bg-[#c7bfff] text-[#0a0a0c] border-[#c7bfff]'
                      : 'bg-white/5 text-[#f4f1e6] border-white/10 hover:bg-white/10'
                  }`}
                >
                  English + Te Reo (bilingual)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live preview */}
        <div className="w-full">
          <p className="text-xs font-medium text-[#a19fb1] uppercase tracking-widest mb-2">
            Live preview
          </p>
          <CaptionDisplay
            segments={segments}
            className="h-64 bg-[#141417] border border-[#474553] rounded-xl"
            style={{ '--scrollbar-color': '#311b92' } as React.CSSProperties}
          />
        </div>

        {/* Attendee join */}
        <div className="w-full rounded-xl bg-[#141417] border border-[#474553] p-6 text-center">
          <p className="text-sm text-[#a19fb1] mb-2">Audience join link</p>
          <p className="font-mono text-[#c7bfff] text-sm">
            {window.location.origin}/event/{event.code}
          </p>
          <p className="text-xs text-[#474553] mt-1">or event code: <span className="text-[#f4f1e6] font-mono">{event.code}</span></p>
        </div>
      </main>
    </div>
  )
}
```

- [x] **Step 2: Check in browser — tabs render, dark background, mic control centred, language pills, caption preview visible**

- [x] **Step 3: Commit**

```bash
git add apps/web/src/pages/PresentPage.tsx
git commit -m "feat: redesign presenter dashboard — dark mode, tab nav, MD3 tokens"
```

---

## Task 5: Live Caption Viewer + Language Picker (EventPage)
**Parallel with Tasks 2, 3, 4. Requires Task 1.**

**Files:**
- Modify: `apps/web/src/pages/EventPage.tsx`
- Modify: `apps/web/src/components/LanguagePicker.tsx`

### Design spec — EventPage
- Sticky glassmorphism header: event title, connection badge, viewer count, language picker, settings button
- Settings panel (slide down): text size range slider + contrast toggle, styled with new tokens
- Caption area: fills remaining height, `surface-container` bg, bilingual English/te reo layout when in dual mode
- Session info strip: session ID, latency indicator
- KowhaiwhaPattern at 4% in caption area background

### Design spec — LanguagePicker
- Grid of language buttons (all 25+ NZ languages)
- Active language: `primary` bg, white text
- Inactive: `surface-container-high`, `on-surface-variant` text, hover to `primary-fixed`
- Search/filter input at top of grid

### Steps

- [x] **Step 1: Read the current LanguagePicker component**

```bash
cat apps/web/src/components/LanguagePicker.tsx
```

Note the existing prop interface before rewriting.

- [x] **Step 2: Rewrite `apps/web/src/pages/EventPage.tsx`**

Replace the current EventPage with this updated version — keeping all business logic identical, only reskinning to new design tokens:

```tsx
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useCaptions } from '../hooks/useCaptions'
import { CaptionDisplay } from '../components/CaptionDisplay'
import { EventLobby } from '../components/EventLobby'
import { LanguagePicker } from '../components/LanguagePicker'
import { KowhaiwhaPattern } from '../components/KowhaiwhaPattern'
import { DarkModeToggle } from '../components/DarkModeToggle'
import { useAccessibility } from '../hooks/useAccessibility'
import { useViewerCount } from '../hooks/useViewerCount'
import type { Event } from '@caption-aotearoa/shared'

export function EventPage() {
  const { code } = useParams<{ code: string }>()
  const [selectedLocale, setSelectedLocale] = useState('en')
  const [lobbyDismissed, setLobbyDismissed] = useState(false)
  const { fontSize, highContrast, setFontSize, toggleHighContrast } = useAccessibility()
  const [showSettings, setShowSettings] = useState(false)
  const viewerCount = useViewerCount(code ?? '')

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', code],
    queryFn: () => api.get<Event>(`/api/events/${code}`).then((r) => r.data),
    enabled: !!code,
    refetchInterval: 10_000,
  })

  const isConfiguredLanguage = event?.languages.includes(selectedLocale) ?? true
  const { segments, isConnected, error: captionError } = useCaptions(
    code ?? '', selectedLocale, isConfiguredLanguage,
  )

  useEffect(() => {
    if (event?.status === 'live') setLobbyDismissed(true)
  }, [event?.status])

  const showLobby =
    !lobbyDismissed && event && event.status !== 'live' &&
    event.event_date && new Date(event.event_date).getTime() > Date.now()

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
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 nav-glass px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-lg font-semibold text-[var(--color-on-surface)]">
            {event.title}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-yellow-400'
            }`} />
            <span className="text-xs text-[var(--color-on-surface-variant)]">
              {isConnected ? (event.status === 'live' ? 'Live' : 'Connected') : 'Connecting…'}
            </span>
            {viewerCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-[var(--color-on-surface-variant)]">
                <span className="material-symbols-outlined text-[14px]">group</span>
                {viewerCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguagePicker selectedLocale={selectedLocale} onSelect={setSelectedLocale} />
          <button
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Accessibility settings"
            className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          <DarkModeToggle />
        </div>
      </header>

      {/* ── Settings panel ── */}
      {showSettings && (
        <div className="px-6 py-4 border-b border-[var(--color-outline-variant)]
                        bg-[var(--color-surface-container-low)]">
          <div className="flex flex-wrap items-center gap-8 max-w-xl">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">
                format_size
              </span>
              <label htmlFor="font-size" className="text-sm font-medium text-[var(--color-on-surface)] whitespace-nowrap">
                Text size
              </label>
              <input
                id="font-size"
                type="range" min="1.25" max="3" step="0.25"
                value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                className="w-28 accent-[var(--color-primary)]"
              />
              <span className="text-sm text-[var(--color-on-surface-variant)] w-14">{fontSize}rem</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={highContrast} onChange={toggleHighContrast}
                className="w-4 h-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm font-medium text-[var(--color-on-surface)]">High contrast</span>
            </label>
          </div>
        </div>
      )}

      {/* ── Caption error banner ── */}
      {captionError && (
        <div className="bg-[var(--color-error)] text-white px-6 py-3 text-sm">
          {captionError}
        </div>
      )}

      {/* ── Caption area ── */}
      <main className="flex-1 overflow-hidden p-6 relative">
        <KowhaiwhaPattern opacity={0.03} />
        {segments.length === 0 && event.status !== 'live' && (
          <p className="text-[var(--color-primary)] opacity-50 text-lg text-center mt-16">
            Waiting for captions to begin…
          </p>
        )}
        <CaptionDisplay
          segments={segments}
          highContrast={highContrast}
          className={`relative z-10 h-full rounded-xl border border-[var(--color-outline-variant)]
                      bg-[var(--color-surface-container)]`}
          style={{ fontSize: `${fontSize}rem` }}
        />
      </main>
    </div>
  )
}
```

- [x] **Step 3: Reskin `apps/web/src/components/LanguagePicker.tsx`**

> **CRITICAL:** Keep ALL existing logic unchanged — `AZURE_TRANSLATION_LANGUAGES`, `panelRef`, click-outside `useEffect`, two-tier Instant/Translated display, `handleSelect`, `inputRef.current?.focus()`. Only replace `brand-*` CSS class names with new token equivalents. Do NOT remove the `AZURE_TRANSLATION_LANGUAGES` import or the `otherItems`/`filteredOther` variables.

Replace class strings as follows:

| Old class | New class |
|---|---|
| `bg-white` (trigger button) | `bg-[var(--color-surface-container-high)]` |
| `text-brand-navy` | `text-[var(--color-on-surface)]` |
| `border-white` | `border-[var(--color-outline-variant)]` |
| `hover:bg-brand-sand` | `hover:bg-[var(--color-surface-container-highest)]` |
| `bg-white rounded-xl ... border-brand-purple border-opacity-20` (dropdown panel) | `bg-[var(--color-surface-container-high)] rounded-xl border border-[var(--color-outline-variant)]` |
| `border-brand-purple border-opacity-20` (search input) | `border-[var(--color-outline-variant)]` |
| `focus:ring-brand-purple focus:ring-opacity-30` | `focus:ring-[var(--color-primary)]` |
| `text-black` (search input) | `text-[var(--color-on-surface)]` |
| `hover:bg-brand-sand` (list items) | `hover:bg-[var(--color-surface-container-highest)]` |
| `bg-brand-sand font-semibold text-brand-purple` (selected item) | `bg-[var(--color-primary-fixed)] font-semibold text-[var(--color-primary)]` |
| `text-brand-black` (unselected item) | `text-[var(--color-on-surface)]` |
| `bg-brand-purple text-white rounded-pill` (Instant badge) | `bg-[var(--color-primary)] text-white rounded-pill` |
| `bg-brand-purple bg-opacity-10 text-brand-purple rounded-pill` (Translated badge) | `bg-[var(--color-primary-fixed)] text-[var(--color-primary)] rounded-pill` |
| `border-brand-purple border-opacity-10 mx-2` (divider) | `border-[var(--color-outline-variant)] mx-2` |
| `text-brand-purple opacity-60` (no results) | `text-[var(--color-on-surface-variant)]` |

Also add `style={{ scrollbarWidth: 'thin', scrollbarColor: '#311b92 transparent' }}` to the scrollable `max-h-64 overflow-y-auto` div.

- [x] **Step 4: Reskin `apps/web/src/components/CaptionDisplay.tsx`**

Replace `brand-*` class names so dark mode renders visible text. Keep all business logic and motion animation unchanged:

```tsx
import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { DisplaySegment } from '../hooks/useCaptions'

interface Props {
  segments: DisplaySegment[]
  className?: string
  style?: React.CSSProperties
  highContrast?: boolean
}

export function CaptionDisplay({ segments, className = '', style, highContrast = false }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments])

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

Note: `highContrast` prop is kept in the interface for backwards compatibility but the `dark` CSS class now handles contrast automatically via token flipping — no conditional class logic needed.

- [x] **Step 5: Check in browser — caption viewer loads, header + settings panel + caption area display correctly, language picker opens with both Instant and Translated tiers, click outside closes it**

- [x] **Step 6: Commit**

```bash
git add apps/web/src/pages/EventPage.tsx \
        apps/web/src/components/LanguagePicker.tsx \
        apps/web/src/components/CaptionDisplay.tsx
git commit -m "feat: redesign caption viewer, language picker, caption display with MD3 tokens"
```

---

## Execution

Tasks 2–5 are fully independent once Task 1 is committed. Run them in parallel across 4 agents.

**Suggested parallel dispatch:**
- Agent A → Task 2 (Landing Page)
- Agent B → Task 3 (Login Page)
- Agent C → Task 4 (Presenter Dashboard)
- Agent D → Task 5 (Caption Viewer + Language Picker)

Each agent should verify visually in the browser (or at minimum confirm no TypeScript errors via `pnpm --filter web build`) before committing.

---

## Out of scope
- Mobile / responsive breakpoints (planned for a future milestone)
- SignupPage, CreateEventPage, DashboardPage, DashboardPresentPage — not in the Stitch designs yet
- Animations / transitions beyond hover states
- E2E tests — UI smoke testing only (dev server + visual check)
