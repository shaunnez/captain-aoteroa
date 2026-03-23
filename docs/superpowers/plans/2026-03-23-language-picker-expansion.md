# Language Picker Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend LanguagePickerModal with an optional `languages` prop, add it to PresentPage (with a back button to dashboard), and replace the transcript `<select>` dropdown with the same modal.

**Architecture:** `LanguagePickerModal` gets an optional `languages?: NzLanguage[]` prop — when provided it renders only those tiles with no "Translated" section. PresentPage uses this with the event's speaker languages plus a synthetic `{ code: 'dual' }` tile for bilingual mode. TranscriptDownload replaces its `<select>` with a pill trigger and the same modal filtered to available transcript languages. Legacy `brand-*` colour classes in TranscriptDownload are fixed as part of that task.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/` (no separate spec written — design agreed in-session 2026-03-23)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `apps/web/src/components/LanguagePickerModal.tsx` | Add optional `languages` prop |
| Modify | `apps/web/src/__tests__/LanguagePickerModal.test.tsx` | Add tests for `languages` prop behaviour |
| Modify | `apps/web/src/pages/PresentPage.tsx` | Back button in header + modal trigger for speaker language |
| Modify | `apps/web/src/components/TranscriptDownload.tsx` | Replace `<select>` with modal trigger, fix legacy colours |

---

## Task 1: Extend LanguagePickerModal with optional `languages` prop

**Files:**
- Modify: `apps/web/src/components/LanguagePickerModal.tsx`
- Modify: `apps/web/src/__tests__/LanguagePickerModal.test.tsx`

**Background:** The current modal always shows NZ_LANGUAGES tiles + AZURE_TRANSLATION_LANGUAGES list. Two callers (PresentPage, TranscriptDownload) only want to show a short custom list. Adding an optional `languages` prop lets them pass exactly what they need — no Translated section, no section header.

- [ ] **Step 1: Write the two failing tests**

Add to `apps/web/src/__tests__/LanguagePickerModal.test.tsx`, inside the existing `describe('LanguagePickerModal')` block:

```tsx
it('shows only provided languages when languages prop is given', () => {
  const langs: NzLanguage[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'mi', label: 'Te reo Māori', flag: '🇳🇿' },
  ]
  render(<LanguagePickerModal {...defaultProps} languages={langs} />)
  expect(screen.getByText('English')).toBeDefined()
  expect(screen.getByText('Te reo Māori')).toBeDefined()
  // Must NOT show the default section labels
  expect(screen.queryByText('Instant Languages')).toBeNull()
  expect(screen.queryByText('Translated')).toBeNull()
})

it('filters provided languages by search query', () => {
  const langs: NzLanguage[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'mi', label: 'Te reo Māori', flag: '🇳🇿' },
  ]
  render(<LanguagePickerModal {...defaultProps} languages={langs} />)
  fireEvent.change(screen.getByPlaceholderText('Search for a language…'), {
    target: { value: 'english' },
  })
  expect(screen.getByText('English')).toBeDefined()
  expect(screen.queryByText('Te reo Māori')).toBeNull()
})
```

Also add the import at the top of the test file:
```tsx
import type { NzLanguage } from '@caption-aotearoa/shared/nzLanguages'
```

- [ ] **Step 2: Run tests to confirm both fail**

```bash
pnpm --filter web test -- LanguagePickerModal 2>&1 | tail -15
```
Expected: 2 tests FAIL — the `languages` prop is not yet in the component.

- [ ] **Step 3: Update LanguagePickerModal.tsx**

Read the file first. Then make these changes:

**a) Add `NzLanguage` import** (it's already imported via `NZ_LANGUAGES`, just add the type):
```tsx
import { NZ_LANGUAGES, type NzLanguage } from '@caption-aotearoa/shared/nzLanguages'
```

**b) Add `languages?` to the interface:**
```tsx
interface LanguagePickerModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLocale: string
  onSelect: (locale: string) => void
  languages?: NzLanguage[]   // when provided: show only these, hide Translated section
}
```

**c) Destructure `languages` in the function signature:**
```tsx
export function LanguagePickerModal({ isOpen, onClose, selectedLocale, onSelect, languages }: LanguagePickerModalProps) {
```

