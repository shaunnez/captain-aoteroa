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
