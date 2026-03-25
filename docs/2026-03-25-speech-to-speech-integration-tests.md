# Engineering Spec: Speech-to-Speech Integration Tests

**Date:** 2026-03-25
**Status:** Draft

---

## Constraints This Spec Must Respect

All verified by reading actual code:

| Constraint | Source |
|---|---|
| Azure STT expects PCM 16kHz 16-bit mono via `PushAudioInputStream` | `AzureSession.ts:93` — `AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)` |
| OpenAI STT resamples 16kHz → 24kHz internally before sending | `OpenAiSttSession.ts:203` — `resample16to24(chunk)` |
| `mi-NZ` source routes to `OpenAiSttSession` (if `config.openaiApiKey` set) or `PapaReoSession` | `EventManager.ts:51` |
| All other locales route to `AzureSession` | `EventManager.ts:51` |
| Azure Translator input: short code (e.g. `'en'`, `'mi'`), not BCP-47 | `translateText.ts:10` — `fromLang: string` |
| `translateText` strips BCP-47 prefix before calling Translator | `SocketHandler.ts:183` — `sourceLang.split('-')[0]` |
| Target languages: all NZ_LANGUAGES codes except source | `SocketHandler.ts:183` |
| Azure TTS: `VOICE_MAP` does NOT include `mi` or `sm` — `synthesize('...', 'mi')` returns `null` | `TtsService.ts:6-7` |
| Azure TTS output: MP3 16kHz 32kbps mono | `TtsService.ts:66-67` — `Audio16Khz32KBitRateMonoMp3` |
| OpenAI TTS input: short code `'mi'`, voice `coral`, model `gpt-4o-mini-tts`, format `pcm` | `OpenAiTtsService.ts:22-29` |
| OpenAI TTS output: raw PCM 24kHz 16-bit LE mono (no WAV header) | `OpenAiTtsService.ts:17` comment |
| TTS routing: `lang === 'mi' && openAiTts != null` → OpenAI stream; else Azure | `SocketHandler.ts:201` |
| `audio:tts` payload: `{ language, sequence, data: ArrayBuffer }` (MP3) | `types.ts:65` |
| `audio:tts-stream` payload: `{ language, sequence, chunk: ArrayBuffer, done: boolean }` (PCM) | `types.ts:66` |
| Source segment `language` stored as BCP-47 (`en-NZ`); translated segments as short code (`en`, `mi`) | `AzureSession.ts:168` vs `SocketHandler.ts:249` |

---

## Objective

Create integration tests covering all 6 speech-to-speech pipeline combinations: English→English, English→Te Reo, English→French, Te Reo→Te Reo, Te Reo→English, Te Reo→French. Tests feed pre-recorded WAV audio into the STT services, validate recognized text, validate translated text, and validate TTS audio output format and size.

These tests are **service-level integration tests** — they bypass Socket.IO and the SocketHandler wiring and call the service layer directly. This avoids Socket.IO test complexity while covering the actual speech-processing code.

---

## Acceptance Criteria

