/**
 * Runtime fake for the Azure Speech SDK.
 * Used when AZURE_MOCK=true so E2E / integration tests can exercise
 * the full pipeline without incurring Azure costs.
 */

import { MOCK_SOURCE_TEXT, MOCK_TRANSLATIONS } from '../../__tests__/fixtures/translations'

// ---------------------------------------------------------------------------
// Enum-like constants matching the real SDK
// (declared before the classes that reference them)
// ---------------------------------------------------------------------------
const ResultReason = {
  RecognizingSpeech: 1,
  RecognizedSpeech: 2,
  TranslatingSpeech: 3,
  TranslatedSpeech: 4,
} as const

const CancellationErrorCode = {
  NoError: 0,
} as const

// ---------------------------------------------------------------------------
// Fake PushAudioInputStream
// ---------------------------------------------------------------------------
class FakePushStream {
  private bytesReceived = 0
  private recognizer: { _fireRecognized(): void } | null = null

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
  _setRecognizer(rec: { _fireRecognized(): void }): void {
    this.recognizer = rec
  }
}

// ---------------------------------------------------------------------------
// Fake SpeechRecognizer
// (used internally; the public export is the class assigned to fakeSdk.SpeechRecognizer)
// ---------------------------------------------------------------------------
class FakeSpeechRecognizer {
  recognizing: ((sender: any, e: any) => void) | null = null
  recognized: ((sender: any, e: any) => void) | null = null
  canceled: ((sender: any, e: any) => void) | null = null

  private running = false
  private pushStream: FakePushStream | null = null

  constructor(config: any, audioConfig: any) {
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

    this.recognized(null, {
      result: {
        reason: ResultReason.RecognizedSpeech,
        text: MOCK_SOURCE_TEXT,
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Fake TranslationRecognizer
// ---------------------------------------------------------------------------
class FakeTranslationRecognizer {
  recognizing: ((sender: any, e: any) => void) | null = null
  recognized: ((sender: any, e: any) => void) | null = null
  canceled: ((sender: any, e: any) => void) | null = null

  private running = false
  private pushStream: FakePushStream | null = null
  private targetLanguages: string[] = []

  constructor(_config: any, audioConfig: any) {
    // Extract target languages from the SpeechTranslationConfig mock
    if (_config?._targetLanguages) {
      this.targetLanguages = _config._targetLanguages
    }
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
    const langs = this.targetLanguages
    this.recognized(null, {
      result: {
        reason: ResultReason.TranslatedSpeech,
        text: MOCK_SOURCE_TEXT,
        translations: {
          languages: langs,
          get(lang: string): string {
            return MOCK_TRANSLATIONS[lang] ?? 'mock translation'
          },
        },
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Public export matching `import * as sdk from 'microsoft-cognitiveservices-speech-sdk'`
// ---------------------------------------------------------------------------
export const fakeSdk = {
  SpeechConfig: {
    fromSubscription(_key: string, _region: string) {
      return {
        speechRecognitionLanguage: '' as string,
        setProperty(_name: string, _value: string) {},
      }
    },
  },

  SpeechTranslationConfig: {
    fromSubscription(_key: string, _region: string) {
      const targetLanguages: string[] = []
      return {
        speechRecognitionLanguage: '' as string,
        setProperty(_name: string, _value: string) {},
        addTargetLanguage(lang: string) { targetLanguages.push(lang) },
        _targetLanguages: targetLanguages,
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

  SpeechRecognizer: FakeSpeechRecognizer,
  TranslationRecognizer: FakeTranslationRecognizer,

  PhraseListGrammar: {
    fromRecognizer(_rec: any) {
      return { addPhrase(_p: string) {} }
    },
  },

  ResultReason,
  CancellationErrorCode,
}
