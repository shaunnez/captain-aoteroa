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
**Used in:** `apps/web/src/pages/HomePage.tsx` — inside the hero `<section>`, replacing `KowhaiwhaPattern` or layered above it.

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

- Each word is a `motion.span` (Framer Motion) positioned absolutely within a `drift-layer` div (`position: absolute; inset: 0; overflow: hidden; pointer-events: none`).
- Words are spread horizontally across the full banner width via fixed `left` percentages.
- Each word has an independently staggered `delay` (0–6s) and slightly varying `duration` (7–10s) so cycles never feel synchronised.
- **Travel distance:** each word rises ~55% of the banner's rendered height. The banner height is measured once via a `useRef` + `ResizeObserver` and stored in state.
- **Opacity envelope per cycle:**
  - 0–8% of cycle: fade in (0 → 1)
  - 8–60%: fully visible
  - 60–80%: fade out (1 → 0)
  - 80–100%: invisible (word resets to bottom for next cycle)
- **Implementation:** Framer Motion `animate` prop with `repeat: Infinity, repeatType: "loop"`. Each word's keyframes are expressed as arrays: `y: [startY, endY]`, `opacity: [0, 1, 1, 0, 0]`, with `times: [0, 0.08, 0.60, 0.80, 1]`.

### Scan line

A single `motion.div` (1.5px tall, full width) sweeps upward through the same lower zone on a `duration: 5s, repeat: Infinity` loop. It fades out before reaching the ~45% mark (well below the headline). Uses a horizontal gradient for a soft glow effect.

### Whakataukī

A short Māori proverb is pinned to the bottom of the banner:
*"Ko ngā kupu he ara — words are a pathway"*
Rendered as a `<p>` with `position: absolute; bottom: 14px`, `z-index: 2`, styled with `--color-secondary` and low opacity (0.65). It sits above the drift layer but below the main hero content.

---

## Theming (Light / Dark)

The component reads dark mode from `useDarkMode()` (the existing `DarkModeContext`).

| Element | Light | Dark |
|---|---|---|
| Primary words | `--color-primary` (#1c0070) | `#c7bfff` + `text-shadow: 0 0 16px rgba(199,191,255,0.5)` |
| Teal words | `--color-secondary` (#14696d) | `#8ad3d7` + `text-shadow: 0 0 16px rgba(138,211,215,0.5)` |
| Scan line | `rgba(20,105,109,0.5)` gradient | `rgba(138,211,215,0.45)` gradient |
| Whakataukī | `--color-secondary` | `#8ad3d7` |

Words alternate between primary and teal colours based on their position in the array.

---

## Word Configuration

Each word entry:

```ts
type DriftWord = {
  text: string
  teal: boolean       // true = teal colour, false = primary colour
  leftPct: number     // horizontal position as % of container width
  sizRem: number      // font-size in rem (0.68–1.0)
  duration: number    // animation cycle length in seconds
  delay: number       // initial delay before first cycle starts
}
```

---

## Accessibility

- The drift layer is `aria-hidden="true"` — purely decorative.
- The whakataukī `<p>` is visible text and does NOT get `aria-hidden`.
- `useReducedMotion()` (already used in `HomePage.tsx`) is passed as a prop. When `true`, the component renders `null` — no animation, no DOM overhead.

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

`KowhaiwhaPattern` stays (very subtle BG tile at 4% opacity). `HeroWordDrift` sits above it as a second decorative layer, below the main content.

---

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/components/HeroWordDrift.tsx` | New component |
| `apps/web/src/pages/HomePage.tsx` | Import and render `HeroWordDrift` |

No new dependencies — Framer Motion is already installed.
