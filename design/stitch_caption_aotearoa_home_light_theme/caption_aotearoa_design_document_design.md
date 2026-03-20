# Design System Document: Caption Aotearoa

## 1. Overview & Creative North Star: "The Digital Weaver"
The Creative North Star for this design system is **"The Digital Weaver."** This concept represents the intersection of ancient Māori tradition—specifically *Raranga* (weaving)—and modern digital technology. Just as a weaver combines individual strands into a cohesive, meaningful cloak (*Korowai*), Caption Aotearoa weaves spoken word, real-time translation, and accessibility into a tapestry of community connection.

### Core Philosophy:
- **Manaakitanga (Hospitality & Care):** Creating an environment where every voice is heard and every listener is welcomed through high readability and intuitive design.
- **Kaitiakitanga (Guardianship):** Preserving the sanctity of the Māori language and culture through respectful use of motifs and a focus on "Te Reo First."
- **Whanaungatanga (Relationship/Connection):** Using technology to bridge gaps between different languages and cultures within New Zealand.

---

## 2. Visual Principles

### A. Deep Contrast & Focus (The Midnight Canvas)
The primary interface uses "Aotearoa Midnight"—a deep charcoal base (#0e0e0e to #000000). This provides a restful, high-contrast environment that keeps the focus entirely on the white caption text, reducing eye strain for long sessions.

### B. Subtle Cultural Integration
Traditional Māori motifs (Koru, Kowhaiwhai, Poutama) are never used as mere decoration. They serve as:
- **Structural Anchors:** Framing the QR code or serving as section dividers.
- **Visual Cues:** The Koru represents the continuous growth and unfolding of the live transcript.
- **Texture:** Very low-opacity background patterns that give the interface "soul" without distracting from the text.

### C. The "Aurora" Gradient
Inspired by the brand's logo, a subtle rainbow gradient is used sparingly as a "glow" or "accent" to signify active states (e.g., the "Live" indicator, or the glow around a primary call-to-action). This represents the vibrancy of a diverse community.

---

## 3. Typography & Readability

- **Primary Typeface:** **Manrope** (Variable Sans-Serif).
- **Rationale:** Manrope offers exceptional legibility at all sizes, particularly for non-English scripts (Hindi, Chinese, etc.). It has a modern, clean geometric feel that balances the organic nature of the Māori motifs.
- **Hierarchy:**
  - **Captions:** Large, bold, and high-contrast (pure white).
  - **Secondary Info:** Dimmed grey (#9d9e9e) to create a clear "focus path" for the user.

---

## 4. Components & Interactive States

### A. The Language Picker
- **Priority Icons:** Minimalist, geometric representations of cultures (e.g., Koru for Te Reo Māori).
- **The "Text-First" List:** High-density alphabetical lists use clear English headers with dimmed native translations, prioritizing quick scanning.
- **Intelligence:** "Te Reo Māori" is always pinned first, reflecting the project's cultural core.

### B. "Ghost" Controls
Buttons and inputs follow a "minimalist footprint." Using thin borders and subtle hover effects ensures they don't compete with the live transcript for the user's attention.

### C. Recording Status
The "Organiser View" centers on a minimalist, glowing microphone icon. The pulse of the glow matches the audio input, creating a physical sense of "voice" being captured.

---

## 5. Design Tokens

| Token | Value | Usage |
| :--- | :--- | :--- |
| **Primary BG** | `#000000` | Main canvas |
| **Secondary BG** | `#0e0e0e` | Cards, Sidebar, Overlays |
| **Accent Glow** | `Gradient (Rainbow)` | Active States / "Live" |
| **Text Primary** | `#e7e5e5` | Captions, Headings |
| **Text Secondary** | `#9d9e9e` | Dimmed/Native names |
| **Border Soft** | `#1f2020` | Subtle component separation |
| **Border Active** | `#c6c6c7` | Focused states |

---

## 6. Future Evolution
The system is designed to scale. As more "NZ Census" languages are added, the "Priority Grid" can be customized per event, while the "Digital Weaver" patterns can evolve into unique generative graphics based on the cadence of the speech being transcribed.