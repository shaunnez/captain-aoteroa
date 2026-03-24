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
    SpeechConfig: {
      fromSubscription: vi.fn(() => ({
        speechRecognitionLanguage: '',
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
    SpeechRecognizer: vi.fn(() => recognizerMock),
    PhraseListGrammar: {
      fromRecognizer: vi.fn(() => ({ addPhrase: vi.fn() })),
    },
    ResultReason: { RecognizingSpeech: 1, RecognizedSpeech: 2 },
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
