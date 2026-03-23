# Audio Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let audience members opt into hearing translated captions spoken aloud in their chosen language, using Azure Neural TTS synthesised on-demand per final caption segment.

**Architecture:** The server synthesises audio only for languages that have at least one active subscriber. When an audience member enables audio, they send `audio:subscribe` over the existing Socket.IO connection; the server registers their socket against their chosen language for the current event, and emits synthesised audio back as `audio:tts` binary frames after each final recognised segment. The client plays chunks sequentially via Web Audio API. A shared constant lists the language codes that have Azure TTS voices, so the UI can hide the button for unsupported languages (Tongan, Fijian).

**Tech Stack:** Azure Speech SDK (`microsoft-cognitiveservices-speech-sdk` — already installed), Web Audio API (browser built-in), Socket.IO (already in use), Vitest

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `packages/shared/src/ttsLanguages.ts` | `TTS_SUPPORTED_LANGUAGES` constant (codes that have Azure voices) |
| Modify | `packages/shared/src/types.ts` | Add `audio:subscribe`, `audio:unsubscribe`, `audio:tts` socket events |
| Create | `apps/api/src/services/TtsService.ts` | Azure SpeechSynthesizer wrapper; language→voice map; returns `Buffer` |
| Create | `apps/api/src/__tests__/TtsService.test.ts` | Unit tests for TtsService |
| Create | `apps/api/src/services/AudioSubscriptionManager.ts` | Tracks `eventCode → language → Set<socketId>` |
| Create | `apps/api/src/__tests__/AudioSubscriptionManager.test.ts` | Unit tests for AudioSubscriptionManager |
| Modify | `apps/api/src/services/SocketHandler.ts` | Handle subscribe/unsubscribe events; trigger TTS on final segments |
| Create | `apps/web/src/hooks/useAudioPlayer.ts` | Manages subscribe state + Web Audio API playback queue |
| Create | `apps/web/src/__tests__/useAudioPlayer.test.ts` | Unit tests for useAudioPlayer |
| Modify | `apps/web/src/pages/EventPage.tsx` | Audio toggle button in sidebar, shown only for supported languages |

---

## Task 1: Add TTS language list to shared package

**Files:**
- Create: `packages/shared/src/ttsLanguages.ts`
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: Create the supported languages constant**

```ts
// packages/shared/src/ttsLanguages.ts

/**
 * Azure Translator language codes that have a corresponding Azure Neural TTS voice.
 * Languages not in this list (e.g. Tongan, Fijian) cannot be synthesised — the UI
 * should hide the audio toggle for those languages.
 */
export const TTS_SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set([
  'en', 'mi', 'sm', 'zh-Hans', 'zh-Hant', 'hi', 'fil', 'yue',
  'fr', 'pa', 'af', 'es', 'de', 'ko', 'ja', 'gu', 'nl',
  'ml', 'pt', 'ru', 'ar', 'ta', 'si', 'it', 'th', 'vi',
  'fa', 'ur', 'ms', 'km', 'id', 'te', 'mr', 'sr',
])
```

- [ ] **Step 2: Re-export from shared index**

In `packages/shared/src/types.ts`, add after the existing exports at the top:
```ts
export { TTS_SUPPORTED_LANGUAGES } from './ttsLanguages.js'
```

- [ ] **Step 3: Add new socket event types to `packages/shared/src/types.ts`**

Add to `ServerToClientEvents`:
```ts
'audio:tts': (payload: { language: string; sequence: number; data: ArrayBuffer }) => void
```

Add to `ClientToServerEvents`:
```ts
'audio:subscribe': (payload: { code: string; language: string }) => void
'audio:unsubscribe': (payload: { code: string; language: string }) => void
```

- [ ] **Step 4: Verify shared package builds**

```bash
cd /Users/shaunnesbitt/Desktop/accessibility-work
pnpm --filter @caption-aotearoa/shared build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/ttsLanguages.ts packages/shared/src/types.ts
git commit -m "feat(shared): add TTS_SUPPORTED_LANGUAGES and audio socket event types"
```

---

## Task 2: TtsService

**Files:**
- Create: `apps/api/src/services/TtsService.ts`
- Create: `apps/api/src/__tests__/TtsService.test.ts`