**d) Replace the `instantItems` and `translatedItems` derivations.** Find the two const declarations after `if (!isOpen) return null` and replace them:

```tsx
const instantItems = (languages ?? NZ_LANGUAGES).filter((l) =>
  l.label.toLowerCase().includes(query)
)

const translatedItems = languages
  ? []   // custom list — no translated section
  : AZURE_TRANSLATION_LANGUAGES.filter(
      (l) => !NZ_CODES.has(l.code) && l.label.toLowerCase().includes(query)
    )
```

**e) Update the section header.** Find the `<p>` that says "Instant Languages" and change it:
```tsx
<p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-3">
  {languages ? 'Languages' : 'Instant Languages'}
</p>
```

- [ ] **Step 4: Run all LanguagePickerModal tests**

```bash
pnpm --filter web test -- LanguagePickerModal 2>&1 | tail -15
```
Expected: ALL 9 tests pass (7 original + 2 new).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/LanguagePickerModal.tsx apps/web/src/__tests__/LanguagePickerModal.test.tsx
git commit -m "feat: add optional languages prop to LanguagePickerModal for custom lists"
```

---

## Task 2: PresentPage — back button + language picker modal

**Files:**
- Modify: `apps/web/src/pages/PresentPage.tsx`

**Background:** The presenter currently sees inline pill buttons for "I am speaking in". We replace these with a pill trigger → LanguagePickerModal showing only the event's speaker languages. The bilingual "English + Te Reo" option is injected as a synthetic `{ code: 'dual' }` tile — the `onSelect` handler routes it to the existing `handleToggleDual()`. A back button is added to the DashboardShell header.

- [ ] **Step 1: Read `apps/web/src/pages/PresentPage.tsx`**

Understand the current structure before editing.

- [ ] **Step 2: Add imports**

At the top of the file, add:
```tsx
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { LanguagePickerModal } from '../components/LanguagePickerModal'
import type { NzLanguage } from '@caption-aotearoa/shared/nzLanguages'
```

Remove `useParams` from the react-router-dom import if it's the only import there — actually keep it, `code` comes from `useParams`. Just add `useNavigate` alongside it:
```tsx
import { useParams, useNavigate } from 'react-router-dom'
```

- [ ] **Step 3: Add state and derived values**

After the existing state declarations (`speakerLocale`, `isDualMode`), add:
```tsx
const navigate = useNavigate()
const [langPickerOpen, setLangPickerOpen] = useState(false)
```

After the `if (isLoading || !event)` guard (so `event` is non-null), add these two derived values before the `return`:

```tsx
// Build the language list for the modal: event speaker languages + bilingual option
const speakerLangList: NzLanguage[] = [
  ...speakerLanguages.map((code) => ({
    code,
    label: NZ_LANGUAGES.find((l) => l.code === code)?.label ?? code,
    flag:  NZ_LANGUAGES.find((l) => l.code === code)?.flag,
  })),
  ...(hasBilingual
    ? [{ code: 'dual', label: 'English + Te Reo', flag: '🇳🇿' }]
    : []),
]

// The currently active code shown on the trigger pill
const activeSpeakerCode: string = isDualMode
  ? 'dual'
  : (Object.keys(PRESENTER_LOCALES).find(
      (k) => PRESENTER_LOCALES[k] === speakerLocale
    ) ?? speakerLanguages[0] ?? 'en')

