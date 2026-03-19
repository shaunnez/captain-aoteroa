# Testing Strategy for Caption Aotearoa

## Context

The app has no E2E tests and limited unit tests. The critical flow — organiser speaks → Azure transcribes → captions broadcast via Socket.io → audience sees translations — touches Azure APIs that cost money per call. We need comprehensive test coverage that exercises the full pipeline without racking up Azure bills.

## Strategy: 4 Test Tiers

| Tier | Tool | Azure Cost | Runs When |
|------|------|-----------|-----------|
| Unit tests | vitest (existing) | $0 | Every commit / CI |
| Integration tests | vitest + socket.io-client | $0 | Every commit / CI |
| E2E tests | Playwright (multi-browser) | $0 (mocked) | CI on PR |
| Smoke test | Playwright + real Azure | ~$0.02/run | Manual pre-release |

---

## Phase 1: Azure Mock Infrastructure

**The key cost-saving trick:** Mock at the Azure SDK boundary only. Everything else (Socket.io routing, EventManager, room broadcast, DB persistence) runs for real.

### 1a. Create fake recognizer stub

**New file:** `apps/api/src/services/__mocks__/azureSpeechStub.ts`

A `FakeTranslationRecognizer` class that:
- Implements the same interface as Azure's `TranslationRecognizer`
- When `pushStream.write()` receives audio bytes, fires `recognized` callback after a short delay with deterministic text: `"This is a test caption"`
- Returns known translations based on configured target languages (from a fixture map)
- Supports `startContinuousRecognitionAsync` / `stopContinuousRecognitionAsync`

### 1b. Add mock toggle to AzureSession

**Modify:** `apps/api/src/services/AzureSession.ts`

Add at the top:
```ts
const useMock = process.env.AZURE_MOCK === 'true'
```

In `createRecognizer()`, swap `sdk` for the fake:
```ts
const effectiveSdk = useMock
  ? require('./__mocks__/azureSpeechStub').fakeSdk
  : sdk
```

Then replace all `sdk.` references in `createRecognizer()` with `effectiveSdk.`. This is the single injection point — all other code runs unchanged.

### 1c. Translation fixture map

**New file:** `apps/api/src/__tests__/fixtures/translations.ts`

Deterministic translation map used by both unit tests and the mock recognizer:
```ts
export const MOCK_TRANSLATIONS: Record<string, string> = {
  'en': 'This is a test caption',
  'mi': 'He whakamatautau tenei',
  'ja': 'テストキャプション',
  'sm': "O se fa'ata'ita'iga fa'amatalaga",
  'to': 'Ko e fakamatala sivi',
}

export const MOCK_SOURCE_TEXT = 'This is a test caption'
```

---

## Phase 2: Expand Unit Tests (vitest, $0 cost)

### API unit tests

| File | What it tests |
|------|--------------|
| `AzureSession.test.ts` (expand) | `recognizing`/`recognized` callbacks produce correct `CaptionSegmentPayload` shape; `canceled` triggers `onError` |
| `DualAzureSession.test.ts` (new) | Creates 2 sessions (en-NZ + mi-NZ); `pushChunk` forwards to both; `stop` stops both |
| `translate.test.ts` (new) | Mock `global.fetch` + Supabase; test batch translation, caching, error handling |
| `SocketHandler.test.ts` (new) | Use `socket.io-client` in Node (no browser); test auth rejection, room join/leave, `caption:history` on join, `audio:chunk` routing |

### Web unit tests

| File | What it tests |
|------|--------------|
| `CaptionDisplay.test.tsx` (new) | Renders segments, accessibility attrs (`role="log"`, `aria-live`), final vs interim styling |
| `useCaptions.test.ts` (new) | Mock socket; simulate `caption:segment` events; assert state updates, locale switching, on-demand polling |

---

## Phase 3: Integration Tests (vitest, $0 cost)

**New file:** `apps/api/src/__tests__/integration/socket-room.test.ts`

Full room broadcast test with `AZURE_MOCK=true`:
1. Start real Express+Socket.io server (in test)
2. Connect organiser socket (with JWT) + audience socket
3. Organiser emits `session:start` → `audio:chunk` (fake PCM bytes)
4. Mock Azure fires back deterministic caption
5. Assert audience socket receives `caption:segment` with correct payload
6. Assert late-joiner receives `caption:history`

This exercises: SocketHandler → EventManager → AzureSession (mocked) → room broadcast → all real code except Azure SDK.

---

## Phase 4: Playwright E2E Tests ($0 with mock)