- [ ] **Step 1: Write the failing tests first**

```ts
// apps/api/src/__tests__/TtsService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const speakTextAsyncMock = vi.fn()
const closeMock = vi.fn()

vi.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: vi.fn(() => ({
      speechSynthesisVoiceName: '',
      speechSynthesisOutputFormat: 0,
    })),
  },
  SpeechSynthesizer: vi.fn(() => ({
    speakTextAsync: speakTextAsyncMock,
    close: closeMock,
  })),
  SpeechSynthesisOutputFormat: { Audio16Khz32KBitRateMonoMp3: 5 },
  ResultReason: { SynthesizingAudioCompleted: 1 },
}))

import { TtsService } from '../services/TtsService'

describe('TtsService', () => {
  let service: TtsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TtsService({ speechKey: 'test-key', speechRegion: 'australiaeast' })
  })

  it('returns a Buffer for a supported language', async () => {
    const fakeAudio = new ArrayBuffer(100)
    speakTextAsyncMock.mockImplementation((_text: string, cb: (r: any) => void) => {
      cb({ reason: 1, audioData: fakeAudio })
    })

    const result = await service.synthesize('Hello world', 'en')
    expect(result).toBeInstanceOf(Buffer)
    expect(result?.byteLength).toBe(100)
    expect(closeMock).toHaveBeenCalled()
  })

  it('returns null for an unsupported language', async () => {
    const result = await service.synthesize('Ko au', 'to') // Tongan — no voice
    expect(result).toBeNull()
    expect(speakTextAsyncMock).not.toHaveBeenCalled()
  })

  it('returns null and closes synthesizer on synthesis error', async () => {
    speakTextAsyncMock.mockImplementation((_text: string, _cb: any, errCb: (e: string) => void) => {
      errCb('synthesis failed')
    })

    const result = await service.synthesize('Hello', 'en')
    expect(result).toBeNull()
    expect(closeMock).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
pnpm --filter api test TtsService
```
Expected: FAIL — `Cannot find module '../services/TtsService'`

- [ ] **Step 3: Implement TtsService**

```ts
// apps/api/src/services/TtsService.ts
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'

/** Azure Neural TTS voice names keyed by Azure Translator language code. */
const VOICE_MAP: Record<string, string> = {
  'en':      'en-NZ-MollyNeural',
  'mi':      'mi-NZ-MereNeural',
  'sm':      'sm-WS-NerauNeural',
  'zh-Hans': 'zh-CN-XiaoxiaoNeural',
  'zh-Hant': 'zh-TW-HsiaoChenNeural',
  'hi':      'hi-IN-SwaraNeural',
  'fil':     'fil-PH-BlessicaNeural',
  'yue':     'yue-CN-XiaoMinNeural',
  'fr':      'fr-FR-DeniseNeural',
  'pa':      'pa-IN-OjasNeural',
  'af':      'af-ZA-AdriNeural',
  'es':      'es-ES-ElviraNeural',
  'de':      'de-DE-KatjaNeural',
  'ko':      'ko-KR-SunHiNeural',
  'ja':      'ja-JP-NanamiNeural',
  'gu':      'gu-IN-DhwaniNeural',
  'nl':      'nl-NL-ColetteNeural',
  'ml':      'ml-IN-SobhanaNeural',
  'pt':      'pt-PT-RaquelNeural',
  'ru':      'ru-RU-SvetlanaNeural',
  'ar':      'ar-SA-ZariyahNeural',
  'ta':      'ta-IN-PallaviNeural',
  'si':      'si-LK-ThiliniNeural',
  'it':      'it-IT-ElsaNeural',
  'th':      'th-TH-PremwadeeNeural',
  'vi':      'vi-VN-HoaiMyNeural',
  'fa':      'fa-IR-DilaraNeural',
  'ur':      'ur-PK-UzmaNeural',
  'ms':      'ms-MY-YasminNeural',
  'km':      'km-KH-SreymomNeural',
  'id':      'id-ID-GadisNeural',
  'te':      'te-IN-ShrutiNeural',
  'mr':      'mr-IN-AarohiNeural',
  'sr':      'sr-RS-SophieNeural',
}

interface TtsServiceOptions {
  speechKey: string
  speechRegion: string
}

export class TtsService {
  private options: TtsServiceOptions

  constructor(options: TtsServiceOptions) {
    this.options = options
  }

  /**
   * Synthesise `text` in the given language. Returns a Buffer of MP3 audio,
   * or null if the language has no Azure voice or synthesis fails.
   */
  async synthesize(text: string, language: string): Promise<Buffer | null> {
    const voice = VOICE_MAP[language]
    if (!voice) return null

    const speechConfig = sdk.SpeechConfig.fromSubscription(
      this.options.speechKey,
      this.options.speechRegion,
    )
    speechConfig.speechSynthesisVoiceName = voice
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

    // null audio config = return audio data in result, no device output
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null as unknown as sdk.AudioConfig)

    return new Promise((resolve) => {
      synthesizer.speakTextAsync(
        text,
        (result) => {
          synthesizer.close()
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted && result.audioData) {
            resolve(Buffer.from(result.audioData))
          } else {
            resolve(null)
          }
        },
        (error) => {
          synthesizer.close()
          console.error('[TtsService] synthesis error:', error)
          resolve(null)
        },
      )
    })
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter api test TtsService
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/TtsService.ts apps/api/src/__tests__/TtsService.test.ts
git commit -m "feat(api): add TtsService wrapping Azure Neural TTS synthesis"
```