const activeLang = speakerLangList.find((l) => l.code === activeSpeakerCode)
```

- [ ] **Step 4: Add the `handleSpeakerSelect` function**

After `handleToggleDual`, add:
```tsx
function handleSpeakerSelect(code: string) {
  setLangPickerOpen(false)
  if (code === 'dual') {
    // Only toggle on if not already in dual mode — selecting it again is a no-op
    if (!isDualMode) handleToggleDual()
  } else {
    // handleLanguageChange already exits dual mode internally if needed
    handleLanguageChange(code)
  }
}
```

- [ ] **Step 5: Add the `headerActions` prop to the existing `<DashboardShell>` opening tag**

Find the `<DashboardShell` opening tag in the return. It currently has no `headerActions` prop. Add only that prop — leave `left`, `main`, and `right` unchanged:

```tsx
headerActions={
  <button
    onClick={() => navigate('/dashboard')}
    className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]
               hover:text-[var(--color-on-surface)] transition-colors"
  >
    <ArrowLeft size={16} />
    Dashboard
  </button>
}
```

- [ ] **Step 6: Replace the "I am speaking in" block**

Find the `{speakerLanguages.length > 0 && (...)}` block in the `left` panel (lines ~103–142). Replace the entire block:

```tsx
{speakerLangList.length > 0 && (
  <div className="flex flex-col gap-2">
    <p className="text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-widest">
      I am speaking in
    </p>
    <button
      onClick={() => setLangPickerOpen(true)}
      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                 bg-[var(--color-surface-container-high)]
                 text-[var(--color-on-surface)]
                 border border-[var(--color-outline-variant)]
                 hover:bg-[var(--color-surface-container-highest)] transition-colors"
    >
      <span className="text-base leading-none">{activeLang?.flag ?? '🌐'}</span>
      <span className="flex-1 text-left truncate">{activeLang?.label ?? activeSpeakerCode}</span>
      <svg className="w-3 h-3 opacity-60 shrink-0" viewBox="0 0 12 12" fill="none">
        <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    <LanguagePickerModal
      isOpen={langPickerOpen}
      onClose={() => setLangPickerOpen(false)}
      selectedLocale={activeSpeakerCode}
      onSelect={handleSpeakerSelect}
      languages={speakerLangList}
    />
  </div>
)}
```

- [ ] **Step 7: Verify build and tests**

```bash
pnpm --filter web build 2>&1 | head -20
pnpm --filter web test 2>&1 | tail -10
```
Expected: build exits 0, all LanguagePickerModal tests still pass (9 total). PresentPage has no test file — build success is the verification.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/PresentPage.tsx
git commit -m "feat: add back button and language picker modal to PresentPage"
```

---

## Task 3: TranscriptDownload — modal trigger + legacy colour fixes

**Files:**
- Modify: `apps/web/src/components/TranscriptDownload.tsx`
- Create: `apps/web/src/__tests__/TranscriptDownload.test.tsx`

**Background:** The current "ready" state shows a `<select>` for language choice. Replace with a pill trigger + LanguagePickerModal filtered to the transcript's available languages. Three legacy `brand-*` colour classes also need fixing while we're in the file.

- [ ] **Step 1: Read `apps/web/src/components/TranscriptDownload.tsx`**

Note the three legacy colour classes to fix:
- `text-brand-error` → `text-[var(--color-error)]`
- `text-brand-black opacity-60` → `text-[var(--color-on-surface-variant)]`
- `text-brand-purple` → `text-[var(--color-primary)]`

- [ ] **Step 2: Write the failing test**

Create `apps/web/src/__tests__/TranscriptDownload.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TranscriptDownload } from '../components/TranscriptDownload'

// Mock the api module
vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from '../lib/api'

describe('TranscriptDownload', () => {
  it('shows a pill trigger button (not a <select>) when transcript is ready', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        status: 'ready',
        languages: [
          { language: 'en', content: 'Hello world' },
          { language: 'mi', content: 'Kia ora' },
        ],
      },
    })

    render(
      <TranscriptDownload
        eventCode="ABC123"
        eventTitle="Test Event"
      />
    )

    // Click the initial "View Transcript" button to fetch
    fireEvent.click(screen.getByText('View Transcript'))

    // Wait for the ready state
    await waitFor(() => {
      // Should show a button trigger (not a select)
      expect(screen.queryByRole('combobox')).toBeNull()
      // Should show a Download PDF button
      expect(screen.getByText('Download PDF')).toBeDefined()
    })
  })
})
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
pnpm --filter web test -- TranscriptDownload 2>&1 | tail -15
```
Expected: test FAILS — `<select>` (combobox role) is present, which means `queryByRole('combobox')` returns non-null.

- [ ] **Step 4: Update imports**

Add at the top of the file:
```tsx
import { useState } from 'react'   // already there
import { LanguagePickerModal } from './LanguagePickerModal'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared/nzLanguages'
import type { NzLanguage } from '@caption-aotearoa/shared/nzLanguages'
```

