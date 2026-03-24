# Hero Word Drift — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Feature:** Animated te reo Māori word drift for the Caption Aotearoa home page hero

---

## Overview

A decorative animated layer added to the existing hero `<section>` on `HomePage.tsx`. Te reo Māori words float upward from the bottom of the banner and fade out before reaching the headline text. The animation is culturally grounded — the words are chosen for their connection to communication, hearing, sight, and understanding — and directly mirrors the product's purpose: making words visible and accessible.

---

## Component

**File:** `apps/web/src/components/HeroWordDrift.tsx`
**Used in:** `apps/web/src/pages/HomePage.tsx` — inside the hero `<section>`, layered above `KowhaiwhaPattern`.
**Client-only:** This component uses `ResizeObserver` and `useRef` for DOM measurement. It is safe for a Vite/React SPA (no SSR). If SSR is ever introduced, wrap with a client-only guard.

### Props

```ts
type HeroWordDriftProps = {
  prefersReduced: boolean
}
```

`prefersReduced` is sourced in `HomePage.tsx` via Framer Motion's `useReducedMotion()` hook, which is already imported and used there (`const prefersReduced = useReducedMotion()`). Pass the same value to `HeroWordDrift`.

---

## Words

Ten te reo Māori words, each related to communication, accessibility, or the senses:

| Word | Meaning |
|---|---|
| Kōrero | to speak, talk |
| Whakarongo | to listen, hear |
| Māramatanga | understanding, enlightenment |
| Kite | to see |
| Aroha | love, compassion |
| Rongo | to hear, sense, feel |
| Mōhio | to know, be aware |
| Ngā Reo | the voices, the languages |
| Tūhura | to explore, discover |
| Mātauranga | knowledge, wisdom |

---

## Animation Behaviour

- Each word is a `motion.span` (Framer Motion) positioned absolutely within a `drift-layer` div (`position: absolute; inset: 0; overflow: hidden; pointer-events: none; aria-hidden: true`).
- Words are spread horizontally across the full banner width via fixed `left` percentages defined in the word config (see Word Configuration below).
- Each word has an independently staggered `delay` (0–6s) and slightly varying `duration` (7–10s) so cycles never feel synchronised.
- **Travel distance:** each word rises 55% of the banner's rendered height (`travelPx = containerHeight * 0.55`). The banner height is measured via a `useRef` + `ResizeObserver` stored in a `containerHeight` state variable. Initial value is `0`; words and the scan line are not rendered until `containerHeight > 0` to avoid a flash at `top: 8px` on first paint.

### Framer Motion keyframes

Each `motion.span` uses the following `animate` keyframe arrays. Both `y` and `opacity` have five values aligned to the same `times` array:

```ts
animate={{
  y:       [0, 0, -(travelPx * 0.6), -(travelPx * 0.8), -travelPx],
  opacity: [0, 1,  1,                  0,                  0],
}}
transition={{
  duration,
  delay,
  repeat: Infinity,
  repeatType: 'loop',
  ease: 'linear',
  times: [0, 0.08, 0.60, 0.80, 1],
}}
```

The word's CSS `top` is set to `containerHeight + 8` (px), so `y: 0` places it just below the visible area and `y: -travelPx` places it 55% up from the bottom.

### Resize behaviour

On a `ResizeObserver` resize event, `containerHeight` state is updated. Framer Motion will re-render the `animate` prop with new `y` values. Words mid-cycle will smoothly transition to the updated target — no manual restart required. The slight position jump on resize is acceptable (resize is rare and brief).

### Scan line

A single `motion.div` (1.5px tall, full width, `pointer-events: none`) sweeps upward through the lower 55% zone. It intentionally leads the words slightly — it begins moving immediately at `t=0` while words hold for 8% of their cycle. This is by design: the scan line acts as a "reveal" sweep that precedes the words.

```ts
animate={{
  y:       [0, 0, -(travelPx * 0.6), -(travelPx * 0.8), -travelPx],
  opacity: [0, 1,  1,                  0,                  0],
}}
transition={{
  duration: 5,
  delay: 0,
  repeat: Infinity,
  repeatType: 'loop',
  ease: 'linear',
  times: [0, 0.05, 0.70, 0.88, 1],
}}
```

Initial CSS `top` is `containerHeight + 8` (same as words). Fade completes at 88% of the cycle — the line reaches ~45% up from the bottom, well below the headline. Uses a horizontal CSS gradient for the glow; see Theming section.

### Whakataukī

A short Māori proverb is pinned to the bottom of the banner:
*"Ko ngā kupu he ara — words are a pathway"*

Rendered as `<p lang="mi">` with Tailwind classes `absolute bottom-3.5 left-0 right-0 text-center text-xs font-semibold italic tracking-wider opacity-65 z-[2]`. Styled with `--color-secondary` (light) / `#8ad3d7` (dark).

**The whakataukī is always rendered, even when `prefersReduced` is `true`.** Only the animated words and scan line are suppressed under reduced motion.

