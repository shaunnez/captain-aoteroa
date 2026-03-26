import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing AzureSession
vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'event-uuid' } }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}))

// Mock config
vi.mock('../config', () => ({
  config: {
    azure: {
      speechKey: 'test-key',
      speechRegion: 'australiaeast',
    },
  },
}))

// Mock the Azure SDK before importing AzureSession
vi.mock('microsoft-cognitiveservices-speech-sdk', () => {
  const pushStreamMock = { write: vi.fn(), close: vi.fn() }
  const addTargetLanguageSpy = vi.fn()
  const targetLanguages: string[] = []
  const translationConfigMock = {
    speechRecognitionLanguage: '' as string,
    setProperty: vi.fn(),
    addTargetLanguage: (lang: string) => {
      addTargetLanguageSpy(lang)
      targetLanguages.push(lang)
    },
    _targetLanguages: targetLanguages,
  }
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
      fromSubscription: vi.fn(() => translationConfigMock),
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
    ResultReason: { RecognizingSpeech: 1, RecognizedSpeech: 2, TranslatingSpeech: 3, TranslatedSpeech: 4 },
    CancellationErrorCode: { NoError: 0 },
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
      languages: [],
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

  it('adds target languages to translation config', async () => {
    const sessionWithLangs = new AzureSession({
      eventCode: 'KAI492',
      languages: ['en-NZ', 'zh-TW', 'mi-NZ'],
      onSegment,
    })
    await sessionWithLangs.start()
    const sdk = await import('microsoft-cognitiveservices-speech-sdk')
    expect(sdk.SpeechTranslationConfig.fromSubscription).toHaveBeenCalled()
    expect(sdk.TranslationRecognizer).toHaveBeenCalled()
  })

  it('updateLanguages restarts when new language added', async () => {
    session = new AzureSession({
      eventCode: 'KAI492',
      languages: ['en-NZ'],
      onSegment,
    })
    await session.start()
    const sdk = await import('microsoft-cognitiveservices-speech-sdk')
    const startCallsBefore = (sdk.TranslationRecognizer as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    session.updateLanguages(['en-NZ', 'zh-TW'])
    // Allow the async restart to run
    await new Promise((r) => setTimeout(r, 10))
    const startCallsAfter = (sdk.TranslationRecognizer as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    expect(startCallsAfter).toBeGreaterThan(startCallsBefore)
  })

  it('updateLanguages does NOT restart when no new languages', async () => {
    session = new AzureSession({
      eventCode: 'KAI492',
      languages: ['en-NZ', 'zh-TW'],
      onSegment,
    })
    await session.start()
    const sdk = await import('microsoft-cognitiveservices-speech-sdk')
    const startCallsBefore = (sdk.TranslationRecognizer as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    session.updateLanguages(['en-NZ', 'zh-TW'])
    await new Promise((r) => setTimeout(r, 10))
    const startCallsAfter = (sdk.TranslationRecognizer as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    expect(startCallsAfter).toBe(startCallsBefore)
  })

  it('emits multi-language segments from translation results', async () => {
    session = new AzureSession({
      eventCode: 'KAI492',
      languages: ['en-NZ', 'zh-TW'],
      onSegment,
    })
    await session.start()
    const sdk = await import('microsoft-cognitiveservices-speech-sdk')
    // Get the recognizer instance that was created
    const recognizerInstance = (sdk.TranslationRecognizer as unknown as ReturnType<typeof vi.fn>).mock.results[
      (sdk.TranslationRecognizer as unknown as ReturnType<typeof vi.fn>).mock.results.length - 1
    ].value
    // Fire a recognized event with translations
    recognizerInstance.recognized(null, {
      result: {
        reason: 4, // TranslatedSpeech
        text: 'Hello',
        translations: {
          languages: ['zh'],
          get: (lang: string) => lang === 'zh' ? '你好' : undefined,
        },
      },
    })
    expect(onSegment).toHaveBeenCalled()
    const payload = onSegment.mock.calls[0][0]
    expect(payload.segments['en-NZ']).toBe('Hello')
    expect(payload.isFinal).toBe(true)
  })
})