| AC | Description | Verify Command | Expected | Tolerance | Automated |
|----|-------------|----------------|----------|-----------|-----------|
| AC1 | Fixture WAVs exist and are correct format | `node -e "const b=require('fs').readFileSync('apps/api/src/__tests__/fixtures/audio/en-hello.wav'); console.log(b.slice(0,4).toString('ascii'), b.readUInt32LE(24))"` | `RIFF 16000` | exact | yes |
| AC2 | en-NZ STT recognizes English phrase | `pnpm --filter api test:integration -- --grep "en-NZ STT"` | test passes, recognized text fuzzy-matches input | ≤20% edit distance | yes |
| AC3 | mi-NZ STT recognizes te reo phrase | `pnpm --filter api test:integration -- --grep "mi-NZ STT"` | test passes, recognized text fuzzy-matches input | ≤30% edit distance (higher tolerance for te reo) | yes |
| AC4 | `translateText` returns non-empty strings for en→mi and en→fr | `pnpm --filter api test:integration -- --grep "translate en"` | test passes | — | yes |
| AC5 | `translateText` returns non-empty strings for mi→en and mi→fr | `pnpm --filter api test:integration -- --grep "translate mi"` | test passes | — | yes |
| AC6 | Azure TTS produces valid MP3 for `en` and `fr` | `pnpm --filter api test:integration -- --grep "TTS azure"` | test passes, Buffer ≥ 1 KB, starts with MP3 magic bytes | — | yes |
| AC7 | OpenAI TTS produces valid PCM stream for `mi` | `pnpm --filter api test:integration -- --grep "TTS openai"` | test passes, ≥1 chunk received, total bytes ≥ 1 KB | — | yes |
| AC8 | Pipeline: en source → en output (MP3) | `pnpm --filter api test:integration -- --grep "pipeline en→en"` | STT recognized + TTS MP3 valid | — | yes |
| AC9 | Pipeline: en source → mi output (PCM) | `pnpm --filter api test:integration -- --grep "pipeline en→mi"` | STT recognized + translation non-empty + TTS PCM valid | — | yes |
| AC10 | Pipeline: en source → fr output (MP3) | `pnpm --filter api test:integration -- --grep "pipeline en→fr"` | STT recognized + translation non-empty + TTS MP3 valid | — | yes |
| AC11 | Pipeline: mi source → mi output (PCM) | `pnpm --filter api test:integration -- --grep "pipeline mi→mi"` | STT recognized + TTS PCM valid | — | yes |
| AC12 | Pipeline: mi source → en output (MP3) | `pnpm --filter api test:integration -- --grep "pipeline mi→en"` | STT recognized + translation non-empty + TTS MP3 valid | — | yes |
| AC13 | Pipeline: mi source → fr output (MP3) | `pnpm --filter api test:integration -- --grep "pipeline mi→fr"` | STT recognized + translation non-empty + TTS MP3 valid | — | yes |
| AC14 | All integration tests skip cleanly if API keys absent | `AZURE_SPEECH_KEY="" pnpm --filter api test:integration` | tests report skipped, exit 0 | — | yes |

---

## Architecture

### Current State
No integration tests exist. All tests use mocks. `OpenAiTtsService` has zero test coverage. The STT → translate → TTS chain is untested end-to-end.