---

## Task 3: AudioSubscriptionManager

**Files:**
- Create: `apps/api/src/services/AudioSubscriptionManager.ts`
- Create: `apps/api/src/__tests__/AudioSubscriptionManager.test.ts`

- [ ] **Step 1: Write the failing tests first**

```ts
// apps/api/src/__tests__/AudioSubscriptionManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { AudioSubscriptionManager } from '../services/AudioSubscriptionManager'

describe('AudioSubscriptionManager', () => {
  let mgr: AudioSubscriptionManager

  beforeEach(() => {
    mgr = new AudioSubscriptionManager()
  })

  it('tracks a subscription', () => {
    mgr.subscribe('EVT1', 'mi', 'socket-a')
    const subs = mgr.getSubscribers('EVT1')
    expect(subs.get('mi')).toContain('socket-a')
  })

  it('unsubscribes a single socket from a language', () => {
    mgr.subscribe('EVT1', 'mi', 'socket-a')
    mgr.subscribe('EVT1', 'mi', 'socket-b')
    mgr.unsubscribe('EVT1', 'mi', 'socket-a')
    expect(mgr.getSubscribers('EVT1').get('mi')).not.toContain('socket-a')
    expect(mgr.getSubscribers('EVT1').get('mi')).toContain('socket-b')
  })

  it('removes socket from all languages on disconnectAll', () => {
    mgr.subscribe('EVT1', 'mi', 'socket-a')
    mgr.subscribe('EVT1', 'en', 'socket-a')
    mgr.subscribe('EVT2', 'zh-Hans', 'socket-a')
    mgr.disconnectAll('socket-a')
    expect(mgr.getSubscribers('EVT1').get('mi')).not.toContain('socket-a')
    expect(mgr.getSubscribers('EVT1').get('en')).not.toContain('socket-a')
    expect(mgr.getSubscribers('EVT2').get('zh-Hans')).not.toContain('socket-a')
  })

  it('returns empty map for unknown event', () => {
    expect(mgr.getSubscribers('UNKNOWN').size).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm --filter api test AudioSubscriptionManager
```
Expected: FAIL — `Cannot find module '../services/AudioSubscriptionManager'`

- [ ] **Step 3: Implement AudioSubscriptionManager**

