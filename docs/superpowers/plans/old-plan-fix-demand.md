# Fix: Demand-Filter Translation Bugs

**Date:** 2026-03-26
**Branch:** `claude/optimize-transcript-storage-u1PRj`
**Status:** Building — review complete, 2 additions from review

---

## Constraints This Spec Must Respect

- `caption_segments` stored row-per-language — no JSONB consolidation (CLAUDE.md Hard Rule #2)
- BCP-47 locale codes everywhere in frontend state (`en-NZ`, `mi-NZ`, not `en`, `mi`)
- `noUnusedLocals: true` in `apps/web/tsconfig.json` — unused local vars are type errors
- `noUnusedParameters` is NOT on — unused parameters don't error
- The `/api/translate` endpoint (translate.ts:15) uses `eventRow.languages[0]` as source — this is BCP-47 (e.g., `en-NZ`)
- `useCaptions` is called from two places: `EventPage.tsx:70` (viewer) and `PresentPage.tsx:102` (presenter)
- `CaptionDisplay` already handles `isTranslating=true` by showing a spinner (CaptionDisplay.tsx:47–52, 82–87)
- `useCaptions.test.ts` currently passes `isConfiguredLanguage` as 3rd arg (5 call sites)

---

## Objective

Fix three regressions introduced by the demand-filtering optimization (commit `abb4490`). All three bugs share one root cause: `isConfiguredLanguage` was designed for a world where configured = always translated. Post-optimization that assumption is broken — a language can be in `event.languages` but have no translations in the DB if no viewers demanded it.

---

## Root Cause

**Before `abb4490`:** Every final segment was translated to all 35 NZ languages. `isConfiguredLanguage = true` reliably meant "translations exist in DB."

**After `abb4490`:** Only demanded languages are translated. `isConfiguredLanguage = true` only means "the event has this language configured" — it says nothing about whether segments have been translated.

Two places in `useCaptions.ts` gate behavior on `isConfiguredLanguage`:

1. **`isTranslating` flag** (`useCaptions.ts:54`):
   ```typescript
   isTranslating: s.isFinal && !isConfiguredRef.current && !hasTranslation
   ```
   For configured languages, `!isConfiguredRef.current = false`, so `isTranslating` is never set. No spinner is shown during the async translation gap. Viewer sees a flash of English before translation arrives (Bug 3).

2. **On-demand translation polling** (`useCaptions.ts:119`):
   ```typescript
   if (isConfiguredLanguage || !eventCode || !locale) return
   ```
   For configured languages, the `if` short-circuits and polling never starts. Existing segments without the new locale's translation are never backfilled. Viewer/presenter sees English for all historical segments (Bugs 1 and 2).

---

## Bugs and Their Manifestations

| Bug | Symptom | Root Cause |
|-----|---------|------------|
| B1: Presenter language switch | Existing live transcript stays in English after switching to te reo | `isConfiguredLanguage=true` (default) → polling skips → no mi-NZ backfill |
| B2: Viewer language switch shows English | Existing transcript shows English after switching to e.g. Samoan | `isConfiguredLanguage=true` (sm is in event.languages) → polling skips → no sm backfill |
| B3: Delayed translation flash | Final segment shows English for ~200ms before translated text appears | `isConfiguredLanguage=true` → `isTranslating=false` → no spinner during async gap |

---

## Acceptance Criteria

| AC | Description | Verify Command | Expected | Automated |
|----|-------------|----------------|----------|-----------|
| AC1 | `useCaptions` accepts only 2 params (no `isConfiguredLanguage`) | `pnpm --filter web tsc --noEmit` | 0 errors | Yes |
| AC2 | `isTranslating=true` for final segments without locale translation | `pnpm --filter web test` | useCaptions tests pass | Yes |
| AC3 | Polling triggers on locale change (not guarded by `isConfiguredLanguage`) | `pnpm --filter web test` | useCaptions tests pass | Yes |
| AC4 | No unused local vars after removing `isConfiguredRef` | `pnpm --filter web tsc --noEmit` | 0 errors | Yes |
| AC5 | All 6 verification commands pass | See Verification section | 0 errors, all tests green | Yes |

---

## Architecture

### Current Flow (broken)

```
Viewer switches locale → EventPage sets selectedLocale → EventPage.tsx:68 computes isConfiguredLanguage
  → useCaptions(code, locale, isConfiguredLanguage=true)
  → useCaptions polling: if (isConfiguredLanguage=true) return  ← SKIP
  → extractSegments: segments[sm] = undefined → fallback to en-NZ → shows English
  → isTranslating: isFinal && !isConfiguredRef.current=false → false → no spinner
```

### New Flow (fixed)

```
Viewer switches locale → EventPage sets selectedLocale → useCaptions(code, locale)
  → useCaptions polling: if (!eventCode || !locale) return  ← ALWAYS runs on locale change
  → poll() calls /api/translate with targetLanguage=sm, sinceSequence=0
  → server finds untranslated segments, calls Azure Translator, returns sm translations
  → client merges sm text into allSegmentsRef entries
  → extractSegments: segments[sm] = "Talofa" → shows Samoan
  → isTranslating: isFinal && !hasTranslation  ← spinner shown during async gap
```

### Key Design Decisions

1. **Remove `isConfiguredLanguage` parameter entirely** — it's now a misleading concept. The hook should always poll for missing translations. The translate endpoint is already idempotent and returns cached results fast.

2. **Fix `isTranslating` to check actual segment data** — `isFinal && !hasTranslation` is the correct invariant: if a segment is final and the viewer's locale has no text, show loading.

3. **`sinceSequence` already handles the live case** — on locale change it resets to 0 (all history), then advances after each poll so subsequent polls only fetch new segments. No change needed here.

---

## Interface Contracts

No interface changes. `UseCaptionsReturn` and `DisplaySegment` types unchanged.

The only signature change: remove `isConfiguredLanguage` from `useCaptions`:

```typescript
// BEFORE (useCaptions.ts:20-24)
export function useCaptions(
  eventCode: string,
  locale: string,
  isConfiguredLanguage = true,
): UseCaptionsReturn

// AFTER
export function useCaptions(
  eventCode: string,
  locale: string,
): UseCaptionsReturn
```

---

## Work Packages

### WP1: Fix `useCaptions.ts`

**File:** `apps/web/src/hooks/useCaptions.ts`

| Line | Current | New | Why |
|------|---------|-----|-----|
| 22 | `locale: string,` | (same) | |
| 23 | `isConfiguredLanguage = true,` | _(delete this line)_ | Param unused after fix |
| 32 | `const isConfiguredRef = useRef(isConfiguredLanguage)` | _(delete this line)_ | Ref unused after fix; would trigger `noUnusedLocals` |
| 33 | `isConfiguredRef.current = isConfiguredLanguage` | _(delete this line)_ | |
| 54 | `isTranslating: s.isFinal && !isConfiguredRef.current && !hasTranslation,` | `isTranslating: s.isFinal && !hasTranslation,` | Fixes B3: show spinner for any final segment missing locale translation |
| 119 | `if (isConfiguredLanguage \|\| !eventCode \|\| !locale) return` | `if (!eventCode \|\| !locale) return` | Fixes B1+B2: always poll on locale change |
| 167 | `}, [eventCode, locale, isConfiguredLanguage, extractSegments])` | `}, [eventCode, locale, extractSegments])` | Remove stale dep |

**Builder instructions:**
1. Open `apps/web/src/hooks/useCaptions.ts`
2. Remove the `isConfiguredLanguage = true` parameter from the function signature (line 23)
3. Remove the `const isConfiguredRef = useRef(isConfiguredLanguage)` line (line 32)
4. Remove the `isConfiguredRef.current = isConfiguredLanguage` assignment (line 33)
5. Change `isTranslating` on line 54 to: `isTranslating: s.isFinal && !hasTranslation,`
6. Change the polling guard on line 119 to: `if (!eventCode || !locale) return`
7. Remove `isConfiguredLanguage` from the dep array on line 167

### WP2: Update `EventPage.tsx`

**File:** `apps/web/src/pages/EventPage.tsx`

| Line | Current | New | Why |
|------|---------|-----|-----|
| 68 | `const isConfiguredLanguage = event?.languages.includes(selectedLocale) ?? true` | _(delete this line)_ | Variable no longer needed |
| 70-74 | `useCaptions(code ?? '', selectedLocale, isConfiguredLanguage,)` | `useCaptions(code ?? '', selectedLocale,)` | Remove 3rd arg |

**Builder instructions:**
1. Open `apps/web/src/pages/EventPage.tsx`
2. Delete line 68 (`const isConfiguredLanguage = ...`)
3. In the `useCaptions` call (lines 70-74), remove the `isConfiguredLanguage` argument

### WP3: Update `useCaptions.test.ts`

**File:** `apps/web/src/__tests__/useCaptions.test.ts`

All 5 `renderHook` calls pass `true` as 3rd arg. Remove that arg from each.

Current (lines 46, 52, 57, 62, 67):
```typescript
renderHook(() => useCaptions('ABC123', 'en', true))
```

New:
```typescript
renderHook(() => useCaptions('ABC123', 'en'))
```

**Builder instructions:**
1. Open `apps/web/src/__tests__/useCaptions.test.ts`
2. Find all 5 occurrences of `useCaptions('ABC123', 'en', true)` and remove the `, true` from each

---

## Execution Order

```
WP1 → WP2 → WP3 → verify
```

WP2 depends on WP1 (function signature must be updated first, then callers). WP3 is independent but tests will fail if WP1 runs first and tests still pass 3rd arg. Run all three before verifying.

---

## AC → Verification Map

```bash
# AC1, AC4: TypeScript passes with no unused locals
pnpm --filter web tsc --noEmit

# AC2, AC3: useCaptions tests pass
pnpm --filter web test --run useCaptions

# AC5: All 6 verification commands
pnpm --filter api tsc --noEmit
pnpm --filter web tsc --noEmit
pnpm --filter api test
pnpm --filter web test
pnpm --filter api build
pnpm --filter web build
```

---

## Risk Register

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Polling fires for source-language viewers (e.g., `en` viewer, `en-NZ` source) | Low | Medium | Translate endpoint returns cached data fast; no functional harm, minor extra API call per 5s. Acceptable trade-off for simplicity. |
| `sinceSequence` reset on locale change causes re-fetching all segments | Low | High (by design) | This is correct: on language switch, we want all historical segments translated. The endpoint is idempotent. |
| `PresentPage.tsx` has no `isConfiguredLanguage` arg already | None | Confirmed | Already `useCaptions(code ?? '', speakerLocale ?? 'en-NZ')` — WP1 removes param, no 3rd arg ever passed here |

---

## What This Does NOT Fix

The underlying "English during interim segments" behavior is inherent: Azure STT interim events only carry source-language text. Translation only happens on final segments. Interim segments will always show source-language text (usually English). After finalizing, the spinner shows briefly, then translated text appears. This is architecturally expected with the SpeechRecognizer + Translator approach (vs. the old TranslationRecognizer which did inline interim translation).
