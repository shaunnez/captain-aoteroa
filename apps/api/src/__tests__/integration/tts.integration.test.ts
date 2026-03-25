import { describe, it, expect } from 'vitest'
import { isValidMp3, isValidPcmStream } from './helpers'

const skipAzure = process.env.AZURE_SPEECH_KEY === '__placeholder__'
const skipOpenAI = process.env.OPENAI_API_KEY === '__placeholder__'

describe('TTS layer', () => {
  describe.skipIf(skipAzure)('TTS azure', () => {
    it('en — produces valid MP3 Buffer', async () => {
      const { TtsService } = await import('../../services/TtsService')
      const tts = new TtsService({ speechKey: process.env.AZURE_SPEECH_KEY!, speechRegion: process.env.AZURE_SPEECH_REGION! })
      const audio = await tts.synthesize('Hello, welcome to the event.', 'en')
      console.log('[TTS azure en] byteLength:', audio?.byteLength)
      expect(audio).not.toBeNull()
      expect(isValidMp3(audio!)).toBe(true)
    })

    it('fr — produces valid MP3 Buffer', async () => {
      const { TtsService } = await import('../../services/TtsService')
      const tts = new TtsService({ speechKey: process.env.AZURE_SPEECH_KEY!, speechRegion: process.env.AZURE_SPEECH_REGION! })
      const audio = await tts.synthesize('Bonjour, bienvenue à l\'événement.', 'fr')
      console.log('[TTS azure fr] byteLength:', audio?.byteLength)
      expect(audio).not.toBeNull()
      expect(isValidMp3(audio!)).toBe(true)
    })
  })

  it.skipIf(skipOpenAI)('TTS openai: mi — produces valid PCM stream', async () => {
    const { OpenAiTtsService } = await import('../../services/OpenAiTtsService')
    const tts = new OpenAiTtsService({ apiKey: process.env.OPENAI_API_KEY! })
    const chunks: Buffer[] = []
    await tts.synthesizeStream('Kia ora, nau mai ki tēnei hui.', (chunk) => chunks.push(chunk))
    const totalBytes = chunks.reduce((n, c) => n + c.byteLength, 0)
    console.log('[TTS openai mi] chunks:', chunks.length, 'totalBytes:', totalBytes)
    expect(isValidPcmStream(chunks)).toBe(true)
  })
})