```ts
// apps/api/src/services/AudioSubscriptionManager.ts

/**
 * Tracks which socket IDs want audio for which language, per event.
 * Structure: eventCode → language → Set<socketId>
 */
export class AudioSubscriptionManager {
  // socketId → Set of "eventCode:language" keys, for efficient disconnectAll
  private socketIndex = new Map<string, Set<string>>()
  // eventCode → language → Set<socketId>
  private subs = new Map<string, Map<string, Set<string>>>()

  subscribe(eventCode: string, language: string, socketId: string): void {
    if (!this.subs.has(eventCode)) this.subs.set(eventCode, new Map())
    const langMap = this.subs.get(eventCode)!
    if (!langMap.has(language)) langMap.set(language, new Set())
    langMap.get(language)!.add(socketId)

    const key = `${eventCode}:${language}`
    if (!this.socketIndex.has(socketId)) this.socketIndex.set(socketId, new Set())
    this.socketIndex.get(socketId)!.add(key)
  }

  unsubscribe(eventCode: string, language: string, socketId: string): void {
    this.subs.get(eventCode)?.get(language)?.delete(socketId)
    this.socketIndex.get(socketId)?.delete(`${eventCode}:${language}`)
  }

  /** Remove a socket from all subscriptions — call on disconnect. */
  disconnectAll(socketId: string): void {
    const keys = this.socketIndex.get(socketId)
    if (!keys) return
    for (const key of keys) {
      const [eventCode, ...langParts] = key.split(':')
      const language = langParts.join(':') // handles codes like zh-Hans
      this.subs.get(eventCode)?.get(language)?.delete(socketId)
    }
    this.socketIndex.delete(socketId)
  }

  /** Returns language → Set<socketId> for the given event. Empty map if none. */
  getSubscribers(eventCode: string): Map<string, Set<string>> {
    return this.subs.get(eventCode) ?? new Map()
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter api test AudioSubscriptionManager
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/AudioSubscriptionManager.ts apps/api/src/__tests__/AudioSubscriptionManager.test.ts
git commit -m "feat(api): add AudioSubscriptionManager for per-language audio subscriber tracking"
```

---

## Task 4: Wire TTS into SocketHandler

**Files:**
- Modify: `apps/api/src/services/SocketHandler.ts`

The `TtsService` and `AudioSubscriptionManager` are instantiated once at the top of `setupSocketHandler`, then used inside socket event handlers.

- [ ] **Step 1: Read the existing SocketHandler tests to understand what already exists**

```bash
cat apps/api/src/__tests__/SocketHandler.test.ts
```

- [ ] **Step 2: Add mocks and new test cases to `apps/api/src/__tests__/SocketHandler.test.ts`**

The existing test pattern uses `mockSocket._handlers['event:name'](payload)` to invoke handlers and `mockIO._connect(mockSocket)` to trigger the connection callback. Match that exactly.

Add these three mocks **at the top of the file**, alongside the existing `vi.mock` calls. The `config` mock prevents `requireEnv` from throwing when SocketHandler.ts is imported.

```ts
vi.mock('../config', () => ({
  config: { azure: { speechKey: 'test-key', speechRegion: 'test-region' } },
}))

let mockAudioSubsInstance: {
  subscribe: ReturnType<typeof vi.fn>
  unsubscribe: ReturnType<typeof vi.fn>
  disconnectAll: ReturnType<typeof vi.fn>
  getSubscribers: ReturnType<typeof vi.fn>
}
vi.mock('../services/AudioSubscriptionManager', () => ({
  AudioSubscriptionManager: vi.fn(() => {
    mockAudioSubsInstance = {
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      disconnectAll: vi.fn(),
      getSubscribers: vi.fn().mockReturnValue(new Map()),
    }
    return mockAudioSubsInstance
  }),
}))

vi.mock('../services/TtsService', () => ({
  TtsService: vi.fn(() => ({ synthesize: vi.fn().mockResolvedValue(Buffer.from('audio')) })),
}))
```

Add these test cases at the bottom of the `describe('SocketHandler', ...)` block:

```ts
it('registers audio:subscribe and audio:unsubscribe handlers on connection', () => {
  mockIO._connect(mockSocket)
  expect(mockSocket.on).toHaveBeenCalledWith('audio:subscribe', expect.any(Function))
  expect(mockSocket.on).toHaveBeenCalledWith('audio:unsubscribe', expect.any(Function))
})

it('calls audioSubs.subscribe with eventCode, language, and socketId', () => {
  mockIO._connect(mockSocket)
  mockSocket._handlers['audio:subscribe']({ code: 'EVT1', language: 'mi' })
  expect(mockAudioSubsInstance.subscribe).toHaveBeenCalledWith('EVT1', 'mi', 'test-socket-id')
})

it('calls audioSubs.unsubscribe with eventCode, language, and socketId', () => {
  mockIO._connect(mockSocket)
  mockSocket._handlers['audio:unsubscribe']({ code: 'EVT1', language: 'mi' })
  expect(mockAudioSubsInstance.unsubscribe).toHaveBeenCalledWith('EVT1', 'mi', 'test-socket-id')
})

it('calls audioSubs.disconnectAll with socketId on disconnecting', async () => {
  mockIO._connect(mockSocket)
  await mockSocket._handlers['disconnecting']()
  expect(mockAudioSubsInstance.disconnectAll).toHaveBeenCalledWith('test-socket-id')
})
```