### New Flow
```
┌─────────────────────────────────────────────────────────────────────┐
│  Test                                                                │
│  1. Read fixture WAV → strip 44-byte header → PCM buffer            │
│  2. Create STT session (AzureSession | OpenAiSttSession)            │
│  3. Call session.start(), feed PCM via pushChunk(chunk)             │
│  4. Collect final segment via onSegment callback                    │
│  5. Call translateText(sourceText, sourceShort, [targetLang])       │
│  6. Call TtsService.synthesize OR OpenAiTtsService.synthesizeStream │
│  7. Assert: recognized text fuzzy-matches, audio format valid       │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**1. Bypass Socket.IO, test services directly.**
SocketHandler is hard to integration-test (Socket.IO + auth + room management). The services are independently instantiable. Testing at the service layer covers all the real code (Azure SDK, OpenAI API, HTTP Translator) without the Socket.IO overhead.

**2. Pre-generated WAV fixtures committed to repo.**
Tests must be deterministic and runnable without a live speaker. A one-time generation script (`generate-audio.ts`) uses OpenAI TTS to synthesize the phrases into 16kHz 16-bit mono WAVs and saves them as committed fixtures. Regenerate only if phrases change.

**3. Env-var gating with `test.skipIf`.**
Integration tests require real API keys. Use `test.skipIf(!process.env.AZURE_SPEECH_KEY)(...)` pattern. CI can omit keys to skip; local dev with keys runs the full suite. Tests exit 0 when skipped.

**4. Separate test script in package.json.**
`"test:integration"` runs only `*.integration.test.ts` files. Existing `"test"` script stays unchanged and never picks up integration tests (avoids API calls in normal test runs).

**5. Timeout: 30 seconds per test.**
STT sessions require a silence timeout to flush the final segment (~500ms). Azure TTS is synchronous. OpenAI streaming takes ~2-5 seconds. 30s is safe.

**6. Fuzzy text matching via normalized edit distance.**
STT output varies slightly per run (punctuation, capitalisation). Normalize both strings (lowercase, remove punctuation, trim) and compute Levenshtein distance as a fraction of reference length. Threshold: 20% for English, 30% for te reo.

---

## Interface Contracts

### Fixture WAV format
```
Format: RIFF WAV
Encoding: PCM (format code 0x0001)
Sample rate: 16000 Hz
Bit depth: 16-bit
Channels: 1 (mono)
Header: 44 bytes standard
```

### WAV header strip utility
```typescript
// apps/api/src/__tests__/integration/helpers.ts
export function stripWavHeader(wav: Buffer): Buffer {
  // Standard WAV header is 44 bytes; validate RIFF magic before stripping
  if (wav.slice(0, 4).toString('ascii') !== 'RIFF') {
    throw new Error('Not a WAV file')
  }
  return wav.slice(44)
}
```

### Fuzzy match utility
```typescript
export function fuzzyMatch(actual: string, reference: string, threshold = 0.2): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim()
  const a = normalize(actual)
  const r = normalize(reference)
  const dist = levenshtein(a, r)
  return dist / r.length <= threshold
}
```

### Audio validation utilities
```typescript
export function isValidMp3(buf: Buffer): boolean {
  if (buf.byteLength < 1000) return false
  // MP3 magic: ID3 tag (0x49443300) or sync frame (0xFFE0 | 0xFFFA | 0xFFFB)
  return (
    (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || // ID3
    (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)              // sync frame
  )
}

export function isValidPcmStream(chunks: Buffer[]): boolean {
  const totalBytes = chunks.reduce((n, c) => n + c.byteLength, 0)
  return chunks.length > 0 && totalBytes >= 1000
}
```

### STT result collector
```typescript
export async function collectSegment(
  session: { start(): Promise<void>; pushChunk(b: Buffer): void; stop(): Promise<void> },
  pcm: Buffer,
  timeoutMs = 5000,
): Promise<string> {
  // Returns the text from the first final segment
}
```

### AzureSession constructor (actual, `AzureSession.ts:20-35`)
```typescript
constructor(
  eventCode: string,
  options: {
    speakerLocale?: string
    onSegment: (payload: CaptionSegmentPayload) => void
    onError: (err: Error, fatal: boolean) => void
  }
)
```

### OpenAiSttSession constructor (actual, `OpenAiSttSession.ts`)
```typescript
constructor(
  eventCode: string,
  options: {
    onSegment: (payload: CaptionSegmentPayload) => void
    onError: (err: Error, fatal: boolean) => void
  }
)
```

### translateText (actual, `translateText.ts:10`)
```typescript
export async function translateText(
  text: string,
  fromLang: string,
  toLangs: string[],
): Promise<Record<string, string>>
```

### TtsService.synthesize (actual, `TtsService.ts:57`)
```typescript
async synthesize(text: string, language: string): Promise<Buffer | null>
```

### OpenAiTtsService.synthesizeStream (actual, `OpenAiTtsService.ts:19`)
```typescript
async synthesizeStream(text: string, onChunk: (chunk: Buffer) => void): Promise<void>
```

---

## Work Packages

### WP1 — Fixture generator script

**Files:** `apps/api/src/__tests__/fixtures/generate-audio.ts` (new), `apps/api/src/__tests__/fixtures/audio/` (new dir, .wav files committed)

**Purpose:** One-time script. Generates `en-hello.wav` and `mi-kia-ora.wav` at 16kHz/16-bit/mono using OpenAI TTS, then saves as standard WAV. Run manually; output committed to repo.

**Changes:**

| File | Change |
|---|---|
| `apps/api/src/__tests__/fixtures/generate-audio.ts` | New script: calls `OpenAI.audio.speech.create` with `response_format: 'wav'`, writes to `audio/en-hello.wav` and `audio/mi-kia-ora.wav` |
| `apps/api/src/__tests__/fixtures/audio/.gitkeep` | Ensures dir is tracked |

**Phrases:**
- `en-hello.wav`: `"Hello, welcome to the event."`
- `mi-kia-ora.wav`: `"Kia ora, nau mai ki tēnei hui."`

**Builder instructions:**
- Import OpenAI from `'openai'` (already a dep at `apps/api`)
- Use `response_format: 'wav'` so the file already has the WAV header with correct format info — but verify it's 16kHz/16-bit/mono after generation
- If OpenAI returns 24kHz PCM WAV, use `ffmpeg` or a node resampling library to downsample to 16kHz before writing
- Add `"generate-audio": "tsx src/__tests__/fixtures/generate-audio.ts"` to `apps/api/package.json` scripts
- Script should be idempotent (skip if files already exist unless `--force` flag)

**Model:** Sonnet

---

### WP2 — Test utilities

**Files:** `apps/api/src/__tests__/integration/helpers.ts` (new)

**Purpose:** Shared utilities for all integration tests.

**Changes:**

| File | Change |
|---|---|
| `apps/api/src/__tests__/integration/helpers.ts` | New file: `stripWavHeader`, `fuzzyMatch`, `isValidMp3`, `isValidPcmStream`, `collectSegment`, `levenshtein` |

**Builder instructions:**
- `levenshtein(a, b)` — standard dynamic-programming implementation, O(m×n)
- `collectSegment` wraps the session in a Promise: resolves on the first `isFinal === true` segment, rejects after `timeoutMs`
- All exports are pure functions except `collectSegment`
- No external imports beyond Node `path` and `fs`

**Model:** Sonnet

---

### WP3 — Vitest integration config

**Files:** `apps/api/package.json`, `apps/api/vitest.integration.config.ts` (new)

**Purpose:** Separate vitest config and npm script for integration tests only.

**Changes:**

| File | Change |
|---|---|
| `apps/api/vitest.integration.config.ts` | New: `include: ['src/__tests__/integration/**/*.integration.test.ts']`, `testTimeout: 30000`, same env injection as `vitest.config.ts` |
| `apps/api/package.json` | Add `"test:integration": "vitest run --config vitest.integration.config.ts"` to scripts |

**Builder instructions:**
- Copy `vitest.config.ts` as starting point, change `include` pattern, increase `testTimeout` to `30000`
- Read `apps/api/vitest.config.ts` first to match env variable injection exactly

**Model:** Sonnet

---

### WP4 — STT layer integration tests

**Files:** `apps/api/src/__tests__/integration/stt.integration.test.ts` (new)

**Purpose:** Validate AzureSession and OpenAiSttSession can recognize speech from WAV fixtures.

**Test cases:**
1. `en-NZ STT: recognizes English phrase from fixture WAV`
   - Create `AzureSession` with `speakerLocale: 'en-NZ'`
   - Feed PCM from `en-hello.wav`
   - Assert fuzzy match against `"Hello welcome to the event"` (≤20%)
2. `mi-NZ STT: recognizes te reo phrase from fixture WAV`
   - Create `OpenAiSttSession`
   - Feed PCM from `mi-kia-ora.wav`
   - Assert fuzzy match against `"Kia ora nau mai ki tēnei hui"` (≤30%)

**Skip condition:** `test.skipIf(!process.env.AZURE_SPEECH_KEY)` for test 1, `test.skipIf(!process.env.OPENAI_API_KEY)` for test 2.

**Builder instructions:**
- Import `AzureSession` from `'../services/AzureSession'` — check actual path relative to integration dir
- `AzureSession` constructor needs `eventCode: string` and `options` — use a fake eventCode like `'test-event-stt'`; the `supabase` write for segments will fail silently (or mock supabase with `vi.mock`)
- Mock `supabase` to prevent real DB writes: `vi.mock('../../services/supabase', () => ({ supabase: { from: () => ({ insert: vi.fn().mockResolvedValue({}) }) } }))`
- Feed PCM in 4096-byte chunks (matches realistic streaming), not one giant write
- After feeding all chunks, call `session.stop()` and wait for `collectSegment` to resolve

**Model:** Opus (real Azure SDK, multi-service)

---

### WP5 — Translation layer integration tests

**Files:** `apps/api/src/__tests__/integration/translate.integration.test.ts` (new)

**Purpose:** Validate `translateText` returns non-empty translations for the 4 translation directions needed.

**Test cases:**
1. `translate en→mi: returns non-empty te reo string`
2. `translate en→fr: returns non-empty French string`
3. `translate mi→en: returns non-empty English string`
4. `translate mi→fr: returns non-empty French string`

**Input phrases (fixed, not from STT):**
- English: `"Hello, welcome to the event."`
- Te reo: `"Kia ora, nau mai ki tēnei hui."`

**Skip condition:** `test.skipIf(!process.env.AZURE_SPEECH_KEY)` (Translator uses same key as Speech)

**Validation:** `result[langCode]` is a non-empty string; optional character-set checks (e.g., fr result contains at least one accent or space)

**Builder instructions:**
- Import `translateText` from `'../../services/translateText'` (check actual relative path)
- Import `config` from `'../../config'` — already injected via vitest env vars
- Don't mock anything; call the real function
- Log actual translations in test output with `console.log` so failures are debuggable

**Model:** Sonnet

---

### WP6 — TTS layer integration tests

**Files:** `apps/api/src/__tests__/integration/tts.integration.test.ts` (new)

**Purpose:** Validate TtsService and OpenAiTtsService produce valid audio output.

**Test cases:**
1. `TTS azure: en — produces valid MP3 Buffer`
2. `TTS azure: fr — produces valid MP3 Buffer`
3. `TTS openai: mi — produces valid PCM stream`

**Builder instructions:**
- Import `TtsService` from `'../../services/TtsService'`
- Import `OpenAiTtsService` from `'../../services/OpenAiTtsService'`
- For Azure TTS: `tts.synthesize("Hello, welcome to the event.", 'en')` → assert `isValidMp3(result)`
- For OpenAI TTS: collect chunks from `synthesizeStream("Kia ora", onChunk)` → assert `isValidPcmStream(chunks)`
- Skip conditions: `AZURE_SPEECH_KEY` for Azure tests, `OPENAI_API_KEY` for OpenAI test
- Don't mock the Azure SDK or OpenAI client — these are integration tests

**Model:** Sonnet

---

### WP7 — Pipeline integration tests (all 6 combos)

**Files:** `apps/api/src/__tests__/integration/pipeline.integration.test.ts` (new)

**Purpose:** End-to-end: WAV → STT → translate → TTS → validate.

**Helper function:**
```typescript
async function runPipeline(opts: {
  wavPath: string         // absolute path to fixture WAV
  sourceLocale: string   // BCP-47: 'en-NZ' | 'mi-NZ'
  targetLang: string     // short code: 'en' | 'mi' | 'fr'
}): Promise<{
  recognizedText: string
  translatedText: string | null  // null when source === target lang
  audio: Buffer | null           // null for streaming path
  audioChunks: Buffer[]          // empty for non-streaming path
}>
```

**Test cases:**

| Test name | wavPath | sourceLocale | targetLang | Expected audio type |
|---|---|---|---|---|
| `pipeline en→en` | `en-hello.wav` | `en-NZ` | `en` | MP3 Buffer |
| `pipeline en→mi` | `en-hello.wav` | `en-NZ` | `mi` | PCM chunks |
| `pipeline en→fr` | `en-hello.wav` | `en-NZ` | `fr` | MP3 Buffer |
| `pipeline mi→mi` | `mi-kia-ora.wav` | `mi-NZ` | `mi` | PCM chunks |
| `pipeline mi→en` | `mi-kia-ora.wav` | `mi-NZ` | `en` | MP3 Buffer |
| `pipeline mi→fr` | `mi-kia-ora.wav` | `mi-NZ` | `fr` | MP3 Buffer |

**Note on en→en:** `translateText` is not called when `targetLang === sourceShort`. Feed recognized text directly into TTS with lang `'en'`.

**Builder instructions:**
- Mock supabase in this file to prevent DB writes
- `runPipeline` must handle the case where STT emits multiple partial segments — only use the final segment text
- Use the `collectSegment` helper from WP2
- Skip entire describe block if `!process.env.AZURE_SPEECH_KEY || !process.env.OPENAI_API_KEY`
- Each test gets its own timeout override: `{ timeout: 30000 }`
- Log intermediate results (recognized text, translated text) to aid debugging

**Model:** Opus

---

## Execution Order

```
WP1 (fixtures) → WP2 (helpers) → WP3 (config)
                                       ↓
                        WP4 (STT tests) + WP5 (translate tests) + WP6 (TTS tests)
                                       ↓
                                  WP7 (pipeline tests)
```

- WP1 before WP4/WP7: pipeline tests need the WAV fixtures
- WP2 before WP4/WP6/WP7: all tests import helpers
- WP3 before WP4/WP5/WP6/WP7: all tests need the integration test script
- WP4/WP5/WP6 can run in parallel
- WP7 after WP4/WP5/WP6: pipeline = composition of layer tests, built last

---

## AC → Verification Map

| AC | Verify Command | Expected | Automated |
|----|---------------|----------|-----------|
| AC1 | `node -e "..."` (see Acceptance Criteria table) | `RIFF 16000` | yes |
| AC2 | `pnpm --filter api test:integration -- --grep "en-NZ STT"` | pass | yes |
| AC3 | `pnpm --filter api test:integration -- --grep "mi-NZ STT"` | pass | yes |
| AC4 | `pnpm --filter api test:integration -- --grep "translate en"` | pass | yes |
| AC5 | `pnpm --filter api test:integration -- --grep "translate mi"` | pass | yes |
| AC6 | `pnpm --filter api test:integration -- --grep "TTS azure"` | pass | yes |
| AC7 | `pnpm --filter api test:integration -- --grep "TTS openai"` | pass | yes |
| AC8–AC13 | `pnpm --filter api test:integration -- --grep "pipeline"` | all 6 pass | yes |
| AC14 | `AZURE_SPEECH_KEY="" pnpm --filter api test:integration` | exit 0, tests skipped | yes |

Full suite: `pnpm --filter api test:integration`

---

## Risk Register

| Risk | Severity | Probability | Mitigation | Detection |
|---|---|---|---|---|
| Azure STT doesn't recognize fixture WAV reliably (wrong format, quality) | High | Medium | Use `ffmpeg` or Node WAV library to guarantee 16kHz/16-bit/mono; verify WAV header with AC1 | AC2/AC3 fail |
| OpenAI TTS WAV output at 24kHz not 16kHz | High | Medium | After generation, resample with `ffmpeg -ar 16000`; verify sample rate in fixture | AC2 fails if fed 24kHz audio to Azure |
| STT timeout — Azure silence detection doesn't fire in test | Medium | Low | After pushing all chunks, explicitly push empty/silence PCM for 1 second before stop() | `collectSegment` timeout triggers |
| Papa Reo API used instead of OpenAI STT (if `OPENAI_API_KEY` absent) | Medium | Low | Integration test must check `OPENAI_API_KEY` env var; test body asserts which session was created | AC3 skips without `OPENAI_API_KEY` |
| Azure Translator uses `speechKey` (not a dedicated translator key) — may reject if SKU doesn't include Translator | Low | Low | Already the production setup; not new risk | AC4/AC5 fail with 401 |
| PCM fixtures grow large (raw audio) | Low | Low | Use short phrases (< 5 seconds); expected ~160KB per fixture at 16kHz/16-bit | File size check in CI |

---

## Notes

**WAV generation and format verification:**
OpenAI TTS `response_format: 'wav'` produces PCM WAV. If the returned sample rate is not 16kHz, the fixture must be resampled before committing. The generation script should print the actual sample rate and warn if resampling is needed.

**en→en path (no translation):**
When source is `en-NZ` and target is also `en`, the pipeline skips `translateText` and passes the recognized source text directly to `TtsService.synthesize(text, 'en')`. This matches `SocketHandler.ts:183` filter behaviour where `targetLangs` excludes the source language short code.

**Running integration tests locally:**
```bash
# Ensure .env.local has AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, OPENAI_API_KEY
cp apps/api/.env.example apps/api/.env.local
# Generate fixtures (one time)
pnpm --filter api generate-audio
# Run tests
pnpm --filter api test:integration
```