### 4a. Setup

- Install `@playwright/test` at repo root
- Create `playwright.config.ts` with `webServer` entries for both API (with `AZURE_MOCK=true`) and Vite dev server
- Generate test audio fixture: `e2e/fixtures/test-audio.wav` (2s silence, 16kHz mono PCM via ffmpeg or Node script)

### 4b. Fake microphone via Chromium flags

```ts
// playwright.config.ts
use: {
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',       // auto-grant mic permission
      '--use-fake-device-for-media-stream',    // use fake device
      '--use-file-audio-capture=e2e/fixtures/test-audio.wav',  // inject WAV as mic
    ],
  },
}
```

This means the real `getUserMedia` → AudioWorklet → socket pipeline runs with fake audio. No browser speech synthesis needed.

### 4c. E2E scenarios

**File:** `e2e/captioning-flow.spec.ts`

**Test 1: Full flow — create event, join, see captions**
- Browser 1 (organiser): login → create event → get code → go to `/present/:code` → start mic
- Browser 2 (audience): go to `/event/:code` → wait for captions
- Assert audience sees `"This is a test caption"` (from mock Azure)
- Assert audience can switch language → sees `"He whakamatautau tenei"`

**Test 2: Multiple audience members**
- 3 browser contexts join same event
- Assert all 3 see identical captions

**Test 3: Late joiner gets history**
- Organiser sends several segments
- New audience member joins
- Assert they immediately see history

**Test 4: On-demand translation polling**
- Event configured with only en-NZ
- Audience selects Japanese
- Mock `/api/translate` returns known Japanese text
- Assert Japanese captions appear after poll interval

### 4d. Smoke test with real Azure (manual, ~$0.02/run)

**File:** `e2e/smoke-real-azure.spec.ts`

- Guarded by `test.skip(!process.env.AZURE_LIVE, 'needs AZURE_LIVE=true')`
- Uses a 3-second WAV recording of "Testing one two three"
- Fuzzy assertion: transcription contains "testing" (not exact match)
- Run manually: `AZURE_LIVE=true pnpm test:e2e:smoke`

---

## Phase 5: Package scripts & CI

```jsonc
// root package.json
"scripts": {
  "test": "pnpm --filter api test && pnpm --filter web test",
  "test:api": "pnpm --filter api test",
  "test:web": "pnpm --filter web test",
  "test:e2e": "AZURE_MOCK=true npx playwright test",
  "test:e2e:smoke": "AZURE_LIVE=true npx playwright test e2e/smoke-real-azure.spec.ts",
  "test:all": "pnpm test && pnpm test:e2e"
}
```

---

## New file structure

```
e2e/
  fixtures/
    test-audio.wav                         # 2s silence, 16kHz mono
    translations.ts                        # shared mock translation map
  captioning-flow.spec.ts                  # multi-browser E2E
  translation-polling.spec.ts              # on-demand translation E2E
  smoke-real-azure.spec.ts                 # real Azure, manual only
playwright.config.ts
apps/api/src/
  services/__mocks__/azureSpeechStub.ts    # fake TranslationRecognizer
  __tests__/
    DualAzureSession.test.ts               # new
    translate.test.ts                       # new
    SocketHandler.test.ts                   # new
    integration/socket-room.test.ts         # new
    fixtures/translations.ts               # new
apps/web/
  vitest.config.ts                         # new (jsdom environment)
  src/__tests__/
    CaptionDisplay.test.tsx                # new
    useCaptions.test.ts                    # new
```

## Files to modify

- `apps/api/src/services/AzureSession.ts` — add `AZURE_MOCK` conditional in `createRecognizer()`
- `apps/api/src/__tests__/AzureSession.test.ts` — expand with callback assertions
- `package.json` (root) — add test scripts
- `apps/web/package.json` — ensure vitest config for jsdom

## Verification

1. `pnpm test` — all unit + integration tests pass
2. `pnpm test:e2e` — Playwright scenarios pass with mocked Azure
3. Manual: `AZURE_LIVE=true pnpm test:e2e:smoke` — real Azure transcription works
4. CI: `pnpm test:all` runs on every PR

## Implementation order

1. Mock infrastructure (Phase 1) — foundation everything else depends on
2. Unit tests (Phase 2) — quick wins, find bugs early
3. Integration tests (Phase 3) — test socket flow end-to-end
4. Playwright E2E (Phase 4) — the multi-browser scenarios
5. Scripts & CI (Phase 5) — wire it all together
