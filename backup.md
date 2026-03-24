# Backup — Original Implementation (before optimize-transcript-storage)

These are the original file contents before the TranslationRecognizer → SpeechRecognizer optimization.
To restore, copy each code block back to its respective file path.

## apps/api/src/services/AzureSession.ts

```typescript
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'
import { supabase } from './supabase'
import { bcp47ToTranslationCode, translationCodeToBcp47 } from './languageMap'
import { RECOGNITION_LOCALES, type CaptionSegmentPayload } from '@caption-aotearoa/shared'

const useMock = process.env.AZURE_MOCK === 'true'

/** Shared mutable counter so multiple sessions can coordinate sequence numbers. */
export interface SequenceCounter {
  value: number
}

interface AzureSessionOptions {
  eventCode: string
  phraseList?: string[]
  languages: string[]           // Azure Translator codes (e.g. 'en', 'mi', 'zh-Hans')
  speakerLocale?: string | null // BCP-47 recognition locale; null or undefined = 'en-NZ'
  onSegment: (payload: CaptionSegmentPayload) => void
  onError?: (message: string, fatal: boolean) => void
  sharedSequence?: SequenceCounter // optional shared counter for dual mode
}

export class AzureSession {
  private options: AzureSessionOptions
  private pushStream!: sdk.PushAudioInputStream
  private recognizer!: sdk.TranslationRecognizer
  private ownSequence = 0
  private eventId: string | null = null
  private partialTimer: ReturnType<typeof setTimeout> | null = null
  private pendingPartial: { segments: Record<string, string> } | null = null

  constructor(options: AzureSessionOptions) {
    this.options = options
  }

  private get sequence(): number {
    return this.options.sharedSequence ? this.options.sharedSequence.value : this.ownSequence
  }

  private set sequence(val: number) {
    if (this.options.sharedSequence) {
      this.options.sharedSequence.value = val
    } else {
      this.ownSequence = val
    }
  }

  async start(): Promise<void> {
    // Fetch event UUID (needed for DB inserts)
    const { data } = await supabase
      .from('events')
      .select('id')
      .eq('code', this.options.eventCode)
      .single()
    this.eventId = data?.id ?? null

    // Resume sequence from last persisted segment so stop/start doesn't reset numbering
    if (this.eventId) {
      const { data: maxRow } = await supabase
        .from('caption_segments')
        .select('sequence')
        .eq('event_id', this.eventId)
        .order('sequence', { ascending: false })
        .limit(1)
        .single()
      if (maxRow && maxRow.sequence > this.sequence) {
        this.sequence = maxRow.sequence
      }
    }

    this.createRecognizer()
    return new Promise((resolve, reject) => {
      this.recognizer.startContinuousRecognitionAsync(resolve, reject)
    })
  }

  private createRecognizer(): void {
    const { languages, speakerLocale } = this.options
    const sourceLocale = speakerLocale ?? languages[0]

    // Use fake SDK when AZURE_MOCK=true (for E2E/integration tests)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const effectiveSdk: typeof sdk = useMock
      ? require('./__mocks__/azureSpeechStub').fakeSdk
      : sdk

    const translationConfig = effectiveSdk.SpeechTranslationConfig.fromSubscription(
      config.azure.speechKey,
      config.azure.speechRegion,
    )
    translationConfig.speechRecognitionLanguage = sourceLocale

    // Shorter segmentation silence → faster final segments (default ~2s → 500ms)
    translationConfig.setProperty('Speech_SegmentationSilenceTimeoutMs', '500')

    // Add target languages (all non-source event languages)
    const sourceCode = bcp47ToTranslationCode(sourceLocale)
    for (const lang of languages) {
      const code = bcp47ToTranslationCode(lang)
      if (code !== sourceCode) {
        translationConfig.addTargetLanguage(code)
      }
    }

    this.pushStream = effectiveSdk.AudioInputStream.createPushStream(
      effectiveSdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1),
    )
    const audioConfig = effectiveSdk.AudioConfig.fromStreamInput(this.pushStream)
    this.recognizer = new effectiveSdk.TranslationRecognizer(translationConfig, audioConfig)

    // Load custom phrase hints (te reo etc.)
    if (this.options.phraseList && this.options.phraseList.length > 0) {
      const grammar = effectiveSdk.PhraseListGrammar.fromRecognizer(this.recognizer)
      this.options.phraseList.forEach((p) => grammar.addPhrase(p))
    }

    // Throttle partials to ~7/sec (trailing-edge) to avoid render thrashing
    this.recognizer.recognizing = (_, e) => {
      if (e.result.reason === effectiveSdk.ResultReason.TranslatingSpeech) {
        this.pendingPartial = { segments: this.buildSegments(e.result) }
        if (!this.partialTimer) {
          this.partialTimer = setTimeout(() => {
            this.partialTimer = null
            if (this.pendingPartial) {
              this.emitSegments(this.pendingPartial.segments, false)
              this.pendingPartial = null
            }
          }, 150)
        }
      }
    }

    this.recognizer.recognized = (_, e) => {
      if (e.result.reason === effectiveSdk.ResultReason.TranslatedSpeech && e.result.text) {
        // Flush any pending partial before emitting final
        this.clearPartialTimer()
        const segments = this.buildSegments(e.result)
        this.emitSegments(segments, true)
      }
    }

    this.recognizer.canceled = (_, e) => {
      const fatal = e.errorCode !== effectiveSdk.CancellationErrorCode.NoError
      this.options.onError?.(`Azure canceled: ${e.errorDetails}`, fatal)
    }
  }

  private buildSegments(result: sdk.TranslationRecognitionResult): Record<string, string> {
    const sourceLocale = this.options.speakerLocale ?? this.options.languages[0]
    const segments: Record<string, string> = { [sourceLocale]: result.text }

    // Add translations from the TranslationRecognizer result
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

  private emitSegments(segments: Record<string, string>, isFinal: boolean): void {
    const seq = isFinal ? ++this.sequence : this.sequence + 1

    const payload: CaptionSegmentPayload = {
      id: uuidv4(),
      segments,
      isFinal,
      sequence: seq,
    }

    this.options.onSegment(payload)

    // Persist only final segments
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
  }

  private clearPartialTimer(): void {
    if (this.partialTimer) {
      clearTimeout(this.partialTimer)
      this.partialTimer = null
    }
    this.pendingPartial = null
  }

  /** BCP-47 locales Azure supports for speech recognition (derived from shared RECOGNITION_LOCALES). */
  static readonly SUPPORTED_LOCALES = Object.values(RECOGNITION_LOCALES)

  async setLanguage(locale: string | null): Promise<void> {
    if (locale && !AzureSession.SUPPORTED_LOCALES.includes(locale)) {
      this.options.onError?.(
        `Locale "${locale}" is not supported by Azure speech recognition`,
        false,
      )
      return
    }
    this.options.speakerLocale = locale
    await this.restart()
  }

  pushChunk(chunk: Buffer): void {
    try {
      this.pushStream.write(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer)
    } catch {
      // Stream may be closed during session transitions — silently drop the chunk
    }
  }

  async stop(): Promise<void> {
    this.clearPartialTimer()
    return new Promise((resolve, reject) => {
      this.recognizer.stopContinuousRecognitionAsync(() => {
        this.pushStream.close()
        this.recognizer.close()
        resolve()
      }, reject)
    })
  }

  async restart(): Promise<void> {
    // Azure SDK does not support reusing a push stream after error.
    // Must create fresh recognizer + push stream.
    try { await this.stop() } catch { /* ignore cleanup errors */ }
    this.createRecognizer()
    return new Promise((resolve, reject) => {
      this.recognizer.startContinuousRecognitionAsync(resolve, reject)
    })
  }
}
```

