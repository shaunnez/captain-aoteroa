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