**Cultural note:** *"Ko ngā kupu he ara"* is a contemporary Māori composition, not a documented traditional whakataukī. It should be reviewed by a Māori language advisor before the feature ships publicly. A placeholder note may be left in the code.

---

## Theming (Light / Dark)

The component reads dark mode from `useDarkMode()` (existing `DarkModeContext`).

| Element | Light | Dark |
|---|---|---|
| Primary words | `color: var(--color-primary)` | `color: #c7bfff; text-shadow: 0 0 16px rgba(199,191,255,0.5)` |
| Teal words | `color: var(--color-secondary)` | `color: #8ad3d7; text-shadow: 0 0 16px rgba(138,211,215,0.5)` |
| Scan line | `linear-gradient(90deg, transparent, rgba(20,105,109,0.5) 50%, transparent)` | `linear-gradient(90deg, transparent, rgba(138,211,215,0.45) 50%, transparent)` |
| Whakataukī | `color: var(--color-secondary)` | `color: #8ad3d7` |

Each word's colour is determined by its explicit `teal: boolean` field in the word config array (not by index parity). This gives full control over which words are indigo vs teal.

---

## Word Configuration

The config array is hardcoded inside `HeroWordDrift.tsx` (no external constants file needed). The full values to use:

```ts
const WORDS: DriftWord[] = [
  { text: 'Kōrero',      teal: false, leftPct: 6,  sizeRem: 0.82, duration: 7,   delay: 0    },
  { text: 'Whakarongo',  teal: true,  leftPct: 22, sizeRem: 1.00, duration: 8.5, delay: 1.4  },
  { text: 'Māramatanga', teal: false, leftPct: 40, sizeRem: 0.72, duration: 6.5, delay: 0.8  },
  { text: 'Kite',        teal: true,  leftPct: 56, sizeRem: 0.90, duration: 9,   delay: 2.2  },
  { text: 'Aroha',       teal: false, leftPct: 70, sizeRem: 0.78, duration: 7.5, delay: 0.3  },
  { text: 'Rongo',       teal: true,  leftPct: 82, sizeRem: 0.82, duration: 8,   delay: 3.1  },
  { text: 'Mōhio',       teal: false, leftPct: 14, sizeRem: 0.70, duration: 9.5, delay: 4.2  },
  { text: 'Ngā Reo',     teal: true,  leftPct: 48, sizeRem: 0.92, duration: 7,   delay: 5.0  },
  { text: 'Tūhura',      teal: false, leftPct: 76, sizeRem: 0.68, duration: 8,   delay: 1.8  },
  { text: 'Mātauranga',  teal: true,  leftPct: 30, sizeRem: 0.75, duration: 10,  delay: 6.0  },
]
```

Each entry:

```ts
type DriftWord = {
  text: string
  teal: boolean      // true = teal colour, false = primary colour
  leftPct: number    // horizontal position as % of container width
  sizeRem: number    // font-size in rem (range: 0.68–1.0)
  duration: number   // animation cycle length in seconds
  delay: number      // initial delay before first cycle in seconds
}
```

---

## Reduced Motion

When `prefersReduced` is `true`:
- The animated `motion.span` words and `motion.div` scan line are **not rendered**.
- The whakataukī `<p lang="mi">` is **still rendered** — it has content value independent of animation.

---

## Z-index Stack (hero section)

| Layer | z-index | Notes |
|---|---|---|
| `KowhaiwhaPattern` SVG | auto (0) | Absolutely positioned, no z-index set |
| `HeroWordDrift` drift layer div | auto (0) | Absolutely positioned, no z-index set — sits above KowhaiwhaPattern in DOM order |
| `HeroWordDrift` whakataukī `<p>` | `z-[2]` | Pinned text, above drift layer |
| Main hero `motion.div` (headline + form) | `relative` / default stacking | In normal flow via `position: relative`, naturally above absolute layers |

---

## Accessibility

- The outer drift layer div has `aria-hidden="true"` — purely decorative.
- The whakataukī `<p lang="mi">` is not hidden and carries `lang="mi"` so screen readers use the correct Māori pronunciation engine.
- All animation respects `prefersReduced` (see above).

---

## Integration with HomePage

The hero `<section>` in `HomePage.tsx` currently contains:

```tsx
<section className="relative overflow-hidden py-24 px-6 text-center">
  <KowhaiwhaPattern />
  <motion.div ...> {/* headline, body, JoinForm */} </motion.div>
</section>
```

After this change:

```tsx
<section className="relative overflow-hidden py-24 px-6 text-center">
  <KowhaiwhaPattern />
  <HeroWordDrift prefersReduced={prefersReduced} />
  <motion.div ...> {/* headline, body, JoinForm */} </motion.div>
</section>
```

`KowhaiwhaPattern` stays (very subtle BG tile at 4% opacity). `HeroWordDrift` sits above it as a second decorative layer, below the main content `motion.div`.

---

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/components/HeroWordDrift.tsx` | New component |
| `apps/web/src/pages/HomePage.tsx` | Import and render `HeroWordDrift` |

No new dependencies — Framer Motion is already installed.