- [ ] **Step 5: Add `langPickerOpen` state**

Inside the `TranscriptDownload` function, after the existing state declarations, add:
```tsx
const [langPickerOpen, setLangPickerOpen] = useState(false)
```

- [ ] **Step 6: Replace the `<select>` block**

Find the "Transcript ready" return (the one that returns the `<div className="flex flex-wrap items-center gap-3">`). Replace the entire return block:

```tsx
// Transcript ready — show language picker and download
const transcriptLangs: NzLanguage[] = transcript.languages.map((l) => {
  const found = NZ_LANGUAGES.find((n) => n.code === l.language)
  return found ?? { code: l.language, label: l.language }
})

const activeLang = transcriptLangs.find((l) => l.code === selectedLang)

return (
  <div className="flex flex-wrap items-center gap-3">
    <button
      onClick={() => setLangPickerOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                 bg-[var(--color-surface-container-high)]
                 text-[var(--color-on-surface)]
                 border border-[var(--color-outline-variant)]
                 hover:bg-[var(--color-surface-container-highest)] transition-colors"
    >
      {activeLang?.flag && (
        <span className="text-base leading-none">{activeLang.flag}</span>
      )}
      <span>{activeLang?.label ?? selectedLang}</span>
      <svg className="w-3 h-3 opacity-60 shrink-0" viewBox="0 0 12 12" fill="none">
        <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    <button
      onClick={downloadPDF}
      className="btn-primary flex items-center gap-2 text-sm py-1.5"
    >
      <Download className="w-4 h-4" />
      Download PDF
    </button>
    <LanguagePickerModal
      isOpen={langPickerOpen}
      onClose={() => setLangPickerOpen(false)}
      selectedLocale={selectedLang}
      onSelect={(code) => { setSelectedLang(code); setLangPickerOpen(false) }}
      languages={transcriptLangs}
    />
  </div>
)
```

Note: place `transcriptLangs` and `activeLang` as `const` declarations immediately before the `return (` statement, not inside the JSX.

- [ ] **Step 7: Fix the three legacy colour classes**

In the "Transcript not ready" return block, fix:

```tsx
/* FROM */
<p className="text-brand-black opacity-60">
/* TO */
<p className="text-[var(--color-on-surface-variant)]">

/* FROM */
<p className="text-brand-purple text-xs mt-1">Processing — check back shortly.</p>
/* TO */
<p className="text-[var(--color-primary)] text-xs mt-1">Processing — check back shortly.</p>

/* FROM */
{error && <p className="text-brand-error text-sm mt-2">{error}</p>}
/* TO */
{error && <p className="text-[var(--color-error)] text-sm mt-2">{error}</p>}
```

- [ ] **Step 6: Verify build and tests**

```bash
pnpm --filter web build 2>&1 | head -20
pnpm --filter web test 2>&1 | tail -10
```
Expected: build exits 0, all 9 tests pass.

- [ ] **Step 8: Run the TranscriptDownload tests**

```bash
pnpm --filter web test -- TranscriptDownload 2>&1 | tail -15
```
Expected: 1 test passes.

- [ ] **Step 9: Run full test suite**

```bash
pnpm --filter web test 2>&1 | tail -10
```
Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/TranscriptDownload.tsx apps/web/src/__tests__/TranscriptDownload.test.tsx
git commit -m "feat: replace transcript <select> with LanguagePickerModal, fix legacy colours"
```

---

## Final Verification

- [ ] Run full test suite

```bash
pnpm --filter web test
```
Expected: all tests pass.

- [ ] Manual checks

| Route | Check |
|-------|-------|
| `/present/:code` | Header shows "← Dashboard" button that navigates to `/dashboard` |
| `/present/:code` | "I am speaking in" shows pill trigger; tap → modal with event languages only (no Samoan/Tongan/Fijian) |
| `/present/:code` (bilingual event) | Modal includes "English + Te Reo" tile; selecting it activates dual mode |
| `/dashboard/events/:id` (ended event) | "View Transcript" → ready state shows pill trigger instead of `<select>` |
| `/dashboard/events/:id` transcript | Selecting language via modal updates the Download PDF button target |
