# Translate Te Reo STT Segments to Other Languages

## Context

When the presenter speaks te reo Maori, `OpenAiSttSession` (or `PapaReoSession`) produces segments with only `{ 'mi': text }`. Audience members viewing English, Chinese, Samoan, etc. see blank captions because there's no translation. Azure sessions (English presenter) don't have this problem — Azure `TranslationRecognizer` produces all language translations in one result.

**Goal**: After a final te reo STT segment arrives, call Azure Translator REST API to fill in translations for all other event languages, then broadcast the enriched segment.

## Architecture

```
Te reo presenter speaks
  → OpenAI STT produces final segment: { 'mi': 'kia ora' }
  → SocketHandler emits segment immediately (te reo audience sees it instantly)
  → SocketHandler calls Azure Translator: mi → en, sm, zh-Hans, ...
  → SocketHandler emits updated segment: { 'mi': 'kia ora', 'en': 'hello', ... }
  → Client overwrites segment by sequence number (all audiences now see translation)
  → Persist all language rows to DB
```

Latency: ~100-300ms for the Azure Translator call. Te reo audience sees captions immediately; other languages see them after a brief delay.

## Steps

### 1. Extract Azure Translator helper function
- **File**: `apps/api/src/services/SocketHandler.ts`
- Extract the Q&A translation code (lines 249-274) into a reusable helper:
  ```ts
  async function translateText(
    text: string,
    fromLang: string,
    toLangs: string[],
  ): Promise<Record<string, string>>
  ```
- Calls `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0`
- Uses existing `config.azure.speechKey` / `config.azure.speechRegion`
- Returns `{ 'en': '...', 'sm': '...', ... }`
- Refactor Q&A translation to use the same helper

### 2. Add translation to te reo STT segments in onSegment callback
- **File**: `apps/api/src/services/SocketHandler.ts`
- In the `onSegment` callback (line 146), after emitting the initial segment:
  ```
  if (payload.isFinal && isMaoriOnly(payload.segments)):
    1. Emit segment immediately (already done — te reo viewers see it)
    2. Compute target languages: all NZ_LANGUAGES codes except 'mi'
    3. Call translateText(text, 'mi', targetLangs)
    4. Merge translations into payload.segments
    5. Emit updated caption:segment with same sequence (client overwrites)
  ```
- This is fire-and-forget async — doesn't block the main emit or TTS dispatch

### 3. Persist translated segments to DB
- **File**: `apps/api/src/services/SocketHandler.ts` (or `OpenAiSttSession.ts`)
- Currently only `'mi'` is persisted by `OpenAiSttSession`
- After translation completes, insert additional `caption_segments` rows for each translated language
- Uses existing supabase client; same pattern as `AzureSession.emitSegments`
- Need eventId — available from the session's DB lookup. Pass it through or look it up in SocketHandler.

### 4. Helper to detect te reo-only segments
- Simple check: `Object.keys(payload.segments).length === 1 && 'mi' in payload.segments`
- OR check if the segment came from a Maori STT session (but checking payload is simpler)

## Files to modify

| File | Change |
|------|--------|
| `apps/api/src/services/SocketHandler.ts` | Extract `translateText()` helper; add te reo translation in `onSegment`; refactor Q&A to reuse helper |

## Key details

- **Azure Translator limit**: ~25 target languages per request. With 36 targets (37 NZ_LANGUAGES minus `mi`), split into 2 batches.
- **Existing pattern**: Q&A translation in SocketHandler (lines 249-274) already calls the same API with the same credentials.
- **No new dependencies**: Uses existing `config.azure.speechKey` and `config.azure.speechRegion`.
- **No client changes needed**: Client `useCaptions` already stores segments by sequence number — emitting an updated segment with translations will overwrite the te reo-only version.

## Verification
1. Start API with `OPENAI_API_KEY` set
2. On presenter page, select te reo Maori and begin speaking
3. On audience page, select English — should see English translation of te reo speech appear ~100-300ms after the te reo text
4. Switch to other languages (Samoan, Chinese, etc.) — should also see translations
5. Reload audience page — caption history should include translated versions
6. Verify English presenter mode still works unchanged
7. Check console for translation errors
