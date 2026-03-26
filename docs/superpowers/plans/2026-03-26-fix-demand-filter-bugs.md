# Fix: Restore Inline Translation via TranslationRecognizer

**Date:** 2026-03-26
**Branch:** `claude/optimize-transcript-storage-u1PRj`
**Status:** Ready to execute

---

## Context

Commit `e0e512e` replaced `TranslationRecognizer` with `SpeechRecognizer + post-final Azure Translator` to cut costs ($12.70/hr → ~$1/hr). The cost was driven by translating to all 36 NZ languages unconditionally. Commit `abb4490` later added demand filtering but only to the post-final Translator call — not fixing the root UX regression.

The original `TranslationRecognizer` produced translated text on both interim and final events. Viewers saw Chinese (or any language) update in real-time as the presenter spoke. That experience is the target.

This plan restores `TranslationRecognizer` while combining it with the demand filtering from `abb4490`: only the languages with active viewers are configured as translation targets. Typical event: 2–5 target languages instead of 36. Cost stays low.

---

## Constraints

- `caption_segments` stored row-per-language — no JSONB consolidation (CLAUDE.md Hard Rule #2)
- BCP-47 locale codes everywhere in frontend state (`en-NZ`, `mi-NZ`, not `en`, `mi`)
- `noUnusedLocals: true` in `apps/web/tsconfig.json`
- `languageMap.ts` still exists with `bcp47ToTranslationCode` / `translationCodeToBcp47`
- `DualAzureSession` creates its own `AzureSession` instances — must also pass `languages`
- TTS block in `SocketHandler.ts:276–328` already resolves text from `payload.segments` — it will work correctly once translations are inline in the payload, no changes needed there
- `translateText` import in `SocketHandler.ts` stays — still used for Q&A translation

---

## Root Cause (Original Bugs)

All three bugs (B1/B2/B3) from `abb4490` share one root cause: `isConfiguredLanguage` in `useCaptions` was designed for a world where configured = always translated. Post-optimization that assumption broke.

With `TranslationRecognizer` restored, B3 (flash of English before translation) is fixed at the server — translations arrive inline with the segment. B1/B2 (historical backfill when viewer switches language) still require the `useCaptions` fix because history in the DB only contains demanded languages at the time of speaking.

---

## Architecture: New Flow

```
Viewer selects Chinese → caption:subscribe → SocketHandler → EventManager.updateLanguages()
  → AzureSession.updateLanguages(['en-NZ', 'zh-TW']) → restart TranslationRecognizer
  → presenter speaks → TranslationRecognizer.recognizing → interim: { en-NZ: "Hel...", zh-TW: "你好..." }
  → socket emit → viewer sees Chinese updating in real-time
  → TranslationRecognizer.recognized → final: { en-NZ: "Hello", zh-TW: "你好" }
  → AzureSession persists one row per language → socket emit
  → TTS block fires for audio subscribers using payload.segments (unchanged)

Viewer switches to Samoan mid-event:
  → caption:subscribe sm-WS → updateLanguages(['en-NZ', 'zh-TW', 'sm-WS'])
  → AzureSession restarts (~1-2s gap) with Samoan added
  → useCaptions polling backfills historical sm-WS segments from /api/translate
```

---

## Acceptance Criteria

| AC | Description | Verify Command | Expected | Automated |
|----|-------------|----------------|----------|-----------|
| AC1 | Interim segments include translations for demanded languages | `pnpm --filter api test` | AzureSession tests pass | Yes |
| AC2 | Final segments include translations inline (no re-emit) | `pnpm --filter api test` | SocketHandler tests pass | Yes |
| AC3 | `caption:subscribe` triggers `updateLanguages` when new language demanded | `pnpm --filter api test` | SocketHandler tests pass | Yes |
| AC4 | Session restarts only when genuinely new target language added | `pnpm --filter api test` | AzureSession tests pass | Yes |
| AC5 | `useCaptions` polls without `isConfiguredLanguage` guard | `pnpm --filter web test` | useCaptions tests pass | Yes |
| AC6 | No unused locals in web build | `pnpm --filter web tsc --noEmit` | 0 errors | Yes |
| AC7 | All 6 verification commands pass | See Verification section | 0 errors, all tests green | Yes |

---

## Work Packages

### WP1: Restore `TranslationRecognizer` in `AzureSession.ts`

**File:** `apps/api/src/services/AzureSession.ts`

**Changes:**

1. Add `languages: string[]` back to `AzureSessionOptions` (list of BCP-47 locales; may be empty on session start)
2. Add import: `import { bcp47ToTranslationCode, translationCodeToBcp47 } from './languageMap'`
3. Change `private recognizer!: sdk.SpeechRecognizer` → `private recognizer!: sdk.TranslationRecognizer`
4. In `createRecognizer()`:
   - Replace `effectiveSdk.SpeechConfig.fromSubscription(...)` with `effectiveSdk.SpeechTranslationConfig.fromSubscription(...)`
   - Replace `new effectiveSdk.SpeechRecognizer(...)` with `new effectiveSdk.TranslationRecognizer(...)`
   - Add target languages loop (filtering out source):
     ```typescript
     const sourceCode = bcp47ToTranslationCode(sourceLocale)
     for (const lang of this.options.languages) {
       const code = bcp47ToTranslationCode(lang)
       if (code !== sourceCode) translationConfig.addTargetLanguage(code)
     }
     ```
   - Change `recognizing` handler: `ResultReason.RecognizingSpeech` → `ResultReason.TranslatingSpeech`
   - Change `recognized` handler: `ResultReason.RecognizedSpeech` → `ResultReason.TranslatedSpeech`
5. Replace `buildSegments(result: sdk.SpeechRecognitionResult)` with:
   ```typescript
   private buildSegments(result: sdk.TranslationRecognitionResult): Record<string, string> {
     const sourceLocale = this.options.speakerLocale ?? 'en-NZ'
     const segments: Record<string, string> = { [sourceLocale]: result.text }
     const translations = result.translations
     if (translations) {
       translations.languages?.forEach((langCode: string) => {
         const text = translations.get(langCode)
         if (text) {
           const bcp47 = translationCodeToBcp47(langCode, this.options.languages)
           segments[bcp47] = text
         }
       })
     }
     return segments
   }
   ```
6. In `emitSegments()`, restore multi-language DB persist (one row per language in segments):
   ```typescript
   if (isFinal && this.eventId) {
     const rows = Object.entries(segments).map(([language, text]) => ({
       id: uuidv4(),
       event_id: this.eventId!,
       sequence: seq,
       text,
       language,
       is_final: true,
     }))
     supabase.from('caption_segments').insert(rows).then(({ error }) => {
       if (error) console.error('Failed to persist segments:', error.message)
     })
   }
   ```
7. Add `updateLanguages(languages: string[])` method:
   ```typescript
   updateLanguages(languages: string[]): void {
     const sourceLocale = this.options.speakerLocale ?? 'en-NZ'
     const sourceCode = bcp47ToTranslationCode(sourceLocale)
     const currentCodes = new Set(
       this.options.languages.map(bcp47ToTranslationCode).filter(c => c !== sourceCode)
     )
     const newCodes = new Set(
       languages.map(bcp47ToTranslationCode).filter(c => c !== sourceCode)
     )
     const hasNew = [...newCodes].some(c => !currentCodes.has(c))
     if (!hasNew) return
     this.options.languages = languages
     this.restart().catch(err =>
       this.options.onError?.(`Language update restart failed: ${String(err)}`, false)
     )
   }
   ```

**Edge case:** If `languages` has no non-source targets, `addTargetLanguage` is never called. `TranslationRecognizer` fires with no translations — `buildSegments` returns source-only, which is correct. Session restarts via `updateLanguages` when first viewer subscribes.

---

### WP2: Update `EventManager.ts`

**File:** `apps/api/src/services/EventManager.ts`

**Changes:**

1. Add `languages?: string[]` to `SessionOptions` interface
2. Pass `languages: options.languages ?? []` to every `new AzureSession({...})` call (there are 3: `start()`, `setLanguage()` non-Māori path, `setMode()` single mode path)
3. Add method:
   ```typescript
   updateLanguages(code: string, languages: string[]): void {
     const entry = this.sessions.get(code)
     if (!entry || !(entry.session instanceof AzureSession)) return
     entry.session.updateLanguages(languages)
   }
   ```

---

### WP3: Update `SocketHandler.ts`

**File:** `apps/api/src/services/SocketHandler.ts`

**Changes:**

1. **In `session:start` handler** (line ~179): compute initial demanded languages and pass to `EventManager.start()`:
   ```typescript
   const captionLangs = captionSubs.getLanguages(code)
   const audioLangs = [...audioSubs.getSubscribers(code).keys()]
   const initialLangs = [...new Set([...captionLangs, ...audioLangs, 'en-NZ'])]
   await EventManager.start(
     code,
     { speakerLocale: locale ?? undefined, languages: initialLangs },
     ...
   )
   ```
2. **Narrow the `translateText` fire-and-forget block** (lines ~187–275): change the guard from `segmentKeys.length === 1` to `segmentKeys.length === 1 && sourceLang === 'mi-NZ'`. Te reo segments from `OpenAiSttSession` still require post-final translation via `translateText` — that session has no translation capability. All other sources now use TranslationRecognizer and arrive with translations inline, so the block never fires for them.
3. **In `caption:subscribe` handler** (line ~66): after `captionSubs.subscribe(...)`, add:
   ```typescript
   if (EventManager.has(code)) {
     const captionLangs = captionSubs.getLanguages(code)
     const audioLangs = [...audioSubs.getSubscribers(code).keys()]
     const allLangs = [...new Set([...captionLangs, ...audioLangs, 'en-NZ'])]
     EventManager.updateLanguages(code, allLangs)
   }
   ```
4. **In `audio:subscribe` handler** (line ~58): same pattern after `audioSubs.subscribe(...)`.

**Note:** TTS block at lines 276–328 is unchanged. It already iterates `audioSubs.getSubscribers(code)` and resolves text from `payload.segments` — it will pick up translated languages automatically once they're inline.

---

### WP4: Update `azureSpeechStub.ts`

**File:** `apps/api/src/services/__mocks__/azureSpeechStub.ts`

**Changes:**

1. Add `TranslatingSpeech: 3, TranslatedSpeech: 4` to `ResultReason`
2. Add `FakeTranslationRecognizer` class:
   - Stores target languages from config (via a `SpeechTranslationConfig` mock that exposes `targetLanguages: string[]`)
   - `_fireRecognized()` fires with `result.reason = ResultReason.TranslatedSpeech`, `result.text = MOCK_SOURCE_TEXT`, and `result.translations = { languages: [...targetLanguages], get(lang) { return MOCK_TRANSLATIONS[lang] ?? 'mock translation' } }`
3. Add `SpeechTranslationConfig` to `fakeSdk`:
   ```typescript
   SpeechTranslationConfig: {
     fromSubscription(_key: string, _region: string) {
       const targetLanguages: string[] = []
       return {
         speechRecognitionLanguage: '' as string,
         setProperty(_name: string, _value: string) {},
         addTargetLanguage(lang: string) { targetLanguages.push(lang) },
         _targetLanguages: targetLanguages,
       }
     }
   }
   ```
4. Export `TranslationRecognizer: FakeTranslationRecognizer` from `fakeSdk`
5. Keep `SpeechRecognizer: FakeSpeechRecognizer` for backward compat (DualAzureSession tests may use it)

Also add `MOCK_TRANSLATIONS` to `apps/api/src/__tests__/fixtures/translations.ts` (a small map of short lang code → mock text, e.g. `{ zh: '你好', sm: 'Talofa', mi: 'Kia ora' }`).

---

### WP5: Update `AzureSession.test.ts`

**File:** `apps/api/src/__tests__/AzureSession.test.ts`

**Changes:**

1. Replace `SpeechConfig` mock with `SpeechTranslationConfig` mock (with `addTargetLanguage` spy)
2. Replace `SpeechRecognizer` mock with `TranslationRecognizer` mock
3. Update `ResultReason` to include `TranslatingSpeech: 3, TranslatedSpeech: 4`
4. Update session construction: `new AzureSession({ ..., languages: ['en-NZ', 'zh-TW'] })`
5. Add test: `updateLanguages` restarts session when new language added
6. Add test: `updateLanguages` does NOT restart when no new languages
7. Update existing segment emission tests to expect multi-language segments

---

### WP6: Fix `useCaptions.ts` (backfill — still needed)

**File:** `apps/web/src/hooks/useCaptions.ts`

Even with inline TranslationRecognizer, historical segments (before a viewer selected a language) only exist for languages that were demanded at the time. The polling backfill is still required.

| Line | Current | New |
|------|---------|-----|
| 23 | `isConfiguredLanguage = true,` | _(delete)_ |
| 32 | `const isConfiguredRef = useRef(isConfiguredLanguage)` | _(delete)_ |
| 33 | `isConfiguredRef.current = isConfiguredLanguage` | _(delete)_ |
| 54 | `isTranslating: s.isFinal && !isConfiguredRef.current && !hasTranslation,` | `isTranslating: s.isFinal && !hasTranslation,` |
| 119 | `if (isConfiguredLanguage \|\| !eventCode \|\| !locale) return` | `if (!eventCode \|\| !locale) return` |
| 167 | `}, [eventCode, locale, isConfiguredLanguage, extractSegments])` | `}, [eventCode, locale, extractSegments])` |

---

### WP7: Update `EventPage.tsx`

**File:** `apps/web/src/pages/EventPage.tsx`

- Delete line 68: `const isConfiguredLanguage = event?.languages.includes(selectedLocale) ?? true`
- Remove `isConfiguredLanguage` arg from `useCaptions` call (lines 70–74)

---

### WP8: Update `useCaptions.test.ts`

**File:** `apps/web/src/__tests__/useCaptions.test.ts`

- Remove `, true` from all 5 `renderHook(() => useCaptions('ABC123', 'en', true))` calls

---

## Execution Order

```
WP1 → WP2 → WP3 → WP4 → WP5 → WP6 → WP7 → WP8 → verify
```

WP2 depends on WP1 (needs `updateLanguages` method). WP3 depends on WP2 (calls `EventManager.updateLanguages`). WP4 (stub) must exist before WP5 (tests import it). WP6/7/8 are independent of WP1–5.

---

## Verification

```bash
pnpm --filter api tsc --noEmit
pnpm --filter web tsc --noEmit
pnpm --filter api test
pnpm --filter web test
pnpm --filter api build
pnpm --filter web build
```

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| `TranslationRecognizer` with 0 target languages throws at SDK level | Medium | `buildSegments` handles empty translations; test with empty language list in WP5 |
| Session restart on new language demand causes ~1-2s audio gap | Low | Edge case: only fires on first new-language subscriber; acceptable UX trade-off |
| Te reo (`mi-NZ`) via `OpenAiSttSession` has no translation — needs `translateText` post-final | High | WP3 keeps the `translateText` block but gates it on `sourceLang === 'mi-NZ'` only |
| `audio:subscribe` also demands translation targets — currently not triggering `updateLanguages` | Medium | WP3 adds the same language-update pattern to `audio:subscribe` handler |
| `DualAzureSession` not updated with `languages` | None | Dual mode is untested and out of scope for this plan |

---

## What This Does NOT Fix

Interim segments will show source-language text for the first ~150ms of a new sentence (before the first `recognizing` event fires with translations). This is inherent to how TranslationRecognizer works — it needs a few frames of audio before it can produce interim translations. After that first event, translations update in real-time.