## apps/api/src/services/DualAzureSession.ts

```typescript
import { AzureSession } from './AzureSession'
import type { SequenceCounter } from './AzureSession'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

interface DualAzureSessionOptions {
  eventCode: string
  languages: string[]
  onSegment: (payload: CaptionSegmentPayload) => void
  onError?: (message: string, fatal: boolean) => void
}

/**
 * Wraps two AzureSession instances (en-NZ + mi-NZ) for bilingual recognition.
 * Both receive the same audio chunks and translate to all configured target languages.
 * A shared sequence counter prevents the two sessions from producing conflicting numbers.
 */
export class DualAzureSession {
  private sessions: AzureSession[] = []
  private options: DualAzureSessionOptions
  private sharedSequence: SequenceCounter = { value: 0 }

  constructor(options: DualAzureSessionOptions) {
    this.options = options
  }

  async start(): Promise<void> {
    const { eventCode, languages, onSegment, onError } = this.options

    const enSession = new AzureSession({
      eventCode,
      languages,
      speakerLocale: 'en-NZ',
      onSegment,
      onError,
      sharedSequence: this.sharedSequence,
    })

    const miSession = new AzureSession({
      eventCode,
      languages,
      speakerLocale: 'mi-NZ',
      onSegment,
      onError,
      sharedSequence: this.sharedSequence,
    })

    this.sessions = [enSession, miSession]
    await Promise.all(this.sessions.map((s) => s.start()))
  }

  pushChunk(chunk: Buffer): void {
    for (const session of this.sessions) {
      session.pushChunk(chunk)
    }
  }

  async stop(): Promise<void> {
    await Promise.all(this.sessions.map((s) => s.stop().catch(() => {})))
    this.sessions = []
  }

  async restart(): Promise<void> {
    await Promise.all(this.sessions.map((s) => s.restart()))
  }

  async setLanguage(locale: string | null): Promise<void> {
    // In dual mode, setLanguage doesn't apply — switch back to single mode via EventManager
    // This is a no-op; EventManager handles mode switching
  }
}
```

