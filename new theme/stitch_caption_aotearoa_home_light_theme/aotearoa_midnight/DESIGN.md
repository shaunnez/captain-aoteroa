# The Digital Weaver: Design System Documentation

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Weaver."** 

This system is an intentional intersection of ancestral Māori wisdom and high-end digital precision. It rejects the "off-the-shelf" SaaS aesthetic in favor of a bespoke, editorial experience. We achieve this through "Atmospheric Depth"—a technique where the UI feels like a series of woven layers rather than a flat screen. By utilizing asymmetrical layouts, low-opacity ancestral motifs (Koru, Kowhaiwhai), and a "Midnight" foundation, we create an environment that feels both grounded in Earth and soaring in the Digital Ether.

**The Signature Feel:** 
- **Intentional Asymmetry:** Elements should feel "placed" rather than "slotted."
- **Tonal Transitions:** Depth is created through light, not lines.
- **Cultural Anchors:** Low-opacity motifs act as structural waypoints, guiding the eye through complex information.

---

## 2. Colors: Aotearoa Midnight & The Aurora
The palette is rooted in the deep charcoal of the New Zealand night, punctuated by the shifting light of the Aurora.

### The Palette (Material Design 3 Tokens)
- **Surface/Background:** `#131313` (Base) to `#0e0e0e` (Lowest).
- **Primary (High Contrast):** `#e7e5e5` (Primary Text).
- **Secondary (Muted):** `#9d9e9e` (Secondary/De-emphasized Text).
- **The Aurora Gradient:** A subtle linear gradient `(135deg, #bac6ea, #c8c6c6, #ffb4ab)` used exclusively for active states, high-priority CTAs, and progress indicators.

### The "No-Line" Rule
**Borders are prohibited for sectioning.** To separate a navigation rail from a main content area, do not use a `1px` stroke. Instead, shift the background token. 
*Example:* Place a `surface-container-high` (`#2a2a2a`) panel against a `surface` (`#131313`) background. The edge is defined by the value shift, creating a seamless, high-end feel.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack.
1. **Background:** `surface` (#131313)
2. **Sectioning:** `surface-container-low` (#1c1b1b)
3. **Interactive Cards:** `surface-container-highest` (#353534)
4. **Floating Modals:** `surface-bright` (#3a3939) with a `40px` backdrop blur.

---

## 3. Typography: The Manrope Scale
We use **Manrope** for its geometric clarity and modern warmth. It bridges the gap between technical precision and human touch.

| Level | Size | Weight | Usage |
| :--- | :--- | :--- | :--- |
| **Display-LG** | 3.5rem | 700 (Bold) | Hero moments; extreme editorial impact. |
| **Headline-MD** | 1.75rem | 600 (Semi) | Section headers; clear, authoritative. |
| **Title-SM** | 1.0rem | 500 (Medium) | Card titles; navigational anchors. |
| **Body-LG** | 1.0rem | 400 (Regular) | Primary reading experience; generous tracking. |
| **Label-MD** | 0.75rem | 600 (Semi) | Buttons, chips, and metadata. |

**Editorial Note:** Use `Display-LG` with asymmetrical padding (e.g., `Spacing-24` on the left, `Spacing-12` on the right) to break the grid and lean into the "Digital Weaver" aesthetic.

---

## 4. Elevation & Depth: Atmospheric Layering
We do not use "drop shadows" in the traditional sense. We use **Tonal Layering** and **Ambient Glows.**

- **The Layering Principle:** Achieve lift by stacking surface tiers. A `surface-container-highest` card on a `surface` background provides all the "elevation" needed.
- **Ambient Shadows:** For floating elements (Modals/Popovers), use a multi-layered shadow: `0px 20px 40px rgba(0, 0, 0, 0.4)`. The shadow must feel like a natural occlusion of light, not a black smudge.
- **Glassmorphism:** All floating surfaces (e.g., tooltips, dropdowns) must use `surface-variant` (#353534) at 70% opacity with a `24px` backdrop-blur. This allows the subtle Māori textures underneath to peek through, maintaining the "Woven" brand story.
- **The Ghost Border:** If a boundary is required for accessibility, use the `outline-variant` token at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components: Functional Elegance

### Buttons (The "Ghost" Standard)
- **Primary:** Background: The Aurora Gradient. Text: `on-primary-fixed` (#1b1c1c). Corner Radius: `sm` (0.5rem).
- **Secondary (Ghost):** Background: Transparent. Border: `1px` solid `primary` (#c8c6c6). Text: `primary`. 
- **Interaction:** On hover, Ghost buttons should fill with a 5% white overlay and the border opacity should increase.

### Cards & Lists (The Divider-Free Rule)
- **Rule:** Forbid 1px horizontal lines between list items.
- **Implementation:** Use `Spacing-4` (1.4rem) of vertical white space or alternate background subtle shifts (`surface-container-low` vs `surface-container-lowest`).
- **Motifs:** Incorporate a `0.03` opacity Koru motif in the bottom-right corner of cards to act as a "signature" of the weaver.

### Input Fields
- **Style:** Underline-only or Ghost-style. 
- **States:** The "Active" bottom border should animate from the center out using the Aurora Gradient.
- **Rounding:** All inputs use `sm` (0.5rem) rounding to match the modern, architectural tone.

### Signature Component: The "Weave" Progress Bar
Instead of a flat bar, use a series of overlapping diagonal lines that "knit" together as the progress increases, utilizing the Aurora Gradient colors.

---

## 6. Do’s and Don'ts

### Do:
- **Use White Space as a Tool:** Give elements room to breathe. High-end design is defined by what you *don't* put on the screen.
- **Embrace the Dark:** Keep the "Midnight" base dominant. 90% of the UI should be dark values to let the Aurora accents shine.
- **Subtle Texture:** Use Māori motifs at 2-5% opacity. They should be felt, not necessarily seen at first glance.

### Don’t:
- **No 100% Black:** Avoid `#000000`. Use the `surface-container-lowest` (#0e0e0e) to maintain tonal depth and prevent "crushed" blacks.
- **No Hard Borders:** Avoid the "boxed-in" look. Let sections flow into each other through background shifts.
- **No Standard Shadows:** Never use the default browser/Figma shadow. Always tint and blur excessively for an ambient effect.
- **No Centered Headers:** Stay editorial. Use left-aligned typography with unexpected offsets to maintain the "Digital Weaver" personality.