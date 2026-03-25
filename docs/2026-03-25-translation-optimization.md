# Translation Optimization: Demand-Filtered Translation

**Date:** 2026-03-25
**Branch:** `claude/optimize-transcript-storage-u1PRj`
**Status:** Implemented

## Problem

The original architecture used Azure's `TranslationRecognizer` which translated every spoken segment to all 36 NZ census languages inline during speech recognition. This cost ~$12.70/hr in Azure Translation fees and generated 36 DB rows per segment.

## Two-Phase Optimization

### Phase 1: Source-Only Recognition (commit `e0e512e`)

Switched from `TranslationRecognizer` ($12.70/hr) to `SpeechRecognizer` ($1/hr). Azure now produces source-language text only. Translation moved to a separate `translateText()` call in `SocketHandler` using the Azure Translator Text API.

**Savings:** ~85% reduction in Azure Speech costs.

### Phase 2: Demand-Filtered Translation (commit `abb4490`)

Instead of translating every segment to all 35 non-source languages, translations are now filtered to only languages with active viewers.

**Before:** Every final segment → `translateText(text, source, [35 languages])` → 35 DB rows
**After:** Every final segment → `translateText(text, source, [demanded languages])` → N DB rows (where N = active viewer languages)

For a typical event with 3 languages being viewed, this reduces translation targets from 35 to 2 (source excluded), API batches from 2 to 1, and DB rows from 35 to 2.

## How It Works

### Viewer Language Tracking

```
Audience browser
  → selects language in LanguagePickerModal
  → EventPage.tsx useEffect emits caption:subscribe { code, language }
  → SocketHandler registers in CaptionSubscriptionManager
  → On language change: unsubscribes old, subscribes new
  → On disconnect: disconnectAll cleans up
```

Two subscription managers track viewer demand:

| Manager | Tracks | Populated by |
|---------|--------|-------------|
| `CaptionSubscriptionManager` | Text caption language viewers | `caption:subscribe` / `caption:unsubscribe` |
| `AudioSubscriptionManager` | TTS audio listeners | `audio:subscribe` / `audio:unsubscribe` |

### Translation Target Selection

In `SocketHandler.ts`, when a final segment arrives:

```typescript
const captionLangs = captionSubs.getLanguages(code)        // text viewers
const audioLangs = new Set(audioSubs.getSubscribers(code).keys())  // audio listeners
const demandedLangs = new Set([...captionLangs, ...audioLangs])
demandedLangs.add('en')  // always include English as fallback
const targetLangs = [...demandedLangs].filter(c => c !== sourceShort && c !== sourceLang)
```

### Why English Is Always Included

- `EventPage.tsx` defaults `selectedLocale` to `'en'` (line 28)
- `useCaptions.ts` fallback chain: `segments[locale] → en-NZ → en → ''`
- New viewers see caption history which needs English rows in the DB
- English is the common language for most NZ events

## Files Changed

| File | Role |
|------|------|
| `packages/shared/src/types.ts` | `caption:subscribe` / `caption:unsubscribe` in `ClientToServerEvents` |
| `apps/api/src/services/CaptionSubscriptionManager.ts` | Tracks text caption language subscriptions per event |
| `apps/api/src/services/SocketHandler.ts` | Wires `captionSubs`, filters `targetLangs` to demanded languages |
| `apps/web/src/pages/EventPage.tsx` | Emits `caption:subscribe`/`caption:unsubscribe` on locale change |

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| No viewers connected | Translates to English only |
| Viewer joins after segment translated | Gets English fallback from history; future segments include their language |
| Viewer switches language | Old unsubscribed, new subscribed; next segment reflects the change |
| Source is te reo (`mi`) | Excluded from targets; English always included; OpenAI TTS routing unchanged |
| Audio subscriber only | Included via `audioLangs` — they need text for display too |

## JSONB Consolidation (Attempted and Reverted)

A JSONB consolidation approach was attempted (commit `4583752`) — storing all language variants in a single JSONB column per sequence instead of one row per language. This was reverted (commit `8969bc5`) because:

1. The read-modify-write pattern for merging translations into the JSONB column created race conditions
2. Row-per-language with `INSERT` is append-only and inherently safe
3. The real optimization was reducing *which* languages get translated, not *how* they're stored

Row-per-language remains the settled design per `CLAUDE.md` Hard Rule #2.

## Observability

Server logs show translation targets per segment:
```
[SocketHandler] translating seq=42 to 2 languages: [en,sm]
```

## Cost Impact

| Metric | Before (Phase 1) | After (Phase 2) | Reduction |
|--------|-------------------|------------------|-----------|
| Azure Translator calls per segment | 2 batches (35 langs) | 1 batch (2-5 langs) | ~85% |
| DB rows per segment | 35 | 2-5 | ~90% |
| Socket payload size | 36 language keys | N language keys | Variable |