## apps/api/src/services/EventManager.ts

```typescript
import { AzureSession, type SequenceCounter } from './AzureSession'
import { DualAzureSession } from './DualAzureSession'
import { PapaReoSession } from './PapaReoSession'
import { OpenAiSttSession } from './OpenAiSttSession'
import { config } from '../config'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

interface SessionOptions {
  languages: string[]
  speakerLocale?: string
}

type OnSegment = (payload: CaptionSegmentPayload) => void
type OnError = (message: string, fatal: boolean) => void

type MaoriSttSession = PapaReoSession | OpenAiSttSession

interface SessionEntry {
  session: AzureSession | DualAzureSession | MaoriSttSession
  options: SessionOptions
  eventCode: string
  onSegment: OnSegment
  onError: OnError
}

class EventManagerClass {
  private sessions = new Map<string, SessionEntry>()

  /** Create the best available te reo STT session: OpenAI if key set, Papa Reo otherwise. */
  private createMaoriSession(
    eventCode: string,
    onSegment: OnSegment,
    onError: (msg: string, fatal: boolean) => void,
    sharedSequence?: SequenceCounter,
  ): MaoriSttSession {
    if (config.openaiApiKey) {
      return new OpenAiSttSession({ apiKey: config.openaiApiKey, eventCode, onSegment, onError, sharedSequence })
    }
    return new PapaReoSession({ eventCode, onSegment, onError, sharedSequence })
  }

  async start(
    code: string,
    options: SessionOptions,
    onSegment: OnSegment,
    onError: OnError,
  ): Promise<void> {
    if (this.sessions.has(code)) await this.end(code)

    let session: AzureSession | MaoriSttSession

    if (options.speakerLocale === 'mi-NZ') {
      const maoriSession = this.createMaoriSession(code, onSegment, (message, fatal) => {
        onError(message, fatal)
        if (fatal) this.sessions.delete(code)
      })
      await maoriSession.start()
      session = maoriSession
    } else {
      const azureSession = new AzureSession({
        eventCode: code,
        languages: options.languages,
        speakerLocale: options.speakerLocale ?? 'en-NZ',
        onSegment,
        onError: async (message, fatal) => {
          onError(message, fatal)
          if (!fatal) {
            try {
              await azureSession.restart()
            } catch (e) {
              onError(`Restart failed: ${e}`, true)
              this.sessions.delete(code)
            }
          } else {
            this.sessions.delete(code)
          }
        },
      })
      await azureSession.start()
      session = azureSession
    }

    this.sessions.set(code, { session, options, eventCode: code, onSegment, onError })
  }

  pushChunk(code: string, chunk: Buffer): void {
    this.sessions.get(code)?.session.pushChunk(chunk)
  }

  async setLanguage(code: string, locale: string | null): Promise<void> {
    const entry = this.sessions.get(code)
    if (!entry) return

    // If in dual mode, switch back to single mode first
    if (entry.session instanceof DualAzureSession) {
      await this.setMode(code, 'single')
    }

    const needsMaori = locale === 'mi-NZ'
    const currentIsMaori = entry.session instanceof PapaReoSession || entry.session instanceof OpenAiSttSession

    if (needsMaori && !currentIsMaori) {
      // Switch from Azure → Māori STT
      try { await entry.session.stop() } catch { /* ignore */ }

      const maoriSession = this.createMaoriSession(entry.eventCode, entry.onSegment, (message, fatal) => {
        entry.onError(message, fatal)
        if (fatal) this.sessions.delete(code)
      })
      await maoriSession.start()
      entry.session = maoriSession
    } else if (!needsMaori && currentIsMaori) {
      // Switch from Papa Reo → Azure
      try { await entry.session.stop() } catch { /* ignore */ }

      const azureSession = new AzureSession({
        eventCode: entry.eventCode,
        languages: entry.options.languages,
        speakerLocale: locale,
        onSegment: entry.onSegment,
        onError: async (message, fatal) => {
          entry.onError(message, fatal)
          if (!fatal) {
            try { await azureSession.restart() } catch (e) {
              entry.onError(`Restart failed: ${e}`, true)
              this.sessions.delete(code)
            }
          } else {
            this.sessions.delete(code)
          }
        },
      })
      await azureSession.start()
      entry.session = azureSession
    } else if (!needsMaori && entry.session instanceof AzureSession) {
      // Stay on Azure, just change language
      await entry.session.setLanguage(locale)
    }
  }

  async setMode(code: string, mode: 'single' | 'dual'): Promise<void> {
    const entry = this.sessions.get(code)
    if (!entry) return

    // Stop current session
    try { await entry.session.stop() } catch { /* ignore */ }

    if (mode === 'dual') {
      const dualSession = new DualAzureSession({
        eventCode: entry.eventCode,
        languages: entry.options.languages,
        onSegment: entry.onSegment,
        onError: async (message, fatal) => {
          entry.onError(message, fatal)
          if (fatal) this.sessions.delete(code)
        },
      })
      await dualSession.start()
      entry.session = dualSession
    } else {
      const singleSession = new AzureSession({
        eventCode: entry.eventCode,
        languages: entry.options.languages,
        onSegment: entry.onSegment,
        onError: async (message, fatal) => {
          entry.onError(message, fatal)
          if (!fatal) {
            try { await singleSession.restart() } catch (e) {
              entry.onError(`Restart failed: ${e}`, true)
              this.sessions.delete(code)
            }
          } else {
            this.sessions.delete(code)
          }
        },
      })
      await singleSession.start()
      entry.session = singleSession
    }
  }

  async end(code: string): Promise<void> {
    const entry = this.sessions.get(code)
    if (!entry) return
    this.sessions.delete(code)
    try { await entry.session.stop() } catch { /* ignore */ }
  }

  has(code: string): boolean {
    return this.sessions.has(code)
  }

  // Test helper
  clear(): void {
    this.sessions.clear()
  }
}

export const EventManager = new EventManagerClass()
```