- [ ] **Step 3: Run the new tests to confirm they fail**

```bash
pnpm --filter api test SocketHandler
```
Expected: new tests FAIL, existing tests PASS.

- [ ] **Step 4: Update SocketHandler to wire up the new events**

In `apps/api/src/services/SocketHandler.ts`, make these changes:

**At the top, add imports:**
```ts
import { TtsService } from './TtsService'
import { AudioSubscriptionManager } from './AudioSubscriptionManager'
import { config } from '../config'
```

**Inside `setupSocketHandler`, before `io.on('connection', ...)`, instantiate:**
```ts
const tts = new TtsService({ speechKey: config.azure.speechKey, speechRegion: config.azure.speechRegion })
const audioSubs = new AudioSubscriptionManager()
```

**Inside the `io.on('connection', socket => {...})` block, add after the existing handlers:**
```ts
socket.on('audio:subscribe', ({ code, language }) => {
  audioSubs.subscribe(code, language, socket.id)
})

socket.on('audio:unsubscribe', ({ code, language }) => {
  audioSubs.unsubscribe(code, language, socket.id)
})
```

**In the existing `disconnecting` handler** (already present), add cleanup:
```ts
socket.on('disconnecting', async () => {
  audioSubs.disconnectAll(socket.id)
  // ...existing viewer count code stays below
  for (const room of socket.rooms) {
    ...
  }
})
```

**In the `session:start` handler**, wrap the existing `onSegment` callback to also trigger TTS for final segments:

Replace the existing `onSegment` arrow function:
```ts
// BEFORE:
(payload) => {
  io.to(code).emit('caption:segment', payload)
}

// AFTER:
(payload) => {
  io.to(code).emit('caption:segment', payload)
  if (!payload.isFinal) return
  const subscribers = audioSubs.getSubscribers(code)
  for (const [lang, sockets] of subscribers) {
    if (sockets.size === 0) continue
    const text = payload.segments[lang]
    if (!text) continue
    tts.synthesize(text, lang).then((audio) => {
      if (!audio) return
      io.to([...sockets]).emit('audio:tts', {
        language: lang,
        sequence: payload.sequence,
        data: audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer,
      })
    }).catch((err) => {
      console.error('[SocketHandler] TTS synthesis failed:', err)
    })
  }
}
```

- [ ] **Step 5: Run all API tests**

```bash
pnpm --filter api test
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/SocketHandler.ts
git commit -m "feat(api): wire TTS synthesis and audio subscription handling into SocketHandler"
```

---

## Task 5: useAudioPlayer hook