## apps/api/src/services/SocketHandler.ts

```typescript
import type { Server, Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from '@caption-aotearoa/shared'
import { NZ_LANGUAGES } from '@caption-aotearoa/shared'
import { EventManager } from './EventManager'
import { supabase } from './supabase'
import { verifyJWT as verifyToken } from '../middleware/auth'
import { TtsService } from './TtsService'
import { OpenAiTtsService } from './OpenAiTtsService'
import { AudioSubscriptionManager } from './AudioSubscriptionManager'
import { config } from '../config'
import { translateText } from './translateText'
import { v4 as uuidv4 } from 'uuid'

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>

const HISTORY_SIZE = 20

// Cache event code → UUID to avoid repeated DB lookups
const eventIdCache = new Map<string, string>()

async function resolveEventId(code: string): Promise<string | null> {
  const cached = eventIdCache.get(code)
  if (cached) return cached
  const { data } = await supabase.from('events').select('id').eq('code', code).single()
  if (data?.id) {
    eventIdCache.set(code, data.id)
    return data.id
  }
  return null
}

function isMaoriOnly(segments: Record<string, string>): boolean {
  return Object.keys(segments).length === 1 && 'mi' in segments
}

/** Resolve text from segments, handling BCP-47 ↔ short code mismatches (e.g. 'en' ↔ 'en-NZ'). */
function resolveSegmentText(segments: Record<string, string>, lang: string): string | undefined {
  return segments[lang]
    ?? Object.entries(segments).find(
      ([k]) => k.startsWith(lang + '-') || lang.startsWith(k + '-')
    )?.[1]
}

async function broadcastViewerCount(io: AppServer, code: string): Promise<void> {
  const sockets = await io.in(code).fetchSockets()
  io.to(code).emit('viewer:count', { count: sockets.length })
}

export function setupSocketHandler(io: AppServer): void {
  const tts = new TtsService({ speechKey: config.azure.speechKey, speechRegion: config.azure.speechRegion })
  const openAiTts = config.openaiApiKey ? new OpenAiTtsService({ apiKey: config.openaiApiKey }) : null
  const audioSubs = new AudioSubscriptionManager()

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`)

    // Track rooms for viewer count on disconnect
    socket.on('audio:subscribe', ({ code, language }) => {
      audioSubs.subscribe(code, language, socket.id)
    })

    socket.on('audio:unsubscribe', ({ code, language }) => {
      audioSubs.unsubscribe(code, language, socket.id)
    })

    socket.on('disconnecting', async () => {
      audioSubs.disconnectAll(socket.id)
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          // Subtract 1 because this socket is still in the room during 'disconnecting'
          const sockets = await io.in(room).fetchSockets()
          io.to(room).emit('viewer:count', { count: Math.max(0, sockets.length - 1) })
        }
      }
    })

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${socket.id} reason=${reason}`)
    })

    // Audience joins an event room to receive captions
    socket.on('event:join', async (code) => {
      console.log(`[socket] event:join code=${code} socketId=${socket.id}`)
      socket.join(code)
      await broadcastViewerCount(io, code)

      // Send caption history so reconnects/late joiners see recent captions
      // Two-step: resolve event UUID first, then fetch segments
      const { data: eventRow } = await supabase
        .from('events')
        .select('id')
        .eq('code', code)
        .single()

      if (!eventRow) return

      // Emit Q&A history for reconnects/late joiners
      const { data: qaQuestions } = await supabase
        .from('qa_questions')
        .select('*')
        .eq('event_id', eventRow.id)
        .neq('status', 'dismissed')
        .order('created_at', { ascending: false })
        .limit(50)
      socket.emit('qa:history', { questions: qaQuestions || [] })

      // Each sequence has one row per language, so over-fetch rows and collect
      // the most recent HISTORY_SIZE distinct sequences in JS before grouping.
      const { data } = await supabase
        .from('caption_segments')
        .select('*')
        .eq('event_id', eventRow.id)
        .eq('is_final', true)
        .order('sequence', { ascending: false })
        .limit(HISTORY_SIZE * 100)

      if (data && data.length > 0) {
        // Collect the most recent HISTORY_SIZE sequences, then group their rows.
        // Rows arrive descending by sequence so same-sequence rows are adjacent.
        const grouped = new Map<number, { id: string; segments: Record<string, string>; sequence: number }>()
        for (const row of data) {
          if (!grouped.has(row.sequence)) {
            if (grouped.size >= HISTORY_SIZE) break
            grouped.set(row.sequence, { id: row.id, segments: {}, sequence: row.sequence })
          }
          grouped.get(row.sequence)!.segments[row.language] = row.text
        }
        // Emit in chronological order
        const segments = Array.from(grouped.values())
          .sort((a, b) => a.sequence - b.sequence)
          .map((s) => ({ ...s, isFinal: true }))
        socket.emit('caption:history', { segments })
      }
    })

    socket.on('event:leave', async (code) => {
      socket.leave(code)
      await broadcastViewerCount(io, code)
    })

    // Organiser starts a captioning session
    socket.on('session:start', async (payload) => {
      const code = typeof payload === 'string' ? payload : payload.code
      const locale = typeof payload === 'string' ? undefined : payload.locale
      console.log(`[socket] session:start code=${code} locale=${locale ?? 'default'} socketId=${socket.id}`)
      const authorised = isAuthorised(socket)
      console.log(`[socket] session:start auth=${authorised}`)
      if (!authorised) {
        socket.emit('caption:error', { message: 'Unauthorised', fatal: true })
        return
      }

      // Verify event exists
      const { data: event, error: dbError } = await supabase
        .from('events')
        .select('id')
        .eq('code', code)
        .single()

      console.log(`[socket] session:start event lookup: found=${!!event} error=${dbError?.message ?? 'none'}`)

      if (!event) {
        socket.emit('caption:error', { message: 'Event not found', fatal: true })
        return
      }

      const languages = NZ_LANGUAGES.map((l: { code: string }) => l.code)
      console.log(`[socket] session:start languages=${JSON.stringify(languages)}`)

      try {
        await EventManager.start(
          code,
          { languages, speakerLocale: locale ?? undefined },
          (payload) => {
            console.log(`[socket] emitting caption:segment seq=${payload.sequence} final=${payload.isFinal}`)
            io.to(code).emit('caption:segment', payload)
            if (!payload.isFinal) return

            // Translate te reo-only segments to all other NZ languages (fire-and-forget)
            if (isMaoriOnly(payload.segments)) {
              const maoriText = payload.segments['mi']
              const targetLangs = NZ_LANGUAGES.map((l) => l.code).filter((c) => c !== 'mi')
              translateText(maoriText, 'mi', targetLangs)
                .then(async (translations) => {
                  if (Object.keys(translations).length === 0) return
                  // Merge translations and re-emit so all audiences see captions
                  const enrichedPayload = {
                    ...payload,
                    segments: { ...payload.segments, ...translations },
                  }
                  io.to(code).emit('caption:segment', enrichedPayload)

                  // Trigger TTS for translated languages
                  const translationSubscribers = audioSubs.getSubscribers(code)
                  for (const [lang, sockets] of translationSubscribers) {
                    if (sockets.size === 0) continue
                    const text = resolveSegmentText(translations, lang)
                    if (!text) continue
                    tts.synthesize(text, lang).then((audio) => {
                      if (!audio) {
                        console.warn(`[SocketHandler] No TTS voice for translated language: ${lang}`)
                        return
                      }
                      io.to([...sockets]).emit('audio:tts', {
                        language: lang,
                        sequence: payload.sequence,
                        data: audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer,
                      })
                    }).catch((err) => {
                      console.error('[SocketHandler] TTS synthesis failed for te reo translation:', err)
                    })
                  }

                  // Persist translated segments to DB
                  const eventId = await resolveEventId(code)
                  if (eventId) {
                    const rows = Object.entries(translations).map(([lang, text]) => ({
                      id: uuidv4(),
                      event_id: eventId,
                      sequence: payload.sequence,
                      text,
                      language: lang,
                      is_final: true,
                    }))
                    const { error } = await supabase.from('caption_segments').insert(rows)
                    if (error) console.error('[SocketHandler] Failed to persist translated segments:', error.message)
                  }
                })
                .catch((err) => {
                  console.error('[SocketHandler] Te reo translation failed:', err)
                })
            }
            const subscribers = audioSubs.getSubscribers(code)
            for (const [lang, sockets] of subscribers) {
              if (sockets.size === 0) continue
              const text = resolveSegmentText(payload.segments, lang)
              if (!text) continue

              if (lang === 'mi' && openAiTts) {
                // Stream PCM chunks from OpenAI in realtime
                const socketIds = [...sockets]
                openAiTts.synthesizeStream(text, (chunk) => {
                  io.to(socketIds).emit('audio:tts-stream', {
                    language: lang,
                    sequence: payload.sequence,
                    chunk: chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer,
                    done: false,
                  })
                }).then(() => {
                  io.to(socketIds).emit('audio:tts-stream', {
                    language: lang,
                    sequence: payload.sequence,
                    chunk: new ArrayBuffer(0),
                    done: true,
                  })
                }).catch((err) => {
                  console.error('[SocketHandler] OpenAI TTS stream failed, falling back to Azure:', err)
                  // Fallback to Azure TTS
                  tts.synthesize(text, lang).then((audio) => {
                    if (!audio) return
                    io.to(socketIds).emit('audio:tts', {
                      language: lang,
                      sequence: payload.sequence,
                      data: audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer,
                    })
                  }).catch((fallbackErr) => {
                    console.error('[SocketHandler] Azure TTS fallback also failed:', fallbackErr)
                  })
                })
              } else {
                tts.synthesize(text, lang).then((audio) => {
                  if (!audio) {
                    console.warn(`[SocketHandler] No TTS voice for language: ${lang}`)
                    return
                  }
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
          },
          (message, fatal) => {
            console.log(`[socket] caption:error message="${message}" fatal=${fatal}`)
            io.to(code).emit('caption:error', { message, fatal })
          },
        )
        console.log(`[socket] session:start Azure session started for code=${code}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[socket] session:start FAILED to start Azure session: ${msg}`)
        socket.emit('caption:error', { message: `Session start failed: ${msg}`, fatal: true })
      }
    })

    // Organiser ends the captioning session
    socket.on('session:end', async (code) => {
      await EventManager.end(code)
    })

    // Organiser switches recognition language (null = back to auto-detect)
    socket.on('session:set-language', async ({ code, locale }) => {
      console.log(`[socket] session:set-language code=${code} locale=${locale ?? 'auto'}`)
      if (!isAuthorised(socket)) return
      await EventManager.setLanguage(code, locale)
    })

    // Organiser switches between single/dual recognition mode
    socket.on('session:set-mode', async ({ code, mode }) => {
      console.log(`[socket] session:set-mode code=${code} mode=${mode}`)
      if (!isAuthorised(socket)) return
      await EventManager.setMode(code, mode)
    })

    // Audience submits a question
    socket.on('qa:submit', async ({ code, body, language }) => {
      if (!body?.trim() || body.length > 280) return

      const { data: event } = await supabase.from('events').select('id, languages').eq('code', code).single()
      if (!event) return

      // Insert question
      const { data: question, error } = await supabase
        .from('qa_questions')
        .insert({ event_id: event.id, body: body.trim(), language })
        .select()
        .single()
      if (error || !question) return

      // Translate to event languages (async, don't block)
      try {
        const targetLangs = (event.languages || []).filter((l: string) => l !== language).map((l: string) => l.split('-')[0])
        if (targetLangs.length > 0 && config.azure?.speechKey) {
          const translations = await translateText(body.trim(), language.split('-')[0], targetLangs)
          if (Object.keys(translations).length > 0) {
            await supabase.from('qa_questions').update({ translations }).eq('id', question.id)
            question.translations = translations
          }
        }
      } catch (e) {
        console.error('Q&A translation failed:', e)
      }

      io.to(code).emit('qa:new', { question })
    })

    // Organiser moderates a question (pin or dismiss)
    socket.on('qa:moderate', async ({ code, questionId, status }) => {
      if (!isAuthorised(socket)) return

      const { data: question, error } = await supabase
        .from('qa_questions')
        .update({ status })
        .eq('id', questionId)
        .select()
        .single()
      if (error || !question) return

      io.to(code).emit('qa:update', { question })
    })

    // Emoji reactions (ephemeral, no DB)
    const reactionThrottles = new Map<string, number>()
    socket.on('reaction:send', ({ code, emoji }) => {
      const key = `${socket.id}:${emoji}`
      const now = Date.now()
      if ((reactionThrottles.get(key) ?? 0) > now - 2000) return
      reactionThrottles.set(key, now)
      io.to(code).emit('reaction:burst', { emoji, count: 1 })
    })

    // Incoming PCM audio chunk from organiser
    let chunkCount = 0
    socket.on('audio:chunk', (chunk) => {
      chunkCount++
      if (chunkCount <= 3 || chunkCount % 100 === 0) {
        console.log(`[socket] audio:chunk #${chunkCount} size=${chunk.byteLength} rooms=${JSON.stringify([...socket.rooms])}`)
      }
      // Find which room this socket is in that has an active session
      let routed = false
      socket.rooms.forEach((room) => {
        if (EventManager.has(room)) {
          EventManager.pushChunk(room, Buffer.from(chunk))
          routed = true
        }
      })
      if (!routed && (chunkCount <= 3 || chunkCount % 100 === 0)) {
        console.warn(`[socket] audio:chunk #${chunkCount} NOT routed — no active session in rooms ${JSON.stringify([...socket.rooms])}`)
      }
    })
  })
}

// Validate Supabase auth token from socket handshake
function isAuthorised(socket: Socket): boolean {
  // Check that a non-empty token was provided.
  // Full Supabase token verification happens on the HTTP routes.
  // Socket auth is a lightweight gatekeeper — the token's presence indicates
  // the client went through the Supabase login flow.
  const token = socket.handshake.auth?.token as string | undefined
  return !!token && token.length > 0
}
```

## apps/api/src/services/__mocks__/azureSpeechStub.ts

```typescript
/**
 * Runtime fake for the Azure Speech SDK.
 * Used when AZURE_MOCK=true so E2E / integration tests can exercise
 * the full pipeline without incurring Azure costs.
 */

import { MOCK_TRANSLATIONS, MOCK_SOURCE_TEXT } from '../../__tests__/fixtures/translations'

// ---------------------------------------------------------------------------
// Enum-like constants matching the real SDK
// (declared before the classes that reference them)
// ---------------------------------------------------------------------------
const ResultReason = {
  TranslatingSpeech: 1,
  TranslatedSpeech: 2,
} as const

const CancellationErrorCode = {
  NoError: 0,
} as const

// ---------------------------------------------------------------------------
// Fake PushAudioInputStream
// ---------------------------------------------------------------------------
class FakePushStream {
  private bytesReceived = 0
  private recognizer: FakeTranslationRecognizer | null = null