**Files:**
- Create: `apps/web/src/hooks/useAudioPlayer.ts`
- Create: `apps/web/src/__tests__/useAudioPlayer.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/src/__tests__/useAudioPlayer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}))

const mockEmit = vi.fn()
const mockOn = vi.fn()
const mockOff = vi.fn()

vi.mock('../lib/socket', () => ({
  socket: {
    connected: true,
    emit: (...args: any[]) => mockEmit(...args),
    on: (...args: any[]) => mockOn(...args),
    off: (...args: any[]) => mockOff(...args),
  },
}))

// AudioContext is not available in jsdom — stub it
const decodeAudioDataMock = vi.fn().mockResolvedValue({})
const createBufferSourceMock = vi.fn(() => ({
  buffer: null,
  connect: vi.fn(),
  start: vi.fn(),
  onended: null,
}))
const destinationMock = {}
const closeMock = vi.fn()

vi.stubGlobal('AudioContext', vi.fn(() => ({
  decodeAudioData: decodeAudioDataMock,
  createBufferSource: createBufferSourceMock,
  destination: destinationMock,
  close: closeMock,
})))

import { useAudioPlayer } from '../hooks/useAudioPlayer'

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts disabled', () => {
    const { result } = renderHook(() => useAudioPlayer('EVT1', 'mi'))
    expect(result.current.isEnabled).toBe(false)
  })

  it('emits audio:subscribe when enabled', () => {
    const { result } = renderHook(() => useAudioPlayer('EVT1', 'mi'))
    act(() => result.current.enable())
    expect(mockEmit).toHaveBeenCalledWith('audio:subscribe', { code: 'EVT1', language: 'mi' })
    expect(result.current.isEnabled).toBe(true)
  })

  it('emits audio:unsubscribe when disabled (via effect cleanup)', () => {
    const { result } = renderHook(() => useAudioPlayer('EVT1', 'mi'))
    act(() => result.current.enable())
    act(() => result.current.disable())
    // audio:unsubscribe is emitted by the isEnabled effect cleanup, not disable() directly
    expect(mockEmit).toHaveBeenCalledWith('audio:unsubscribe', { code: 'EVT1', language: 'mi' })
    expect(result.current.isEnabled).toBe(false)
  })

  it('registers audio:tts listener when enabled', () => {
    const { result } = renderHook(() => useAudioPlayer('EVT1', 'mi'))
    act(() => result.current.enable())
    expect(mockOn).toHaveBeenCalledWith('audio:tts', expect.any(Function))
  })

  it('unregisters audio:tts listener and emits unsubscribe on unmount while enabled', () => {
    const { result, unmount } = renderHook(() => useAudioPlayer('EVT1', 'mi'))
    act(() => result.current.enable())
    unmount()
    expect(mockOff).toHaveBeenCalledWith('audio:tts', expect.any(Function))
    expect(mockEmit).toHaveBeenCalledWith('audio:unsubscribe', { code: 'EVT1', language: 'mi' })
  })

  it('re-subscribes when language changes while enabled', () => {
    const { result, rerender } = renderHook(
      ({ lang }) => useAudioPlayer('EVT1', lang),
      { initialProps: { lang: 'mi' } }
    )
    act(() => result.current.enable())
    rerender({ lang: 'zh-Hans' })
    expect(mockEmit).toHaveBeenCalledWith('audio:unsubscribe', { code: 'EVT1', language: 'mi' })
    expect(mockEmit).toHaveBeenCalledWith('audio:subscribe', { code: 'EVT1', language: 'zh-Hans' })
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm --filter web test useAudioPlayer
```
Expected: FAIL — `Cannot find module '../hooks/useAudioPlayer'`

- [ ] **Step 3: Implement useAudioPlayer**