  /** Called by AzureSession.pushChunk → this.pushStream.write(chunk) */
  write(chunk: ArrayBuffer | Buffer): void {
    this.bytesReceived += chunk instanceof Buffer ? chunk.length : chunk.byteLength
    // After accumulating ~200ms of 16kHz 16-bit mono audio (3200 bytes),
    // fire a recognized event on the linked recognizer.
    if (this.bytesReceived >= 3200 && this.recognizer) {
      this.bytesReceived = 0
      this.recognizer._fireRecognized()
    }
  }

  close(): void {
    this.bytesReceived = 0
  }

  /** Internal: link the push stream to its recognizer so writes can trigger events. */
  _setRecognizer(rec: FakeTranslationRecognizer): void {
    this.recognizer = rec
  }
}

// ---------------------------------------------------------------------------
// Fake TranslationRecognizer
// (used internally; the public export is the class assigned to fakeSdk.TranslationRecognizer)
// ---------------------------------------------------------------------------
class FakeTranslationRecognizer {
  recognizing: ((sender: any, e: any) => void) | null = null
  recognized: ((sender: any, e: any) => void) | null = null
  canceled: ((sender: any, e: any) => void) | null = null

  private targetLanguages: string[]
  private running = false
  private pushStream: FakePushStream | null = null

  constructor(config: any, audioConfig: any) {
    this.targetLanguages = config._targetLanguages ?? []
    if (audioConfig?._stream instanceof FakePushStream) {
      this.pushStream = audioConfig._stream
      this.pushStream!._setRecognizer(this)
    }
  }

  startContinuousRecognitionAsync(ok?: () => void, _err?: (e: any) => void): void {
    this.running = true
    ok?.()
  }

  stopContinuousRecognitionAsync(ok?: () => void, _err?: (e: any) => void): void {
    this.running = false
    ok?.()
  }

  close(): void {
    this.running = false
  }

  /** Called by FakePushStream when enough audio bytes accumulate. */
  _fireRecognized(): void {
    if (!this.running || !this.recognized) return

    const translations = {
      languages: this.targetLanguages,
      get: (code: string) => MOCK_TRANSLATIONS[code] ?? `[mock:${code}]`,
    }

    this.recognized(null, {
      result: {
        reason: ResultReason.TranslatedSpeech,
        text: MOCK_SOURCE_TEXT,
        translations,
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Public export matching `import * as sdk from 'microsoft-cognitiveservices-speech-sdk'`
// ---------------------------------------------------------------------------
export const fakeSdk = {
  SpeechTranslationConfig: {
    fromSubscription(_key: string, _region: string) {
      return {
        speechRecognitionLanguage: '' as string,
        _targetLanguages: [] as string[],
        addTargetLanguage(code: string) {
          this._targetLanguages.push(code)
        },
        setProperty(_name: string, _value: string) {},
      }
    },
  },

  AudioInputStream: {
    createPushStream(_format?: any): FakePushStream {
      return new FakePushStream()
    },
  },

  AudioStreamFormat: {
    getWaveFormatPCM(_rate: number, _bits: number, _channels: number) {
      return {}
    },
  },

  AudioConfig: {
    fromStreamInput(stream: FakePushStream) {
      return { _stream: stream }
    },
  },

  TranslationRecognizer: FakeTranslationRecognizer,

  PhraseListGrammar: {
    fromRecognizer(_rec: any) {
      return { addPhrase(_p: string) {} }
    },
  },

  ResultReason,
  CancellationErrorCode,
}
```

## apps/api/src/__tests__/AzureSession.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Azure SDK before importing AzureSession
vi.mock('microsoft-cognitiveservices-speech-sdk', () => {
  const pushStreamMock = { write: vi.fn(), close: vi.fn() }
  const recognizerMock = {
    startContinuousRecognitionAsync: vi.fn((ok) => ok()),
    stopContinuousRecognitionAsync: vi.fn((ok) => ok()),
    close: vi.fn(),
    recognizing: null as any,
    recognized: null as any,
    canceled: null as any,
  }
  return {
    SpeechTranslationConfig: {
      fromSubscription: vi.fn(() => ({
        speechRecognitionLanguage: '',
        addTargetLanguage: vi.fn(),
        setProperty: vi.fn(),
      })),
    },
    AudioConfig: {
      fromStreamInput: vi.fn(() => ({})),
    },
    AudioInputStream: {
      createPushStream: vi.fn(() => pushStreamMock),
    },
    AudioStreamFormat: {
      getWaveFormatPCM: vi.fn(),
    },
    TranslationRecognizer: vi.fn(() => recognizerMock),
    PhraseListGrammar: {
      fromRecognizer: vi.fn(() => ({ addPhrase: vi.fn() })),
    },
    ResultReason: { TranslatingSpeech: 1, TranslatedSpeech: 2 },
  }
})

import { AzureSession } from '../services/AzureSession'

describe('AzureSession', () => {
  let session: AzureSession
  let onSegment: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSegment = vi.fn()
    session = new AzureSession({
      eventCode: 'KAI492',
      phraseList: ['karakia'],
      languages: ['en-NZ'],
      onSegment,
    })
  })

  it('starts without throwing', async () => {
    await expect(session.start()).resolves.not.toThrow()
  })

  it('writes audio chunks to push stream', async () => {
    await session.start()
    const buffer = new ArrayBuffer(320)
    session.pushChunk(Buffer.from(buffer))
    const sdk = await import('microsoft-cognitiveservices-speech-sdk')
    expect(sdk.AudioInputStream.createPushStream).toHaveBeenCalled()
  })

  it('stops and closes cleanly', async () => {
    await session.start()
    await expect(session.stop()).resolves.not.toThrow()
  })
})
```