```ts
// apps/web/src/hooks/useAudioPlayer.ts
import { useState, useEffect, useRef } from 'react'
import { socket } from '../lib/socket'

interface AudioTtsPayload {
  language: string
  sequence: number
  data: ArrayBuffer
}

export function useAudioPlayer(eventCode: string, language: string) {
  const [isEnabled, setIsEnabled] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  // Queue of decoded AudioBuffers waiting to play
  const queueRef = useRef<AudioBuffer[]>([])
  const isPlayingRef = useRef(false)
  const languageRef = useRef(language)

  // When language changes while enabled, re-subscribe to the new language
  useEffect(() => {
    if (!isEnabled) {
      languageRef.current = language
      return
    }
    const prev = languageRef.current
    if (prev !== language) {
      socket.emit('audio:unsubscribe', { code: eventCode, language: prev })
      socket.emit('audio:subscribe', { code: eventCode, language })
      languageRef.current = language
      queueRef.current = []
    }
  }, [language, isEnabled, eventCode])

  // Main audio effect: set up AudioContext + socket listener while enabled.
  // Cleanup emits audio:unsubscribe — this is the single place unsubscription happens
  // (covers both disable() and unmount-while-enabled).
  useEffect(() => {
    if (!isEnabled) return

    languageRef.current = language
    const audioCtx = new AudioContext()
    audioCtxRef.current = audioCtx

    function playNext() {
      if (queueRef.current.length === 0) {
        isPlayingRef.current = false
        return
      }
      isPlayingRef.current = true
      const buffer = queueRef.current.shift()!
      const source = audioCtx.createBufferSource()
      source.buffer = buffer
      source.connect(audioCtx.destination)
      source.onended = playNext
      source.start()
    }

    function handleAudioTts({ language: lang, data }: AudioTtsPayload) {
      if (lang !== languageRef.current) return
      audioCtx.decodeAudioData(data.slice(0)).then((buffer) => {
        queueRef.current.push(buffer)
        if (!isPlayingRef.current) playNext()
      }).catch((err) => {
        console.error('[useAudioPlayer] decodeAudioData failed:', err)
      })
    }

    socket.on('audio:tts', handleAudioTts)

    return () => {
      socket.emit('audio:unsubscribe', { code: eventCode, language: languageRef.current })
      socket.off('audio:tts', handleAudioTts)
      audioCtx.close()
      audioCtxRef.current = null
      queueRef.current = []
      isPlayingRef.current = false
    }
  }, [isEnabled, eventCode])

  const enable = () => {
    languageRef.current = language
    socket.emit('audio:subscribe', { code: eventCode, language })
    setIsEnabled(true)
  }

  // disable() only sets state — the effect cleanup above handles audio:unsubscribe
  const disable = () => {
    setIsEnabled(false)
  }

  return { isEnabled, enable, disable }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter web test useAudioPlayer
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useAudioPlayer.ts apps/web/src/__tests__/useAudioPlayer.test.ts
git commit -m "feat(web): add useAudioPlayer hook for on-demand TTS audio subscription and playback"
```

---

## Task 6: Audio toggle in EventPage

**Files:**
- Modify: `apps/web/src/pages/EventPage.tsx`

- [ ] **Step 1: Add the import and hook call**

At the top of `EventPage.tsx`, add:
```ts
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { TTS_SUPPORTED_LANGUAGES } from '@caption-aotearoa/shared'
```

Inside the `EventPage` component, add after the existing hooks:
```ts
const { isEnabled: audioEnabled, enable: enableAudio, disable: disableAudio } =
  useAudioPlayer(code ?? '', selectedLocale)

const audioSupported = TTS_SUPPORTED_LANGUAGES.has(selectedLocale)
```

- [ ] **Step 2: Add the audio toggle button to the sidebar**

In the sidebar section, find the language picker block (the `div` starting with `mt-auto pt-6 border-t`). Inside that block, after the language picker button, add:

```tsx
{audioSupported && (
  <button
    onClick={audioEnabled ? disableAudio : enableAudio}
    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
               border transition-colors ${
      audioEnabled
        ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]'
        : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-highest)]'
    }`}
    aria-pressed={audioEnabled}
    aria-label={audioEnabled ? 'Disable audio translation' : 'Enable audio translation'}
  >
    <span className="material-symbols-outlined text-[16px]">
      {audioEnabled ? 'volume_up' : 'volume_off'}
    </span>
    <span>{audioEnabled ? 'Audio on' : 'Play audio'}</span>
  </button>
)}
```

- [ ] **Step 3: Verify the web app builds without type errors**

```bash
pnpm --filter web build
```
Expected: builds cleanly.

- [ ] **Step 4: Run all web tests**

```bash
pnpm --filter web test
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/EventPage.tsx
git commit -m "feat(web): add audio translation toggle to EventPage sidebar"
```

---

## Manual verification checklist

After all tasks are complete, verify end-to-end:

- [ ] Start API and web dev servers (`pnpm --filter api dev`, `pnpm --filter web dev`)
- [ ] Join an event as an audience member
- [ ] Select a language with TTS support (e.g. Te reo Māori)
- [ ] "Play audio" button appears in sidebar
- [ ] Select a language without TTS support (e.g. Tongan)
- [ ] "Play audio" button is hidden
- [ ] Start a captioning session as presenter, speak a sentence
- [ ] With audio enabled, hear the synthesised translation spoken in the browser
- [ ] Switch language while audio is on — audio follows the new language within one segment
- [ ] Disable audio — no further audio plays; clicking again re-enables
- [ ] Open two audience tabs with different languages — each hears only their language
